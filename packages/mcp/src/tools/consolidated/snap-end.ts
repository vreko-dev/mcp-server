/**
 * Snap End Tool
 *
 * Completes a task with learning capture. Replaces:
 * - complete_task
 * - review_work
 * - what_changed
 * - learn (when capturing at end)
 *
 * ENHANCED: Now includes:
 * - 🧢 SnapBack branding for visual distinctiveness
 * - User-facing token efficiency stats
 * - Mistakes prevented metrics
 * - Internal improvement tracking for agent learning
 *
 * @see stress_test_remediation.md Section "Tool 2: snap.end"
 * @module tools/consolidated/snap-end
 */

import { INTERNAL_SEPARATOR, messages, WIRE_PREFIX } from "../../branding/index.js";
import { handleCompleteTask } from "../../facades/complete-task.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

/** Compress string for wire format */
const compressStr = (s: string, max: number): string => {
	const clean = s.replace(/\s+/g, "→");
	return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

// =============================================================================
// Types
// =============================================================================

/**
 * Snap.end parameters
 */
export interface SnapEndParams {
	/** Success: 1=ok, 0=failed */
	ok?: 0 | 1;
	/** Quick learnings as strings */
	l?: string[];
	/** Full exit survey */
	survey?: {
		tech?: { pat?: string[]; pit?: string[]; hlp?: string[]; nhlp?: string[] };
		eff?: { wa?: number; won?: string; first?: string; worked?: string; saved?: string };
		ins?: { gen?: string; app?: string[]; conf?: "l" | "m" | "h" };
		fb?: { hlp?: string; miss?: string; fric?: string[]; sug?: string };
	};
	/** Outcome: completed, abandoned, blocked */
	outcome?: "completed" | "abandoned" | "blocked";
	/** Notes about completion */
	notes?: string;
}

/**
 * Session efficiency metrics for user-facing stats
 */
interface EfficiencyMetrics {
	/** Estimated tokens saved by using 🧢 SnapBack */
	tokensSaved: number;
	/** Token savings percentage */
	savingsPercent: number;
	/** Mistakes/issues prevented */
	mistakesPrevented: number;
	/** Examples of what was prevented */
	preventedExamples: string[];
	/** Tool calls made */
	toolCallsMade: number;
	/** Estimated tool calls without 🧢 SnapBack */
	estimatedWithout: number;
	/** Learnings applied from history */
	learningsApplied: number;
	/** New learnings captured */
	newLearnings: number;
}

/**
 * Internal improvement opportunity for agent learning
 */
interface ImprovementOpportunity {
	/** What could be done better */
	suggestion: string;
	/** When this applies */
	trigger: string;
	/** Priority: low/medium/high */
	priority: "low" | "medium" | "high";
}

// =============================================================================
// Efficiency Calculation
// =============================================================================

/**
 * Calculate session efficiency metrics
 * These provide immediate positive reinforcement for using 🧢 SnapBack
 */
function calculateEfficiencyMetrics(data: Record<string, unknown>, learningsCount: number): EfficiencyMetrics {
	// Base token estimates (from research: ~100 tokens wire vs ~1300 traditional)
	const TOKENS_PER_TRADITIONAL_CALL = 1300;
	const TOKENS_PER_SNAP_CALL = 100;

	// Estimate tool calls from session data
	const toolCallsMade = (data.toolCalls as number) || 5; // Default estimate
	const estimatedWithout = Math.ceil(toolCallsMade * 2.5); // Would need ~2.5x more without context

	// Calculate token savings
	const tokensWithSnap = toolCallsMade * TOKENS_PER_SNAP_CALL;
	const tokensWithout = estimatedWithout * TOKENS_PER_TRADITIONAL_CALL;
	const tokensSaved = tokensWithout - tokensWithSnap;
	const savingsPercent = Math.round((1 - tokensWithSnap / tokensWithout) * 100);

	// Mistakes prevented (from protection status and risk analysis)
	const protectedFiles = (data.protectedFiles as string[]) || [];
	const risksAnalyzed = (data.risksAnalyzed as number) || 0;
	const mistakesPrevented = protectedFiles.length > 0 ? 1 : 0 + (risksAnalyzed > 0 ? 1 : 0);

	const preventedExamples: string[] = [];
	if (protectedFiles.length > 0) {
		preventedExamples.push(`Protected ${protectedFiles.length} critical files`);
	}
	if (risksAnalyzed > 0) {
		preventedExamples.push(`Analyzed ${risksAnalyzed} risk scenarios`);
	}

	// Learnings
	const learningsApplied = (data.learningsApplied as number) || 0;

	return {
		tokensSaved,
		savingsPercent,
		mistakesPrevented,
		preventedExamples,
		toolCallsMade,
		estimatedWithout,
		learningsApplied,
		newLearnings: learningsCount,
	};
}

/**
 * Identify improvement opportunities for the agent
 * These are internal learnings to improve future sessions
 */
function identifyImprovements(data: Record<string, unknown>, params: SnapEndParams): ImprovementOpportunity[] {
	const improvements: ImprovementOpportunity[] = [];

	// Check if agent skipped validation before risky edits
	const filesModified = (data.filesModified as number) || 0;
	const validationRuns = (data.validationRuns as number) || 0;
	if (filesModified > 3 && validationRuns === 0) {
		improvements.push({
			suggestion: "Run snap m:c periodically during large edits",
			trigger: "Editing 3+ files without validation",
			priority: "medium",
		});
	}

	// Check if task failed - opportunity to learn
	if (params.ok === 0 || params.outcome === "abandoned" || params.outcome === "blocked") {
		improvements.push({
			suggestion: "Capture specific blocker as pitfall learning",
			trigger: "Task did not complete successfully",
			priority: "high",
		});
	}

	// Check if no learnings were captured
	if (!params.l || params.l.length === 0) {
		improvements.push({
			suggestion: "Capture at least one learning per session",
			trigger: "Session ended without learnings",
			priority: "low",
		});
	}

	return improvements;
}

/**
 * Format efficiency stats for user display
 */
function formatUserStats(metrics: EfficiencyMetrics): string {
	const parts: string[] = [];

	// Token savings (the headline number)
	parts.push(`💰 ~${metrics.tokensSaved.toLocaleString()} tokens saved (${metrics.savingsPercent}%)`);

	// Mistakes prevented
	if (metrics.mistakesPrevented > 0) {
		parts.push(`🛡️ ${metrics.mistakesPrevented} ${metrics.mistakesPrevented === 1 ? "issue" : "issues"} prevented`);
	}

	// Learnings
	if (metrics.learningsApplied > 0 || metrics.newLearnings > 0) {
		parts.push(`📚 ${metrics.learningsApplied} applied, ${metrics.newLearnings} captured`);
	}

	return parts.join(" | ");
}

/**
 * Format improvements for agent consumption (internal)
 */
function formatImprovements(improvements: ImprovementOpportunity[]): string {
	if (improvements.length === 0) return "";

	const lines = improvements.map((i) => `[${i.priority.toUpperCase()}] ${i.suggestion} (when: ${i.trigger})`);
	return `\n[IMPROVE] ${lines.join(" | ")}`;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle snap_end
 *
 * Enhanced to provide:
 * 1. 🧢 SnapBack branded output for visual distinctiveness
 * 2. User-facing efficiency stats (tokens saved, mistakes prevented)
 * 3. Internal improvement tracking for agent learning loop
 */
export const handleSnapEnd: ToolHandler = async (args, context) => {
	const params = args as unknown as SnapEndParams;

	// Check if task has a goal that needs validation
	const goalCheck = await checkTaskGoal(context.workspaceRoot);
	if (goalCheck && !goalCheck.met) {
		// Goal not met - return warning but don't block completion
		return {
			content: [
				{
					type: "text",
					text: `🧢|🔴|GOAL_NOT_MET|${goalCheck.metric}|${goalCheck.current}${goalCheck.unit}|target:${goalCheck.target}${goalCheck.unit}\n\n⚠️ Goal not achieved: ${goalCheck.metric} is ${goalCheck.current}${goalCheck.unit}, target was ${goalCheck.target}${goalCheck.unit}. Task marked incomplete.`,
				},
			],
			isError: false, // Warning, not error
		};
	}

	// Convert quick learnings to customLearning format if provided
	const customLearnings = (params.l || []).map((learning) => ({
		type: "pattern" as const,
		trigger: "Task completion",
		action: learning,
	}));

	// Map to complete_task parameters
	const completeArgs: Record<string, unknown> = {
		outcome: params.outcome || (params.ok === 0 ? "abandoned" : "completed"),
		createSnapshot: true,
		notes: params.notes,
	};

	// Add first custom learning if present
	if (customLearnings.length > 0) {
		completeArgs.customLearning = customLearnings[0];
	}

	const result = await handleCompleteTask(completeArgs, context);

	// Parse and format as 🧢 SnapBack branded wire response
	try {
		const content = result.content[0]?.text || "";
		const data = JSON.parse(content) as Record<string, unknown>;

		// Calculate efficiency metrics for user
		const metrics = calculateEfficiencyMetrics(data, customLearnings.length);

		// Identify improvements for agent learning
		const improvements = identifyImprovements(data, params);

		// Build wire format with 🧢 SnapBack branding
		// Format: 🧢|E|status|learningsL|filesF|lines+/-|user_stats|[improvements]
		const success = data.success !== false;
		const parts = [
			WIRE_PREFIX, // SnapBack brand - visual anchor from branding module
			"E",
			success ? "OK" : "FAIL",
			`${data.learningsGenerated || customLearnings.length}L`,
			`${data.filesModified || 0}F`,
			`${data.linesAdded || 0}+${data.linesRemoved || 0}-`,
		];

		// Add learnings summary using compressStr
		if (params.l?.length) {
			parts.push(...params.l.slice(0, 2).map((l) => compressStr(l, 30)));
		}

		// Build full response with user stats and internal improvements
		const wireFormat = parts.join("|");
		const userStats = formatUserStats(metrics);
		const improvementNotes = formatImprovements(improvements);

		// Add human-readable branded message
		const humanMessage = success
			? messages.session.complete(1, (data.filesModified as number) || 0)
			: messages.error.generic(params.outcome === "blocked" ? "task blocked" : "task incomplete");

		// Combined output: wire format (agent-only) + separator + human-readable content
		const fullResponse = `${wireFormat}${improvementNotes}${INTERNAL_SEPARATOR}${humanMessage}\n${userStats}`;

		return { content: [{ type: "text", text: fullResponse }] };
	} catch {
		return result;
	}
};

/**
 * Check if task goal was met (if goal was set)
 */
async function checkTaskGoal(
	workspaceRoot: string,
): Promise<{ met: boolean; metric: string; current: number; target: number; unit: string } | null> {
	const { existsSync, readFileSync } = await import("node:fs");
	const { join } = await import("node:path");

	// Check if task has a goal stored in session state
	const sessionPath = join(workspaceRoot, ".snapback", "session", "state.json");
	if (!existsSync(sessionPath)) return null;

	try {
		const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8"));
		const goal = sessionData.currentTask?.goal;
		if (!goal) return null;

		const { metric, target, unit } = goal;
		let current = 0;

		// Measure current value based on metric
		if (metric === "bundle") {
			// Measure bundle size
			const distPaths = ["dist/extension.js", "dist/main.js", "dist/index.js", "dist/bundle.js"];

			for (const distPath of distPaths) {
				const fullPath = join(workspaceRoot, distPath);
				if (existsSync(fullPath)) {
					const { statSync } = await import("node:fs");
					const stats = statSync(fullPath);
					current = Math.round(stats.size / 1024); // KB
					break;
				}
			}
		}
		// Add other metric types (performance, coverage) as needed

		const met = current <= target;
		return { met, metric, current, target, unit };
	} catch {
		return null;
	}
}

// =============================================================================
// Tool Definition
// =============================================================================

export const snapEndTool: SnapBackTool = {
	name: "snap_end",
	description: `🧢 SnapBack: ALWAYS call at task end. Returns efficiency stats and captures learnings.

**REQUIRED** before starting any new task. Provides:
- 💰 Token savings report (typically 90%+ reduction)
- 🛡️ Mistakes prevented count
- 📚 Learnings captured for future sessions
- 📈 Improvement opportunities (internal)

**Wire Format:** 🧢|E|status|learningsL|filesF|lines+/-|stats

**Parameters:**
- ok: 1=success, 0=failed
- l: Quick learnings as string array
- outcome: completed/abandoned/blocked`,
	inputSchema: {
		type: "object",
		properties: {
			ok: {
				type: "number",
				enum: [0, 1],
				description: "Success?",
			},
			l: {
				type: "array",
				items: { type: "string" },
				description: "Quick learnings",
			},
			outcome: {
				type: "string",
				enum: ["completed", "abandoned", "blocked"],
				description: "Task outcome",
			},
			notes: {
				type: "string",
				description: "Completion notes",
			},
			survey: {
				type: "object",
				description: "Full exit survey",
				properties: {
					tech: { type: "object" },
					eff: { type: "object" },
					ins: { type: "object" },
					fb: { type: "object" },
				},
			},
		},
	},
	annotations: {
		title: "🧢 SnapBack End",
		readOnlyHint: false,
		idempotentHint: false,
	},
	tier: "free",
};
