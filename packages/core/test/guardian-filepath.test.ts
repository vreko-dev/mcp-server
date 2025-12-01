import { beforeEach, describe, expect, it } from "vitest";
import { type AnalysisPlugin, Guardian } from "../src/guardian.js";

describe("Guardian FilePath Parameter", () => {
	let guardian: Guardian;

	beforeEach(() => {
		guardian = new Guardian();
	});

	it("should pass filePath parameter to plugins", async () => {
		let receivedFilePath: string | undefined;
		const testFilePath = "/path/to/test/file.js";

		const mockPlugin: AnalysisPlugin = {
			name: "filepath-test-plugin",
			analyze: async (_content: string, filePath?: string) => {
				receivedFilePath = filePath;
				return {
					score: 0.5,
					factors: ["filepath-test"],
					recommendations: ["test-recommendation"],
				};
			},
		};

		guardian.addPlugin(mockPlugin);

		const result = await guardian.analyze("test content", testFilePath);

		// Verify that the plugin received the filePath parameter
		expect(receivedFilePath).toBe(testFilePath);

		// Verify that the analysis still works
		expect(result.score).toBe(0.5);
		expect(result.factors).toContain("filepath-test");
	});

	it("should pass undefined filePath when not provided", async () => {
		let receivedFilePath: string | undefined;

		const mockPlugin: AnalysisPlugin = {
			name: "filepath-undefined-test-plugin",
			analyze: async (_content: string, filePath?: string) => {
				receivedFilePath = filePath;
				return {
					score: 0.3,
					factors: ["filepath-undefined-test"],
					recommendations: ["test-recommendation"],
				};
			},
		};

		guardian.addPlugin(mockPlugin);

		const result = await guardian.analyze("test content");

		// Verify that the plugin received undefined for filePath
		expect(receivedFilePath).toBeUndefined();

		// Verify that the analysis still works
		expect(result.score).toBe(0.3);
		expect(result.factors).toContain("filepath-undefined-test");
	});

	it("should pass filePath to multiple plugins", async () => {
		const filePaths: (string | undefined)[] = [];
		const testFilePath = "/path/to/another/file.ts";

		const plugin1: AnalysisPlugin = {
			name: "multi-plugin-1",
			analyze: async (_content: string, filePath?: string) => {
				filePaths.push(filePath);
				return {
					score: 0.4,
					factors: ["multi-test-1"],
					recommendations: ["test-recommendation-1"],
				};
			},
		};

		const plugin2: AnalysisPlugin = {
			name: "multi-plugin-2",
			analyze: async (_content: string, filePath?: string) => {
				filePaths.push(filePath);
				return {
					score: 0.6,
					factors: ["multi-test-2"],
					recommendations: ["test-recommendation-2"],
				};
			},
		};

		guardian.addPlugin(plugin1);
		guardian.addPlugin(plugin2);

		const result = await guardian.analyze("test content", testFilePath);

		// Verify that both plugins received the filePath parameter
		expect(filePaths).toHaveLength(2);
		expect(filePaths[0]).toBe(testFilePath);
		expect(filePaths[1]).toBe(testFilePath);

		// Verify that the aggregated result is correct
		expect(result.score).toBe(0.5); // Average of 0.4 and 0.6
		expect(result.factors).toContain("multi-test-1");
		expect(result.factors).toContain("multi-test-2");
	});
});
