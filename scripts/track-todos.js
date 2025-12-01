#!/usr/bin/env node

/**
 * Script to track and manage TODO comments in the codebase
 *
 * This script finds all TODO, FIXME, and XXX comments in the project
 * and generates a report to help prioritize and manage technical debt.
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

console.log("🔍 Searching for TODO comments in the codebase...\n");

try {
	// Find all TODO, FIXME, and XXX comments
	const grepOutput = execSync(
		'grep -r -n "TODO\\|FIXME\\|XXX" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist',
		{
			cwd: join(process.cwd(), "apps", "web"),
			encoding: "utf8",
			stdio: "pipe",
		},
	);

	const lines = grepOutput.split("\n").filter((line) => line.trim() !== "");

	// Parse the results
	const todos = [];
	const fixmes = [];
	const xxxs = [];

	for (const line of lines) {
		if (line.includes(":")) {
			const [file, lineNumber, content] = line.split(":", 3);
			const todo = {
				file: file.replace("./", ""),
				lineNumber: Number.parseInt(lineNumber, 10),
				content: content.trim(),
			};

			if (todo.content.includes("TODO")) {
				todos.push(todo);
			} else if (todo.content.includes("FIXME")) {
				fixmes.push(todo);
			} else if (todo.content.includes("XXX")) {
				xxxs.push(todo);
			}
		}
	}

	// Generate report
	const report = `
# TODO/FIXME/XXX Tracking Report

## TODO Comments (${todos.length})
${todos.map((todo) => `- ${todo.file}:${todo.lineNumber} - ${todo.content}`).join("\n") || "None found"}

## FIXME Comments (${fixmes.length})
${fixmes.map((fixme) => `- ${fixme.file}:${fixme.lineNumber} - ${fixme.content}`).join("\n") || "None found"}

## XXX Comments (${xxxs.length})
${xxxs.map((xxx) => `- ${xxx.file}:${xxx.lineNumber} - ${xxx.content}`).join("\n") || "None found"}

## Summary
- Total TODOs: ${todos.length}
- Total FIXMEs: ${fixmes.length}
- Total XXXs: ${xxxs.length}
- Total Issues: ${todos.length + fixmes.length + xxxs.length}

## Recommendations

1. Prioritize FIXME comments as they indicate known issues that need fixing
2. Review XXX comments as they may indicate critical problems
3. Plan implementation for TODO comments in upcoming sprints
4. Consider assigning owners to each issue for accountability
5. Set up automated tracking to monitor technical debt growth

## Next Steps

1. Review each TODO/FIXME/XXX and:
   - Convert to GitHub issues for better tracking
   - Assign priority levels (High/Medium/Low)
   - Assign owners for resolution
   - Set target completion dates

2. Establish team conventions for:
   - Using TODO comments effectively
   - Regular review of technical debt
   - Preventing accumulation of unresolved issues
`;

	// Write report to file
	const reportPath = join(process.cwd(), "TODO_TRACKING_REPORT.md");
	writeFileSync(reportPath, report);
	console.log("✅ TODO tracking complete!");
	console.log(`📝 Detailed report saved to: ${reportPath}`);
	console.log("\n📊 SUMMARY:");
	console.log(`  TODO Comments: ${todos.length}`);
	console.log(`  FIXME Comments: ${fixmes.length}`);
	console.log(`  XXX Comments: ${xxxs.length}`);
	console.log(`  Total Issues: ${todos.length + fixmes.length + xxxs.length}`);
} catch (error) {
	console.error("❌ Error searching for TODO comments:", error.message);
}
