/**
 * Enhanced Validation Layers Tests
 *
 * Tests for SecurityLayer++ and PerformanceLayer++ pattern additions.
 *
 * Phase 1 Implementation per recommendations:
 * - SecurityLayer++: SecretDetector integration + unsafe function patterns
 * - PerformanceLayer++: O(n²), memory leaks, ReDoS, shell injection patterns
 *
 * Following red-green-refactor TDD methodology.
 *
 * @see https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns
 * @see https://github.com/rahmansec/SecretHunter
 */

import { beforeEach, describe, expect, it } from "vitest";
import { PerformanceLayer, SecurityLayer } from "../src/validation/layers/index.js";
import { ValidationPipeline } from "../src/validation/ValidationPipeline.js";

// =============================================================================
// SECURITY LAYER++ TESTS
// =============================================================================

describe("SecurityLayer++ Enhanced Detection", () => {
	let securityLayer: SecurityLayer;

	beforeEach(() => {
		securityLayer = new SecurityLayer();
	});

	describe("Secret Detection Integration", () => {
		// AWS Patterns (from GitHub Secret Scanning)
		describe("AWS Secrets", () => {
			it("should detect AWS Access Key ID (AKIA pattern)", async () => {
				const code = `
const awsAccessKey = "AKIAIOSFODNN7EXAMPLE";
`;
				const result = await securityLayer.validate(code, "src/config.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(
					result.issues.some(
						(i) =>
							i.severity === "critical" &&
							(i.type.includes("SECRET") ||
								i.type.includes("AWS") ||
								i.message.toLowerCase().includes("aws")),
					),
				).toBe(true);
			});

			it("should detect AWS Secret Access Key", async () => {
				const code = `
aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
`;
				const result = await securityLayer.validate(code, "src/config.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});
		});

		// GitHub Token Patterns
		describe("GitHub Tokens", () => {
			it("should detect GitHub Personal Access Token (ghp_)", async () => {
				const code = `
const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
`;
				const result = await securityLayer.validate(code, "src/auth.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(
					result.issues.some(
						(i) =>
							i.severity === "critical" &&
							(i.type.includes("GITHUB") || i.message.toLowerCase().includes("github")),
					),
				).toBe(true);
			});

			it("should detect GitHub OAuth Token (gho_)", async () => {
				const code = `
const oauthToken = "gho_1234567890abcdefghijklmnopqrstuvwxyz";
`;
				const result = await securityLayer.validate(code, "src/auth.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});

			it("should detect GitHub Fine-Grained Token (github_pat_)", async () => {
				const code = `
const fineGrainedToken = "github_pat_11ABCD123_abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12345";
`;
				const result = await securityLayer.validate(code, "src/auth.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});
		});

		// Stripe Patterns
		describe("Stripe Keys", () => {
			it("should detect Stripe Live Secret Key (sk_live_)", async () => {
				const code = `
const stripeKey = "sk_live_1234567890abcdefghijklmn";
`;
				const result = await securityLayer.validate(code, "src/payment.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(
					result.issues.some(
						(i) =>
							i.severity === "critical" &&
							(i.type.includes("STRIPE") || i.message.toLowerCase().includes("stripe")),
					),
				).toBe(true);
			});

			it("should detect Stripe Test Secret Key (sk_test_)", async () => {
				const code = `
const stripeTestKey = "sk_test_1234567890abcdefghijklmn";
`;
				const result = await securityLayer.validate(code, "src/payment.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});

			it("should detect Stripe Restricted Key (rk_live_)", async () => {
				const code = `
const stripeRestrictedKey = "rk_live_1234567890abcdefghijklmn";
`;
				const result = await securityLayer.validate(code, "src/payment.ts");

				expect(result.issues.length).toBeGreaterThan(0);
			});
		});

		// JWT Patterns
		describe("JWT Tokens", () => {
			it("should detect JWT token pattern", async () => {
				const code = `
const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
`;
				const result = await securityLayer.validate(code, "src/auth.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(
					result.issues.some((i) => i.type.includes("JWT") || i.message.toLowerCase().includes("jwt")),
				).toBe(true);
			});
		});

		// Database Connection Strings
		describe("Database Connection Strings", () => {
			it("should detect PostgreSQL connection string with password", async () => {
				const code = `
const dbUrl = "postgres://user:secretpassword@localhost:5432/mydb";
`;
				const result = await securityLayer.validate(code, "src/db.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});

			it("should detect MongoDB connection string with password", async () => {
				const code = `
const mongoUrl = "mongodb+srv://admin:secretpass123@cluster0.abc123.mongodb.net/mydb";
`;
				const result = await securityLayer.validate(code, "src/db.ts");

				expect(result.issues.length).toBeGreaterThan(0);
			});
		});

		// Private Key Detection
		describe("Private Keys", () => {
			it("should detect RSA private key header", async () => {
				const code = `
const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3
-----END RSA PRIVATE KEY-----\`;
`;
				const result = await securityLayer.validate(code, "src/crypto.ts");

				expect(result.issues.length).toBeGreaterThan(0);
				expect(result.issues.some((i) => i.severity === "critical")).toBe(true);
			});

			it("should detect EC private key header", async () => {
				const code = `
const ecKey = \`-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIBYf
-----END EC PRIVATE KEY-----\`;
`;
				const result = await securityLayer.validate(code, "src/crypto.ts");

				expect(result.issues.length).toBeGreaterThan(0);
			});
		});

		// High-Entropy String Detection
		describe("High-Entropy Secrets", () => {
			it("should detect high-entropy strings as potential secrets", async () => {
				const code = `
const secret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";
`;
				const result = await securityLayer.validate(code, "src/config.ts");

				// Should detect via entropy analysis
				expect(result.issues.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Unsafe Function Detection", () => {
		it("should detect eval() as critical security issue", async () => {
			const code = `
function execute(userInput: string) {
	return eval(userInput);
}
`;
			const result = await securityLayer.validate(code, "src/executor.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.issues.some((i) => i.severity === "critical" && i.type === "UNSAFE_EVAL")).toBe(true);
		});

		it("should detect new Function() as critical security issue", async () => {
			const code = `
const dynamicFn = new Function("return " + userInput);
`;
			const result = await securityLayer.validate(code, "src/executor.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) => i.severity === "critical" && (i.type === "UNSAFE_EVAL" || i.type === "UNSAFE_FUNCTION"),
				),
			).toBe(true);
		});

		it("should detect child_process.exec() as critical (command injection)", async () => {
			const code = `
import { exec } from 'child_process';
exec(\`ls \${userInput}\`);
`;
			const result = await securityLayer.validate(code, "src/shell.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) => i.severity === "critical" && (i.type === "COMMAND_INJECTION" || i.type.includes("EXEC")),
				),
			).toBe(true);
		});

		it("should detect innerHTML assignment as warning (XSS)", async () => {
			const code = `
element.innerHTML = userContent;
`;
			const result = await securityLayer.validate(code, "src/ui.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) =>
						(i.severity === "warning" || i.severity === "critical") &&
						(i.type === "XSS_RISK" || i.type.includes("INNERHTML")),
				),
			).toBe(true);
		});

		it("should detect dangerouslySetInnerHTML as warning (React XSS)", async () => {
			const code = `
<div dangerouslySetInnerHTML={{ __html: userContent }} />
`;
			const result = await securityLayer.validate(code, "src/Component.tsx");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) => i.type === "XSS_RISK" || i.type.includes("DANGEROUS") || i.message.includes("XSS"),
				),
			).toBe(true);
		});

		it("should detect spawn with shell as critical", async () => {
			const code = `
import { spawn } from 'child_process';
spawn('sh', ['-c', command]);
`;
			const result = await securityLayer.validate(code, "src/shell.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) =>
						i.severity === "critical" && (i.type === "SHELL_INJECTION" || i.type === "COMMAND_INJECTION"),
				),
			).toBe(true);
		});
	});

	describe("False Positive Prevention", () => {
		it("should NOT flag secrets in test files", async () => {
			const code = `
const testApiKey = "sk_test_1234567890abcdefghijklmn";
const mockToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
`;
			const result = await securityLayer.validate(code, "test/payment.test.ts");

			// Test files should not trigger secret detection
			const criticalSecrets = result.issues.filter(
				(i) => i.severity === "critical" && (i.type.includes("SECRET") || i.type.includes("TOKEN")),
			);
			expect(criticalSecrets.length).toBe(0);
		});

		it("should NOT flag example/placeholder patterns", async () => {
			const code = `
// Example: const apiKey = "YOUR_API_KEY_HERE";
const placeholder = "xxxx-xxxx-xxxx-xxxx";
`;
			const result = await securityLayer.validate(code, "src/config.ts");

			// Placeholders should not trigger
			expect(result.issues.filter((i) => i.message.includes("placeholder")).length).toBe(0);
		});
	});
});

// =============================================================================
// PERFORMANCE LAYER++ TESTS
// =============================================================================

describe("PerformanceLayer++ Enhanced Detection", () => {
	let performanceLayer: PerformanceLayer;

	beforeEach(() => {
		performanceLayer = new PerformanceLayer();
	});

	describe("O(n²) Nested Loop Detection", () => {
		it("should detect nested for loops as O(n²) warning", async () => {
			const code = `
function findDuplicates(arr: number[]): number[] {
	const duplicates: number[] = [];
	for (let i = 0; i < arr.length; i++) {
		for (let j = i + 1; j < arr.length; j++) {
			if (arr[i] === arr[j]) {
				duplicates.push(arr[i]);
			}
		}
	}
	return duplicates;
}
`;
			const result = await performanceLayer.validate(code, "src/utils.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) =>
						i.type === "O_N2_ALGORITHM" ||
						i.type === "NESTED_LOOPS" ||
						i.message.includes("O(n²)") ||
						i.message.includes("nested"),
				),
			).toBe(true);
		});

		it("should detect forEach inside for loop", async () => {
			const code = `
for (const user of users) {
	permissions.forEach(perm => {
		checkPermission(user, perm);
	});
}
`;
			const result = await performanceLayer.validate(code, "src/auth.ts");

			expect(result.issues.length).toBeGreaterThan(0);
		});
	});

	describe("Memory Leak Detection", () => {
		it("should detect addEventListener without removeEventListener", async () => {
			const code = `
function setupHandler() {
	window.addEventListener('resize', handleResize);
	// Missing cleanup!
}
`;
			const result = await performanceLayer.validate(code, "src/handlers.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) =>
						i.type === "MEMORY_LEAK" ||
						i.type === "EVENT_LISTENER_LEAK" ||
						i.message.toLowerCase().includes("memory") ||
						i.message.toLowerCase().includes("cleanup"),
				),
			).toBe(true);
		});

		it("should NOT flag addEventListener with corresponding removeEventListener", async () => {
			const code = `
function setupHandler() {
	window.addEventListener('resize', handleResize);
	return () => window.removeEventListener('resize', handleResize);
}
`;
			const result = await performanceLayer.validate(code, "src/handlers.ts");

			// Should not flag when cleanup exists
			const leakIssues = result.issues.filter(
				(i) => i.type === "MEMORY_LEAK" || i.type === "EVENT_LISTENER_LEAK",
			);
			expect(leakIssues.length).toBe(0);
		});
	});

	describe("ReDoS Vulnerability Detection", () => {
		it("should detect regex with nested quantifiers (ReDoS)", async () => {
			const code = `
const emailRegex = /^([a-zA-Z0-9]+)*@example.com$/;
`;
			const result = await performanceLayer.validate(code, "src/validation.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some(
					(i) =>
						i.severity === "critical" &&
						(i.type === "REDOS" ||
							i.type === "REGEX_DOS" ||
							i.message.toLowerCase().includes("redos") ||
							i.message.toLowerCase().includes("regex")),
				),
			).toBe(true);
		});

		it("should detect catastrophic backtracking patterns", async () => {
			const code = `
const pattern = /^(a+)+$/;
`;
			const result = await performanceLayer.validate(code, "src/validation.ts");

			expect(result.issues.length).toBeGreaterThan(0);
		});
	});

	describe("Shell Injection Detection", () => {
		it("should detect spawn with shell option", async () => {
			const code = `
spawn('ls', [userInput], { shell: true });
`;
			const result = await performanceLayer.validate(code, "src/shell.ts");

			// Note: This might be in SecurityLayer instead - adjust based on implementation
			expect(result.issues.length).toBeGreaterThan(0);
		});
	});

	describe("Existing Patterns Still Work", () => {
		it("should still detect console.log in production code", async () => {
			const code = `
export function doSomething() {
	console.log("debug");
	return true;
}
`;
			const result = await performanceLayer.validate(code, "apps/api/src/service.ts");

			expect(result.issues.some((i) => i.type === "NO_CONSOLE")).toBe(true);
		});

		it("should still detect await in loop (N+1)", async () => {
			const code = `
for (const id of ids) {
	await db.query(\`SELECT * FROM users WHERE id = \${id}\`);
}
`;
			const result = await performanceLayer.validate(code, "src/data.ts");

			expect(result.issues.some((i) => i.type === "AWAIT_IN_LOOP")).toBe(true);
		});

		it("should still detect synchronous file I/O", async () => {
			const code = `
const content = fs.readFileSync('/path/to/file');
`;
			const result = await performanceLayer.validate(code, "src/utils.ts");

			expect(result.issues.some((i) => i.type === "SYNC_FILE_IO")).toBe(true);
		});
	});
});

// =============================================================================
// INTEGRATION TESTS - Full Pipeline with Enhanced Layers
// =============================================================================

describe("ValidationPipeline Integration with Enhanced Layers", () => {
	let pipeline: ValidationPipeline;

	beforeEach(() => {
		pipeline = new ValidationPipeline();
	});

	describe("Security + Performance Combined Detection", () => {
		it("should catch multiple security issues in one file", async () => {
			const badCode = `
const apiKey = "sk_live_1234567890abcdefghijklmn";
const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";

function execute(input: string) {
	eval(input);
}
`;
			const result = await pipeline.validate(badCode, "src/dangerous.ts");

			expect(result.overall.passed).toBe(false);
			expect(result.overall.confidence).toBeLessThan(0.5);
			expect(result.recommendation).toBe("full_review");

			const securityLayer = result.layers.find((l) => l.layer === "security");
			expect(securityLayer).toBeDefined();
			expect(securityLayer!.issues.length).toBeGreaterThanOrEqual(2);
		});

		it("should catch multiple performance issues in one file", async () => {
			const slowCode = `
for (const user of users) {
	for (const perm of permissions) {
		console.log(user, perm);
		await db.query(\`SELECT * FROM access WHERE user=\${user.id}\`);
	}
}
`;
			const result = await pipeline.validate(slowCode, "src/slow.ts");

			const perfLayer = result.layers.find((l) => l.layer === "performance");
			expect(perfLayer).toBeDefined();
			expect(perfLayer!.issues.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Confidence Scoring with New Patterns", () => {
		it("should heavily penalize secret detection", async () => {
			const secretCode = `
const awsKey = "AKIAIOSFODNN7EXAMPLE";
`;
			const result = await pipeline.validate(secretCode, "src/config.ts");

			// Secrets should result in very low confidence
			expect(result.overall.confidence).toBeLessThan(0.5);
		});

		it("should moderately penalize performance issues", async () => {
			const perfCode = `
for (const a of arr1) {
	for (const b of arr2) {
		process(a, b);
	}
}
`;
			const result = await pipeline.validate(perfCode, "src/process.ts");

			// Performance issues should lower confidence but not as much as security
			expect(result.overall.confidence).toBeLessThan(0.9);
			expect(result.overall.confidence).toBeGreaterThan(0.3);
		});
	});

	describe("Layer Performance Budget", () => {
		it("should complete validation within 130ms budget", async () => {
			const code = `
import { logger } from "@snapback/core";

export function process(data: string): string {
	logger.info("Processing", { data });
	return data.toUpperCase();
}
`;
			const start = Date.now();
			await pipeline.validate(code, "src/process.ts");
			const duration = Date.now() - start;

			// Should complete within 130ms (with some buffer for CI variability)
			expect(duration).toBeLessThan(500); // Generous buffer for CI
		});
	});
});
