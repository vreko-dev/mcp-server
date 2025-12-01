import { evaluate } from "@snapback/policy-engine";
import { describe, expect, it, vi } from "vitest";

// Mock the policy engine module to ensure we're testing the actual implementation
vi.mock("@snapback/policy-engine", async () => {
	const actual = await vi.importActual("@snapback/policy-engine");
	return {
		...actual,
	};
});

describe("Policy Engine Integration", () => {
	const mockSarif = {
		version: "2.1.0",
		runs: [
			{
				tool: { driver: { name: "snapback" } },
				results: [],
			},
		],
	};

	it("should return apply decision for clean SARIF with no issues", () => {
		const decision = evaluate(mockSarif);

		expect(decision.action).toBe("apply");
		expect(decision.reason).toBe("No blocking issues found");
		expect(decision.details).toBeDefined();
		expect(decision.confidence).toBeGreaterThanOrEqual(0);
		expect(decision.confidence).toBeLessThanOrEqual(1);
	});

	it("should return apply decision for SARIF with only low severity issues under threshold", () => {
		const sarifWithLowIssues = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [
						{ ruleId: "test-1", level: "note" },
						{ ruleId: "test-2", level: "note" },
					],
				},
			],
		};

		const decision = evaluate(sarifWithLowIssues);

		expect(decision.action).toBe("apply");
		expect(decision.reason).toBe("No blocking issues found");
	});

	it("should return review decision for SARIF with critical or high issues even under threshold", () => {
		const sarifWithHighIssues = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [{ ruleId: "test-1", level: "error" }],
				},
			],
		};

		// Custom policy that allows high issues but still requires review
		// This policy should allow critical issues (threshold > 0) but still require review
		const policy = {
			thresholds: {
				critical: 100, // Allow up to 100 critical issues
				high: 100,
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: false, // Don't block on critical issues
				high: false,
				medium: false,
				low: false,
			},
			pathRules: [],
		};

		const decision = evaluate(sarifWithHighIssues, policy);

		expect(decision.action).toBe("review");
		expect(decision.reason).toBe("Critical or high severity issues found");
	});

	it("should return block decision for SARIF with critical issues exceeding threshold", () => {
		const sarifWithCriticalIssues = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [
						{ ruleId: "test-1", level: "error" },
						{ ruleId: "test-2", level: "error" },
					],
				},
			],
		};

		// Use a stricter policy that blocks on any critical issues
		const strictPolicy = {
			thresholds: {
				critical: 0, // Block on any critical issues
				high: 0, // Block on any high issues
				medium: 0, // Block on any medium issues
				low: 0, // Block on any low issues
			},
			blockOn: {
				critical: true,
				high: true,
				medium: true,
				low: true,
			},
			pathRules: [],
		};

		const decision = evaluate(sarifWithCriticalIssues, strictPolicy);
		console.log("Critical issues decision:", decision);

		expect(decision.action).toBe("block");
		expect(decision.reason).toContain("Critical issues");
	});

	it("should return block decision for SARIF with high issues exceeding threshold", () => {
		const sarifWithHighIssues = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [
						{ ruleId: "test-1", level: "warning" },
						{ ruleId: "test-2", level: "warning" },
					],
				},
			],
		};

		// Use a stricter policy that blocks on any high issues
		const strictPolicy = {
			thresholds: {
				critical: 0,
				high: 0, // Block on any high issues
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: true,
				high: true,
				medium: false,
				low: false,
			},
			pathRules: [],
		};

		const decision = evaluate(sarifWithHighIssues, strictPolicy);
		console.log("High issues decision:", decision);

		expect(decision.action).toBe("block");
		expect(decision.reason).toContain("High issues");
	});

	it("should produce deterministic decisions for seeded SARIF", () => {
		const seededSarif = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [
						{ ruleId: "test-1", level: "error" },
						{ ruleId: "test-2", level: "warning" },
						{ ruleId: "test-3", level: "warning" },
						{ ruleId: "test-4", level: "note" },
					],
				},
			],
		};

		const decision1 = evaluate(seededSarif);
		const decision2 = evaluate(seededSarif);

		expect(decision1.action).toBe(decision2.action);
		expect(decision1.reason).toBe(decision2.reason);
		expect(decision1.details).toEqual(decision2.details);
	});

	it("should include rules_hit in decision response", () => {
		const seededSarif = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [
						{ ruleId: "test-1", level: "error" },
						{ ruleId: "test-2", level: "warning" },
					],
				},
			],
		};

		// Use a strict policy to ensure we get a decision that includes the rules
		const strictPolicy = {
			thresholds: {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0,
			},
			blockOn: {
				critical: true,
				high: true,
				medium: true,
				low: true,
			},
			pathRules: [],
		};

		const decision = evaluate(seededSarif, strictPolicy);
		console.log("Rules hit decision:", decision);

		expect(decision.rules_hit).toBeDefined();
		expect(decision.rules_hit).toContain("test-1");
		expect(decision.rules_hit).toContain("test-2");
	});

	it("should include confidence score in decision response", () => {
		const seededSarif = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [{ ruleId: "test-1", level: "error" }],
				},
			],
		};

		const decision = evaluate(seededSarif);

		expect(decision.confidence).toBeDefined();
		expect(decision.confidence).toBeGreaterThanOrEqual(0);
		expect(decision.confidence).toBeLessThanOrEqual(1);
	});

	it("should handle path-based rules correctly", () => {
		const sarifWithIssues = {
			...mockSarif,
			runs: [
				{
					...mockSarif.runs[0],
					results: [{ ruleId: "test-1", level: "warning" }], // This is a "high" severity issue
				},
			],
		};

		// Policy with path-based rules
		const policy = {
			thresholds: {
				critical: 0,
				high: 0, // Block on any high issues by default
				medium: 0,
				low: 100,
			},
			blockOn: {
				critical: true,
				high: true, // Block on high issues by default
				medium: true,
				low: false,
			},
			pathRules: [
				{
					glob: "src/**",
					thresholds: {
						critical: 0,
						high: 100, // Allow high issues in src/ directory
						medium: 100,
						low: 100,
					},
					blockOn: {
						critical: true,
						high: false, // Don't block on high issues in src/ directory
						medium: true,
						low: false,
					},
				},
			],
		};

		// Test with a file path that matches the rule
		const decision = evaluate(sarifWithIssues, policy, "src/main.js");

		// Should allow high issues in src/ directory because path rule overrides blockOn
		expect(decision.action).toBe("review");
	});
});
