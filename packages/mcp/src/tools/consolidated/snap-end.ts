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
import { createTieredLearningService, HOT_TIER_PROMOTION_THRESHOLD } from "../../services/tiered-learning-service.js";

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
	/**
	 * Agent-reported efficiency metrics
	 * The LLM knows what it did - trust its assessment
	 */
	efficiency?: {
		/** Agent's estimate of tokens saved, e.g. "~12K" or "15000" */
		saved?: string;
		/** What mistakes SnapBack helped prevent, e.g. "2 - wrong layer, missed pattern" */
		prevented?: string;
		/** What loaded context helped most, e.g. "auth patterns, layer constraints" */
		helped?: string;
	};
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
 * Simplified: Trust agent-reported values instead of calculating
 */
interface EfficiencyMetrics {
	/** Agent-reported tokens saved (e.g. "~12K") */
	saved: string;
	/** Agent-reported mistakes prevented (e.g. "2 - wrong layer") */
	prevented: string;
	/** What context helped most */
	helped: string;
	/** New learnings captured this session */
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
// Efficiency Metrics (Agent-Reported)
// =============================================================================

/**
 * Extract efficiency metrics from agent-reported values
 * Trust the LLM - it knows what it did and what helped
 */
function getEfficiencyMetrics(params: SnapEndParams, learningsCount: number): EfficiencyMetrics {
	const eff = params.efficiency || {};
	return {
		saved: eff.saved || "not reported",
		prevented: eff.prevented || "none reported",
		helped: eff.helped || "general context",
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
 * Uses agent-reported values - no magic number calculations
 */
function formatUserStats(metrics: EfficiencyMetrics): string {
	const parts: string[] = [];

	// Token savings (agent-reported)
	if (metrics.saved !== "not reported") {
		parts.push(`💰 ${metrics.saved} tokens saved`);
	}

	// Mistakes prevented (agent-reported)
	if (metrics.prevented !== "none reported") {
		parts.push(`🛡️ ${metrics.prevented}`);
	}

	// What helped
	if (metrics.helped !== "general context") {
		parts.push(`📚 Helped: ${metrics.helped}`);
	}

	// New learnings
	if (metrics.newLearnings > 0) {
		parts.push(`✨ ${metrics.newLearnings} new learnings`);
	}

	return parts.length > 0 ? parts.join(" | ") : "Session completed";
}

/**
 * Format improvements for agent consumption (internal)
 */
function formatImprovements(improvements: ImprovementOpportunity[]): string {
	if (improvements.length === 0) {
		return "";
	}

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

	// P1-3: Track learnings as applied for auto-promotion
	// This enables the 3x → hot tier promotion system
	const learningService = createTieredLearningService(context.workspaceRoot);
	let promotionResult: { promoted: number; totalHot: number } | undefined;

	if (customLearnings.length > 0) {
		// Generate IDs for the learnings we're capturing
		for (const learning of customLearnings) {
			const learningId = `snap-end-${learning.action.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;
			learningService.trackApplied(learningId);
		}

		// Check if we should trigger auto-regeneration
		// (when a learning hits the threshold, regenerate hot tier)
		const stats = learningService.getUsageStats();
		const hasReachedThreshold = Object.values(stats).some(
			(s) => s.appliedCount >= HOT_TIER_PROMOTION_THRESHOLD.minAccessCount,
		);

		if (hasReachedThreshold) {
			try {
				promotionResult = await learningService.regenerateHotTier();
			} catch {
				// Best effort - don't fail snap_end if promotion fails
			}
		}
	}

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

		// Get efficiency metrics from agent-reported values
		const metrics = getEfficiencyMetrics(params, customLearnings.length);

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

		// Add promotion info if any learnings were promoted
		const promotionInfo =
			promotionResult && promotionResult.promoted > 0
				? ` | 🔥 ${promotionResult.promoted} learning(s) promoted to hot tier`
				: "";

		// Add human-readable branded message
		const humanMessage = success
			? messages.session.complete(1, (data.filesModified as number) || 0)
			: messages.error.generic(params.outcome === "blocked" ? "task blocked" : "task incomplete");

		// Combined output: wire format (agent-only) + separator + human-readable content
		const fullResponse = `${wireFormat}${improvementNotes}${INTERNAL_SEPARATOR}${humanMessage}\n${userStats}${promotionInfo}`;

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
	if (!existsSync(sessionPath)) {
		return null;
	}

	try {
		const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8"));
		const goal = sessionData.currentTask?.goal;
		if (!goal) {
			return null;
		}

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
			efficiency: {
				type: "object",
				description: "Your assessment of session efficiency",
				properties: {
					saved: {
						type: "string",
						description: "Tokens saved estimate (e.g. '~15K')",
					},
					prevented: {
						type: "string",
						description: "Mistakes prevented (e.g. '2 - wrong layer')",
					},
					helped: {
						type: "string",
						description: "What context helped most",
					},
				},
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
