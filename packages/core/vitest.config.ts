import { resolve } from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
	resolve: {
		alias: {
			"@snapback-core": resolve(__dirname, "./src"),
		},
	},
	test: {
		name: "@snapback/core",
		globals: true,
		environment: "node",
		include: ["test/**/*.{test,spec}.{js,ts}", "src/**/*.{test,spec}.{js,ts}"],
	},
});
