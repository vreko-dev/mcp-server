/**
 * Composite Tool: what_changed
 *
 * Tracks changes since task start, provides file diffs,
 * and surfaces AI attribution from the extension.
 *
 * @see pair_programmer.md Section 2.3
 * @module facades/what-changed
 */

import { execSync } from "node:child_process";
import { relative } from "node:path";
import type { ToolHandler, ToolResult } from "../registry.js";
import { formatDuration, getBaselineFileSet, getCurrentTask } from "../session/state.js";
import { getIntelligence } from "./intelligence.js";

// =============================================================================
// TYPES
// =============================================================================

interface WhatChangedInput {
	/** Include full diffs (default: summary only) */
	includeDiff?: boolean;
	/** Only show changes to these files */
	filterFiles?: string[];
	/** Include AI attribution info (default: true) */
	includeAIAttribution?: boolean;
}

interface ChangeSummary {
	file: string;
	type: "created" | "modified" | "deleted";
	linesChanged: number;
	aiAttributed: boolean;
	timestamp: number;
}

interface WhatChangedOutput {
	taskId: string | null;
	taskDescription: string | null;
	duration: string;
	changes: ChangeSummary[];
	stats: {
		totalFiles: number;
		totalLines: number;
		aiAttributedFiles: number;
		aiAttributedLines: number;
	};
	diffs?: Array<{
		file: string;
		diff: string;
	}>;
	riskAssessment: {
		level: "low" | "medium" | "high";
		factors: string[];
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
 * Get git diff for a file
 * @param file - File path relative to workspace
 * @param workspaceRoot - Workspace root directory
 * @returns Diff string or null if unavailable/timeout
 */
function getFileDiff(file: string, workspaceRoot: string): string | null {
	try {
		const result = execSync(`git diff --no-color -- "${file}"`, {
			cwd: workspaceRoot,
			encoding: "utf8",
			maxBuffer: 1024 * 1024, // 1MB
			timeout: 5000, // 5s timeout to prevent blocking
		});
		return result.trim() || null;
	} catch {
		// Git not available, timeout, or file not found
		return null;
	}
}

/**
 * Get git status for staged/unstaged changes
 * @param workspaceRoot - Workspace root directory
 * @returns Map of file paths to change status
 */
function getGitChanges(workspaceRoot: string): Map<string, "A" | "M" | "D"> {
	const changes = new Map<string, "A" | "M" | "D">();

	try {
		// Get both staged and unstaged with timeout
		const result = execSync("git status --porcelain", {
			cwd: workspaceRoot,
			encoding: "utf8",
			timeout: 5000, // 5s timeout to prevent blocking
		});

		for (const line of result.split("\n")) {
			if (!line.trim()) {
				continue;
			}

			const status = line.substring(0, 2);
			const file = line.substring(3).trim();

			if (status.includes("A") || status === "??") {
				changes.set(file, "A");
			} else if (status.includes("D")) {
				changes.set(file, "D");
			} else if (status.includes("M") || status.includes("U")) {
				changes.set(file, "M");
			}
		}
	} catch {
		// Git not available, timeout, or not a git repo
	}

	return changes;
}

/**
 * Count lines changed in a diff
 */
function countLinesChanged(diff: string): number {
	let count = 0;
	for (const line of diff.split("\n")) {
		if (line.startsWith("+") && !line.startsWith("+++")) {
			count++;
		} else if (line.startsWith("-") && !line.startsWith("---")) {
			count++;
		}
	}
	return count;
}

/**
 * Assess risk based on changes
 */
function assessChangeRisk(changes: ChangeSummary[]): { level: "low" | "medium" | "high"; factors: string[] } {
	const factors: string[] = [];

	// Check for critical files
	const criticalPatterns = ["auth", "payment", "security", "config", "migration", "env"];
	for (const change of changes) {
		const lowerFile = change.file.toLowerCase();
		for (const pattern of criticalPatterns) {
			if (lowerFile.includes(pattern)) {
				factors.push(`Critical file modified: ${change.file}`);
				break;
			}
		}
	}

	// Check AI attribution ratio
	const aiFiles = changes.filter((c) => c.aiAttributed).length;
	const aiRatio = changes.length > 0 ? aiFiles / changes.length : 0;
	if (aiRatio > 0.7 && changes.length >= 3) {
		factors.push(`High AI-attribution ratio: ${Math.round(aiRatio * 100)}% of changes`);
	}

	// Check total lines
	const totalLines = changes.reduce((sum, c) => sum + c.linesChanged, 0);
	if (totalLines > 500) {
		factors.push(`Large change set: ${totalLines} lines`);
	}

	// Determine level
	let level: "low" | "medium" | "high" = "low";
	if (factors.length >= 3) {
		level = "high";
	} else if (factors.length >= 1) {
		level = "medium";
	}

	return { level, factors };
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
 * what_changed - Track changes since task start
 *
 * IMPORTANT: Only shows changes made AFTER the current task started.
 * Uses git baseline captured at task start to filter out pre-existing changes.
 */
export const handleWhatChanged: ToolHandler = async (args, context): Promise<ToolResult> => {
	const { includeDiff = false, filterFiles, includeAIAttribution = true } = args as WhatChangedInput;

	const workspaceRoot = context.workspaceRoot;
	const task = getCurrentTask(workspaceRoot);

	// If no active task, return clear message instead of random git changes
	if (!task) {
		return result(
			JSON.stringify(
				{
					taskId: null,
					taskDescription: null,
					duration: "No active task",
					changes: [],
					stats: {
						totalFiles: 0,
						totalLines: 0,
						aiAttributedFiles: 0,
						aiAttributedLines: 0,
					},
					riskAssessment: { level: "low", factors: [] },
					nextActions: [
						{
							tool: "begin_task",
							priority: 1,
							reason: "Start a task to begin tracking changes",
						},
					],
					_hint: "No active task. Use begin_task to start tracking changes.",
				},
				null,
				2,
			),
		);
	}

	// Get baseline file set (files that were modified BEFORE task started)
	const baselineFiles = getBaselineFileSet(workspaceRoot);

	// Get changes from Intelligence's shared session (cross-surface: Extension, MCP, CLI)
	// This replaces the MCP-only state.changesSinceTaskStart
	const intel = getIntelligence(workspaceRoot);
	const intelligenceChanges = intel.getFileModifications(task.id, task.startedAt);
	const gitChanges = getGitChanges(workspaceRoot);

	// Merge Intelligence and git changes
	const changeMap = new Map<string, ChangeSummary>();

	// Add Intelligence-tracked changes (shared across all surfaces)
	for (const change of intelligenceChanges) {
		const relativePath = change.path.startsWith(workspaceRoot) ? relative(workspaceRoot, change.path) : change.path;
		changeMap.set(relativePath, {
			file: relativePath,
			type: change.type === "create" ? "created" : change.type === "delete" ? "deleted" : "modified",
			linesChanged: change.linesChanged,
			aiAttributed: change.aiAttributed,
			timestamp: change.timestamp,
		});
	}

	// Add git changes ONLY if not in baseline (i.e., changed AFTER task started)
	for (const [file, status] of gitChanges) {
		// Skip files that were already modified before task started
		if (baselineFiles.has(file) && !changeMap.has(file)) {
			continue; // This file was modified before the task, skip it
		}

		if (!changeMap.has(file)) {
			const type: "created" | "modified" | "deleted" =
				status === "A" ? "created" : status === "D" ? "deleted" : "modified";

			let linesChanged = 0;
			if (type !== "deleted") {
				const diff = getFileDiff(file, workspaceRoot);
				if (diff) {
					linesChanged = countLinesChanged(diff);
				}
			}

			changeMap.set(file, {
				file,
				type,
				linesChanged,
				aiAttributed: false, // Unknown without extension data
				timestamp: Date.now(),
			});
		}
	}

	// Convert to array and filter
	let changes = Array.from(changeMap.values());

	if (filterFiles && filterFiles.length > 0) {
		changes = changes.filter((c) => filterFiles.some((f) => c.file.includes(f) || f.includes(c.file)));
	}

	// Sort by timestamp (most recent first)
	changes.sort((a, b) => b.timestamp - a.timestamp);

	// Calculate stats
	const totalFiles = changes.length;
	const totalLines = changes.reduce((sum, c) => sum + c.linesChanged, 0);
	const aiAttributedFiles = changes.filter((c) => c.aiAttributed).length;
	const aiAttributedLines = changes.filter((c) => c.aiAttributed).reduce((sum, c) => sum + c.linesChanged, 0);

	// Get diffs if requested
	let diffs: Array<{ file: string; diff: string }> | undefined;
	if (includeDiff) {
		diffs = [];
		for (const change of changes.slice(0, 10)) {
			// Limit to 10 files
			if (change.type !== "deleted") {
				const diff = getFileDiff(change.file, workspaceRoot);
				if (diff) {
					diffs.push({
						file: change.file,
						diff: diff.length > 2000 ? `${diff.slice(0, 2000)}\n...(truncated)` : diff,
					});
				}
			}
		}
	}

	// Assess risk
	const riskAssessment = assessChangeRisk(changes);

	// Build next actions
	const nextActions: Array<{ tool: string; priority: number; reason: string }> = [];

	if (totalLines > 0) {
		nextActions.push({
			tool: "quick_check",
			priority: 1,
			reason: "Validate changes before proceeding",
		});
	}

	if (riskAssessment.level === "high") {
		nextActions.push({
			tool: "snapshot_create",
			priority: 1,
			reason: "Create safety snapshot for high-risk changes",
		});
	}

	if (changes.length > 0) {
		nextActions.push({
			tool: "review_work",
			priority: 2,
			reason: "Review changes before committing",
		});
	}

	// Calculate duration
	const duration = task ? formatDuration(Date.now() - task.startedAt) : "No active task";

	const output: WhatChangedOutput = {
		taskId: task?.id ?? null,
		taskDescription: task?.description ?? null,
		duration,
		changes: includeAIAttribution ? changes : changes.map((c) => ({ ...c, aiAttributed: false })),
		stats: {
			totalFiles,
			totalLines,
			aiAttributedFiles: includeAIAttribution ? aiAttributedFiles : 0,
			aiAttributedLines: includeAIAttribution ? aiAttributedLines : 0,
		},
		diffs,
		riskAssessment,
		nextActions,
	};

	return result(
		JSON.stringify(
			{
				...output,
				_hint:
					totalFiles === 0
						? "No changes detected yet. Start making modifications!"
						: riskAssessment.level === "high"
							? "High-risk changes detected. Consider creating a snapshot."
							: `${totalFiles} file(s) changed, ${totalLines} line(s) modified`,
			},
			null,
			2,
		),
	);
};
