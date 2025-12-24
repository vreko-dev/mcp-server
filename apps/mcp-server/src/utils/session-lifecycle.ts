/**
 * Session Lifecycle Management
 *
 * Provides session-end hooks with auto-learning prompts and session metrics.
 * Designed to improve DX by capturing session outcomes and suggesting learnings.
 *
 * @module utils/session-lifecycle
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// TYPES
// =============================================================================

export interface SessionMetrics {
	sessionId: string;
	startedAt: string;
	endedAt: string;
	durationMs: number;
	snapshotCount: number;
	risksAnalyzed: number;
	filesModified: string[];
	errorsEncountered: number;
	toolsUsed: string[];
}

export interface SessionSummary {
	metrics: SessionMetrics;
	score: "excellent" | "good" | "fair" | "needs-improvement";
	coaching: string;
	suggestedLearnings: SuggestedLearning[];
}

export interface SuggestedLearning {
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	suggestedAction: string;
	confidence: number; // 0-1
	reason: string;
}

export interface LearningEntry {
	id: string;
	type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
	trigger: string;
	action: string;
	source: string;
	sessionId?: string;
	createdAt: string;
}

export interface SessionState {
	id: string;
	startedAt: string;
	task?: string;
	files?: string[];
	snapshotCount: number;
	risksAnalyzed: number;
	filesModified: string[];
	errorsEncountered: number;
	toolsUsed: string[];
}

// =============================================================================
// SESSION STATE MANAGEMENT
// =============================================================================

const sessionStates = new Map<string, SessionState>();

/**
 * Start tracking a session
 */
export function startSessionTracking(workspaceRoot: string, sessionId: string, task?: string): void {
	sessionStates.set(workspaceRoot, {
		id: sessionId,
		startedAt: new Date().toISOString(),
		task,
		files: [],
		snapshotCount: 0,
		risksAnalyzed: 0,
		filesModified: [],
		errorsEncountered: 0,
		toolsUsed: [],
	});
}

/**
 * Update session metrics
 */
export function updateSessionMetrics(
	workspaceRoot: string,
	update: Partial<Pick<SessionState, "snapshotCount" | "risksAnalyzed" | "errorsEncountered">> & {
		fileModified?: string;
		toolUsed?: string;
	},
): void {
	const state = sessionStates.get(workspaceRoot);
	if (!state) return;

	if (update.snapshotCount !== undefined) state.snapshotCount = update.snapshotCount;
	if (update.risksAnalyzed !== undefined) state.risksAnalyzed = update.risksAnalyzed;
	if (update.errorsEncountered !== undefined) state.errorsEncountered = update.errorsEncountered;
	if (update.fileModified && !state.filesModified.includes(update.fileModified)) {
		state.filesModified.push(update.fileModified);
	}
	if (update.toolUsed && !state.toolsUsed.includes(update.toolUsed)) {
		state.toolsUsed.push(update.toolUsed);
	}
}

/**
 * Increment a session counter
 */
export function incrementSessionCounter(
	workspaceRoot: string,
	counter: "snapshotCount" | "risksAnalyzed" | "errorsEncountered",
): void {
	const state = sessionStates.get(workspaceRoot);
	if (!state) return;
	state[counter]++;
}

/**
 * Get current session state
 */
export function getSessionState(workspaceRoot: string): SessionState | undefined {
	return sessionStates.get(workspaceRoot);
}

// =============================================================================
// SESSION END ANALYSIS
// =============================================================================

/**
 * Analyze session and generate summary with learning suggestions
 */
export function analyzeSession(workspaceRoot: string): SessionSummary | null {
	const state = sessionStates.get(workspaceRoot);
	if (!state) return null;

	const endedAt = new Date().toISOString();
	const durationMs = Date.now() - new Date(state.startedAt).getTime();

	const metrics: SessionMetrics = {
		sessionId: state.id,
		startedAt: state.startedAt,
		endedAt,
		durationMs,
		snapshotCount: state.snapshotCount,
		risksAnalyzed: state.risksAnalyzed,
		filesModified: state.filesModified,
		errorsEncountered: state.errorsEncountered,
		toolsUsed: state.toolsUsed,
	};

	const score = calculateSessionScore(metrics);
	const coaching = generateCoaching(metrics, score);
	const suggestedLearnings = generateLearningSuggestions(metrics, state.task);

	return { metrics, score, coaching, suggestedLearnings };
}

/**
 * Calculate session quality score
 */
function calculateSessionScore(metrics: SessionMetrics): SessionSummary["score"] {
	let score = 100;

	// Deduct for no snapshots when files were modified
	if (metrics.filesModified.length > 0 && metrics.snapshotCount === 0) {
		score -= 30;
	}

	// Bonus for good snapshot discipline
	if (metrics.snapshotCount > 0 && metrics.filesModified.length > 0) {
		const ratio = metrics.snapshotCount / metrics.filesModified.length;
		if (ratio >= 0.5) score += 10;
	}

	// Deduct for errors
	score -= metrics.errorsEncountered * 5;

	// Bonus for using risk analysis
	if (metrics.risksAnalyzed > 0) score += 10;

	// Normalize
	score = Math.max(0, Math.min(100, score));

	if (score >= 85) return "excellent";
	if (score >= 70) return "good";
	if (score >= 50) return "fair";
	return "needs-improvement";
}

/**
 * Generate coaching message based on session
 */
function generateCoaching(metrics: SessionMetrics, score: SessionSummary["score"]): string {
	const parts: string[] = [];

	// Duration coaching
	const durationMin = Math.round(metrics.durationMs / 60000);
	if (durationMin > 60) {
		parts.push(`Long session (${durationMin}min) - consider taking breaks for better focus.`);
	}

	// Snapshot coaching
	if (metrics.filesModified.length > 3 && metrics.snapshotCount === 0) {
		parts.push(
			"You modified several files without creating snapshots. Consider snapshot discipline for safer iteration.",
		);
	} else if (metrics.snapshotCount > 0) {
		parts.push(`Good snapshot discipline! ${metrics.snapshotCount} snapshot(s) created.`);
	}

	// Risk analysis coaching
	if (metrics.risksAnalyzed === 0 && metrics.filesModified.length > 0) {
		parts.push("No risk analysis performed. Use `assess_risk` before applying AI-generated changes.");
	}

	// Error coaching
	if (metrics.errorsEncountered > 2) {
		parts.push(`${metrics.errorsEncountered} errors encountered. Consider recording a pitfall learning.`);
	}

	// Overall
	const scoreMessages: Record<SessionSummary["score"], string> = {
		excellent: "🌟 Excellent session! Your workflow is well-protected.",
		good: "✅ Good session. Keep up the solid practices.",
		fair: "📊 Fair session. Consider more proactive protection.",
		"needs-improvement": "⚠️ Session needs improvement. Review snapshot and risk analysis habits.",
	};

	return [scoreMessages[score], ...parts].join("\n");
}

/**
 * Generate learning suggestions based on session patterns
 */
function generateLearningSuggestions(metrics: SessionMetrics, task?: string): SuggestedLearning[] {
	const suggestions: SuggestedLearning[] = [];

	// Pattern: Good snapshot discipline
	if (metrics.snapshotCount >= 3 && metrics.filesModified.length > 0) {
		suggestions.push({
			type: "pattern",
			trigger: "multi-file changes",
			suggestedAction: "Create snapshots before and after major changes",
			confidence: 0.8,
			reason: "You demonstrated good snapshot discipline this session",
		});
	}

	// Pitfall: No snapshots with many file changes
	if (metrics.filesModified.length > 5 && metrics.snapshotCount === 0) {
		suggestions.push({
			type: "pitfall",
			trigger: "large file modifications",
			suggestedAction: "Always create a snapshot before modifying more than 3 files",
			confidence: 0.9,
			reason: "Modified many files without protection points",
		});
	}

	// Efficiency: Quick session with good outcomes
	if (metrics.durationMs < 30 * 60 * 1000 && metrics.errorsEncountered === 0 && metrics.filesModified.length > 0) {
		suggestions.push({
			type: "efficiency",
			trigger: task || "focused task",
			suggestedAction: "Time-boxed sessions with clear goals lead to fewer errors",
			confidence: 0.7,
			reason: "Efficient session with zero errors",
		});
	}

	// Discovery: Used multiple tools effectively
	if (metrics.toolsUsed.length >= 3) {
		suggestions.push({
			type: "discovery",
			trigger: "multi-tool workflow",
			suggestedAction: `Combine ${metrics.toolsUsed.slice(0, 3).join(", ")} for comprehensive protection`,
			confidence: 0.6,
			reason: "Effective use of multiple SnapBack tools",
		});
	}

	// Workflow: Risk + Snapshot combination
	if (metrics.risksAnalyzed > 0 && metrics.snapshotCount > 0) {
		suggestions.push({
			type: "workflow",
			trigger: "AI code changes",
			suggestedAction: "assess_risk → create_snapshot → apply changes → validate",
			confidence: 0.85,
			reason: "You followed a protective workflow this session",
		});
	}

	return suggestions;
}

// =============================================================================
// LEARNING PERSISTENCE
// =============================================================================

/**
 * Record a learning entry
 */
export function recordLearning(
	workspaceRoot: string,
	learning: Omit<LearningEntry, "id" | "createdAt">,
): LearningEntry {
	const learningsDir = join(workspaceRoot, ".snapback", "learnings");
	const learningsPath = join(learningsDir, "user-learnings.jsonl");

	if (!existsSync(learningsDir)) {
		mkdirSync(learningsDir, { recursive: true });
	}

	const entry: LearningEntry = {
		...learning,
		id: `learn_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
		createdAt: new Date().toISOString(),
	};

	appendFileSync(learningsPath, JSON.stringify(entry) + "\n");
	return entry;
}

/**
 * Record multiple learnings from suggestions
 */
export function recordSuggestedLearnings(
	workspaceRoot: string,
	suggestions: SuggestedLearning[],
	sessionId: string,
	acceptedIndices: number[],
): LearningEntry[] {
	const recorded: LearningEntry[] = [];

	for (const idx of acceptedIndices) {
		const suggestion = suggestions[idx];
		if (!suggestion) continue;

		const entry = recordLearning(workspaceRoot, {
			type: suggestion.type,
			trigger: suggestion.trigger,
			action: suggestion.suggestedAction,
			source: `session:${sessionId}`,
			sessionId,
		});
		recorded.push(entry);
	}

	return recorded;
}

// =============================================================================
// SESSION PERSISTENCE
// =============================================================================

/**
 * Persist session summary to history
 */
export function persistSessionSummary(workspaceRoot: string, summary: SessionSummary): void {
	const sessionsDir = join(workspaceRoot, ".snapback");
	const sessionsPath = join(sessionsDir, "session-history.jsonl");

	if (!existsSync(sessionsDir)) {
		mkdirSync(sessionsDir, { recursive: true });
	}

	const record = {
		...summary.metrics,
		score: summary.score,
		suggestedLearningsCount: summary.suggestedLearnings.length,
	};

	appendFileSync(sessionsPath, JSON.stringify(record) + "\n");
}

/**
 * End session and cleanup
 */
export function endSessionTracking(workspaceRoot: string): void {
	sessionStates.delete(workspaceRoot);
}

// =============================================================================
// SESSION HISTORY
// =============================================================================

interface SessionHistoryEntry {
	sessionId: string;
	startedAt: string;
	endedAt: string;
	durationMs: number;
	snapshotCount: number;
	score: string;
}

/**
 * Get recent session history
 */
export function getSessionHistory(workspaceRoot: string, limit = 10): SessionHistoryEntry[] {
	const sessionsPath = join(workspaceRoot, ".snapback", "session-history.jsonl");

	if (!existsSync(sessionsPath)) {
		return [];
	}

	try {
		const content = readFileSync(sessionsPath, "utf-8");
		const entries = content
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as SessionHistoryEntry);

		return entries.slice(-limit).reverse();
	} catch {
		return [];
	}
}
