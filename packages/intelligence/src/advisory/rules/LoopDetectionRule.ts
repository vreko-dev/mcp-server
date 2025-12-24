/**
 * Loop Detection Rule
 *
 * Triggers warnings when session loop detection indicates repeated operations.
 * Helps prevent infinite loops and wasted LLM cycles.
 */

import type { AdvisoryRule, AdvisoryWarning } from "../../types/advisory.js";

export const LoopDetectionRule: AdvisoryRule = {
	id: "loop-detection-warning",
	priority: 1, // High priority - critical safety issue
	trigger: (ctx) => {
		return ctx.session.loopsDetected > 0;
	},
	generate: (ctx) => {
		const warnings: AdvisoryWarning[] = [];

		if (ctx.session.loopsDetected > 0) {
			warnings.push({
				level: "error",
				code: "LOOP_DETECTED",
				message: `${ctx.session.loopsDetected} loop${ctx.session.loopsDetected > 1 ? "s" : ""} detected in session`,
				suggestion: "Review recent tool calls - may be repeating same operations",
			});
		}

		return { warnings };
	},
};
