/**
 * Session Manager
 *
 * Tracks LLM session context: tool calls, file modifications, loop detection, risk escalation.
 *
 * Based on research:
 * - arXiv:2511.10650 - Hybrid loop detection (F1: 0.72)
 * - Pedowitz Safety Playbook - Circuit breakers + idempotency
 * - LangChain Context Engineering - Session state management
 */

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { readFile, writeFile } from "atomically";
import { z } from "zod";
import type {
	CircuitBreaker,
	FileModification,
	LoopDetectionResult,
	SessionAnalytics,
	SessionLimits,
	SessionRiskLevel,
	SessionState,
	ToolCall,
} from "../types/session.js";
import { DEFAULT_SESSION_LIMITS } from "../types/session.js";
import { logger } from "../utils/logger.js";
import { LoopDetector } from "./LoopDetector.js";

/**
 * Runtime validation schemas (Zod best practice)
 */
const ToolCallSchema = z.object({
	id: z.string().min(1, "Tool call ID required"),
	name: z.string().min(1, "Tool name required"),
	args: z.record(z.unknown()),
	timestamp: z.number().positive("Timestamp must be positive"),
	result: z
		.object({
			success: z.boolean(),
			output: z.unknown().optional(),
			error: z.string().optional(),
		})
		.optional(),
	embedding: z.array(z.number()).optional(),
});

const FileModificationSchema = z.object({
	path: z.string().min(1, "File path required"),
	timestamp: z.number().positive("Timestamp must be positive"),
	type: z.enum(["create", "update", "delete"]),
	linesChanged: z.number().nonnegative().optional(),
});

/**
 * Session Manager
 *
 * Manages multiple concurrent LLM sessions with:
 * - Tool call tracking with idempotency
 * - File modification velocity
 * - Loop detection (structural + semantic)
 * - Risk escalation
 * - Circuit breakers
 */
export class SessionManager {
	private sessions = new Map<string, SessionState>();
	private limits: SessionLimits;
	private loopDetector: LoopDetector;
	private persistencePath?: string;
	private autosaveEnabled: boolean;

	constructor(limits: Partial<SessionLimits> = {}, options?: { persistencePath?: string; autosave?: boolean }) {
		this.limits = { ...DEFAULT_SESSION_LIMITS, ...limits };
		this.loopDetector = new LoopDetector();
		this.persistencePath = options?.persistencePath;
		this.autosaveEnabled = options?.autosave ?? false;

		// Auto-load sessions on startup if persistence enabled
		if (this.persistencePath) {
			this.loadSessions().catch((error) => {
				logger.error("Failed to load sessions on startup", {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	/**
	 * Start a new session
	 */
	startSession(
		sessionId: string,
		metadata?: {
			workspaceId?: string;
			userId?: string;
			tags?: string[];
		},
	): void {
		// Defensive check (L6256620335)
		if (!sessionId) {
			throw new Error("SessionManager.startSession: sessionId is required");
		}

		// Prevent duplicate sessions
		if (this.sessions.has(sessionId)) {
			logger.warn("Session already exists", { sessionId, action: "rejected" });
			throw new Error(`SessionManager.startSession: Session ${sessionId} already exists`);
		}

		const now = Date.now();

		logger.info("Session started", {
			sessionId,
			workspaceId: metadata?.workspaceId,
			userId: metadata?.userId,
			timestamp: now,
		});

		this.sessions.set(sessionId, {
			sessionId,
			startedAt: now,
			lastActivity: now,
			turnCount: 0,
			toolCalls: [],
			fileModifications: [],
			consecutiveModifications: new Map(),
			loopDetection: {
				sequence: [],
				dedupKeys: new Set(),
				consecutiveSameTool: new Map(),
				semanticCache: new Map(),
				circuitBreakers: new Map(),
			},
			riskLevel: "low",
			riskReasons: [],
			metadata: metadata ?? {},
		});

		// Autosave if enabled
		void this.autoSave();
	}

	/**
	 * Record a tool call
	 * Returns true if call is allowed, false if blocked (circuit breaker/loop)
	 */
	recordToolCall(sessionId: string, call: ToolCall): boolean {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`SessionManager.recordToolCall: Session ${sessionId} not found`);
		}

		// Input validation (Zod runtime check)
		try {
			ToolCallSchema.parse(call);
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new Error(
					`SessionManager.recordToolCall: Invalid tool call - ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
				);
			}
			throw error;
		}

		// Check idempotency (dedupe)
		if (session.loopDetection.dedupKeys.has(call.id)) {
			return false; // Duplicate operation
		}

		// Check circuit breaker
		const breaker = this.getOrCreateCircuitBreaker(session, call.name);
		if (breaker.state === "open") {
			// Check if cooldown expired
			const cooldownExpired = Date.now() - breaker.lastFailure > breaker.cooldownMs;
			if (!cooldownExpired) {
				logger.warn("Circuit breaker tripped", {
					sessionId,
					tool: call.name,
					state: breaker.state,
					failures: breaker.failures,
					cooldownRemaining: breaker.cooldownMs - (Date.now() - breaker.lastFailure),
				});
				return false; // Circuit breaker tripped
			}
			// Move to half-open for retry
			breaker.state = "half-open";
			logger.info("Circuit breaker half-open", {
				sessionId,
				tool: call.name,
				state: breaker.state,
			});
		}

		// Check consecutive same-tool limit
		const consecutive = (session.loopDetection.consecutiveSameTool.get(call.name) ?? 0) + 1;
		if (consecutive > this.limits.maxConsecutiveSameTool) {
			return false; // Too many consecutive calls
		}

		// Record call
		session.toolCalls.push(call);
		session.loopDetection.dedupKeys.add(call.id);
		session.loopDetection.consecutiveSameTool.set(call.name, consecutive);
		session.loopDetection.sequence.push(call.name);

		// Keep sequence limited to last 5
		if (session.loopDetection.sequence.length > 5) {
			session.loopDetection.sequence.shift();
		}

		// Update turn count
		session.turnCount++;
		session.lastActivity = Date.now();

		// Update circuit breaker on result
		if (call.result) {
			if (call.result.success) {
				breaker.failures = 0;
				if (breaker.state === "half-open") {
					breaker.state = "closed";
					logger.info("Circuit breaker closed (recovered)", {
						sessionId,
						tool: call.name,
						state: breaker.state,
					});
				}
			} else {
				breaker.failures++;
				breaker.lastFailure = Date.now();
				if (breaker.failures >= breaker.threshold) {
					breaker.state = "open";
					logger.error("Circuit breaker opened", {
						sessionId,
						tool: call.name,
						state: breaker.state,
						failures: breaker.failures,
						threshold: breaker.threshold,
					});
				}
			}
		}

		// Cleanup: Remove old tool counters to prevent memory leak (WeakMap pattern)
		// Only keep last 10 tools to prevent unbounded growth
		if (session.loopDetection.consecutiveSameTool.size > 10) {
			const toolNames = Array.from(session.loopDetection.consecutiveSameTool.keys());
			// Remove oldest entries (first in map)
			for (let i = 0; i < toolNames.length - 10; i++) {
				session.loopDetection.consecutiveSameTool.delete(toolNames[i]);
			}
		}

		// Recalculate risk
		this.updateRiskLevel(session);

		// Autosave if enabled
		void this.autoSave();

		return true;
	}

	/**
	 * Record a file modification
	 */
	recordFileModification(sessionId: string, mod: FileModification): void {
		const session = this.getSession(sessionId);
		if (!session) {
			throw new Error(`SessionManager.recordFileModification: Session ${sessionId} not found`);
		}

		// Input validation (Zod runtime check)
		try {
			FileModificationSchema.parse(mod);
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new Error(
					`SessionManager.recordFileModification: Invalid modification - ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
				);
			}
			throw error;
		}

		session.fileModifications.push(mod);

		// Track consecutive modifications
		const consecutiveCount = (session.consecutiveModifications.get(mod.path) ?? 0) + 1;
		session.consecutiveModifications.set(mod.path, consecutiveCount);

		session.lastActivity = Date.now();

		// Recalculate risk
		this.updateRiskLevel(session);

		// Autosave if enabled
		void this.autoSave();
	}

	/**
	 * Detect loops in session
	 */
	detectLoop(sessionId: string): LoopDetectionResult {
		const session = this.getSession(sessionId);
		if (!session) {
			return {
				detected: false,
				confidence: 0,
				evidence: [],
				action: "continue",
			};
		}

		return this.loopDetector.detect(session);
	}

	/**
	 * Calculate and update session risk level
	 */
	private updateRiskLevel(session: SessionState): void {
		const reasons: string[] = [];
		let riskScore = 0;

		// Factor 1: Tool call velocity
		const toolCallRate = session.toolCalls.length / Math.max((Date.now() - session.startedAt) / 60000, 1); // calls per minute
		if (toolCallRate > 10) {
			riskScore += 30;
			reasons.push(`High tool call rate: ${toolCallRate.toFixed(1)}/min`);
		} else if (toolCallRate > 5) {
			riskScore += 15;
			reasons.push(`Moderate tool call rate: ${toolCallRate.toFixed(1)}/min`);
		}

		// Factor 2: File modification velocity
		const fileModCount = session.fileModifications.length;
		if (fileModCount > this.limits.maxFileModifications * 0.8) {
			riskScore += 20;
			reasons.push(`High file modification count: ${fileModCount}`);
		}

		// Factor 3: Consecutive modifications to same file
		for (const [file, count] of session.consecutiveModifications.entries()) {
			if (count > this.limits.maxConsecutiveSameFile * 0.8) {
				riskScore += 25;
				reasons.push(`File modified ${count} times: ${file}`);
			}
		}

		// Factor 4: Loop detection
		const loopResult = this.loopDetector.detect(session);
		if (loopResult.detected) {
			riskScore += 40;
			reasons.push(`Loop detected: ${loopResult.type}`);
		}

		// Factor 5: Circuit breaker trips
		const circuitBreakerTrips = Array.from(session.loopDetection.circuitBreakers.values()).filter(
			(cb) => cb.state === "open",
		).length;
		if (circuitBreakerTrips > 0) {
			riskScore += 20 * circuitBreakerTrips;
			reasons.push(`${circuitBreakerTrips} circuit breaker(s) tripped`);
		}

		// Bound risk score to 0-100 range
		riskScore = Math.min(Math.max(riskScore, 0), 100);

		// Calculate risk level
		let riskLevel: SessionRiskLevel;
		if (riskScore >= 80) {
			riskLevel = "critical";
		} else if (riskScore >= 50) {
			riskLevel = "high";
		} else if (riskScore >= 25) {
			riskLevel = "medium";
		} else {
			riskLevel = "low";
		}

		// Log risk escalation
		if (riskLevel !== session.riskLevel && riskLevel !== "low") {
			logger.warn("Risk level escalated", {
				sessionId: session.sessionId,
				previousLevel: session.riskLevel,
				newLevel: riskLevel,
				riskScore,
				reasons,
			});
		}

		session.riskLevel = riskLevel;
		session.riskReasons = reasons;
	}

	/**
	 * Get session analytics
	 */
	getAnalytics(sessionId: string): SessionAnalytics | null {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return null;
		}

		// Count tool usage
		const toolCounts = new Map<string, number>();
		for (const call of session.toolCalls) {
			toolCounts.set(call.name, (toolCounts.get(call.name) ?? 0) + 1);
		}

		const uniqueTools = Array.from(toolCounts.keys());
		const mostCalledTool: { name: string; count: number } | null =
			uniqueTools.length > 0
				? Array.from(toolCounts.entries()).reduce<{ name: string; count: number }>(
						(max, [name, count]) => (count > max.count ? { name, count } : max),
						{ name: "", count: 0 },
					)
				: null;

		// Unique files
		const filesTouched = Array.from(new Set(session.fileModifications.map((m) => m.path)));

		// Count loops (detect once, not per tool call)
		const currentLoopResult = this.loopDetector.detect(session);
		const loopsDetected = currentLoopResult.detected ? 1 : 0;

		// Count circuit breaker trips
		const circuitBreakerTrips = Array.from(session.loopDetection.circuitBreakers.values()).filter(
			(cb) => cb.state === "open",
		).length;

		// Determine outcome
		const now = Date.now();
		const duration = now - session.startedAt;
		const timedOut = duration > this.limits.sessionTimeoutMs;
		const halted = session.riskLevel === "critical";

		let outcome: SessionAnalytics["outcome"];
		if (halted) {
			outcome = "halted";
		} else if (timedOut) {
			outcome = "timeout";
		} else {
			outcome = "completed";
		}

		return {
			sessionId: session.sessionId,
			duration,
			totalToolCalls: session.toolCalls.length,
			uniqueTools,
			mostCalledTool,
			filesTouched,
			peakRiskLevel: session.riskLevel,
			loopsDetected,
			circuitBreakerTrips,
			outcome,
		};
	}

	/**
	 * End a session and clean up
	 */
	endSession(sessionId: string): SessionAnalytics | null {
		const analytics = this.getAnalytics(sessionId);
		this.sessions.delete(sessionId);
		return analytics;
	}

	/**
	 * Get session state (for debugging)
	 */
	getSessionState(sessionId: string): SessionState | null {
		return this.sessions.get(sessionId) ?? null;
	}

	/**
	 * Get file modifications for a session
	 * @param sessionId - Session to query
	 * @param since - Optional timestamp filter (return modifications >= since)
	 * @returns File modifications array (empty if session not found)
	 */
	getFileModifications(sessionId: string, since?: number): FileModification[] {
		const session = this.getSession(sessionId);
		if (!session) {
			return [];
		}

		if (since !== undefined && since > 0) {
			return session.fileModifications.filter((m) => m.timestamp >= since);
		}

		return [...session.fileModifications];
	}

	/**
	 * Prune stale sessions (older than timeout)
	 */
	pruneStale(): number {
		const now = Date.now();
		let pruned = 0;

		for (const [sessionId, session] of this.sessions.entries()) {
			const age = now - session.lastActivity;
			if (age > this.limits.sessionTimeoutMs) {
				this.sessions.delete(sessionId);
				pruned++;
			}
		}

		return pruned;
	}

	/**
	 * Get or create circuit breaker for tool
	 */
	private getOrCreateCircuitBreaker(session: SessionState, toolName: string): CircuitBreaker {
		let breaker = session.loopDetection.circuitBreakers.get(toolName);

		if (!breaker) {
			breaker = {
				tool: toolName,
				state: "closed",
				failures: 0,
				threshold: this.limits.circuitBreakerThreshold,
				lastFailure: 0,
				cooldownMs: this.limits.circuitBreakerCooldownMs,
			};
			session.loopDetection.circuitBreakers.set(toolName, breaker);
		}

		return breaker;
	}

	/**
	 * Get session (null-safe)
	 */
	private getSession(sessionId: string): SessionState | null {
		return this.sessions.get(sessionId) ?? null;
	}

	/**
	 * Get active session count
	 */
	getActiveSessionCount(): number {
		return this.sessions.size;
	}

	// =========================================================================
	// PERSISTENCE (JSONL + Atomic Writes)
	// =========================================================================

	/**
	 * Save all sessions to disk (atomic writes)
	 * Based on web research best practices (GitHub jsonl-db, Claude Skills)
	 */
	async saveSessions(): Promise<void> {
		if (!this.persistencePath) {
			logger.warn("saveSessions called but no persistencePath configured");
			return;
		}

		try {
			// Ensure directory exists
			const dir = dirname(this.persistencePath);
			if (!existsSync(dir)) {
				await mkdir(dir, { recursive: true });
			}

			// Convert sessions to serializable format (Maps → Objects)
			const serializable = Array.from(this.sessions.entries()).map(([_id, session]) => ({
				...session,
				consecutiveModifications: Object.fromEntries(session.consecutiveModifications),
				loopDetection: {
					sequence: session.loopDetection.sequence,
					dedupKeys: Array.from(session.loopDetection.dedupKeys),
					consecutiveSameTool: Object.fromEntries(session.loopDetection.consecutiveSameTool),
					semanticCache: Object.fromEntries(session.loopDetection.semanticCache),
					circuitBreakers: Object.fromEntries(session.loopDetection.circuitBreakers),
				},
			}));

			// Atomic write (temp file → rename)
			const jsonl = serializable.map((s) => JSON.stringify(s)).join("\n");
			await writeFile(this.persistencePath, jsonl);

			logger.debug("Sessions saved", {
				count: this.sessions.size,
				path: this.persistencePath,
			});
		} catch (error) {
			logger.error("Failed to save sessions", {
				error: error instanceof Error ? error.message : String(error),
				path: this.persistencePath,
			});
			throw error;
		}
	}

	/**
	 * Load sessions from disk
	 */
	async loadSessions(): Promise<void> {
		if (!this.persistencePath) {
			return;
		}

		if (!existsSync(this.persistencePath)) {
			logger.debug("No sessions file found, starting fresh", {
				path: this.persistencePath,
			});
			return;
		}

		try {
			const content = await readFile(this.persistencePath, "utf-8");
			const lines = content.split("\n").filter((line) => line.trim());

			let loaded = 0;
			for (const line of lines) {
				try {
					const data = JSON.parse(line);

					// Reconstruct Maps from Objects
					const session: SessionState = {
						...data,
						consecutiveModifications: new Map(Object.entries(data.consecutiveModifications || {})),
						loopDetection: {
							sequence: data.loopDetection.sequence || [],
							dedupKeys: new Set(data.loopDetection.dedupKeys || []),
							consecutiveSameTool: new Map(Object.entries(data.loopDetection.consecutiveSameTool || {})),
							semanticCache: new Map(Object.entries(data.loopDetection.semanticCache || {})),
							circuitBreakers: new Map(Object.entries(data.loopDetection.circuitBreakers || {})),
						},
					};

					this.sessions.set(session.sessionId, session);
					loaded++;
				} catch (error) {
					logger.warn("Failed to parse session line, skipping", {
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			logger.info("Sessions loaded", {
				count: loaded,
				path: this.persistencePath,
			});
		} catch (error) {
			logger.error("Failed to load sessions", {
				error: error instanceof Error ? error.message : String(error),
				path: this.persistencePath,
			});
			throw error;
		}
	}

	/**
	 * Auto-save session after modifications (if enabled)
	 */
	private async autoSave(): Promise<void> {
		if (this.autosaveEnabled && this.persistencePath) {
			await this.saveSessions().catch((error) => {
				logger.error("Autosave failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}
}
