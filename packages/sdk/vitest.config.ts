import path from "node:path";
import { fileURLToPath } from "node:url";
import { nodeConfig } from "@snapback/vitest-config";
import { defineProject } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
	...nodeConfig,
	resolve: {
		alias: {
			...nodeConfig.resolve?.alias,
			"@snapback-sdk": path.resolve(__dirname, "./src"),
			"@snapback-sdk/core": path.resolve(__dirname, "./src/core"),
			"@snapback-sdk/storage": path.resolve(__dirname, "./src/storage"),
			"@snapback/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
		},
	},
	test: {
		...nodeConfig.test,
		name: "@snapback/sdk",
		include: ["tests/**/*.test.ts", "__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
		setupFiles: ["./__tests__/setup.ts"],
	},
});
