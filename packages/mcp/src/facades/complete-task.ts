/**
 * Composite Tool: complete_task
 *
 * Gracefully ends the current task with:
 * - Session summary
 * - Learning capture prompts
 * - Optional snapshot creation
 * - Statistics update
 *
 * @see pair_programmer.md Section 2.5
 * @module facades/complete-task
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ToolHandler, ToolResult } from "../registry.js";
import { createSnapshotService } from "../services/snapshot-service.js";
import { endTask, formatDuration, getCurrentTask, getSessionState } from "../session/state.js";

// =============================================================================
// TYPES
// =============================================================================

interface CompleteTaskInput {
	/** Outcome of the task */
	outcome?: "completed" | "abandoned" | "blocked";
	/** Create final snapshot (default: true for completed tasks) */
	createSnapshot?: boolean;
	/** Learnings to capture (indices from pending suggestions) */
	acceptLearnings?: number[];
	/** Custom learning to add */
	customLearning?: {
		type: "pattern" | "pitfall" | "efficiency" | "discovery" | "workflow";
		trigger: string;
		action: string;
	};
	/** Notes about the task completion */
	notes?: string;
}

interface CompleteTaskOutput {
	taskId: string;
	taskDescription: string;
	outcome: "completed" | "abandoned" | "blocked";
	duration: string;
	summary: {
		filesChanged: number;
		linesChanged: number;
		snapshotsCreated: number;
		riskAreasTouched: string[];
	};
	learningsCaptured: number;
	finalSnapshot?: {
		id: string;
		fileCount: number;
	};
	sessionStats: {
		tasksCompleted: number;
		totalSnapshots: number;
		totalLearnings: number;
	};
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
	}>;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Append learning to JSONL file
 */
function appendLearning(
	workspaceRoot: string,
	learning: { type: string; trigger: string; action: string; source?: string },
): void {
	const learningsDir = join(workspaceRoot, ".snapback", "learnings");
	const learningsPath = join(learningsDir, "learnings.jsonl");

	try {
		if (!existsSync(learningsDir)) {
			mkdirSync(learningsDir, { recursive: true });
		}

		const entry = {
			...learning,
			timestamp: new Date().toISOString(),
			source: learning.source || "task_completion",
		};

		appendFileSync(learningsPath, JSON.stringify(entry) + "\n", "utf8");
	} catch {
		// Ignore write errors
	}
}

// =============================================================================
// HANDLER
// =============================================================================

function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * complete_task - Gracefully end the current task
 */
export const handleCompleteTask: ToolHandler = async (args, context): Promise<ToolResult> => {
	const {
		outcome = "completed",
		createSnapshot = outcome === "completed",
		acceptLearnings = [],
		customLearning,
		notes,
	} = args as CompleteTaskInput;

	const workspaceRoot = context.workspaceRoot;
	const state = getSessionState(workspaceRoot);
	const task = getCurrentTask(workspaceRoot);

	if (!task) {
		return result(
			JSON.stringify({
				error: "E301_NO_ACTIVE_TASK",
				message: "No active task to complete. Use begin_task to start one.",
				_hint: "Start a new task with begin_task before trying to complete it.",
			}),
			true,
		);
	}

	// Calculate duration
	const durationMs = Date.now() - task.startedAt;
	const duration = formatDuration(durationMs);

	// Calculate summary
	const filesChanged = state.changesSinceTaskStart.length;
	const linesChanged = state.changesSinceTaskStart.reduce((sum, c) => sum + c.linesChanged, 0);

	// Create final snapshot if requested
	let finalSnapshot: CompleteTaskOutput["finalSnapshot"];

	if (createSnapshot && filesChanged > 0) {
		const filePaths = state.changesSinceTaskStart.map((c) => c.file);
		const snapshotService = createSnapshotService(workspaceRoot);
		const snapshotResult = await snapshotService.createFromFiles(filePaths, {
			description: `Task complete: ${task.description}`,
			trigger: "ai-detection",
			skipDedup: true, // Always create final snapshot
		});

		if (snapshotResult.success && snapshotResult.snapshot) {
			finalSnapshot = {
				id: snapshotResult.snapshot.id,
				fileCount: snapshotResult.snapshot.fileCount,
			};
			state.stats.snapshotsCreated++;
		}
	}

	// Capture accepted learnings
	let learningsCaptured = 0;

	// Accept pending suggested learnings
	for (const idx of acceptLearnings) {
		if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
			const learning = state.pendingSuggestedLearnings[idx];
			appendLearning(workspaceRoot, learning);
			learningsCaptured++;
		}
	}

	// Add custom learning if provided
	if (customLearning) {
		appendLearning(workspaceRoot, customLearning);
		learningsCaptured++;
	}

	// Update session stats
	state.stats.learningsCaptured += learningsCaptured;

	// End the task
	endTask(workspaceRoot, outcome);

	// Build next actions
	const nextActions: Array<{ tool: string; priority: number; reason: string }> = [];

	if (outcome === "completed") {
		nextActions.push({
			tool: "begin_task",
			priority: 2,
			reason: "Start your next task",
		});
	} else if (outcome === "blocked") {
		nextActions.push({
			tool: "get_learnings",
			priority: 1,
			reason: "Check if similar issues were solved before",
		});
	}

	if (learningsCaptured === 0 && filesChanged > 3) {
		nextActions.push({
			tool: "learn",
			priority: 3,
			reason: "Consider capturing a pattern from this work",
		});
	}

	const output: CompleteTaskOutput = {
		taskId: task.id,
		taskDescription: task.description,
		outcome,
		duration,
		summary: {
			filesChanged,
			linesChanged,
			snapshotsCreated: finalSnapshot ? 1 : 0,
			riskAreasTouched: state.riskAreasTouched,
		},
		learningsCaptured,
		finalSnapshot,
		sessionStats: {
			tasksCompleted: state.stats.tasksCompleted,
			totalSnapshots: state.stats.snapshotsCreated,
			totalLearnings: state.stats.learningsCaptured,
		},
		nextActions,
	};

	// Build completion message
	const emoji = outcome === "completed" ? "✅" : outcome === "blocked" ? "🚧" : "⏹️";
	const hint =
		outcome === "completed"
			? `Task completed in ${duration}! ${filesChanged} file(s), ${linesChanged} line(s) changed.`
			: outcome === "blocked"
				? "Task blocked. Check learnings for similar issues."
				: "Task abandoned.";

	return result(
		JSON.stringify(
			{
				...output,
				message: `${emoji} ${hint}`,
				_hint: notes ? `Notes: ${notes}` : hint,
			},
			null,
			2,
		),
	);
};
