/**
 * Console Log in Production Rule
 *
 * Advisory rule that detects console.log/debug/info statements in production code
 * and generates suggestions to use structured logging instead.
 *
 * Part of Session Feedback Implementation spec - pattern detection.
 *
 * @module advisory/rules/ConsoleLogRule
 */

import type { AdvisoryRule, ProactiveSuggestion } from "../../types/advisory.js";

/**
 * Check if a file is a test file (excluded from this rule)
 */
function isTestFile(filePath: string): boolean {
	return (
		filePath.includes(".test.") ||
		filePath.includes(".spec.") ||
		filePath.includes("__tests__") ||
		filePath.includes("__mocks__")
	);
}

/**
 * Check if a file is a configuration or build file (excluded)
 */
function isConfigFile(filePath: string): boolean {
	return (
		filePath.includes("config") ||
		filePath.includes("vite.") ||
		filePath.includes("vitest.") ||
		filePath.includes("eslint") ||
		filePath.includes("biome")
	);
}

/**
 * Detect console statements in code
 */
function detectConsoleStatements(
	code: string,
	_filePath: string,
): Array<{ type: string; line: number; context: string }> {
	const results: Array<{ type: string; line: number; context: string }> = [];
	const lines = code.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Match console.log, console.debug, console.info (but not console.error/warn which may be intentional)
		const match = line.match(/console\.(log|debug|info)\s*\(/);
		if (match) {
			// Skip if it's in a comment
			const trimmed = line.trim();
			if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
				continue;
			}
			results.push({
				type: match[1],
				line: i + 1,
				context: line.trim().slice(0, 80),
			});
		}
	}

	return results;
}

/**
 * ConsoleLogRule - Detects console.log in production code
 *
 * Triggers when any non-test TypeScript/JavaScript file is analyzed.
 * Generates suggestions to use structured logging instead.
 */
export const ConsoleLogRule: AdvisoryRule = {
	id: "console-log-in-production",
	priority: 3,

	/**
	 * Trigger for non-test source files
	 */
	trigger: (ctx) => {
		return ctx.files.some((f) => {
			const isSource = f.match(/\.(ts|tsx|js|jsx)$/);
			return isSource && !isTestFile(f) && !isConfigFile(f);
		});
	},

	/**
	 * Generate suggestions for console statement cleanup
	 */
	generate: (ctx) => {
		const suggestions: ProactiveSuggestion[] = [];
		const allDetected: Array<{ file: string; type: string; line: number }> = [];

		for (const file of ctx.files) {
			if (isTestFile(file) || isConfigFile(file)) {
				continue;
			}

			const code = (ctx as { code?: string }).code;
			if (!code) {
				continue;
			}

			try {
				const detected = detectConsoleStatements(code, file);
				for (const d of detected) {
					allDetected.push({ file, type: d.type, line: d.line });
				}
			} catch {}
		}

		if (allDetected.length === 0) {
			return { suggestions: [] };
		}

		// Group by file
		const fileCount = new Set(allDetected.map((d) => d.file)).size;
		const totalCount = allDetected.length;

		suggestions.push({
			text: `Found ${totalCount} console.${allDetected[0].type}() statement${totalCount > 1 ? "s" : ""} in ${fileCount} file${fileCount > 1 ? "s" : ""}. Consider using structured logging for production code.`,
			priority: totalCount >= 5 ? 2 : 3,
			confidence: 0.8,
			category: "validation",
			files: [...new Set(allDetected.map((d) => d.file))],
		});

		return { suggestions };
	},
};
