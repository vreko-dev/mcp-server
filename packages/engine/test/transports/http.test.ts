/**
 * HTTP Transport Adapter Tests
 *
 * Tests for the HTTP transport adapter that bridges the engine
 * with REST API endpoints (apps/api).
 *
 * TDD Phase: RED - All tests should FAIL initially
 * Following TDD_CORE.md 4-path coverage: happy, sad, edge, error
 */

import { beforeEach, describe, expect, it } from "vitest";
import { HTTPEngineAdapter, type HTTPFileInput, type HTTPRiskResponse } from "../../src/transports/http";

describe("HTTPEngineAdapter", () => {
	let adapter: HTTPEngineAdapter;

	beforeEach(() => {
		adapter = new HTTPEngineAdapter();
	});

	// ==========================================================================
	// HAPPY PATH: Valid file inputs
	// ==========================================================================
	describe("analyzeFiles - Happy Path", () => {
		it("should analyze valid file inputs and return risk response", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "src/auth/login.ts",
					content: "const user = authenticate();",
					changeType: "modified",
					linesAdded: 5,
					linesDeleted: 2,
				},
			];

			const result = await adapter.analyzeFiles(files);

			expect(result).toBeDefined();
			expect(result.riskScore).toBeGreaterThanOrEqual(0);
			expect(result.riskScore).toBeLessThanOrEqual(10);
			expect(result.riskLevel).toMatch(/^(safe|low|medium|high|critical)$/);
			expect(Array.isArray(result.riskFactors)).toBe(true);
			expect(result.analysisId).toBeDefined();
		});

		it("should detect high-risk patterns in file content", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "config/secrets.ts",
					content: 'const API_KEY = "sk_live_abcdef123456789";',
					changeType: "added",
				},
			];

			const result = await adapter.analyzeFiles(files);

			expect(result.riskLevel).toMatch(/^(high|critical)$/);
			expect(result.riskScore).toBeGreaterThan(5);
			expect(result.riskFactors.length).toBeGreaterThan(0);
		});

		it("should include session health for coaching integration", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "src/utils/helpers.ts",
					content: "export const add = (a, b) => a + b;",
					changeType: "added",
				},
			];

			const result = await adapter.analyzeFiles(files);

			expect(result.session).toBeDefined();
			expect(typeof result.session.score).toBe("number");
			expect(result.session.score).toBeGreaterThanOrEqual(0);
			expect(result.session.score).toBeLessThanOrEqual(100);
		});
	});

	// ==========================================================================
	// SAD PATH: Empty or minimal inputs
	// ==========================================================================
	describe("analyzeFiles - Sad Path", () => {
		it("should return zero risk for empty files array", async () => {
			const files: HTTPFileInput[] = [];

			const result = await adapter.analyzeFiles(files);

			expect(result.riskLevel).toBe("safe");
			expect(result.riskScore).toBe(0);
			expect(result.riskFactors).toHaveLength(0);
		});

		it("should handle files with no content", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "empty.ts",
					content: "",
					changeType: "added",
				},
			];

			const result = await adapter.analyzeFiles(files);

			expect(result.riskLevel).toBe("safe");
			expect(result.riskScore).toBeLessThanOrEqual(1);
		});

		it("should handle deleted files (no content to analyze)", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "deprecated/old-module.ts",
					changeType: "deleted",
					linesDeleted: 100,
				},
			];

			const result = await adapter.analyzeFiles(files);

			// Deletions may have volume risk but no code threat
			expect(result).toBeDefined();
			expect(result.riskLevel).toMatch(/^(safe|low|medium)$/);
		});
	});

	// ==========================================================================
	// EDGE CASES: Large inputs, performance, boundary conditions
	// ==========================================================================
	describe("analyzeFiles - Edge Cases", () => {
		it("should handle large file sets within performance budget", { timeout: 30000 }, async () => {
			// 10 files with moderate content - realistic for a PR
			const files: HTTPFileInput[] = Array.from({ length: 10 }, (_, i) => ({
				path: `src/module${i}/index.ts`,
				content: `export const value${i} = ${i};\n`.repeat(50),
				changeType: "modified" as const,
				linesAdded: 50,
			}));

			const startTime = Date.now();
			const result = await adapter.analyzeFiles(files);
			const duration = Date.now() - startTime;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(20000); // 20 second budget (allows for coverage overhead)
		});

		it("should handle mixed file types (ts, js, json, md)", async () => {
			const files: HTTPFileInput[] = [
				{ path: "src/app.ts", content: "const x = 1;", changeType: "modified" },
				{ path: "package.json", content: '{"name": "test"}', changeType: "modified" },
				{ path: "README.md", content: "# Title", changeType: "added" },
			];

			const result = await adapter.analyzeFiles(files);

			expect(result).toBeDefined();
			expect(result.analysisId).toBeDefined();
		});

		it("should handle files with binary-like content gracefully", async () => {
			const files: HTTPFileInput[] = [
				{
					path: "assets/image.png",
					content: "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
					changeType: "added",
				},
			];

			const result = await adapter.analyzeFiles(files);

			// Should not crash, just skip or low-risk
			expect(result).toBeDefined();
		});
	});

	// ==========================================================================
	// ERROR PATH: Invalid inputs, malformed data
	// ==========================================================================
	describe("analyzeFiles - Error Path", () => {
		it("should return error for invalid input format", async () => {
			// @ts-expect-error - Testing invalid input
			const result = await adapter.analyzeFiles("not an array");

			expect(result.error).toBeDefined();
			expect(result.riskLevel).toBe("safe");
		});

		it("should handle null input gracefully", async () => {
			// @ts-expect-error - Testing null input
			const result = await adapter.analyzeFiles(null);

			expect(result.error).toBeDefined();
			expect(result.riskScore).toBe(0);
		});

		it("should handle malformed file objects gracefully", async () => {
			const files = [
				{ path: "valid.ts", content: "code" },
				{}, // Missing required fields
			] as HTTPFileInput[];

			const result = await adapter.analyzeFiles(files);

			// Should process valid files, skip malformed
			expect(result).toBeDefined();
		});
	});

	// ==========================================================================
	// API RESPONSE FORMAT (matches apps/api contract)
	// ==========================================================================
	describe("Response Format - API Contract", () => {
		it("should match expected API response structure", async () => {
			const files: HTTPFileInput[] = [{ path: "src/test.ts", content: "const x = 1;", changeType: "added" }];

			const result: HTTPRiskResponse = await adapter.analyzeFiles(files);

			// Must match apps/api/modules/risk/procedures/analyze-risk.ts output
			expect(result).toHaveProperty("analysisId");
			expect(result).toHaveProperty("riskScore");
			expect(result).toHaveProperty("riskLevel");
			expect(result).toHaveProperty("riskFactors");
			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("timestamp");
			expect(result).toHaveProperty("session");
		});

		it("should generate unique analysisId per request", async () => {
			const files: HTTPFileInput[] = [{ path: "a.ts", content: "1" }];

			const result1 = await adapter.analyzeFiles(files);
			const result2 = await adapter.analyzeFiles(files);

			expect(result1.analysisId).not.toBe(result2.analysisId);
		});
	});

	// ==========================================================================
	// SESSION MANAGEMENT
	// ==========================================================================
	describe("Session Management", () => {
		it("should reset session when requested", async () => {
			await adapter.analyzeFiles([{ path: "a.ts", content: "code" }]);
			adapter.resetSession();

			const health = adapter.getSessionHealth();

			expect(health.score).toBe(100);
			expect(health.warnings).toHaveLength(0);
		});

		it("should accumulate session state across analyses", async () => {
			await adapter.analyzeFiles([{ path: "a.ts", content: "const x = 1;" }]);
			await adapter.analyzeFiles([{ path: "b.ts", content: "const y = 2;" }]);

			const health = adapter.getSessionHealth();

			expect(health).toBeDefined();
			expect(typeof health.score).toBe("number");
		});
	});
});
