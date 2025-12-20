/**
 * Vitest configuration for @snapback/intelligence
 *
 * Uses centralized presets from @snapback/testing per C-005 constraint.
 */
import { mergeConfigs, nodePreset } from "@snapback/testing/vitest-config";

export default mergeConfigs(nodePreset, {
	test: {
		name: "@snapback/intelligence",
		include: ["test/**/*.test.ts"],
		coverage: {
			thresholds: {
				statements: 80,
				branches: 75,
				functions: 80,
				lines: 80,
			},
		},
	},
});
