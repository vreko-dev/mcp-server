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
import type { PerceivedHelp } from "@snapback/contracts";
import { endTaskViaDaemon } from "../daemon/client-facade.js";
import type { ToolHandler, ToolResult } from "../registry.js";
import { createSnapshotService } from "../services/snapshot-service.js";
import { endTask, formatDuration, getCurrentTask, getSessionState, type TaskIntent } from "../session/state.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Behavior change tracking for accountability
 * Tracks whether user would have behaved differently without SnapBack
 */
interface AccountabilityBehavior {
	/** Would the user have behaved differently without SnapBack watching? */
	behaved_differently: boolean;
	/** How did they behave differently? e.g., "Fixed skipped tests instead of leaving them" */
	how?: string;
	/** What triggered the behavior change? e.g., "begin_task showed 2 skipped tests" */
	triggered_by?: string;
	/** Effort change compared to without SnapBack */
	effort_change?: "more" | "same" | "less";
}

/**
 * Reflection input for accountability tracking
 * Extended with behavior tracking per Session Feedback spec
 */
interface ReflectionInput {
	/** User's perception of how much SnapBack helped */
	perceived_help: PerceivedHelp;
	/** Accountability behavior tracking */
	accountability?: AccountabilityBehavior;
}

/**
 * Behavior change type classification
 */
type BehaviorChangeType =
	| "worked_harder"
	| "fixed_vs_skipped"
	| "tested_more"
	| "documented_more"
	| "safer_approach"
	| "other";

/**
 * SnapBack feature that triggered accountability
 */
type SnapBackFeature =
	| "begin_task_context"
	| "learn_system"
	| "checkpoint_visibility"
	| "review_work"
	| "complete_task_reflection"
	| "general_awareness";

/**
 * Accountability effect output matching the schema from @snapback/contracts
 * Extended with behavior tracking per Session Feedback spec
 */
interface AccountabilityEffectOutput {
	/** Session identifier */
	session_id: string;
	/** Session duration in milliseconds */
	session_duration_ms: number;
	/** User's perception of how much SnapBack helped */
	perceived_help: "significantly" | "somewhat" | "not_really" | "blocked";
	/** Actual changes made during the session */
	actual_changes: {
		files_modified: number;
		lines_added: number;
		lines_removed: number;
		snapshots_used: number;
	};
	/** Issues prevented by SnapBack */
	prevented_issues: {
		rollbacks_avoided: number;
		pattern_violations_caught: number;
		skipped_tests_flagged: number;
	};
	/** User's subscription tier */
	tier: string;
	/** Accountability behavior tracking (new in Session Feedback spec) */
	accountability_behavior?: {
		/** Did user behave differently because of SnapBack? */
		would_have_behaved_differently: boolean;
		/** Type of behavior change */
		behavior_change_type?: BehaviorChangeType;
		/** What triggered the accountability */
		what_triggered_accountability?: string;
		/** Effort change */
		effort_delta?: "significantly_more" | "somewhat_more" | "same" | "less";
		/** Which SnapBack feature was responsible */
		snapback_feature_responsible?: SnapBackFeature;
		/** Did the outcome improve because of accountability? */
		outcome_improved?: boolean;
	};
}

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
	/** Reflection for accountability tracking */
	reflection?: ReflectionInput;
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
	/** Accountability effect when reflection is provided */
	accountability_effect?: AccountabilityEffectOutput;
	/** Warnings about issues that occurred during completion */
	_warnings?: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Result of attempting to append a learning
 */
interface AppendLearningResult {
	success: boolean;
	error?: string;
}

/**
 * Append learning to JSONL file
 * Returns success/error instead of silently swallowing errors
 */
function appendLearning(
	workspaceRoot: string,
	learning: { type: string; trigger: string; action: string; source?: string },
): AppendLearningResult {
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
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown write error",
		};
	}
}

/**
 * Infer behavior change type from description
 */
function inferBehaviorType(how: string): BehaviorChangeType {
	const lowered = how.toLowerCase();
	if (lowered.includes("fix") && lowered.includes("skip")) return "fixed_vs_skipped";
	if (lowered.includes("test")) return "tested_more";
	if (lowered.includes("doc") || lowered.includes("comment")) return "documented_more";
	if (lowered.includes("safe") || lowered.includes("careful")) return "safer_approach";
	if (lowered.includes("thorough") || lowered.includes("harder")) return "worked_harder";
	return "other";
}

/**
 * Map effort change to output format
 */
function mapEffortDelta(change?: "more" | "same" | "less"): "significantly_more" | "somewhat_more" | "same" | "less" {
	switch (change) {
		case "more":
			return "somewhat_more";
		case "less":
			return "less";
		default:
			return "same";
	}
}

/**
 * Infer which SnapBack feature triggered accountability
 */
function inferFeature(trigger?: string): SnapBackFeature {
	if (!trigger) return "general_awareness";
	const lowered = trigger.toLowerCase();
	if (lowered.includes("begin_task")) return "begin_task_context";
	if (lowered.includes("learn")) return "learn_system";
	if (lowered.includes("checkpoint") || lowered.includes("snapshot")) return "checkpoint_visibility";
	if (lowered.includes("review")) return "review_work";
	if (lowered.includes("complete")) return "complete_task_reflection";
	return "general_awareness";
}

/**
 * Build accountability effect from reflection and session data
 * Extended with behavior tracking per Session Feedback spec
 */
function buildAccountabilityEffect(
	reflection: ReflectionInput,
	taskId: string,
	durationMs: number,
	filesChanged: number,
	linesChanged: number,
	snapshotsCreated: number,
	tier: string,
	outcome: "completed" | "abandoned" | "blocked",
): AccountabilityEffectOutput {
	// Validate perceived_help is a valid value
	const validValues = ["significantly", "somewhat", "not_really", "blocked"] as const;
	const perceived_help = validValues.includes(reflection.perceived_help as unknown as (typeof validValues)[number])
		? reflection.perceived_help
		: "somewhat"; // Fallback for invalid values

	// Build base accountability output
	const result: AccountabilityEffectOutput = {
		session_id: taskId,
		session_duration_ms: durationMs,
		perceived_help,
		actual_changes: {
			files_modified: filesChanged,
			lines_added: Math.max(0, Math.floor(linesChanged * 0.7)), // Estimate: 70% adds
			lines_removed: Math.max(0, Math.floor(linesChanged * 0.3)), // Estimate: 30% removes
			snapshots_used: snapshotsCreated,
		},
		prevented_issues: {
			// These would ideally come from session tracking
			// For now, we provide reasonable defaults based on session activity
			rollbacks_avoided: snapshotsCreated > 0 ? 1 : 0,
			pattern_violations_caught: 0, // Would need check_patterns tracking
			skipped_tests_flagged: 0, // Would need staticAnalysis tracking
		},
		tier,
	};

	// Add accountability behavior tracking if provided
	if (reflection.accountability !== undefined) {
		if (reflection.accountability.behaved_differently) {
			result.accountability_behavior = {
				would_have_behaved_differently: true,
				behavior_change_type: reflection.accountability.how
					? inferBehaviorType(reflection.accountability.how)
					: "other",
				what_triggered_accountability: reflection.accountability.triggered_by,
				effort_delta: mapEffortDelta(reflection.accountability.effort_change),
				snapback_feature_responsible: inferFeature(reflection.accountability.triggered_by),
				outcome_improved: outcome === "completed",
			};
		} else {
			// Track when user explicitly says they didn't behave differently
			result.accountability_behavior = {
				would_have_behaved_differently: false,
			};
		}
	}

	return result;
}

// =============================================================================
// INTENT-AWARE COMPLETION
// =============================================================================

/**
 * Intent-specific completion hints
 * Provides tailored feedback based on what the user was trying to accomplish
 */
const INTENT_COMPLETION_HINTS: Record<TaskIntent, { completed: string; abandoned: string; blocked: string }> = {
	implement: {
		completed: "Feature implemented. Consider running tests to verify.",
		abandoned: "Implementation paused. Snapshot preserved for resumption.",
		blocked: "Blocked on implementation. Check learnings for similar issues.",
	},
	debug: {
		completed: "Bug fixed! Consider recording the fix as a learning.",
		abandoned: "Debug session paused. Current state preserved.",
		blocked: "Still debugging. Try get_learnings for similar issues.",
	},
	refactor: {
		completed: "Refactoring complete. Run tests to ensure no regressions.",
		abandoned: "Refactor paused. Partial changes preserved in snapshot.",
		blocked: "Blocked on refactor. Consider smaller incremental changes.",
	},
	review: {
		completed: "Review complete. Consider recording any patterns discovered.",
		abandoned: "Review paused. Notes preserved.",
		blocked: "Review blocked. May need additional context or access.",
	},
	explore: {
		completed: "Exploration complete. Consider recording discoveries as learnings.",
		abandoned: "Exploration paused. Findings preserved.",
		blocked: "Exploration blocked. Try a different approach.",
	},
};

/**
 * Get intent-specific completion hint
 */
function getIntentHint(
	intent: TaskIntent | undefined,
	outcome: "completed" | "abandoned" | "blocked",
): string | undefined {
	if (!intent) return undefined;
	return INTENT_COMPLETION_HINTS[intent]?.[outcome];
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
 *
 * DAEMON-FIRST ARCHITECTURE:
 * 1. Try to end task via daemon for cross-surface coordination
 * 2. If daemon unavailable, use local state
 */
export const handleCompleteTask: ToolHandler = async (args, context): Promise<ToolResult> => {
	const {
		outcome = "completed",
		createSnapshot = outcome === "completed",
		acceptLearnings = [],
		customLearning,
		notes,
		reflection,
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

	// =========================================================================
	// DAEMON-FIRST: Try ending task via daemon
	// =========================================================================
	const daemonResult = await endTaskViaDaemon(workspaceRoot, outcome);

	if (daemonResult) {
		// Daemon handled the task end - it has the authoritative state
		// We still need to end local state and handle learning capture

		// Track warnings for user visibility
		const warnings: string[] = [];

		// Check for unvalidated files (pre-completion validation warning)
		const modifiedFiles = state.changesSinceTaskStart.map((c) => c.file);
		const validatedFiles = state.validatedFiles || [];
		const unvalidatedFiles = modifiedFiles.filter((f) => !validatedFiles.includes(f));
		if (unvalidatedFiles.length > 0) {
			warnings.push(
				`${unvalidatedFiles.length} file(s) modified but not validated. Consider running check_patterns before committing.`,
			);
		}

		// Capture accepted learnings locally with error tracking
		let learningsCaptured = 0;
		const failedLearnings: string[] = [];
		for (const idx of acceptLearnings) {
			if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
				const learning = state.pendingSuggestedLearnings[idx];
				const result = appendLearning(workspaceRoot, learning);
				if (result.success) {
					learningsCaptured++;
				} else {
					failedLearnings.push(`Learning ${idx}: ${result.error}`);
				}
			}
		}

		if (customLearning) {
			const result = appendLearning(workspaceRoot, customLearning);
			if (result.success) {
				learningsCaptured++;
			} else {
				failedLearnings.push(`Custom learning: ${result.error}`);
			}
		}

		if (failedLearnings.length > 0) {
			warnings.push(`Failed to save ${failedLearnings.length} learning(s): ${failedLearnings.join("; ")}`);
		}

		state.stats.learningsCaptured += learningsCaptured;

		// End local task tracking
		endTask(workspaceRoot, outcome);

		// Build next actions
		const nextActions: Array<{ tool: string; priority: number; reason: string }> = [];
		if (outcome === "completed") {
			nextActions.push({ tool: "begin_task", priority: 2, reason: "Start your next task" });
		} else if (outcome === "blocked") {
			nextActions.push({
				tool: "get_learnings",
				priority: 1,
				reason: "Check if similar issues were solved before",
			});
		}
		if (learningsCaptured === 0 && daemonResult.summary.filesModified > 3) {
			nextActions.push({ tool: "learn", priority: 3, reason: "Consider capturing a pattern from this work" });
		}

		// Build accountability effect if reflection provided (daemon path)
		let accountability_effect: AccountabilityEffectOutput | undefined;
		if (reflection?.perceived_help) {
			accountability_effect = buildAccountabilityEffect(
				reflection,
				task.id,
				daemonResult.summary.duration,
				daemonResult.summary.filesModified,
				daemonResult.summary.linesChanged,
				daemonResult.snapshot.created ? 1 : 0,
				context.tier || "free",
				outcome,
			);
		}

		const output: CompleteTaskOutput = {
			taskId: task.id,
			taskDescription: task.description,
			outcome,
			duration: formatDuration(daemonResult.summary.duration),
			summary: {
				filesChanged: daemonResult.summary.filesModified,
				linesChanged: daemonResult.summary.linesChanged,
				snapshotsCreated: daemonResult.snapshot.created ? 1 : 0,
				riskAreasTouched: state.riskAreasTouched,
			},
			learningsCaptured: learningsCaptured + daemonResult.learningsAccepted,
			finalSnapshot: daemonResult.snapshot.created
				? { id: "daemon-snapshot", fileCount: daemonResult.summary.filesModified }
				: undefined,
			sessionStats: {
				tasksCompleted: state.stats.tasksCompleted,
				totalSnapshots: state.stats.snapshotsCreated,
				totalLearnings: state.stats.learningsCaptured,
			},
			nextActions,
			accountability_effect,
			_warnings: warnings.length > 0 ? warnings : undefined,
		};

		const emoji = outcome === "completed" ? "✅" : outcome === "blocked" ? "🚧" : "⏹️";
		const intentHint = getIntentHint(task.intent, outcome);
		const baseHint =
			outcome === "completed"
				? `Task completed in ${formatDuration(daemonResult.summary.duration)}! ${daemonResult.summary.filesModified} file(s), ${daemonResult.summary.linesChanged} line(s) changed.`
				: outcome === "blocked"
					? "Task blocked. Check learnings for similar issues."
					: "Task abandoned.";
		const hint = intentHint ? `${baseHint} ${intentHint}` : baseHint;

		return result(
			JSON.stringify(
				{
					...output,
					message: `${emoji} ${hint}`,
					_hint: notes ? `Notes: ${notes}` : hint,
					_intentHint: intentHint,
					_source: "daemon",
				},
				null,
				2,
			),
		);
	}

	// =========================================================================
	// FALLBACK: Daemon unavailable, use local state
	// =========================================================================

	// Track warnings for user visibility
	const fallbackWarnings: string[] = [];

	// Calculate duration
	const durationMs = Date.now() - task.startedAt;
	const duration = formatDuration(durationMs);

	// Calculate summary
	const filesChanged = state.changesSinceTaskStart.length;
	const linesChanged = state.changesSinceTaskStart.reduce((sum, c) => sum + c.linesChanged, 0);

	// Check for unvalidated files (pre-completion validation warning)
	const modifiedFilePaths = state.changesSinceTaskStart.map((c) => c.file);
	const validatedFilePaths = state.validatedFiles || [];
	const unvalidatedFilePaths = modifiedFilePaths.filter((f) => !validatedFilePaths.includes(f));
	if (unvalidatedFilePaths.length > 0) {
		fallbackWarnings.push(
			`${unvalidatedFilePaths.length} file(s) modified but not validated. Consider running check_patterns before committing.`,
		);
	}

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

	// Capture accepted learnings with error tracking
	let learningsCaptured = 0;
	const failedLearningWrites: string[] = [];

	// Accept pending suggested learnings
	for (const idx of acceptLearnings) {
		if (idx >= 0 && idx < state.pendingSuggestedLearnings.length) {
			const learning = state.pendingSuggestedLearnings[idx];
			const writeResult = appendLearning(workspaceRoot, learning);
			if (writeResult.success) {
				learningsCaptured++;
			} else {
				failedLearningWrites.push(`Learning ${idx}: ${writeResult.error}`);
			}
		}
	}

	// Add custom learning if provided
	if (customLearning) {
		const writeResult = appendLearning(workspaceRoot, customLearning);
		if (writeResult.success) {
			learningsCaptured++;
		} else {
			failedLearningWrites.push(`Custom learning: ${writeResult.error}`);
		}
	}

	if (failedLearningWrites.length > 0) {
		fallbackWarnings.push(
			`Failed to save ${failedLearningWrites.length} learning(s): ${failedLearningWrites.join("; ")}`,
		);
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

	// Build accountability effect if reflection provided
	let accountability_effect: AccountabilityEffectOutput | undefined;
	if (reflection?.perceived_help) {
		accountability_effect = buildAccountabilityEffect(
			reflection,
			task.id,
			durationMs,
			filesChanged,
			linesChanged,
			finalSnapshot ? 1 : 0,
			context.tier || "free",
			outcome,
		);
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
		accountability_effect,
		_warnings: fallbackWarnings.length > 0 ? fallbackWarnings : undefined,
	};

	// Build completion message
	const emoji = outcome === "completed" ? "✅" : outcome === "blocked" ? "🚧" : "⏹️";
	const intentHint = getIntentHint(task.intent, outcome);
	const baseHint =
		outcome === "completed"
			? `Task completed in ${duration}! ${filesChanged} file(s), ${linesChanged} line(s) changed.`
			: outcome === "blocked"
				? "Task blocked. Check learnings for similar issues."
				: "Task abandoned.";
	const hint = intentHint ? `${baseHint} ${intentHint}` : baseHint;

	return result(
		JSON.stringify(
			{
				...output,
				message: `${emoji} ${hint}`,
				_hint: notes ? `Notes: ${notes}` : hint,
				_intentHint: intentHint,
			},
			null,
			2,
		),
	);
};
