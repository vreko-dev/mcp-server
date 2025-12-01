import { describe, expect, it } from "vitest";
import { AdvancedSecretsPlugin } from "../../src/plugins/secret-advanced";

describe("PL1-A: Advanced secrets plugin", () => {
	it("pl1-a-001: should detect AWS access keys (AKIA pattern)", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			const config = {
				awsAccessKeyId: "AKIAIOSFODNN7EXAMPLE",
				region: "us-west-2"
			};
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("AWS access key detected"))).toBe(true);
		expect(result.recommendations).toContain("Remove hardcoded secrets from source code");
	});

	it("pl1-a-002: should detect JWT tokens", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBe(0.95);
		expect(result.severity).toBe("critical");
		expect(result.factors.some((f) => f.includes("JWT token detected"))).toBe(true);
	});

	it("pl1-a-003: should ignore placeholders and comments", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			// Placeholder for AWS key
			const awsKey = "AKIA_PLACEHOLDER";
			
			/*
			 * Example JWT token
			 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
			 */
			
			// Your token here
			const token = "YOUR_JWT_TOKEN";
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
		expect(result.severity).toBe("low");
	});

	it("pl1-a-004: should respect changedLines metadata for diff-aware analysis", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			const oldApiKey = "AKIAIOSFODNN7EXAMPLE"; // This line is not changed
			const newApiKey = "AKIA9999999999999999"; // This line is changed
			const normalCode = "console.log('hello');"; // This line is not changed
		`;

		// Only analyze line 3 (1-indexed)
		const metadata = {
			changedLines: [3],
		};

		const result = await plugin.analyze(testContent, "test.js", metadata);

		// Should only detect the secret on the changed line
		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("AWS access key detected"))).toBe(true);
	});

	it("pl1-a-005: should detect high-entropy secrets", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			const apiKey = "x9sjk2hj34k23h4k23jh4k23jh4k23jh4k23j4h";
		`;

		const result = await plugin.analyze(testContent);

		expect(result.score).toBeGreaterThan(0);
		expect(result.severity).toBe("high");
		expect(result.factors.some((f) => f.includes("High-entropy secret detected"))).toBe(true);
	});

	it("pl1-a-006: should not flag common words as secrets", async () => {
		const plugin = new AdvancedSecretsPlugin();

		const testContent = `
			const password = "password";
			const secret = "secret";
			const token = "token";
		`;

		const result = await plugin.analyze(testContent);

		// These common words should not be flagged as high-entropy secrets
		expect(result.score).toBe(0);
		expect(result.factors).toHaveLength(0);
	});
});
