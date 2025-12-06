import { describe, expect, it } from "vitest";
import { SecretDetector } from "../src/detectors/SecretDetector";

describe("SecretDetector", () => {
	const detector = new SecretDetector();

	describe("AWS Access Key Detection", () => {
		it("should detect AWS access keys", () => {
			const code = `
				const config = {
					accessKeyId: "AKIAIOSFODNN7EXAMPLE",
					secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
				};
			`;

			const result = detector.detect(code, "src/config.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings.some((f) => f.type === "AWS Access Key")).toBe(true);
			expect(result.riskScore).toBeGreaterThan(0);
		});

		it("should not detect AWS keys in test files", () => {
			const code = `
				const mockKey = "AKIAIOSFODNN7EXAMPLE";
			`;

			const result = detector.detect(code, "src/config.test.ts");

			expect(result.findings.length).toBe(0);
			expect(result.riskScore).toBe(0);
		});
	});

	describe("GitHub Token Detection", () => {
		it("should detect GitHub personal access tokens", () => {
			const code = `
				const token = "ghp_1234567890abcdefghijklmnopqrst123456";
			`;

			const result = detector.detect(code, "src/auth.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings.some((f) => f.type === "GitHub Token")).toBe(true);
			expect(result.findings[0].severity).toBe("critical");
		});

		it("should detect GitHub OAuth tokens", () => {
			const code = `
				const token = "gho_1234567890abcdefghijklmnopqrst123456";
			`;

			const result = detector.detect(code, "src/auth.ts");

			expect(result.findings.length).toBeGreaterThan(0);
		});
	});

	describe("Stripe API Key Detection", () => {
		it("should detect Stripe live keys", () => {
			const code = `
				const stripeKey = "sk_live_1234567890abcdefghijklmn";
			`;

			const result = detector.detect(code, "src/payment.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings.some((f) => f.type === "Stripe API Key")).toBe(true);
		});

		it("should detect Stripe test keys", () => {
			const code = `
				const stripeKey = "sk_test_1234567890abcdefghijklmn";
			`;

			const result = detector.detect(code, "src/payment.ts");

			expect(result.findings.length).toBeGreaterThan(0);
		});
	});

	describe("Private Key Detection", () => {
		it("should detect RSA private keys", () => {
			const code = `
				const key = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----\`;
			`;

			const result = detector.detect(code, "src/crypto.ts");

			expect(result.findings.length).toBeGreaterThan(0);
			expect(result.findings.some((f) => f.type === "Private Key Header")).toBe(true);
			expect(result.findings[0].severity).toBe("critical");
		});

		it("should detect OpenSSH private keys", () => {
			const code = `
				const key = "-----BEGIN OPENSSH PRIVATE KEY-----";
			`;

			const result = detector.detect(code, "src/ssh.ts");

			expect(result.findings.length).toBeGreaterThan(0);
		});
	});

	describe("High Entropy String Detection", () => {
		it("should detect high-entropy strings", () => {
			const code = `
				const secret = "xK9mP2qL5nR8tY4wB7vC3zA6sD1fG0hJ";
			`;

			const result = detector.detect(code, "src/config.ts");

			// High entropy string should be detected
			expect(result.findings.some((f) => f.type === "High-Entropy String")).toBe(true);
			expect(result.findings[0].entropy).toBeGreaterThan(4.5);
		});

		it("should not detect low-entropy strings", () => {
			const code = `
				const message = "hello world hello world hello";
			`;

			const result = detector.detect(code, "src/messages.ts");

			// Low entropy - should not be flagged
			expect(result.findings.length).toBe(0);
		});

		it("should include entropy in findings", () => {
			const code = `
				const randomKey = "A1b2C3d4E5f6G7h8I9j0K1L2M3N4O5P6";
			`;

			const result = detector.detect(code, "src/random.ts");

			const entropyFinding = result.findings.find((f) => f.entropy !== undefined);
			expect(entropyFinding).toBeDefined();
			expect(entropyFinding?.entropy).toBeGreaterThan(0);
		});
	});

	describe("Generic API Key Detection", () => {
		it("should detect api_key assignments", () => {
			const code = `
				const apiKey = "abc123def456ghi789jkl012mno345pqr678";
			`;

			const result = detector.detect(code, "src/api.ts");

			expect(result.findings.some((f) => f.type === "Generic API Key")).toBe(true);
		});

		it("should detect api-key with hyphen", () => {
			const code = `
				const config = { "api-key": "abc123def456ghi789jkl" };
			`;

			const result = detector.detect(code, "src/config.ts");

			expect(result.findings.length).toBeGreaterThan(0);
		});
	});

	describe("Password Detection", () => {
		it("should detect password assignments", () => {
			const code = `
				const password = "mySecretPass123!";
			`;

			const result = detector.detect(code, "src/auth.ts");

			expect(result.findings.some((f) => f.type === "Password Assignment")).toBe(true);
			expect(result.findings[0].severity).toBe("medium");
		});
	});

	describe("Bearer Token Detection", () => {
		it("should detect Bearer tokens", () => {
			const code = `
				const auth = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
			`;

			const result = detector.detect(code, "src/auth.ts");

			expect(result.findings.some((f) => f.type === "Bearer Token")).toBe(true);
		});
	});

	describe("OAuth Token Detection", () => {
		it("should detect OAuth tokens", () => {
			const code = `
				const oauth_token = "abc123def456ghi789jkl012";
			`;

			const result = detector.detect(code, "src/oauth.ts");

			expect(result.findings.some((f) => f.type === "OAuth Token")).toBe(true);
		});
	});

	describe("Comment Filtering", () => {
		it("should skip secrets in single-line comments", () => {
			const code = `
				// Example: const apiKey = "AKIAIOSFODNN7EXAMPLE";
				const realKey = "something-else";
			`;

			const result = detector.detect(code, "src/example.ts");

			// Should not detect the commented key
			const awsFindings = result.findings.filter((f) => f.type === "AWS Access Key");
			expect(awsFindings.length).toBe(0);
		});

		it("should skip secrets in multi-line comments", () => {
			const code = `
				/*
				 * Example key: AKIAIOSFODNN7EXAMPLE
				 */
				const code = "safe";
			`;

			const result = detector.detect(code, "src/example.ts");

			const awsFindings = result.findings.filter((f) => f.type === "AWS Access Key");
			expect(awsFindings.length).toBe(0);
		});
	});

	describe("Risk Score Calculation", () => {
		it("should calculate higher risk for critical findings", () => {
			const criticalCode = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				const ghToken = "ghp_1234567890abcdefghijklmnopqrst123456";
			`;

			const criticalResult = detector.detect(criticalCode, "src/critical.ts");

			const lowCode = `
				const password = "test123";
			`;

			const lowResult = detector.detect(lowCode, "src/low.ts");

			expect(criticalResult.riskScore).toBeGreaterThan(lowResult.riskScore);
		});

		it("should cap risk score at 10", () => {
			const manySecrets = `
				const key1 = "AKIAIOSFODNN7EXAMPLE";
				const key2 = "ghp_1234567890abcdefghijklmnopqrst123456";
				const key3 = "sk_live_1234567890abcdefghijklmn";
				const key4 = "AIza1234567890abcdefghijklmnopqrstuvwxyz";
				const key5 = "xK9mP2qL5nR8tY4wB7vC3zA6sD1fG0hJ";
			`;

			const result = detector.detect(manySecrets, "src/many.ts");

			expect(result.riskScore).toBeLessThanOrEqual(10);
		});

		it("should return 0 risk score for clean code", () => {
			const cleanCode = `
				const message = "Hello, world!";
				const count = 42;
			`;

			const result = detector.detect(cleanCode, "src/clean.ts");

			expect(result.riskScore).toBe(0);
			expect(result.findings.length).toBe(0);
		});
	});

	describe("Rule ID Generation", () => {
		it("should include rule IDs in findings", () => {
			const code = `
				const key = "AKIAIOSFODNN7EXAMPLE";
			`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].ruleId).toBeDefined();
			expect(result.findings[0].ruleId).toContain("secret-detection/");
		});

		it("should have consistent rule ID format", () => {
			const code = `
				const ghToken = "ghp_1234567890abcdefghijklmnopqrst123456";
			`;

			const result = detector.detect(code, "src/test.ts");

			const ruleId = result.findings[0].ruleId;
			expect(ruleId).toMatch(/^secret-detection\/.+$/);
		});
	});

	describe("Location Information", () => {
		it("should include line numbers", () => {
			const code = `line1
line2
const key = "AKIAIOSFODNN7EXAMPLE";
line4`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].line).toBe(3);
		});

		it("should include column numbers", () => {
			const code = `const key = "AKIAIOSFODNN7EXAMPLE";`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].column).toBeGreaterThan(0);
		});

		it("should include code snippet", () => {
			const code = `const secretKey = "AKIAIOSFODNN7EXAMPLE";`;

			const result = detector.detect(code, "src/test.ts");

			expect(result.findings[0].snippet).toBeDefined();
			expect(result.findings[0].snippet).toContain("AKIA");
		});
	});

	describe("Multiple Findings", () => {
		it("should detect multiple secrets in one file", () => {
			const code = `
				const aws = "AKIAIOSFODNN7EXAMPLE";
				const github = "ghp_1234567890abcdefghijklmnopqrst123456";
				const stripe = "sk_live_1234567890abcdefghijklmn";
			`;

			const result = detector.detect(code, "src/secrets.ts");

			expect(result.findings.length).toBeGreaterThanOrEqual(3);
		});

		it("should detect different types of secrets", () => {
			const code = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				const password = "myPassword123";
			`;

			const result = detector.detect(code, "src/mixed.ts");

			const types = result.findings.map((f) => f.type);
			expect(types).toContain("AWS Access Key");
			expect(types).toContain("Password Assignment");
		});
	});
});
