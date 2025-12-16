/**
 * CLI Transport Adapter Tests
 *
 * Tests for the CLI transport adapter that bridges the engine
 * with command-line tools (apps/cli).
 *
 * TDD Phase: RED - All tests should FAIL initially
 * Following TDD_CORE.md 4-path coverage: happy, sad, edge, error
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CLIEngineAdapter, type CLIInput } from "../../src/transports/cli";

describe("CLIEngineAdapter", () => {
	let adapter: CLIEngineAdapter;

	beforeEach(() => {
		adapter = new CLIEngineAdapter();
	});

	// ==========================================================================
	// HAPPY PATH: Valid file paths
	// ==========================================================================
	describe("analyze - Happy Path", () => {
		it("should analyze file paths and return CLI-friendly output", async () => {
			const input: CLIInput = {
				files: [{ path: "src/auth/login.ts", content: "const user = authenticate();" }],
				format: "text",
			};

			const result = await adapter.analyze(input);

			expect(result).toBeDefined();
			expect(typeof result.exitCode).toBe("number");
			expect(result.exitCode).toBeGreaterThanOrEqual(0);
			expect(result.exitCode).toBeLessThanOrEqual(1);
			expect(typeof result.output).toBe("string");
			expect(result.riskScore).toBeGreaterThanOrEqual(0);
		});

		it("should detect high-risk patterns and return exit code 1", async () => {
			const input: CLIInput = {
				files: [{ path: "secrets.ts", content: 'const API_KEY = "sk_live_secret";' }],
				format: "text",
			};

			const result = await adapter.analyze(input);

			expect(result.exitCode).toBe(1);
			expect(result.riskScore).toBeGreaterThan(5);
			expect(result.output).toContain("risk");
		});

		it("should support JSON output format", async () => {
			const input: CLIInput = {
				files: [{ path: "test.ts", content: "const x = 1;" }],
				format: "json",
			};

			const result = await adapter.analyze(input);

			expect(result.output).toBeDefined();
			// JSON output should be parseable
			const parsed = JSON.parse(result.output);
			expect(parsed).toHaveProperty("riskScore");
			expect(parsed).toHaveProperty("riskLevel");
		});
	});

	// ==========================================================================
	// SAD PATH: Empty or minimal inputs
	// ==========================================================================
	describe("analyze - Sad Path", () => {
		it("should return exit code 0 for empty files array", async () => {
			const input: CLIInput = { files: [], format: "text" };

			const result = await adapter.analyze(input);

			expect(result.exitCode).toBe(0);
			expect(result.riskScore).toBe(0);
		});

		it("should handle files with no content", async () => {
			const input: CLIInput = {
				files: [{ path: "empty.ts", content: "" }],
				format: "text",
			};

			const result = await adapter.analyze(input);

			expect(result.exitCode).toBe(0);
			expect(result.riskScore).toBeLessThanOrEqual(1);
		});

		it("should handle whitespace-only content", async () => {
			const input: CLIInput = {
				files: [{ path: "blank.ts", content: "   \n\n\t  " }],
				format: "text",
			};

			const result = await adapter.analyze(input);

			expect(result.exitCode).toBe(0);
		});
	});

	// ==========================================================================
	// EDGE CASES: Large inputs, performance, boundary conditions
	// ==========================================================================
	describe("analyze - Edge Cases", () => {
		it("should handle multiple files within performance budget", { timeout: 30000 }, async () => {
			const input: CLIInput = {
				files: Array.from({ length: 5 }, (_, i) => ({
					path: `src/module${i}.ts`,
					content: `export const value${i} = ${i};\n`.repeat(20),
				})),
				format: "text",
			};

			const startTime = Date.now();
			const result = await adapter.analyze(input);
			const duration = Date.now() - startTime;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(20000);
		});

		it("should handle quiet mode (no output)", async () => {
			const input: CLIInput = {
				files: [{ path: "test.ts", content: "code" }],
				format: "text",
				quiet: true,
			};

			const result = await adapter.analyze(input);

			// Quiet mode should still analyze but minimize output
			expect(result.exitCode).toBeDefined();
			expect(result.riskScore).toBeDefined();
		});

		it("should support SARIF output format for CI integration", async () => {
			const input: CLIInput = {
				files: [{ path: "test.ts", content: "eval(x);" }],
				format: "sarif",
			};

			const result = await adapter.analyze(input);

			// SARIF should be parseable
			const sarif = JSON.parse(result.output);
			expect(sarif).toHaveProperty("version");
			expect(sarif).toHaveProperty("runs");
		});
	});

	// ==========================================================================
	// ERROR PATH: Invalid inputs, malformed data
	// ==========================================================================
	describe("analyze - Error Path", () => {
		it("should return error for invalid input", async () => {
			// @ts-expect-error - Testing invalid input
			const result = await adapter.analyze("not an object");

			expect(result.exitCode).toBe(1);
			expect(result.error).toBeDefined();
		});

		it("should handle null input gracefully", async () => {
			// @ts-expect-error - Testing null input
			const result = await adapter.analyze(null);

			expect(result.exitCode).toBe(1);
			expect(result.riskScore).toBe(0);
		});

		it("should handle malformed file objects gracefully", async () => {
			const input = {
				files: [{ path: "valid.ts" }, {}], // Missing content
				format: "text",
			} as CLIInput;

			const result = await adapter.analyze(input);

			// Should process valid files, skip malformed
			expect(result.exitCode).toBeGreaterThanOrEqual(0);
		});
	});

	// ==========================================================================
	// SESSION MANAGEMENT
	// ==========================================================================
	describe("Session Management", () => {
		it("should reset session when requested", async () => {
			await adapter.analyze({ files: [{ path: "a.ts", content: "x" }], format: "text" });
			adapter.resetSession();

			const health = adapter.getSessionHealth();

			expect(health.score).toBe(100);
			expect(health.warnings).toHaveLength(0);
		});
	});
});
