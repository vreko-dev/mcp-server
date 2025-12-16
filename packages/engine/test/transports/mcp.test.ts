/**
 * MCP Transport Adapter Tests
 *
 * Tests for the MCP (Model Context Protocol) transport adapter that bridges
 * the new engine with MCP clients like Claude Desktop.
 *
 * TDD Phase: RED - All tests should FAIL initially
 * Following TDD_CORE.md 4-path coverage: happy, sad, edge, error
 */

import { beforeEach, describe, expect, it } from "vitest";

// Import the adapter we're going to build
// This import will fail until we create the file (expected in RED phase)
import { type MCPChange, MCPEngineAdapter } from "../../src/transports/mcp";

describe("MCPEngineAdapter", () => {
	let adapter: MCPEngineAdapter;

	beforeEach(() => {
		adapter = new MCPEngineAdapter();
	});

	// ==========================================================================
	// HAPPY PATH: analyze_risk tool with valid changes
	// ==========================================================================
	describe("analyzeRisk - Happy Path", () => {
		it("should analyze valid code changes and return risk assessment", async () => {
			const changes: MCPChange[] = [
				{ added: true, removed: false, value: "const x = 1;", count: 1 },
				{ added: true, removed: false, value: "const y = 2;", count: 1 },
			];

			const result = await adapter.analyzeRisk(changes);

			expect(result).toBeDefined();
			expect(result.riskLevel).toMatch(/^(safe|low|medium|high|critical)$/);
			expect(typeof result.score).toBe("number");
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(10);
			expect(Array.isArray(result.factors)).toBe(true);
			expect(result.session).toBeDefined();
			expect(typeof result.session.score).toBe("number");
		});

		it("should detect high-risk patterns in code changes", async () => {
			const changes: MCPChange[] = [
				{ added: true, removed: false, value: 'const password = "secret123";', count: 1 },
				{ added: true, removed: false, value: "eval(userInput);", count: 1 },
			];

			const result = await adapter.analyzeRisk(changes);

			expect(result.riskLevel).toMatch(/^(high|critical)$/);
			expect(result.score).toBeGreaterThan(5);
			expect(result.factors.length).toBeGreaterThan(0);
		});

		it("should include session health in response for coaching", async () => {
			const changes: MCPChange[] = [{ added: true, removed: false, value: "console.log('hello');", count: 1 }];

			const result = await adapter.analyzeRisk(changes);

			expect(result.session).toBeDefined();
			expect(typeof result.session.score).toBe("number");
			expect(result.session.score).toBeGreaterThanOrEqual(0);
			expect(result.session.score).toBeLessThanOrEqual(100);
			expect(Array.isArray(result.session.warnings)).toBe(true);
			expect(Array.isArray(result.session.suggestions)).toBe(true);
		});
	});

	// ==========================================================================
	// SAD PATH: Empty or minimal changes
	// ==========================================================================
	describe("analyzeRisk - Sad Path", () => {
		it("should return zero risk for empty changes array", async () => {
			const changes: MCPChange[] = [];

			const result = await adapter.analyzeRisk(changes);

			expect(result.riskLevel).toBe("safe");
			expect(result.score).toBe(0);
			expect(result.factors).toHaveLength(0);
		});

		it("should handle changes with only whitespace", async () => {
			const changes: MCPChange[] = [
				{ added: true, removed: false, value: "   ", count: 1 },
				{ added: true, removed: false, value: "\n\n", count: 1 },
			];

			const result = await adapter.analyzeRisk(changes);

			expect(result.riskLevel).toBe("safe");
			expect(result.score).toBeLessThanOrEqual(1);
		});

		it("should handle only removed lines (no added content)", async () => {
			const changes: MCPChange[] = [
				{ added: false, removed: true, value: "const oldVar = 1;", count: 1 },
				{ added: false, removed: true, value: "const anotherOld = 2;", count: 1 },
			];

			const result = await adapter.analyzeRisk(changes);

			// Removal-only changes should be low risk
			expect(result.riskLevel).toMatch(/^(safe|low)$/);
		});
	});

	// ==========================================================================
	// EDGE CASES: Large inputs, performance, boundary conditions
	// ==========================================================================
	describe("analyzeRisk - Edge Cases", () => {
		it("should handle large change sets (1000+ lines) within performance budget", async () => {
			const changes: MCPChange[] = Array.from({ length: 1000 }, (_, i) => ({
				added: true,
				removed: false,
				value: `const var${i} = ${i};`,
				count: 1,
			}));

			const startTime = Date.now();
			const result = await adapter.analyzeRisk(changes);
			const duration = Date.now() - startTime;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(5000); // 5 second budget for 1000 lines
		});

		it("should handle mixed add/remove changes correctly", async () => {
			const changes: MCPChange[] = [
				{ added: false, removed: true, value: "const unsafeOld = eval(x);", count: 1 },
				{ added: true, removed: false, value: "const safenew = 1;", count: 1 },
			];

			const result = await adapter.analyzeRisk(changes);

			// New code is safe, old dangerous code removed - should be low risk
			expect(result).toBeDefined();
			expect(result.riskLevel).toMatch(/^(safe|low|medium)$/);
		});

		it("should handle changes without optional count field", async () => {
			const changes: MCPChange[] = [
				{ added: true, removed: false, value: "const x = 1;" },
				{ added: true, value: "const y = 2;" }, // minimal fields
			];

			const result = await adapter.analyzeRisk(changes);

			expect(result).toBeDefined();
			expect(result.riskLevel).toBeDefined();
		});
	});

	// ==========================================================================
	// ERROR PATH: Invalid inputs, malformed data
	// ==========================================================================
	describe("analyzeRisk - Error Path", () => {
		it("should return error result for invalid input format", async () => {
			// @ts-expect-error - Testing invalid input
			const result = await adapter.analyzeRisk("not an array");

			expect(result.riskLevel).toBe("safe");
			expect(result.error).toBeDefined();
		});

		it("should handle null/undefined changes gracefully", async () => {
			// @ts-expect-error - Testing null input
			const result = await adapter.analyzeRisk(null);

			expect(result.riskLevel).toBe("safe");
			expect(result.score).toBe(0);
		});

		it("should handle changes with undefined value field", async () => {
			const changes = [
				{ added: true, removed: false },
				{ added: true, removed: false, value: "valid line" },
			] as MCPChange[];

			const result = await adapter.analyzeRisk(changes);

			// Should still process valid changes
			expect(result).toBeDefined();
		});
	});

	// ==========================================================================
	// CHECK DEPENDENCIES: 4-path coverage
	// ==========================================================================
	describe("checkDependencies", () => {
		it("should detect added dependencies", async () => {
			const before = { lodash: "^4.17.21" };
			const after = { lodash: "^4.17.21", axios: "^1.0.0" };

			const result = await adapter.checkDependencies(before, after);

			expect(result.added).toContain("axios");
			expect(result.removed).toHaveLength(0);
		});

		it("should detect removed dependencies", async () => {
			const before = { lodash: "^4.17.21", moment: "^2.29.4" };
			const after = { lodash: "^4.17.21" };

			const result = await adapter.checkDependencies(before, after);

			expect(result.removed).toContain("moment");
			expect(result.added).toHaveLength(0);
		});

		it("should detect version changes", async () => {
			const before = { lodash: "^4.17.21" };
			const after = { lodash: "^5.0.0" };

			const result = await adapter.checkDependencies(before, after);

			expect(result.changed).toBeDefined();
			expect(result.changed).toContainEqual({
				name: "lodash",
				from: "^4.17.21",
				to: "^5.0.0",
			});
		});

		it("should handle empty dependencies objects", async () => {
			const result = await adapter.checkDependencies({}, {});

			expect(result.added).toHaveLength(0);
			expect(result.removed).toHaveLength(0);
			expect(result.changed).toHaveLength(0);
		});
	});

	// ==========================================================================
	// SESSION MANAGEMENT
	// ==========================================================================
	describe("Session Management", () => {
		it("should reset session when requested", async () => {
			// First analyze something to modify session
			await adapter.analyzeRisk([{ added: true, removed: false, value: "const x = 1;" }]);

			// Reset session
			adapter.resetSession();

			const health = adapter.getSessionHealth();
			expect(health.score).toBe(100);
			expect(health.warnings).toHaveLength(0);
			expect(health.filesModified).toHaveLength(0);
		});

		it("should accumulate session health across multiple analyses", async () => {
			await adapter.analyzeRisk([{ added: true, removed: false, value: "const x = 1;" }]);

			await adapter.analyzeRisk([{ added: true, removed: false, value: "const y = 2;" }]);

			const health = adapter.getSessionHealth();
			expect(health).toBeDefined();
			// Multiple analyses should be tracked
		});
	});
});
