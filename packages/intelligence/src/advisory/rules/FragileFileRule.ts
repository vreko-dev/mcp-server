/**
 * Fragile File Rule
 *
 * Triggers warnings when files have high fragility scores.
 * Fragility indicates rollback risk based on historical patterns.
 */

import type { AdvisoryRule, AdvisoryWarning } from "../../types/advisory.js";

/**
 * Fragility score thresholds (0-1 where 1 = very fragile)
 */
const FRAGILITY_THRESHOLDS = {
	/** Critical fragility - file very prone to rollbacks */
	HIGH: 0.7,
	/** Moderate fragility - file somewhat prone to issues */
	MODERATE: 0.5,
} as const;

export const FragileFileRule: AdvisoryRule = {
	id: "fragile-file-warning",
	priority: 2,
	trigger: (ctx) => {
		for (const [_file, score] of ctx.fragility.entries()) {
			if (score > FRAGILITY_THRESHOLDS.MODERATE) return true;
		}
		return false;
	},
	generate: (ctx) => {
		const warnings: AdvisoryWarning[] = [];

		for (const [file, score] of ctx.fragility.entries()) {
			if (score > FRAGILITY_THRESHOLDS.HIGH) {
				warnings.push({
					level: "error",
					code: "FRAGILE_FILE",
					message: `File has high fragility score (${(score * 100).toFixed(0)}%)`,
					file,
					suggestion: "Create snapshot before modifying - high rollback risk",
				});
			} else if (score > FRAGILITY_THRESHOLDS.MODERATE) {
				warnings.push({
					level: "warning",
					code: "FRAGILE_FILE",
					message: `File has moderate fragility score (${(score * 100).toFixed(0)}%)`,
					file,
					suggestion: "Proceed with caution - potential rollback risk",
				});
			}
		}

		return { warnings };
	},
};
