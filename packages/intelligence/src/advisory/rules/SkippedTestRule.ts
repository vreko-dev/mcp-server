/**
 * Skipped Test Rule
 *
 * Advisory rule that detects skipped tests (describe.skip, it.skip, test.skip)
 * and generates proactive suggestions for AI agents.
 *
 * This enables the "proactive pattern suggestions" feature from the
 * Session Feedback Implementation spec.
 *
 * @module advisory/rules/SkippedTestRule
 */

import { detectSkippedTests, type SkippedTestResult } from "@snapback/core/analysis";
import type { AdvisoryRule, ProactiveSuggestion } from "../../types/advisory.js";

/**
 * Check if a file is a test file
 */
function isTestFile(filePath: string): boolean {
	return filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__");
}

/**
 * SkippedTestRule - Detects skipped tests and generates suggestions
 *
 * Triggers when any test file is in the target files list.
 * Generates suggestions based on skipped test count:
 * - 1-2 skipped: priority 3 (low)
 * - 3-5 skipped: priority 2 (medium)
 * - 6+ skipped: priority 1 (high)
 */
export const SkippedTestRule: AdvisoryRule = {
	id: "skipped-vitest-tests",
	priority: 2,

	/**
	 * Trigger when any test file is in the target files
	 */
	trigger: (ctx) => {
		return ctx.files.some(isTestFile);
	},

	/**
	 * Generate suggestions based on skipped tests detected
	 */
	generate: (ctx) => {
		const suggestions: ProactiveSuggestion[] = [];
		const allSkipped: SkippedTestResult[] = [];
		const filesWithSkipped: string[] = [];

		// Analyze each test file
		for (const file of ctx.files) {
			if (!isTestFile(file)) {
				continue;
			}

			try {
				// Get code content - may come from context or need to be read
				// For now, we use detectSkippedTests which requires code content
				// The actual code reading happens in the facade that calls this rule
				const code = (ctx as { code?: string }).code;
				if (!code) {
					// No code available, skip this file
					continue;
				}

				const result = detectSkippedTests(code, file);
				if (result.parsed && result.skipped.length > 0) {
					allSkipped.push(result);
					filesWithSkipped.push(file);
				}
			} catch {}
		}

		// Calculate total skipped tests
		const totalSkipped = allSkipped.reduce((sum, r) => sum + r.skipped.length, 0);

		if (totalSkipped === 0) {
			return { suggestions: [] };
		}

		// Determine priority based on count
		let priority: number;
		if (totalSkipped >= 6) {
			priority = 1; // High priority
		} else if (totalSkipped >= 3) {
			priority = 2; // Medium priority
		} else {
			priority = 3; // Low priority
		}

		// Generate suggestion
		const filesList =
			filesWithSkipped.length <= 3 ? filesWithSkipped.join(", ") : `${filesWithSkipped.length} files`;

		suggestions.push({
			text: `Found ${totalSkipped} skipped test${totalSkipped > 1 ? "s" : ""} in ${filesList}. Consider re-enabling these tests or removing if obsolete.`,
			priority,
			confidence: 0.9,
			category: "testing",
			files: filesWithSkipped,
		});

		return { suggestions };
	},
};
