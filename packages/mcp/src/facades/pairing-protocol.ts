/**
 * Pairing Protocol Generator
 *
 * Generates context-aware guidance for AI agents using SnapBack.
 * This protocol is injected into system prompts to guide tool usage.
 *
 * Architecture:
 * - Reads session state for context
 * - Generates dynamic recommendations
 * - Provides quick reference for tool usage
 *
 * @module facades/pairing-protocol
 */

import { formatDuration, getCurrentTask, getSessionState, type MCPSessionState } from "../session/state.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Pairing protocol context for AI agents
 */
export interface PairingProtocol {
	/** Protocol version */
	version: string;

	/** Current task context (if any) */
	currentTask: {
		id: string;
		description: string;
		duration: string;
		filesChanged: number;
		snapshotId?: string;
	} | null;

	/** Recent observations to surface */
	recentObservations: Array<{
		type: string;
		message: string;
		emoji: string;
	}>;

	/** Risk areas currently being modified */
	riskAreas: string[];

	/** Session statistics */
	sessionStats: {
		tasksCompleted: number;
		snapshotsCreated: number;
		restoresPerformed: number;
		learningsCaptured: number;
	};

	/** Dynamic recommendations */
	recommendations: string[];

	/** Quick reference for tool usage */
	quickReference: string;

	/** Full protocol text (for system prompt injection) */
	protocolText: string;
}

// =============================================================================
// EMOJI HELPERS
// =============================================================================

/**
 * Get emoji for observation type
 */
function getObservationEmoji(type: string): string {
	switch (type) {
		case "risk":
			return "⚠️";
		case "warning":
			return "🚨";
		case "pattern":
			return "📚";
		case "suggestion":
			return "💡";
		case "progress":
			return "✅";
		default:
			return "ℹ️";
	}
}

// =============================================================================
// PROTOCOL GENERATION
// =============================================================================

/**
 * Generate dynamic recommendations based on session state
 */
function generateRecommendations(state: MCPSessionState): string[] {
	const recommendations: string[] = [];

	// Check if no task is active
	if (!state.currentTask) {
		recommendations.push("Call `begin_task` before making any code changes");
		return recommendations;
	}

	// Check for high risk areas
	if (state.riskAreasTouched.length > 0) {
		recommendations.push(
			`You're modifying ${state.riskAreasTouched.join(", ")} - a snapshot protects these changes`,
		);
	}

	// Check for many unsaved observations
	if (state.pendingObservations.length > 3) {
		recommendations.push(`${state.pendingObservations.length} observations pending - review with next tool call`);
	}

	// Check for long-running task
	if (state.currentTask) {
		const durationMs = Date.now() - state.currentTask.startedAt;
		const minutes = durationMs / 60000;

		if (minutes > 30) {
			recommendations.push("Task running 30+ minutes - consider using `review_work` to check progress");
		}
	}

	// Check for many changes
	if (state.changesSinceTaskStart.length > 5) {
		recommendations.push(
			`${state.changesSinceTaskStart.length} files changed - use \`what_changed\` to review scope`,
		);
	}

	// Check for high AI attribution
	const aiChanges = state.changesSinceTaskStart.filter((c) => c.aiAttributed).length;
	if (aiChanges > 3) {
		recommendations.push(`${aiChanges} AI-attributed changes - review carefully before committing`);
	}

	// Check session stats
	if (state.stats.restoresPerformed > 0) {
		recommendations.push(`You've used restore ${state.stats.restoresPerformed} time(s) - snapshots are helping!`);
	}

	return recommendations;
}

/**
 * Generate quick reference text
 */
function generateQuickReference(): string {
	return `
| Situation | Tool to Call |
|-----------|-------------|
| Starting any task | \`begin_task\` |
| "Did I break anything?" | \`quick_check\` |
| "What have I changed?" | \`what_changed\` |
| Ready to commit | \`review_work\` |
| Task complete | \`complete_task\` |
| Need to undo | \`snapshot_restore\` |
`.trim();
}

/**
 * Generate full protocol text for system prompt injection
 */
function generateProtocolText(state: MCPSessionState): string {
	const lines: string[] = ["## SnapBack Pairing Protocol", ""];

	// Current task status
	if (state.currentTask) {
		const duration = formatDuration(Date.now() - state.currentTask.startedAt);
		lines.push(`**Active Task:** ${state.currentTask.description}`);
		lines.push(`**Duration:** ${duration}`);
		lines.push(`**Files Changed:** ${state.changesSinceTaskStart.length}`);
		if (state.currentTask.snapshotId) {
			lines.push(`**Snapshot:** ${state.currentTask.snapshotId} (available for rollback)`);
		}
		lines.push("");
	} else {
		lines.push("**No active task.** Call `begin_task` before making changes.");
		lines.push("");
	}

	// Pending observations
	if (state.pendingObservations.length > 0) {
		lines.push("**Recent Observations:**");
		for (const obs of state.pendingObservations.slice(-3)) {
			const emoji = getObservationEmoji(obs.type);
			lines.push(`- ${emoji} ${obs.message}`);
		}
		lines.push("");
	}

	// Risk areas
	if (state.riskAreasTouched.length > 0) {
		lines.push(`**Risk Areas in Scope:** ${state.riskAreasTouched.join(", ")}`);
		lines.push("");
	}

	// Tool usage pattern
	lines.push("### Tool Usage Pattern");
	lines.push("");
	lines.push("**START of any coding task:**");
	lines.push("```");
	lines.push('Call: begin_task({ task: "description", files: ["planned", "files"] })');
	lines.push("```");
	lines.push("");
	lines.push("**DURING development:**");
	lines.push("- After changes: `quick_check({})` - fast validation");
	lines.push("- Review progress: `what_changed({})` - see all changes");
	lines.push("");
	lines.push("**BEFORE committing:**");
	lines.push("```");
	lines.push('Call: review_work({ intent: "what you accomplished" })');
	lines.push("```");
	lines.push("");
	lines.push("**END of task:**");
	lines.push("```");
	lines.push('Call: complete_task({ outcome: "completed", acceptLearnings: [0, 1] })');
	lines.push("```");
	lines.push("");

	// Quick reference
	lines.push("### Quick Reference");
	lines.push("");
	lines.push(generateQuickReference());

	return lines.join("\n");
}

/**
 * Generate pairing protocol for a workspace
 */
export function generatePairingProtocol(workspaceRoot: string): PairingProtocol {
	const state = getSessionState(workspaceRoot);
	const currentTask = getCurrentTask(workspaceRoot);

	// Build current task summary
	let taskContext: PairingProtocol["currentTask"] = null;
	if (currentTask) {
		taskContext = {
			id: currentTask.id,
			description: currentTask.description,
			duration: formatDuration(Date.now() - currentTask.startedAt),
			filesChanged: state.changesSinceTaskStart.length,
			snapshotId: currentTask.snapshotId,
		};
	}

	// Build observations
	const recentObservations = state.pendingObservations.slice(-5).map((obs) => ({
		type: obs.type,
		message: obs.message,
		emoji: getObservationEmoji(obs.type),
	}));

	// Generate recommendations
	const recommendations = generateRecommendations(state);

	return {
		version: "2.0",
		currentTask: taskContext,
		recentObservations,
		riskAreas: [...state.riskAreasTouched],
		sessionStats: { ...state.stats },
		recommendations,
		quickReference: generateQuickReference(),
		protocolText: generateProtocolText(state),
	};
}

/**
 * Get system prompt addendum based on current session state
 *
 * This is a shorter version suitable for injection into system prompts
 */
export function getSystemPromptAddendum(workspaceRoot: string): string {
	const state = getSessionState(workspaceRoot);
	return generateProtocolText(state);
}

/**
 * Get a minimal context summary for tool responses
 */
export function getContextSummary(workspaceRoot: string): {
	hasActiveTask: boolean;
	taskId?: string;
	filesChanged: number;
	riskAreas: string[];
	pendingObservations: number;
} {
	const state = getSessionState(workspaceRoot);

	return {
		hasActiveTask: state.currentTask !== null,
		taskId: state.currentTask?.id,
		filesChanged: state.changesSinceTaskStart.length,
		riskAreas: [...state.riskAreasTouched],
		pendingObservations: state.pendingObservations.length,
	};
}
