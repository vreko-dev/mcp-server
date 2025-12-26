/**
 * Composite Tool: review_work
 *
 * Comprehensive pre-commit review that combines:
 * - Pattern checking (7-layer validation)
 * - Change summary
 * - Learning suggestions
 * - Suggested commit message
 *
 * @see pair_programmer.md Section 2.4
 * @module facades/review-work
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { ToolHandler, ToolResult } from "../registry.js";
import {
	formatDuration,
	getBaselineFileSet,
	getCurrentTask,
	getSessionState,
	pushObservation,
} from "../session/state.js";
import { getIntelligence } from "./intelligence.js";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewWorkInput {
	/** Skip pattern validation (default: false) */
	skipPatterns?: boolean;
	/** Include suggested commit message (default: true) */
	includeCommitMessage?: boolean;
	/** Specific files to review (default: all changed files) */
	files?: string[];
}

interface ValidationIssue {
	layer: string;
	severity: "error" | "warning" | "info";
	message: string;
	file?: string;
	line?: number;
}

interface ReviewWorkOutput {
	taskId: string | null;
	taskDescription: string | null;
	duration: string;
	readyToCommit: boolean;
	validation: {
		passed: boolean;
		issues: ValidationIssue[];
		layerSummary: Array<{
			layer: string;
			passed: boolean;
			issueCount: number;
		}>;
	};
	changes: {
		fileCount: number;
		linesAdded: number;
		linesRemoved: number;
		files: Array<{
			file: string;
			status: "A" | "M" | "D";
			linesChanged: number;
		}>;
	};
	suggestedCommitMessage?: string;
	suggestedLearnings: Array<{
		type: "pattern" | "pitfall" | "efficiency";
		trigger: string;
		action: string;
	}>;
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
 * Get git diff stats with timeout and task-scoped filtering
 * @param workspaceRoot - Workspace root directory
 * @param baselineFiles - Files that existed before task started (to exclude)
 * @returns Object with files, linesAdded, linesRemoved
 */
function getGitDiffStats(
	workspaceRoot: string,
	baselineFiles?: Set<string>,
): {
	files: Array<{ file: string; status: "A" | "M" | "D"; linesChanged: number }>;
	linesAdded: number;
	linesRemoved: number;
} {
	const files: Array<{ file: string; status: "A" | "M" | "D"; linesChanged: number }> = [];
	let linesAdded = 0;
	let linesRemoved = 0;

	try {
		// Get numstat for line counts with timeout
		const numstat = execSync("git diff --numstat HEAD", {
			cwd: workspaceRoot,
			encoding: "utf8",
			timeout: 5000, // 5s timeout to prevent blocking
		});

		for (const line of numstat.split("\n")) {
			if (!line.trim()) continue;
			const [added, removed, file] = line.split("\t");
			if (file) {
				// Skip files that were in baseline (modified before task started)
				if (baselineFiles?.has(file)) {
					continue;
				}

				const a = added === "-" ? 0 : Number.parseInt(added, 10);
				const r = removed === "-" ? 0 : Number.parseInt(removed, 10);
				linesAdded += a;
				linesRemoved += r;
				files.push({
					file,
					status: "M",
					linesChanged: a + r,
				});
			}
		}

		// Get status for new/deleted files with timeout
		const status = execSync("git status --porcelain", {
			cwd: workspaceRoot,
			encoding: "utf8",
			timeout: 5000, // 5s timeout to prevent blocking
		});

		for (const line of status.split("\n")) {
			if (!line.trim()) continue;
			const statusCode = line.substring(0, 2);
			const file = line.substring(3).trim();

			// Skip files that were in baseline (modified before task started)
			if (baselineFiles?.has(file)) {
				continue;
			}

			const existing = files.find((f) => f.file === file);
			if (existing) {
				if (statusCode.includes("A") || statusCode === "??") {
					existing.status = "A";
				} else if (statusCode.includes("D")) {
					existing.status = "D";
				}
			} else if (statusCode === "??" || statusCode.includes("A")) {
				// New untracked file
				files.push({ file, status: "A", linesChanged: 0 });
			}
		}
	} catch {
		// Git not available, timeout, or not a git repo
	}

	return { files, linesAdded, linesRemoved };
}

/**
 * Generate commit message from changes
 */
function generateCommitMessage(
	taskDescription: string | null,
	files: Array<{ file: string; status: "A" | "M" | "D" }>,
): string {
	// Determine type from files
	let type = "chore";
	const lowerDesc = (taskDescription || "").toLowerCase();

	if (lowerDesc.includes("fix") || lowerDesc.includes("bug")) {
		type = "fix";
	} else if (lowerDesc.includes("add") || lowerDesc.includes("implement") || lowerDesc.includes("feature")) {
		type = "feat";
	} else if (lowerDesc.includes("test")) {
		type = "test";
	} else if (lowerDesc.includes("refactor")) {
		type = "refactor";
	} else if (lowerDesc.includes("doc")) {
		type = "docs";
	}

	// Determine scope from files
	let scope = "";
	const scopes = new Set<string>();

	for (const { file } of files) {
		const parts = file.split("/");
		if (parts.length >= 2) {
			// apps/vscode -> vscode, packages/mcp -> mcp
			if (parts[0] === "apps" || parts[0] === "packages") {
				scopes.add(parts[1]);
			}
		}
	}

	if (scopes.size === 1) {
		scope = Array.from(scopes)[0];
	} else if (scopes.size > 1) {
		scope = "multiple";
	}

	// Build message
	const subject = taskDescription
		? taskDescription.replace(/^(add|fix|implement|update|refactor)\s+/i, "").trim()
		: `update ${files.length} file(s)`;

	const scopePart = scope ? `(${scope})` : "";
	return `${type}${scopePart}: ${subject}`;
}

/**
 * Suggest learnings from the work done
 */
function suggestLearnings(
	files: Array<{ file: string; status: string }>,
	issues: ValidationIssue[],
): Array<{ type: "pattern" | "pitfall" | "efficiency"; trigger: string; action: string }> {
	const suggestions: Array<{ type: "pattern" | "pitfall" | "efficiency"; trigger: string; action: string }> = [];

	// If there were validation issues, suggest a pitfall
	const errorCount = issues.filter((i) => i.severity === "error").length;
	if (errorCount > 0) {
		suggestions.push({
			type: "pitfall",
			trigger: `Working on ${files.map((f) => basename(f.file)).join(", ")}`,
			action: `Check for ${issues[0]?.layer || "validation"} issues before committing`,
		});
	}

	// If working with many files, suggest breaking down
	if (files.length > 5) {
		suggestions.push({
			type: "efficiency",
			trigger: "Large multi-file change",
			action: "Consider breaking into smaller, focused commits",
		});
	}

	// If touching test files, suggest pattern
	const hasTests = files.some((f) => f.file.includes(".test.") || f.file.includes(".spec."));
	if (hasTests) {
		suggestions.push({
			type: "pattern",
			trigger: "Adding/modifying tests",
			action: "Run tests locally before pushing to CI",
		});
	}

	return suggestions.slice(0, 3); // Max 3 suggestions
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
 * review_work - Comprehensive pre-commit review
 */
export const handleReviewWork: ToolHandler = async (args, context): Promise<ToolResult> => {
	const { skipPatterns = false, includeCommitMessage = true, files: filterFiles } = args as ReviewWorkInput;

	const workspaceRoot = context.workspaceRoot;
	const state = getSessionState(workspaceRoot);
	const task = getCurrentTask(workspaceRoot);

	// Get baseline files (files that were modified BEFORE task started)
	// This enables task-scoped filtering to only show changes made during this task
	const baselineFiles = getBaselineFileSet(workspaceRoot);

	// Get change stats with task-scoped filtering
	let { files, linesAdded, linesRemoved } = getGitDiffStats(workspaceRoot, baselineFiles);

	// Filter files if specified
	if (filterFiles && filterFiles.length > 0) {
		files = files.filter((f) => filterFiles.some((filter) => f.file.includes(filter) || filter.includes(f.file)));
	}

	// Run validation if not skipped
	const issues: ValidationIssue[] = [];
	const layerSummary: Array<{ layer: string; passed: boolean; issueCount: number }> = [];
	let validationPassed = true;

	if (!skipPatterns && files.length > 0) {
		try {
			const intel = getIntelligence(workspaceRoot);

			// Validate each file
			for (const { file, status } of files.slice(0, 10)) {
				// Limit to 10 files
				if (status === "D") continue; // Skip deleted files

				const fullPath = join(workspaceRoot, file);
				if (!existsSync(fullPath)) continue;

				try {
					const code = readFileSync(fullPath, "utf8");
					const result = await intel.checkPatterns(code, file);

					if (!result.overall.passed) {
						validationPassed = false;
					}

					for (const layer of result.layers) {
						// Aggregate by layer
						const existing = layerSummary.find((l) => l.layer === layer.layer);
						if (existing) {
							existing.issueCount += layer.issues.length;
							if (!layer.passed) existing.passed = false;
						} else {
							layerSummary.push({
								layer: layer.layer,
								passed: layer.passed,
								issueCount: layer.issues.length,
							});
						}

						// Add individual issues
						for (const issue of layer.issues) {
							const issueMessage =
								typeof issue === "string"
									? issue
									: (issue as { message?: string }).message || String(issue);
							issues.push({
								layer: layer.layer,
								severity: "error",
								message: issueMessage,
								file,
							});
						}
					}
				} catch {
					// Individual file validation failed
				}
			}
		} catch {
			// Intelligence not available
			layerSummary.push({
				layer: "validation",
				passed: true,
				issueCount: 0,
			});
		}
	}

	// Generate commit message
	let suggestedCommitMessage: string | undefined;
	if (includeCommitMessage) {
		suggestedCommitMessage = generateCommitMessage(task?.description ?? null, files);
	}

	// Suggest learnings
	const suggestedLearnings = suggestLearnings(files, issues);

	// Save suggested learnings to session for later acceptance
	if (suggestedLearnings.length > 0) {
		state.pendingSuggestedLearnings = suggestedLearnings;
	}

	// Determine if ready to commit
	const readyToCommit = validationPassed && files.length > 0;

	// Build next actions
	const nextActions: Array<{ tool: string; priority: number; reason: string }> = [];

	if (!validationPassed) {
		nextActions.push({
			tool: "validate",
			priority: 1,
			reason: "Fix validation issues before committing",
		});
	}

	if (readyToCommit) {
		nextActions.push({
			tool: "complete_task",
			priority: 1,
			reason: "Finalize task and optionally capture learnings",
		});
	}

	if (suggestedLearnings.length > 0) {
		nextActions.push({
			tool: "learn",
			priority: 3,
			reason: `${suggestedLearnings.length} learning(s) suggested from this work`,
		});
	}

	// Push observation about review completion
	pushObservation(workspaceRoot, {
		type: readyToCommit ? "progress" : "warning",
		message: readyToCommit
			? `Review complete: ${files.length} file(s) ready to commit`
			: `Review found ${issues.length} issue(s) to address`,
		timestamp: Date.now(),
	});

	// Calculate duration
	const duration = task ? formatDuration(Date.now() - task.startedAt) : "No active task";

	const output: ReviewWorkOutput = {
		taskId: task?.id ?? null,
		taskDescription: task?.description ?? null,
		duration,
		readyToCommit,
		validation: {
			passed: validationPassed,
			issues: issues.slice(0, 20), // Limit issues
			layerSummary,
		},
		changes: {
			fileCount: files.length,
			linesAdded,
			linesRemoved,
			files: files.slice(0, 20), // Limit files
		},
		suggestedCommitMessage,
		suggestedLearnings,
		nextActions,
	};

	return result(
		JSON.stringify(
			{
				...output,
				_hint: readyToCommit
					? `Ready to commit! Suggested: ${suggestedCommitMessage}`
					: `${issues.length} issue(s) found. Fix them before committing.`,
			},
			null,
			2,
		),
	);
};
