/**
 * Composite Tool: begin_task
 *
 * Single entry point that replaces the manual workflow:
 * get_context → snapshot_create → get_learnings → session.start
 *
 * Reduces 5+ tool calls to 1 for starting any development task.
 *
 * @see pair_programmer.md Section 2.1
 * @module facades/begin-task
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ToolHandler, ToolResult } from "../registry.js";
import { createSnapshotService } from "../services/snapshot-service.js";
import {
	drainPendingObservations,
	extractKeywords,
	getSessionState,
	type RiskArea,
	startTask,
} from "../session/state.js";
import { getIntelligence } from "./intelligence.js";

// =============================================================================
// TYPES
// =============================================================================

interface RiskAssessment {
	overallRisk: "low" | "medium" | "high";
	riskAreas: RiskArea[];
	recommendations: string[];
}

interface BeginTaskOutput {
	taskId: string;
	snapshot: {
		created: boolean;
		id?: string;
		reason?: string;
	};
	patterns: Array<{
		name: string;
		description: string;
		examples?: string[];
	}>;
	constraints: Array<{
		domain: string;
		name: string;
		value: number | string;
		description: string;
	}>;
	learnings: Array<{
		type: string;
		trigger: string;
		action: string;
		source?: string;
		relevanceScore: number;
	}>;
	observations: Array<{
		type: string;
		message: string;
	}>;
	riskAssessment: RiskAssessment;
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
 * Assess risk of planned files
 */
function assessRisk(files: string[], _workspaceRoot: string): RiskAssessment {
	const riskAreas: RiskArea[] = [];
	const recommendations: string[] = [];

	for (const file of files) {
		const lowerPath = file.toLowerCase();

		if (lowerPath.includes("auth") || lowerPath.includes("login")) {
			if (!riskAreas.includes("auth")) {
				riskAreas.push("auth");
			}
		}
		if (lowerPath.includes("payment") || lowerPath.includes("stripe")) {
			if (!riskAreas.includes("payment")) {
				riskAreas.push("payment");
			}
		}
		if (lowerPath.includes("database") || lowerPath.includes("migration")) {
			if (!riskAreas.includes("database")) {
				riskAreas.push("database");
			}
		}
		if (lowerPath.includes("config") || lowerPath.includes(".env")) {
			if (!riskAreas.includes("config")) {
				riskAreas.push("config");
			}
		}
		if (lowerPath.includes("api") || lowerPath.includes("route")) {
			if (!riskAreas.includes("api")) {
				riskAreas.push("api");
			}
		}
		if (lowerPath.includes("security") || lowerPath.includes("crypto")) {
			if (!riskAreas.includes("security")) {
				riskAreas.push("security");
			}
		}
	}

	// Determine overall risk
	const criticalAreas: RiskArea[] = ["auth", "payment", "security"];
	const hasCritical = riskAreas.some((a) => criticalAreas.includes(a));
	const overallRisk: "low" | "medium" | "high" = hasCritical
		? "high"
		: riskAreas.length >= 2
			? "medium"
			: riskAreas.length > 0
				? "medium"
				: "low";

	// Build recommendations
	if (riskAreas.includes("auth")) {
		recommendations.push("Test with both valid and invalid credentials");
	}
	if (riskAreas.includes("payment")) {
		recommendations.push("Use test mode/sandbox for payment testing");
	}
	if (riskAreas.includes("database")) {
		recommendations.push("Verify migrations can be rolled back");
	}
	if (riskAreas.includes("config")) {
		recommendations.push("Ensure secrets are not committed");
	}
	if (files.length >= 5) {
		recommendations.push("Consider breaking into smaller focused changes");
	}

	return { overallRisk, riskAreas, recommendations };
}

/**
 * Decide if snapshot should be auto-created
 */
function shouldAutoSnapshot(risk: RiskAssessment, files?: string[]): boolean {
	// Always snapshot for high risk
	if (risk.overallRisk === "high") {
		return true;
	}

	// Snapshot if touching critical areas
	const criticalAreas: RiskArea[] = ["auth", "payment", "database", "security"];
	if (risk.riskAreas.some((a) => criticalAreas.includes(a))) {
		return true;
	}

	// Snapshot if modifying 3+ files
	if (files && files.length >= 3) {
		return true;
	}

	// Medium risk + config files
	if (risk.overallRisk === "medium" && files?.some((f) => f.includes("config") || f.endsWith(".env"))) {
		return true;
	}

	return false;
}

/**
 * Get learnings from JSONL file
 */
function getLearningsFromFile(
	workspaceRoot: string,
	keywords: string[],
): Array<{ type: string; trigger: string; action: string; source?: string; score: number }> {
	const learningsPath = join(workspaceRoot, ".snapback", "learnings", "learnings.jsonl");

	if (!existsSync(learningsPath)) {
		return [];
	}

	try {
		const content = readFileSync(learningsPath, "utf8");
		const lines = content.split("\n").filter(Boolean);
		const learnings: Array<{
			type: string;
			trigger: string;
			action: string;
			source?: string;
		}> = [];

		for (const line of lines) {
			try {
				learnings.push(JSON.parse(line));
			} catch {
				// Skip invalid lines
			}
		}

		// Score learnings by keyword relevance
		const scored = learnings.map((learning) => {
			let score = 0;
			const searchText = `${learning.trigger} ${learning.action}`.toLowerCase();

			for (const keyword of keywords) {
				if (searchText.includes(keyword.toLowerCase())) {
					score += 1;
				}
			}

			return { ...learning, score };
		});

		// Filter and sort by score
		return scored
			.filter((l) => l.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5);
	} catch {
		return [];
	}
}

/**
 * Get context constraints from .snapback/ctx/context.json
 */
function getConstraints(workspaceRoot: string): Array<{
	domain: string;
	name: string;
	value: number | string;
	description: string;
}> {
	const ctxPath = join(workspaceRoot, ".snapback", "ctx", "context.json");

	if (!existsSync(ctxPath)) {
		return [];
	}

	try {
		const content = JSON.parse(readFileSync(ctxPath, "utf8"));
		const constraints: Array<{
			domain: string;
			name: string;
			value: number | string;
			description: string;
		}> = [];

		if (content.constraints) {
			for (const [domain, domainConstraints] of Object.entries(content.constraints)) {
				for (const [name, constraint] of Object.entries(domainConstraints as Record<string, any>)) {
					constraints.push({
						domain,
						name,
						value: constraint.max || constraint.value,
						description: constraint.description || "",
					});
				}
			}
		}

		return constraints;
	} catch {
		return [];
	}
}

/**
 * Generate next actions based on context
 */
function generateNextActions(
	risk: RiskAssessment,
	_learnings: Array<{ type: string }>,
): Array<{ tool: string; priority: number; reason: string }> {
	const actions: Array<{ tool: string; priority: number; reason: string }> = [];

	// Always suggest quick_check after implementation
	actions.push({
		tool: "quick_check",
		priority: 2,
		reason: "Validate changes after implementation",
	});

	// If high risk, suggest frequent validation
	if (risk.overallRisk === "high") {
		actions.push({
			tool: "what_changed",
			priority: 3,
			reason: "Track changes in high-risk area",
		});
	}

	// Before commit
	actions.push({
		tool: "review_work",
		priority: 4,
		reason: "Review before committing",
	});

	return actions;
}

// =============================================================================
// HANDLER
// =============================================================================

/**
 * Helper to create JSON result
 */
function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * begin_task - Start any development task
 *
 * Combines: get_context + snapshot_create + get_learnings + session.start
 */
export const handleBeginTask: ToolHandler = async (args, context): Promise<ToolResult> => {
	const input = args as Record<string, unknown>;
	const task = input.task as string | undefined;
	const files = input.files as string[] | undefined;
	const providedKeywords = input.keywords as string[] | undefined;
	const skipSnapshot = input.skipSnapshot as boolean | undefined;

	if (!task) {
		return result(
			JSON.stringify({
				error: "E102_MISSING_PARAM",
				message: "Required parameter 'task' is missing",
			}),
			true,
		);
	}

	const workspaceRoot = context.workspaceRoot;

	// 1. Extract keywords from task description if not provided
	const keywords = providedKeywords ?? extractKeywords(task);

	// 2. Assess risk of planned files
	const riskAssessment = files
		? assessRisk(files, workspaceRoot)
		: {
				overallRisk: "low" as const,
				riskAreas: [] as RiskArea[],
				recommendations: [],
			};

	// 3. Auto-decide snapshot creation using SnapshotService
	let snapshot: BeginTaskOutput["snapshot"] = { created: false };

	if (!skipSnapshot && shouldAutoSnapshot(riskAssessment, files) && files && files.length > 0) {
		const snapshotService = createSnapshotService(workspaceRoot);
		const snapshotResult = await snapshotService.createFromFiles(files, {
			description: `Pre-task: ${task}`,
			trigger: "ai-detection",
			skipDedup: false,
			dedupWindow: 5,
		});

		if (snapshotResult.success) {
			if (snapshotResult.reused) {
				// Reusing existing snapshot
				snapshot = {
					created: false,
					id: snapshotResult.reusedSnapshotId,
					reason: snapshotResult.reusedReason,
				};
			} else if (snapshotResult.snapshot) {
				// New snapshot created
				snapshot = {
					created: true,
					id: snapshotResult.snapshot.id,
					reason: `Auto-created: ${riskAssessment.overallRisk} risk task touching ${riskAssessment.riskAreas.join(", ") || "planned files"}`,
				};

				// Update session stats
				const state = getSessionState(workspaceRoot);
				state.stats.snapshotsCreated++;
			}
		} else {
			// Snapshot creation failed
			snapshot = {
				created: false,
				reason: `Snapshot creation failed: ${snapshotResult.error}`,
			};
		}
	}

	// 4. Get relevant learnings
	const learnings = getLearningsFromFile(workspaceRoot, keywords).map((l) => ({
		...l,
		relevanceScore: l.score / keywords.length,
	}));

	// 5. Get patterns from Intelligence (if available)
	let patterns: BeginTaskOutput["patterns"] = [];
	try {
		const intel = getIntelligence(workspaceRoot);
		const contextResult = await intel.getContext({ task, keywords });

		// Extract patterns from context
		if (contextResult.patterns) {
			const patternLines = contextResult.patterns.split("\n").filter(Boolean);
			patterns = patternLines.slice(0, 5).map((line) => ({
				name: line.substring(0, 50),
				description: line,
			}));
		}
	} catch {
		// Intelligence not available - continue without patterns
	}

	// 6. Get constraints
	const constraints = getConstraints(workspaceRoot);

	// 7. Drain pending observations from extension
	const observations = drainPendingObservations(workspaceRoot).map((o) => ({
		type: o.type,
		message: o.message,
	}));

	// 8. Start task tracking
	const currentTask = startTask(workspaceRoot, {
		description: task,
		plannedFiles: files || [],
		snapshotId: snapshot.id,
		keywords,
	});

	// Update risk areas touched
	const state = getSessionState(workspaceRoot);
	state.riskAreasTouched = riskAssessment.riskAreas;

	// 9. Generate next actions
	const nextActions = generateNextActions(riskAssessment, learnings);

	// 10. Build response
	const output: BeginTaskOutput = {
		taskId: currentTask.id,
		snapshot,
		patterns,
		constraints,
		learnings,
		observations,
		riskAssessment,
		nextActions,
	};

	return result(
		JSON.stringify(
			{
				...output,
				message: `Task started: ${task}`,
				_hint: snapshot.created
					? `Safety snapshot created: ${snapshot.id}`
					: learnings.length > 0
						? `${learnings.length} relevant learning(s) found`
						: "Ready to start coding!",
			},
			null,
			2,
		),
	);
};
