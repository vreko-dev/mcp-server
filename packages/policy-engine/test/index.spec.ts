import { describe, expect, it } from "vitest";
import { evaluate, loadPolicyConfig, type PolicyConfig } from "../src/index";

describe("PO1-A: Mini policy engine (.snapbackrc)", () => {
	const mockSarif = {
		version: "2.1.0",
		runs: [
			{
				tool: { driver: { name: "snapback" } },
				results: [
					{ ruleId: "test-1", level: "critical" },
					{ ruleId: "test-2", level: "high" },
					{ ruleId: "test-3", level: "medium" },
					{ ruleId: "test-4", level: "low" },
				],
			},
		],
	};

	it("po1-a-001: should enforce thresholds and blockOn severities", async () => {
		// Test with default policy (should block on critical and high)
		const decision1 = evaluate(mockSarif);
		expect(decision1.action).toBe("block");
		expect(decision1.reason).toContain("Critical issues");

		// Test with custom policy that allows critical issues
		const customPolicy: PolicyConfig = {
			thresholds: {
				critical: 100,
				high: 0,
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: false,
				high: true,
				medium: false,
				low: false,
			},
			pathRules: [],
		};

		const decision2 = evaluate(mockSarif, customPolicy);
		expect(decision2.action).toBe("block");
		expect(decision2.reason).toContain("High issues");

		// Test with policy that allows all issues
		const permissivePolicy: PolicyConfig = {
			thresholds: {
				critical: 100,
				high: 100,
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: false,
				high: false,
				medium: false,
				low: false,
			},
			pathRules: [],
		};

		const decision3 = evaluate(mockSarif, permissivePolicy);
		expect(decision3.action).toBe("review");
		expect(decision3.reason).toBe("Critical or high severity issues found");
	});

	it("po1-a-002: should override thresholds for globs with pathRules", async () => {
		const sarifWithOnlyMedium = {
			version: "2.1.0",
			runs: [
				{
					tool: { driver: { name: "snapback" } },
					results: [
						{ ruleId: "test-1", level: "medium" },
						{ ruleId: "test-2", level: "medium" },
					],
				},
			],
		};

		// Default policy allows medium issues
		const decision1 = evaluate(sarifWithOnlyMedium);
		expect(decision1.action).toBe("apply");

		// Custom policy with path rule that blocks medium issues in src/ directory
		const policyWithPathRules: PolicyConfig = {
			thresholds: {
				critical: 0,
				high: 0,
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: true,
				high: true,
				medium: false,
				low: false,
			},
			pathRules: [
				{
					glob: "src/**",
					thresholds: {
						medium: 0, // Block medium issues in src/
					},
				},
			],
		};

		// Should block when file path matches src/**
		const decision2 = evaluate(sarifWithOnlyMedium, policyWithPathRules, "src/components/App.tsx");
		expect(decision2.action).toBe("block");
		expect(decision2.reason).toContain("Medium issues");

		// Should not block when file path doesn't match src/**
		const decision3 = evaluate(sarifWithOnlyMedium, policyWithPathRules, "test/App.test.tsx");
		expect(decision3.action).toBe("apply");
	});

	it("po1-a-003: should handle empty SARIF results", async () => {
		const emptySarif = {
			version: "2.1.0",
			runs: [
				{
					tool: { driver: { name: "snapback" } },
					results: [],
				},
			],
		};

		const decision = evaluate(emptySarif);
		expect(decision.action).toBe("apply");
		expect(decision.reason).toBe("No blocking issues found");
	});

	it("po1-a-004: should require review for critical/high issues even if under threshold", async () => {
		const sarifWithHighIssues = {
			version: "2.1.0",
			runs: [
				{
					tool: { driver: { name: "snapback" } },
					results: [{ ruleId: "test-1", level: "high" }],
				},
			],
		};

		// Policy that allows high issues but still requires review
		const policy: PolicyConfig = {
			thresholds: {
				critical: 0,
				high: 100,
				medium: 100,
				low: 100,
			},
			blockOn: {
				critical: true,
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

	it("po1-a-005: should apply automatically when only low issues are found", async () => {
		const sarifWithLowIssues = {
			version: "2.1.0",
			runs: [
				{
					tool: { driver: { name: "snapback" } },
					results: [
						{ ruleId: "test-1", level: "low" },
						{ ruleId: "test-2", level: "low" },
					],
				},
			],
		};

		const decision = evaluate(sarifWithLowIssues);
		expect(decision.action).toBe("apply");
		expect(decision.reason).toBe("No blocking issues found");
	});

	it("po1-a-006: should load policy configuration from .snapbackrc", async () => {
		// For this test, we'll just verify the function exists and returns the default policy
		// when no .snapbackrc file is present
		const config = loadPolicyConfig();
		expect(config).toHaveProperty("thresholds");
		expect(config).toHaveProperty("blockOn");
		expect(config).toHaveProperty("pathRules");
	});
});
