import { beforeEach, describe, expect, it } from "vitest";
import { type AnalysisPlugin, Guardian } from "../src/guardian.js";

describe("Guardian Plugin System", () => {
	let guardian: Guardian;

	beforeEach(() => {
		guardian = new Guardian();
	});

	it("should allow adding plugins", () => {
		const mockPlugin: AnalysisPlugin = {
			name: "mock-plugin",
			analyze: async (_content: string) => {
				return {
					score: 0.5,
					factors: ["mock-factor"],
					recommendations: ["mock-recommendation"],
					severity: "medium",
				};
			},
		};

		guardian.addPlugin(mockPlugin);

		// Verify plugin was added
		// Note: We can't directly access private plugins array, but we can test functionality
	});

	it("should execute plugins when analyzing content", async () => {
		const mockPlugin: AnalysisPlugin = {
			name: "mock-plugin",
			analyze: async (_content: string) => {
				return {
					score: 0.8,
					factors: ["high-complexity"],
					recommendations: ["simplify-code"],
					severity: "high",
				};
			},
		};

		guardian.addPlugin(mockPlugin);

		const result = await guardian.analyze("test content");

		expect(result.score).toBe(0.8);
		expect(result.factors).toContain("high-complexity");
		expect(result.recommendations).toContain("simplify-code");
	});

	it("should aggregate results from multiple plugins", async () => {
		const plugin1: AnalysisPlugin = {
			name: "plugin-1",
			analyze: async (_content: string) => {
				return {
					score: 0.3,
					factors: ["factor-1"],
					recommendations: ["recommendation-1"],
					severity: "low",
				};
			},
		};

		const plugin2: AnalysisPlugin = {
			name: "plugin-2",
			analyze: async (_content: string) => {
				return {
					score: 0.7,
					factors: ["factor-2"],
					recommendations: ["recommendation-2"],
					severity: "medium",
				};
			},
		};

		guardian.addPlugin(plugin1);
		guardian.addPlugin(plugin2);

		const result = await guardian.analyze("test content");

		// With our new implementation, the score should be 0.5 (medium severity)
		expect(result.score).toBe(0.5);
		expect(result.factors).toContain("factor-1");
		expect(result.factors).toContain("factor-2");
		expect(result.recommendations).toContain("recommendation-1");
		expect(result.recommendations).toContain("recommendation-2");
	});

	it("should handle plugin execution errors gracefully", async () => {
		const failingPlugin: AnalysisPlugin = {
			name: "failing-plugin",
			analyze: async (_content: string) => {
				throw new Error("Plugin execution failed");
			},
		};

		const workingPlugin: AnalysisPlugin = {
			name: "working-plugin",
			analyze: async (_content: string) => {
				return {
					score: 0.5,
					factors: ["working-factor"],
					recommendations: ["working-recommendation"],
					severity: "medium",
				};
			},
		};

		guardian.addPlugin(failingPlugin);
		guardian.addPlugin(workingPlugin);

		// Should not throw an error even if one plugin fails
		const result = await guardian.analyze("test content");

		// Should still get results from the working plugin
		expect(result.score).toBe(0.5);
		expect(result.factors).toContain("working-factor");
	});
});
