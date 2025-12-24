/**
 * Generic Suggestions Rule
 *
 * Provides general best-practice suggestions based on session context.
 * Always applies - serves as baseline guidance.
 */

import type { AdvisoryRule, ProactiveSuggestion } from "../../types/advisory.js";

/**
 * Session activity threshold for complexity warning
 */
const HIGH_TOOL_CALL_THRESHOLD = 20;

/**
 * File type detection helpers
 */
const isTestFile = (file: string): boolean => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);
const isCodeFile = (file: string): boolean => /\.(ts|tsx|js|jsx)$/.test(file);

export const GenericSuggestionsRule: AdvisoryRule = {
	id: "generic-suggestions",
	priority: 10, // Low priority (runs last)
	trigger: () => true, // Always applies
	generate: (ctx) => {
		const suggestions: ProactiveSuggestion[] = [];

		// Snapshot suggestion for medium+ risk
		if (ctx.session.riskLevel === "medium" || ctx.session.riskLevel === "high") {
			suggestions.push({
				text: "Create snapshot before continuing",
				priority: 1,
				confidence: 0.8,
				category: "checkpoint",
				files: ctx.files,
			});
		}

		// Testing suggestion for code changes
		if (ctx.files.some((f) => isCodeFile(f) && !isTestFile(f))) {
			suggestions.push({
				text: "Run tests before committing",
				priority: 2,
				confidence: 0.9,
				category: "testing",
			});
		}

		// Validation suggestion for high tool call count
		if (ctx.session.toolCallCount > HIGH_TOOL_CALL_THRESHOLD) {
			suggestions.push({
				text: "Review changes - high tool call count may indicate complexity",
				priority: 3,
				confidence: 0.7,
				category: "validation",
			});
		}

		return { suggestions };
	},
};
