import { describe, expect, it } from "vitest";
import { ruleViolations } from "../rule-violations";

describe("ruleViolations schema", () => {
	it("should have the correct table structure", () => {
		expect(ruleViolations).toBeDefined();
		expect(ruleViolations.id).toBeDefined();
		expect(ruleViolations.userId).toBeDefined();
		expect(ruleViolations.apiKeyId).toBeDefined();
		expect(ruleViolations.ruleId).toBeDefined();
		expect(ruleViolations.ruleName).toBeDefined();
		expect(ruleViolations.severity).toBeDefined();
		expect(ruleViolations.timestamp).toBeDefined();
		expect(ruleViolations.createdAt).toBeDefined();
	});

	it("should have proper relationships", () => {
		// This test will be expanded once we have the relations properly set up
		expect(true).toBe(true);
	});
});
