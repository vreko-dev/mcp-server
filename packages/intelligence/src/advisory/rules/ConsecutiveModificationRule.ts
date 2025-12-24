/**
 * Consecutive Modification Rule
 *
 * Triggers warnings when files are modified repeatedly in session.
 * Indicates potential thrashing or uncertainty about implementation.
 */

import type { AdvisoryRule, AdvisoryWarning } from "../../types/advisory.js";

export const ConsecutiveModificationRule: AdvisoryRule = {
	id: "consecutive-modification-warning",
	priority: 1,
	trigger: (ctx) => {
		for (const [_file, count] of ctx.session.consecutiveFileModifications.entries()) {
			if (count >= 3) return true;
		}
		return false;
	},
	generate: (ctx) => {
		const warnings: AdvisoryWarning[] = [];

		for (const [file, count] of ctx.session.consecutiveFileModifications.entries()) {
			if (count >= 3) {
				warnings.push({
					level: "warning",
					code: "CONSECUTIVE_MODIFICATIONS",
					message: `File modified ${count} times this session`,
					file,
					suggestion: "Consider creating a snapshot before further modifications",
				});
			}
		}

		return { warnings };
	},
};
