import type { AnalysisPlugin } from "@snapback/core";
import { describe, expect, it } from "vitest";
import { Guardian } from "@snapback/core/guardian";

// Mock plugin results for testing
const createMockPlugin = (
	name: string,
	score: number,
	severity: "low" | "medium" | "high" | "critical",
	factors: string[] = [],
): AnalysisPlugin => ({
	name,
	analyze: async (_content: string) => ({
		score,
		factors,
		recommendations: [],
		severity,
	}),
});

describe("Score Dominance", () => {
	it("mcp-001: should prioritize critical severity over average score", async () => {
		// Create a Guardian instance
		const guardian = new Guardian();

		// Add mock plugins with one critical and several low severity results
		guardian.addPlugin(createMockPlugin("low-plugin-1", 0.1, "low", ["Low severity issue 1"]));
		guardian.addPlugin(createMockPlugin("low-plugin-2", 0.2, "low", ["Low severity issue 2"]));
		guardian.addPlugin(createMockPlugin("critical-plugin", 0.95, "critical", ["Critical security vulnerability"]));
		guardian.addPlugin(createMockPlugin("low-plugin-3", 0.15, "low", ["Low severity issue 3"]));

		// Analyze some content
		const result = await guardian.analyze("test content");

		// Verify that the critical issue dominates the score
		expect(result.score).toBe(0.95); // Should be 0.95 due to critical issue
		expect(result.severity).toBe("critical");
		expect(result.factors).toContain("Critical security vulnerability");
	});

	it("mcp-002: should use high score when high severity issues present", async () => {
		// Create a Guardian instance
		const guardian = new Guardian();

		// Add mock plugins with medium and high severity but no critical
		guardian.addPlugin(createMockPlugin("medium-plugin", 0.3, "medium", ["Medium severity issue"]));
		guardian.addPlugin(createMockPlugin("high-plugin", 0.6, "high", ["High severity issue"]));
		guardian.addPlugin(createMockPlugin("medium-plugin-2", 0.4, "medium", ["Another medium severity issue"]));

		// Analyze some content
		const result = await guardian.analyze("test content");

		// Verify that the result uses a top-heavy approach but not critical dominance
		expect(result.score).toBe(0.8); // Should be 0.8 due to high severity issue
		expect(result.severity).toBe("high");
	});

	it("mcp-003: should handle multiple critical issues correctly", async () => {
		// Create a Guardian instance
		const guardian = new Guardian();

		// Add mock plugins with multiple critical issues
		guardian.addPlugin(createMockPlugin("critical-plugin-1", 0.95, "critical", ["Critical issue 1"]));
		guardian.addPlugin(createMockPlugin("critical-plugin-2", 0.92, "critical", ["Critical issue 2"]));
		guardian.addPlugin(createMockPlugin("low-plugin", 0.2, "low", ["Low severity issue"]));

		// Analyze some content
		const result = await guardian.analyze("test content");

		// Verify that critical issues dominate
		expect(result.score).toBe(0.95);
		expect(result.severity).toBe("critical");
		expect(result.factors).toContain("Critical issue 1");
		expect(result.factors).toContain("Critical issue 2");
	});

	it("mcp-004: should handle all low severity issues with average scoring", async () => {
		// Create a Guardian instance
		const guardian = new Guardian();

		// Add mock plugins with only low severity issues
		guardian.addPlugin(createMockPlugin("low-plugin-1", 0.1, "low", ["Low severity issue 1"]));
		guardian.addPlugin(createMockPlugin("low-plugin-2", 0.2, "low", ["Low severity issue 2"]));
		guardian.addPlugin(createMockPlugin("low-plugin-3", 0.15, "low", ["Low severity issue 3"]));

		// Analyze some content
		const result = await guardian.analyze("test content");

		// Calculate expected average
		const expectedAverage = (0.1 + 0.2 + 0.15) / 3;

		// Verify that the result uses average scoring for low severity issues
		expect(result.score).toBeCloseTo(expectedAverage, 2);
		expect(result.severity).toBe("low");
	});
});
