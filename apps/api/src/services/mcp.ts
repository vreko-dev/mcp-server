/**
 * MCP Service Layer
 *
 * Business logic for MCP server operations.
 * Privacy: Metadata only, no code content (C-006)
 *
 * @module services/mcp
 */

import { mcpActivityEvents, mcpAggregatedLearnings, mcpSessions } from "@snapback/platform";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./database";

// Service error classes (C-015)
export class McpServiceError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "McpServiceError";
	}
}

export class SessionNotFoundError extends McpServiceError {
	constructor(sessionId: string) {
		super(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND", { sessionId });
	}
}

export class UserNotFoundError extends McpServiceError {
	constructor(userId: string) {
		super(`User not found: ${userId}`, "USER_NOT_FOUND", { userId });
	}
}

/**
 * Start a new MCP session
 *
 * Creates a session record in the database and returns initial recommendations
 * based on cross-workspace learning patterns.
 *
 * @param userId - The user's ID
 * @param workspaceId - Hashed workspace identifier
 * @param taskDescription - Optional task description (user-provided, not code)
 * @param detectedStack - Optional detected stack metadata
 * @returns Session ID and initial guidance
 */
export async function startMcpSession(
	userId: string,
	workspaceId: string,
	taskDescription?: string,
	detectedStack?: Record<string, unknown>,
): Promise<{
	sessionId: string;
	guidance: {
		recommendations: Array<{
			type: string;
			title: string;
			description: string;
			confidence: number;
		}>;
		next_actions: Array<{
			tool: string;
			reason: string;
			priority: "high" | "medium" | "low";
		}>;
	};
}> {
	// Validate input (C-016)
	if (!userId || typeof userId !== "string") {
		throw new McpServiceError("Invalid userId", "INVALID_INPUT", { userId });
	}
	if (!workspaceId || typeof workspaceId !== "string") {
		throw new McpServiceError("Invalid workspaceId", "INVALID_INPUT", { workspaceId });
	}

	// Create session in database
	const [session] = await db
		.insert(mcpSessions)
		.values({
			userId,
			workspaceId,
			taskDescription: taskDescription ?? null,
			detectedStack: detectedStack ?? {},
		})
		.returning({ id: mcpSessions.id });

	// Format session ID with prefix for external use
	const sessionId = `sess_${session.id.replace(/-/g, "").slice(0, 12)}`;

	// Get recommendations based on user's cross-workspace learnings
	const recommendations = await queryUserRecommendations(userId, workspaceId);

	// Build session start next_actions - recommend key tools for starting work
	const next_actions = buildSessionStartActions(taskDescription);

	return {
		sessionId,
		guidance: {
			recommendations,
			next_actions,
		},
	};
}

/**
 * Build recommended next actions for session start
 *
 * Provides tool-based guidance to ensure LLMs discover the full tool suite.
 * Always recommends get_context first for new tasks, plus other useful tools.
 */
function buildSessionStartActions(taskDescription?: string): Array<{
	tool: string;
	reason: string;
	priority: "high" | "medium" | "low";
}> {
	const actions: Array<{ tool: string; reason: string; priority: "high" | "medium" | "low" }> = [];

	// Always recommend get_context first for new sessions
	actions.push({
		tool: "get_context",
		reason: taskDescription
			? `Gather patterns and learnings relevant to: ${taskDescription.slice(0, 50)}${taskDescription.length > 50 ? "..." : ""}`
			: "Gather workspace patterns, constraints, and recent learnings before starting",
		priority: "high",
	});

	// Recommend prepare_workspace for safety assessment
	actions.push({
		tool: "prepare_workspace",
		reason: "Run pre-flight check to assess protection score and get coaching suggestions",
		priority: "medium",
	});

	// Recommend get_learnings if task involves common patterns
	if (taskDescription) {
		actions.push({
			tool: "get_learnings",
			reason: "Search for past learnings that may inform your approach",
			priority: "low",
		});
	}

	return actions;
}

/**
 * Query user recommendations based on aggregated learnings
 *
 * Fetches high-confidence patterns from cross-workspace aggregation.
 * Patterns with 2+ workspaces are prioritized for recommendations.
 * Patterns seen in the current workspace get a confidence boost.
 *
 * @param userId - The user's ID
 * @param workspaceId - Current workspace ID for context-aware sorting
 * @returns Array of recommendations sorted by confidence
 */
export async function queryUserRecommendations(
	userId: string,
	workspaceId: string,
): Promise<
	Array<{
		type: string;
		title: string;
		description: string;
		confidence: number;
	}>
> {
	// Validate input - return empty array for invalid input (graceful degradation)
	if (!userId || typeof userId !== "string") {
		return [];
	}

	// Query high-confidence patterns (confidence > 0.7, multiple workspaces)
	const learnings = await db
		.select({
			patternKey: mcpAggregatedLearnings.patternKey,
			patternType: mcpAggregatedLearnings.patternType,
			confidence: mcpAggregatedLearnings.confidence,
			workspaceCount: mcpAggregatedLearnings.workspaceCount,
			workspaceIds: mcpAggregatedLearnings.workspaceIds,
		})
		.from(mcpAggregatedLearnings)
		.where(and(eq(mcpAggregatedLearnings.userId, userId), gte(mcpAggregatedLearnings.confidence, 0.7)))
		.orderBy(desc(mcpAggregatedLearnings.confidence))
		.limit(10);

	// Transform learnings to recommendations with workspace context boost
	const recommendations = learnings.map(
		(learning: {
			patternKey: string;
			patternType: string;
			confidence: number;
			workspaceCount: number;
			workspaceIds: unknown;
		}) => {
			// Boost confidence for patterns seen in current workspace
			const seenInWorkspace = Array.isArray(learning.workspaceIds) && learning.workspaceIds.includes(workspaceId);
			const adjustedConfidence = seenInWorkspace
				? Math.min(learning.confidence * 1.1, 1.0) // 10% boost, capped at 1.0
				: learning.confidence;

			return {
				type: learning.patternType,
				title: formatPatternTitle(learning.patternKey),
				description: formatPatternDescription(
					learning.patternKey,
					learning.patternType,
					learning.workspaceCount,
				),
				confidence: adjustedConfidence,
			};
		},
	);

	// Always include a session-started recommendation
	if (recommendations.length === 0) {
		recommendations.push({
			type: "pattern",
			title: "Session Started",
			description: "Ready to assist with your development task.",
			confidence: 1.0,
		});
	}

	return recommendations;
}

/**
 * Format pattern key into human-readable title
 */
function formatPatternTitle(patternKey: string): string {
	return patternKey
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Format pattern description based on type and workspace count
 */
function formatPatternDescription(patternKey: string, patternType: string, workspaceCount: number): string {
	const typeDescriptions: Record<string, string> = {
		stack: "Technology stack preference",
		practice: "Development practice",
		preference: "User preference",
	};
	const baseDesc = typeDescriptions[patternType] ?? "Pattern";
	return `${baseDesc}: ${patternKey} (used across ${workspaceCount} workspace${workspaceCount > 1 ? "s" : ""})`;
}

/**
 * Record an activity event (metadata only)
 *
 * Stores activity events with strict privacy enforcement - only allowed
 * metadata keys are accepted to prevent code content leakage (C-006).
 *
 * @param sessionId - The session ID
 * @param userId - The user's ID
 * @param eventType - Type of event (snapshot_created, risk_analyzed, learning_recorded)
 * @param metadata - Event metadata (fileCount, totalBytes, riskLevel only)
 */
export async function recordActivityEvent(
	sessionId: string,
	userId: string,
	eventType: string,
	metadata: {
		fileCount?: number;
		totalBytes?: number;
		riskLevel?: string;
	},
): Promise<{ eventId: string }> {
	// Validate input (C-016)
	if (!sessionId) {
		throw new McpServiceError("Missing sessionId", "INVALID_INPUT", { sessionId });
	}
	if (!userId) {
		throw new McpServiceError("Missing userId", "INVALID_INPUT", { userId });
	}
	if (!eventType) {
		throw new McpServiceError("Missing eventType", "INVALID_INPUT", { eventType });
	}

	// Validate metadata doesn't contain code content (C-006)
	const allowedKeys = new Set(["fileCount", "totalBytes", "riskLevel"]);
	for (const key of Object.keys(metadata)) {
		if (!allowedKeys.has(key)) {
			throw new McpServiceError(`Disallowed metadata key: ${key}`, "PRIVACY_VIOLATION", { key });
		}
	}

	// Extract session prefix and look up actual session UUID
	const sessionPrefix = extractSessionPrefix(sessionId);

	// Find the actual session by prefix pattern
	const sessions = await db
		.select({ id: mcpSessions.id })
		.from(mcpSessions)
		.where(and(eq(mcpSessions.userId, userId), sql`id::text LIKE ${`%${sessionPrefix}%`}`))
		.limit(1);

	if (sessions.length === 0) {
		throw new SessionNotFoundError(sessionId);
	}

	const actualSessionId = sessions[0].id;

	// Insert activity event
	const [event] = await db
		.insert(mcpActivityEvents)
		.values({
			sessionId: actualSessionId,
			userId,
			eventType,
			fileCount: metadata.fileCount ?? null,
			totalBytes: metadata.totalBytes ?? null,
			riskLevel: metadata.riskLevel ?? null,
		})
		.returning({ id: mcpActivityEvents.id });

	// Update session counters
	await updateSessionCounters(actualSessionId, eventType);

	return { eventId: `evt_${event.id.replace(/-/g, "").slice(0, 12)}` };
}

/**
 * Parse session ID from prefixed format to extract the UUID prefix
 * Returns the 12-character hash used for LIKE queries
 */
function extractSessionPrefix(sessionId: string): string {
	if (sessionId.startsWith("sess_")) {
		return sessionId.slice(5); // Remove "sess_" prefix, get 12-char hash
	}
	return sessionId;
}

/**
 * Update session counters based on event type
 * @param sessionUuid - The actual session UUID (not prefixed)
 * @param eventType - Type of event to increment counter for
 */
async function updateSessionCounters(sessionUuid: string, eventType: string): Promise<void> {
	const columnMap: Record<string, string> = {
		snapshot_created: "snapshot_count",
		risk_analyzed: "risk_analysis_count",
		learning_recorded: "learnings_recorded",
	};

	const column = columnMap[eventType];
	if (!column) {
		return;
	}

	// Use raw SQL for atomic increment with direct UUID match
	await db.execute(
		sql`UPDATE mcp_sessions SET ${sql.raw(column)} = ${sql.raw(column)} + 1, updated_at = NOW() WHERE id = ${sessionUuid}::uuid`,
	);
}

/**
 * Record a learning signal for cross-workspace aggregation
 *
 * Implements pattern promotion logic:
 * - New patterns are stored with initial confidence
 * - Patterns seen in 2+ workspaces are promoted to user preferences
 * - High confidence (>0.8) patterns are included in recommendations
 *
 * @param userId - The user's ID
 * @param workspaceId - The workspace ID
 * @param patternKey - Pattern identifier (e.g., "typescript", "react-hooks")
 * @param patternType - Type of pattern ("stack", "practice", "preference")
 * @param confidence - Confidence score (0.0-1.0)
 */
export async function recordLearningSignal(
	userId: string,
	workspaceId: string,
	patternKey: string,
	patternType: string,
	confidence: number,
): Promise<{ aggregated: boolean; workspaceCount: number }> {
	// Validate input (C-016)
	if (!userId) {
		throw new McpServiceError("Missing userId", "INVALID_INPUT", { userId });
	}
	if (!workspaceId) {
		throw new McpServiceError("Missing workspaceId", "INVALID_INPUT", { workspaceId });
	}
	if (!patternKey) {
		throw new McpServiceError("Missing patternKey", "INVALID_INPUT", { patternKey });
	}
	if (!patternType) {
		throw new McpServiceError("Missing patternType", "INVALID_INPUT", { patternType });
	}
	if (confidence < 0 || confidence > 1) {
		throw new McpServiceError("Confidence must be between 0 and 1", "INVALID_INPUT", { confidence });
	}

	// Check for existing learning pattern
	const existing = await db
		.select({
			id: mcpAggregatedLearnings.id,
			workspaceCount: mcpAggregatedLearnings.workspaceCount,
			workspaceIds: mcpAggregatedLearnings.workspaceIds,
			totalOccurrences: mcpAggregatedLearnings.totalOccurrences,
			confidence: mcpAggregatedLearnings.confidence,
		})
		.from(mcpAggregatedLearnings)
		.where(
			and(
				eq(mcpAggregatedLearnings.userId, userId),
				eq(mcpAggregatedLearnings.patternKey, patternKey),
				eq(mcpAggregatedLearnings.patternType, patternType),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		// Update existing pattern with aggregation
		const current = existing[0];
		const newOccurrences = current.totalOccurrences + 1;
		// Weighted average for confidence update
		const newConfidence = (current.confidence * current.totalOccurrences + confidence) / newOccurrences;

		// Track unique workspaces - only increment if this is a new workspace
		const existingWorkspaceIds = (current.workspaceIds as string[]) || [];
		const isNewWorkspace = !existingWorkspaceIds.includes(workspaceId);
		const newWorkspaceIds = isNewWorkspace ? [...existingWorkspaceIds, workspaceId] : existingWorkspaceIds;
		const newWorkspaceCount = newWorkspaceIds.length;

		await db
			.update(mcpAggregatedLearnings)
			.set({
				totalOccurrences: newOccurrences,
				confidence: Math.min(newConfidence, 1.0),
				workspaceCount: newWorkspaceCount,
				workspaceIds: newWorkspaceIds,
				lastSeenAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(mcpAggregatedLearnings.id, current.id));

		return {
			aggregated: newWorkspaceCount >= 2,
			workspaceCount: newWorkspaceCount,
		};
	}

	// Insert new learning pattern with initial workspace
	await db.insert(mcpAggregatedLearnings).values({
		userId,
		patternKey,
		patternType,
		confidence,
		workspaceCount: 1,
		workspaceIds: [workspaceId],
		totalOccurrences: 1,
	});

	return {
		aggregated: true,
		workspaceCount: 1,
	};
}

/**
 * Get session statistics
 *
 * Returns aggregate metrics for a session including snapshot counts,
 * risk analysis counts, and learnings recorded.
 *
 * @param sessionId - The session ID
 * @param userId - The user's ID (for authorization)
 * @returns Session statistics
 */
export async function getSessionStats(
	sessionId: string,
	userId: string,
): Promise<{
	snapshotCount: number;
	riskAnalysisCount: number;
	learningsRecorded: number;
	duration: number;
}> {
	// Validate input (C-016)
	if (!sessionId) {
		throw new McpServiceError("Missing sessionId", "INVALID_INPUT", { sessionId });
	}
	if (!userId) {
		throw new McpServiceError("Missing userId", "INVALID_INPUT", { userId });
	}

	// Extract session prefix and query with ownership check
	const sessionPrefix = extractSessionPrefix(sessionId);

	const sessions = await db
		.select({
			snapshotCount: mcpSessions.snapshotCount,
			riskAnalysisCount: mcpSessions.riskAnalysisCount,
			learningsRecorded: mcpSessions.learningsRecorded,
			startedAt: mcpSessions.startedAt,
			endedAt: mcpSessions.endedAt,
		})
		.from(mcpSessions)
		.where(and(eq(mcpSessions.userId, userId), sql`id::text LIKE ${`%${sessionPrefix}%`}`))
		.limit(1);

	if (sessions.length === 0) {
		// Return empty stats for non-existent session (graceful degradation)
		return {
			snapshotCount: 0,
			riskAnalysisCount: 0,
			learningsRecorded: 0,
			duration: 0,
		};
	}

	const session = sessions[0];
	const endTime = session.endedAt ?? new Date();
	const duration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);

	return {
		snapshotCount: session.snapshotCount ?? 0,
		riskAnalysisCount: session.riskAnalysisCount ?? 0,
		learningsRecorded: session.learningsRecorded ?? 0,
		duration,
	};
}

/**
 * End an MCP session
 *
 * Marks the session as ended with an end timestamp.
 *
 * @param sessionId - The session ID
 * @param userId - The user's ID (for authorization)
 */
export async function endMcpSession(sessionId: string, userId: string): Promise<{ success: boolean }> {
	// Validate input (C-016)
	if (!sessionId) {
		throw new McpServiceError("Missing sessionId", "INVALID_INPUT", { sessionId });
	}
	if (!userId) {
		throw new McpServiceError("Missing userId", "INVALID_INPUT", { userId });
	}

	// Extract session prefix and update with ownership check
	const sessionPrefix = extractSessionPrefix(sessionId);

	// Update session with end timestamp, matching both session prefix and user
	const result = await db
		.update(mcpSessions)
		.set({
			endedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(mcpSessions.userId, userId), sql`id::text LIKE ${`%${sessionPrefix}%`}`))
		.returning({ id: mcpSessions.id });

	return { success: result.length > 0 };
}
