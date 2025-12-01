#!/usr/bin/env node
/**
 * Create GitHub issues from TODO/FIXME markers
 *
 * Usage:
 *   node scripts/create-todo-issues.js --dry-run  # Preview issues
 *   node scripts/create-todo-issues.js            # Create issues (requires gh CLI)
 */

import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Configuration
const TODO_PATTERNS = ["TODO", "FIXME", "HACK"];
const INCLUDE_EXTENSIONS = ["*.ts", "*.tsx", "*.js", "*.jsx"];
const SEARCH_DIRS = ["apps/", "packages/"];
const DRY_RUN = process.argv.includes("--dry-run");

// Priority mapping
const PRIORITY_LABELS = {
	CRITICAL: { label: "priority: critical", color: "D93F0B" },
	BLOCKER: { label: "priority: blocker", color: "B60205" },
	HIGH: { label: "priority: high", color: "FBCA04" },
	MEDIUM: { label: "priority: medium", color: "0E8A16" },
	LOW: { label: "priority: low", color: "C5DEF5" },
};

// Type labels
const TYPE_LABELS = {
	TODO: { label: "type: enhancement", color: "A2EEEF" },
	FIXME: { label: "type: bug", color: "D73A4A" },
	HACK: { label: "type: tech-debt", color: "F9D0C4" },
};

async function extractTODOs() {
	const todos = [];

	for (const dir of SEARCH_DIRS) {
		for (const ext of INCLUDE_EXTENSIONS) {
			for (const pattern of TODO_PATTERNS) {
				try {
					const { stdout } = await execAsync(
						`grep -rn "${pattern}" ${dir} --include="${ext}" 2>/dev/null || true`,
					);

					if (stdout) {
						const lines = stdout.trim().split("\n");
						for (const line of lines) {
							const match = line.match(/^(.+?):(\d+):(.+)$/);
							if (match) {
								const [, file, lineNum, content] = match;
								const cleanContent = content.trim();

								// Extract priority if specified
								let priority = "MEDIUM";
								if (cleanContent.includes("CRITICAL") || cleanContent.includes("BLOCKER")) {
									priority = "CRITICAL";
								} else if (cleanContent.includes("HIGH")) {
									priority = "HIGH";
								} else if (cleanContent.includes("LOW")) {
									priority = "LOW";
								}

								// Extract ticket reference if exists
								const ticketMatch = cleanContent.match(/TODO\((.+?)\)|FIXME\((.+?)\)|HACK\((.+?)\)/);
								const ticketRef = ticketMatch
									? ticketMatch[1] || ticketMatch[2] || ticketMatch[3]
									: null;

								todos.push({
									file,
									line: Number.parseInt(lineNum, 10),
									content: cleanContent,
									pattern,
									priority,
									ticketRef,
									package: extractPackageName(file),
								});
							}
						}
					}
				} catch (_error) {
					// Ignore grep errors (no matches)
				}
			}
		}
	}

	return todos;
}

function extractPackageName(filePath) {
	const parts = filePath.split("/");
	if (parts[0] === "apps" || parts[0] === "packages") {
		return parts[1];
	}
	return "root";
}

function groupTodosByContext(todos) {
	const groups = new Map();

	for (const todo of todos) {
		const key = `${todo.package}:${todo.priority}`;
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key).push(todo);
	}

	return Array.from(groups.entries()).map(([key, items]) => {
		const [pkg, priority] = key.split(":");
		return { package: pkg, priority, items };
	});
}

function generateIssueContent(group) {
	const { package: pkg, priority, items } = group;

	// Generate title
	const title = `[${pkg}] Fix ${items.length} ${priority.toLowerCase()} priority TODO${items.length > 1 ? "s" : ""}`;

	// Generate body
	const body = `## Overview

This issue tracks ${items.length} TODO/FIXME marker${items.length > 1 ? "s" : ""} in the \`${pkg}\` package that ${items.length > 1 ? "need" : "needs"} to be addressed.

**Priority**: ${priority}
**Package**: \`${pkg}\`
**Total Items**: ${items.length}

## TODO Items

${items
	.map(
		(item, idx) => `### ${idx + 1}. ${item.pattern} in \`${path.basename(item.file)}\`

**File**: \`${item.file}:${item.line}\`
${item.ticketRef ? `**Reference**: ${item.ticketRef}\n` : ""}
**Description**:
\`\`\`
${item.content}
\`\`\`

**Action Required**: ${getActionRequired(item)}

---
`,
	)
	.join("\n")}

## Acceptance Criteria

- [ ] All ${items.length} TODO/FIXME marker${items.length > 1 ? "s" : ""} addressed
- [ ] Code comments updated or removed
- [ ] Tests added/updated if needed
- [ ] Documentation updated if needed

## Labels

- \`${PRIORITY_LABELS[priority]?.label || "priority: medium"}\`
- \`${TYPE_LABELS[items[0].pattern]?.label || "type: enhancement"}\`
- \`package: ${pkg}\`

## Related

Generated automatically from codebase analysis on ${new Date().toISOString().split("T")[0]}
`;

	return { title, body, labels: generateLabels(group) };
}

function getActionRequired(item) {
	const content = item.content.toLowerCase();

	if (content.includes("implement")) {
		return "Implement the described functionality";
	}
	if (content.includes("fix")) {
		return "Fix the identified issue";
	}
	if (content.includes("remove") || content.includes("hardcoded") || content.includes("password")) {
		return "Remove hardcoded values and implement proper solution";
	}
	if (content.includes("test")) {
		return "Add the missing test coverage";
	}
	if (content.includes("refactor")) {
		return "Refactor the code as described";
	}
	if (content.includes("document")) {
		return "Add missing documentation";
	}
	return "Address the TODO item as described";
}

function generateLabels(group) {
	const labels = [];

	// Priority label
	if (PRIORITY_LABELS[group.priority]) {
		labels.push(PRIORITY_LABELS[group.priority].label);
	}

	// Type label (use first item's pattern)
	if (group.items.length > 0 && TYPE_LABELS[group.items[0].pattern]) {
		labels.push(TYPE_LABELS[group.items[0].pattern].label);
	}

	// Package label
	labels.push(`package: ${group.package}`);

	// Add tech-debt label if relevant
	if (group.items.some((item) => item.pattern === "HACK" || item.content.toLowerCase().includes("tech debt"))) {
		labels.push("tech-debt");
	}

	return labels;
}

async function createGitHubIssues(issues) {
	const results = {
		created: [],
		failed: [],
		skipped: [],
	};

	for (const issue of issues) {
		try {
			if (DRY_RUN) {
				console.log(`\n${"=".repeat(80)}`);
				console.log(`📝 WOULD CREATE: ${issue.title}`);
				console.log(`Labels: ${issue.labels.join(", ")}`);
				console.log(`\n${issue.body.substring(0, 200)}...`);
				results.skipped.push(issue);
			} else {
				// Create issue using gh CLI
				const labelsArg = issue.labels.map((l) => `--label "${l}"`).join(" ");
				const bodyFile = `/tmp/issue-body-${Date.now()}.md`;
				await fs.writeFile(bodyFile, issue.body);

				const { stdout } = await execAsync(
					`gh issue create --title "${issue.title}" --body-file "${bodyFile}" ${labelsArg}`,
				);

				const issueUrl = stdout.trim();
				console.log(`✅ Created: ${issueUrl}`);
				results.created.push({ ...issue, url: issueUrl });

				// Clean up temp file
				await fs.unlink(bodyFile);

				// Rate limiting - wait 1 second between issues
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		} catch (error) {
			console.error(`❌ Failed to create issue: ${issue.title}`);
			console.error(error.message);
			results.failed.push({ ...issue, error: error.message });
		}
	}

	return results;
}

async function main() {
	console.log("🔍 Extracting TODO/FIXME markers...\n");

	const todos = await extractTODOs();
	console.log(`Found ${todos.length} TODO/FIXME markers\n`);

	// Group by package and priority
	const groups = groupTodosByContext(todos);
	console.log(`Grouped into ${groups.length} issue batches\n`);

	// Generate issue content
	const issues = groups.map(generateIssueContent);

	// Filter out low priority or skip if too many
	const filteredIssues = issues
		.filter((issue) => issue.labels.some((l) => l.includes("critical") || l.includes("high")))
		.slice(0, 20); // Limit to 20 issues max

	if (filteredIssues.length === 0) {
		console.log("✅ No critical or high priority TODOs found!");
		console.log("All TODOs are tracked in TODO_REPORT.md");
		return;
	}

	console.log(`\n📋 Will create ${filteredIssues.length} GitHub issues (filtered from ${issues.length} total)\n`);

	if (DRY_RUN) {
		console.log("🏃 DRY RUN MODE - No issues will be created\n");
		console.log("Remove --dry-run flag to actually create issues\n");
	}

	// Create issues
	const results = await createGitHubIssues(filteredIssues);

	// Summary
	console.log(`\n${"=".repeat(80)}`);
	console.log("📊 SUMMARY");
	console.log("=".repeat(80));
	console.log(`Total TODOs found: ${todos.length}`);
	console.log(`Issues created: ${results.created.length}`);
	console.log(`Issues failed: ${results.failed.length}`);
	console.log(`Issues skipped (dry-run): ${results.skipped.length}`);

	if (results.created.length > 0) {
		console.log("\n✅ Created Issues:");
		results.created.forEach((issue) => {
			console.log(`  - ${issue.url}`);
		});
	}

	if (results.failed.length > 0) {
		console.log("\n❌ Failed Issues:");
		results.failed.forEach((issue) => {
			console.log(`  - ${issue.title}: ${issue.error}`);
		});
	}

	console.log("\n💡 Next Steps:");
	console.log("  1. Review created issues on GitHub");
	console.log("  2. Assign issues to team members");
	console.log("  3. Update TODO comments with issue numbers");
	console.log("  4. Plan sprint work based on priorities");
}

main().catch(console.error);
