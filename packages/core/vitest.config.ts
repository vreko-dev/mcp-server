import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@snapback/core",
		globals: true,
		environment: "node",
		include: ["test/**/*.{test,spec}.{js,ts}", "src/**/*.{test,spec}.{js,ts}"],
	},
});
