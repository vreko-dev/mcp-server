/**
 * Violation History Rule
 *
 * Surfaces past violations for files being modified.
 * Helps prevent repeating past mistakes.
 */

import type { AdvisoryRule, AdvisoryWarning } from "../../types/advisory.js";

export const ViolationHistoryRule: AdvisoryRule = {
	id: "violation-history-warning",
	priority: 3,
	trigger: (ctx) => {
		return ctx.recentViolations.length > 0;
	},
	generate: (ctx) => {
		const warnings: AdvisoryWarning[] = [];

		// Group violations by file
		const violationsByFile = new Map<string, string[]>();
		for (const violation of ctx.recentViolations) {
			const existing = violationsByFile.get(violation.file) ?? [];
			existing.push(violation.type);
			violationsByFile.set(violation.file, existing);
		}

		// Generate warnings
		for (const [file, types] of violationsByFile.entries()) {
			const uniqueTypes = [...new Set(types)];
			warnings.push({
				level: "warning",
				code: "VIOLATION_HISTORY",
				message: `${uniqueTypes.length} past violation type${uniqueTypes.length > 1 ? "s" : ""}: ${uniqueTypes.join(", ")}`,
				file,
				suggestion: "Review past mistakes before modifying",
			});
		}

		return { warnings };
	},
};
