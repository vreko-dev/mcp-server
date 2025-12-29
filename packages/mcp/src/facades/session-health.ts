/**
 * SessionHealth Wrapper
 *
 * Provides session health context for MCP tool responses.
 * Wraps tool results with workspace vitals and session state.
 *
 * @module facades/session-health
 */

import { createStorage } from "@snapback/engine";
import { PRESSURE_THRESHOLDS, WorkspaceVitals } from "@snapback/intelligence/vitals";
import type { ToolContext, ToolResult } from "../registry.js";
import { getIntelligence } from "./intelligence.js";

/**
 * Session health snapshot included in enhanced responses
 */
export interface SessionHealth {
	workspaceId: string;
	healthScore: number;
	trajectory: "improving" | "stable" | "degrading" | "critical";
	activeWarnings: string[];
	recentViolations: number;
	lastSnapshot: {
		id: string;
		createdAt: string;
		minutesAgo: number;
	} | null;
	suggestions: string[];
}

/**
 * Enhanced tool result with session health
 */
export interface EnhancedToolResult {
	data: unknown;
	session: SessionHealth;
}

/**
 * Get current session health for a workspace
 *
 * @param context - Tool context with workspace info
 * @returns Session health snapshot
 */
export async function getSessionHealth(context: ToolContext): Promise<SessionHealth> {
	const intel = getIntelligence(context.workspaceRoot);
	const violations = intel.getViolationsSummary();

	// Get vitals from WorkspaceVitals
	const vitals = WorkspaceVitals.for(context.workspaceRoot);
	const currentVitals = vitals.current();
	const guidance = vitals.getAgentGuidance();

	// Get snapshot info
	const storage = createStorage(context.workspaceRoot);
	const snapshots = storage.listSnapshots();
	const lastSnapshot = snapshots[0];

	// Calculate health score (inverse of pressure, clamped 0-100)
	const healthScore = Math.max(0, Math.min(100, 100 - currentVitals.pressure.value));

	// Build warnings list
	const activeWarnings: string[] = [];

	if (currentVitals.pressure.value >= PRESSURE_THRESHOLDS.high) {
		activeWarnings.push("High pressure - consider creating a snapshot");
	}
	if (currentVitals.temperature.level === "hot") {
		activeWarnings.push("High AI change density detected");
	}
	if (currentVitals.pressure.criticalFilesTouched.length > 0) {
		activeWarnings.push(`Critical files touched: ${currentVitals.pressure.criticalFilesTouched.join(", ")}`);
	}
	if (violations.total > 0) {
		activeWarnings.push(`${violations.total} recent violation(s) recorded`);
	}

	// Build suggestions
	const suggestions: string[] = [];
	if (guidance.suggestion) {
		suggestions.push(guidance.suggestion);
	}
	if (violations.readyForPromotion.length > 0) {
		suggestions.push(`${violations.readyForPromotion.length} violation(s) ready for pattern promotion`);
	}

	return {
		workspaceId: context.workspaceRoot,
		healthScore,
		trajectory: currentVitals.trajectory as "stable" | "critical" | "improving" | "degrading",
		activeWarnings,
		recentViolations: violations.total,
		lastSnapshot: lastSnapshot
			? {
					id: lastSnapshot.id,
					createdAt: new Date(lastSnapshot.createdAt).toISOString(),
					minutesAgo: Math.floor((Date.now() - lastSnapshot.createdAt) / 60000),
				}
			: null,
		suggestions,
	};
}

/**
 * Wrap a tool result with session health
 *
 * @param data - The original tool result data
 * @param context - Tool context
 * @returns Enhanced result with session health
 */
export async function wrapWithSessionHealth<T>(data: T, context: ToolContext): Promise<EnhancedToolResult> {
	const session = await getSessionHealth(context);
	return { data, session };
}

/**
 * Create a ToolResult with embedded session health
 *
 * This is the primary function for handlers to use when they want
 * session-aware responses.
 *
 * @param data - The tool response data
 * @param context - Tool context
 * @returns ToolResult with session health embedded in JSON
 */
export async function sessionAwareResult<T>(data: T, context: ToolContext): Promise<ToolResult> {
	const enhanced = await wrapWithSessionHealth(data, context);
	return {
		content: [{ type: "text", text: JSON.stringify(enhanced, null, 2) }],
		isError: false,
	};
}

/**
 * Check if session health indicates risky state
 *
 * @param health - Session health snapshot
 * @returns true if workspace is in a risky state
 */
export function isRiskyState(health: SessionHealth): boolean {
	return (
		health.healthScore < 50 ||
		health.trajectory === "critical" ||
		health.trajectory === "degrading" ||
		health.activeWarnings.length > 2
	);
}

/**
 * Recommended action with priority
 */
export interface RecommendedAction {
	tool: string;
	reason: string;
	priority: "critical" | "high" | "medium" | "low";
}

/**
 * Get recommended next actions based on session health
 *
 * Returns up to 3 prioritized recommendations from the full tool suite.
 * Balances snapshot creation with other valuable tools like:
 * - get_context: Task planning and pattern awareness
 * - check_patterns: Pre-commit validation
 * - get_learnings: Historical knowledge retrieval
 * - report_violation: Learning from mistakes
 * - validate: Code quality checks
 * - prepare_workspace: Pre-flight checks
 *
 * @param health - Session health snapshot
 * @param taskContext - Optional task description for context-aware recommendations
 * @returns Prioritized list of recommended tools (max 3)
 */
export function getRecommendedActions(
	health: SessionHealth,
	taskContext?: { isNewTask?: boolean; hasCodeChanges?: boolean; fileCount?: number },
): RecommendedAction[] {
	const recommendations: RecommendedAction[] = [];

	// CRITICAL: Only recommend snapshot for truly critical situations
	if (health.healthScore < 30 || health.trajectory === "critical") {
		recommendations.push({
			tool: "snapshot_create",
			reason: "Critical health score - create safety snapshot before proceeding",
			priority: "critical",
		});
	}

	// HIGH: Context and learning tools for informed decisions
	if (taskContext?.isNewTask) {
		recommendations.push({
			tool: "get_context",
			reason: "Starting new task - gather patterns, constraints, and relevant learnings",
			priority: "high",
		});
	}

	if (health.recentViolations > 3) {
		recommendations.push({
			tool: "get_learnings",
			reason: `${health.recentViolations} recent violations - review past patterns to avoid repeating mistakes`,
			priority: "high",
		});
	}

	// MEDIUM: Pre-commit validation and workspace prep
	if (taskContext?.hasCodeChanges) {
		recommendations.push({
			tool: "check_patterns",
			reason: "Code changes detected - validate against architectural patterns before commit",
			priority: "medium",
		});
	}

	if ((taskContext?.fileCount ?? 0) > 3 && !health.lastSnapshot) {
		recommendations.push({
			tool: "prepare_workspace",
			reason: "Multi-file changes planned with no snapshot - run pre-flight check",
			priority: "medium",
		});
	}

	// LOW: Maintenance and optimization
	if (health.lastSnapshot && health.lastSnapshot.minutesAgo > 120 && health.trajectory === "degrading") {
		recommendations.push({
			tool: "snapshot_create",
			reason: "Last snapshot over 2 hours ago and trajectory is degrading",
			priority: "low",
		});
	}

	if (health.suggestions.length > 0) {
		recommendations.push({
			tool: "report_violation",
			reason: "Active suggestions available - consider recording learnings for pattern promotion",
			priority: "low",
		});
	}

	// Sort by priority and return top 3
	const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
	return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 3);
}

/**
 * Get recommended next action based on session health (legacy single-action API)
 *
 * @param health - Session health snapshot
 * @returns Recommended tool to call next (highest priority only)
 * @deprecated Use getRecommendedActions() for full tool suite recommendations
 */
export function getRecommendedAction(health: SessionHealth): { tool: string; reason: string } | null {
	const actions = getRecommendedActions(health);
	return actions.length > 0 ? { tool: actions[0].tool, reason: actions[0].reason } : null;
}
