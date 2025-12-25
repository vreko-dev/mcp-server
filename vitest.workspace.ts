import { defineWorkspace } from "vitest/config";
export default defineWorkspace([
	{
		test: {
			include: [
				"{apps,packages,packages-oss}/**/*.{test,spec}.ts?(x)",
				"test/**/*.{test,spec}.ts",
			],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/out/**",
				"**/coverage/**",
				"**/fixtures/**/node_modules/**",
				"**/.next/**",
			],
		},
	},
]);
