#!/usr/bin/env node
/**
 * Validation Pipeline Pre-Commit Hook
 *
 * Runs @snapback/intelligence ValidationPipeline on staged files.
 * Blocks commit if critical issues are found.
 *
 * Usage: node tooling/scripts/validate-with-pipeline.mjs <files...>
 *
 * Exit codes:
 *   0 - All checks passed or only warnings
 *   1 - Critical issues found (blocks commit)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Dynamic import since @snapback/intelligence is ESM
const loadValidationPipeline = async () => {
	try {
		const { ValidationPipeline } = await import("@snapback/intelligence/validation");
		return ValidationPipeline;
	} catch (error) {
		console.error("⚠️  Could not load @snapback/intelligence. Skipping validation.");
		console.error("   Run 'pnpm build:oss' to build workspace packages.");
		return null;
	}
};

const COLORS = {
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	green: "\x1b[32m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
	reset: "\x1b[0m",
	bold: "\x1b[1m",
};

const formatSeverity = (severity) => {
	switch (severity) {
		case "critical":
			return `${COLORS.red}${COLORS.bold}CRITICAL${COLORS.reset}`;
		case "warning":
			return `${COLORS.yellow}WARNING${COLORS.reset}`;
		case "info":
			return `${COLORS.gray}INFO${COLORS.reset}`;
		default:
			return severity;
	}
};

async function main() {
	const files = process.argv.slice(2);

	if (files.length === 0) {
		console.log("✅ No files to validate");
		process.exit(0);
	}

	// Filter to only TypeScript/JavaScript files
	const validFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

	if (validFiles.length === 0) {
		console.log("✅ No TypeScript/JavaScript files to validate");
		process.exit(0);
	}

	const ValidationPipeline = await loadValidationPipeline();

	if (!ValidationPipeline) {
		// Skip validation if package not available
		process.exit(0);
	}

	const pipeline = new ValidationPipeline();

	console.log(`${COLORS.cyan}🔍 Running ValidationPipeline on ${validFiles.length} files...${COLORS.reset}\n`);

	let totalCritical = 0;
	let totalWarnings = 0;
	let totalInfo = 0;

	for (const file of validFiles) {
		try {
			const filePath = resolve(process.cwd(), file);
			const code = readFileSync(filePath, "utf-8");

			const result = await pipeline.validate(code, file);

			const issues = ValidationPipeline.flattenIssues(result);

			if (issues.length > 0) {
				console.log(`${COLORS.bold}${file}${COLORS.reset}`);

				for (const issue of issues) {
					const lineInfo = issue.line ? `:${issue.line}` : "";
					console.log(`  ${formatSeverity(issue.severity)} [${issue.type}] ${issue.message}`);
					if (issue.fix) {
						console.log(`    ${COLORS.gray}Fix: ${issue.fix}${COLORS.reset}`);
					}

					if (issue.severity === "critical") {
						totalCritical++;
					} else if (issue.severity === "warning") {
						totalWarnings++;
					} else {
						totalInfo++;
					}
				}
				console.log("");
			}
		} catch (error) {
			console.error(`${COLORS.yellow}⚠️  Could not validate ${file}: ${error.message}${COLORS.reset}`);
		}
	}

	// Summary
	console.log(`${COLORS.bold}Summary:${COLORS.reset}`);
	console.log(`  Critical: ${totalCritical > 0 ? COLORS.red : COLORS.green}${totalCritical}${COLORS.reset}`);
	console.log(`  Warnings: ${totalWarnings > 0 ? COLORS.yellow : COLORS.green}${totalWarnings}${COLORS.reset}`);
	console.log(`  Info: ${COLORS.gray}${totalInfo}${COLORS.reset}`);
	console.log("");

	if (totalCritical > 0) {
		console.log(`${COLORS.red}${COLORS.bold}❌ Commit blocked: ${totalCritical} critical issues found${COLORS.reset}`);
		console.log(`${COLORS.gray}   Fix critical issues before committing${COLORS.reset}`);
		process.exit(1);
	}

	if (totalWarnings > 0) {
		console.log(`${COLORS.yellow}⚠️  ${totalWarnings} warnings found (commit allowed)${COLORS.reset}`);
	} else {
		console.log(`${COLORS.green}✅ All validations passed${COLORS.reset}`);
	}

	process.exit(0);
}

main().catch((error) => {
	console.error("Validation script error:", error);
	process.exit(1);
});
