import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "@snapback/mcp-server",
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,js}", "test/**/*.{test,spec}.{ts,js}"],
	},
});
