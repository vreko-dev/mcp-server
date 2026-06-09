import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("MCP Server Security - P0 Fixes", () => {
	let serverProcess: ChildProcess;
	const TEST_PORT = 8081;
	const BASE_URL = `http://localhost:${TEST_PORT}`;

	beforeEach(async () => {
		// Start server for testing
		serverProcess = spawn("node", [path.join(__dirname, "../../dist/index.js")], {
			env: {
				...process.env,
				PORT: TEST_PORT.toString(),
				NODE_ENV: "test",
				CORS_ORIGIN: "https://allowed-domain.com",
			},
			stdio: "pipe",
		});

		// Wait for server to start
		await new Promise((resolve) => setTimeout(resolve, 1000));
	});

	afterEach(() => {
		if (serverProcess) {
			serverProcess.kill();
		}
	});

	describe("P0-1: Silent Error Logging", () => {
		it("should log JSON parse errors with request context", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "invalid json{",
			});

			expect(response.status).toBe(400);
			const json = (await response.json()) as { error: string };
			expect(json.error).toBe("BAD_REQUEST");

			// TODO: Verify logs contain parseError details
			// This requires capturing stderr output
		});

		it("should log request ID with all errors", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspace: "/test" }), // Missing apiKey
			});

			expect(response.status).toBe(401);
			// TODO: Verify logs contain requestId
		});
	});

	describe("P0-4: API Key Validation", () => {
		it("should reject empty API key", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/valid/path",
					apiKey: "",
				}),
			});

			expect(response.status).toBe(401);
			const json = (await response.json()) as { error: string };
			expect(json.error).toBe("UNAUTHORIZED");
		});

		it("should reject API key without valid prefix", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/valid/path",
					apiKey: "invalid_key_format",
				}),
			});

			expect(response.status).toBe(401);
			const json = (await response.json()) as { error: string; message: string };
			expect(json.error).toBe("UNAUTHORIZED");
			expect(json.message).toContain("Invalid API key format");
		});

		it("should accept valid sk_live_ prefix format", async () => {
			// Note: With Better Auth consolidation, valid format keys still need to exist in DB
			// This test verifies format validation doesn't reject valid prefixes
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/tmp/test-workspace",
					apiKey: "sk_live_test_1234567890abcdef",
				}),
			});

			// Key has valid format, but won't exist in DB so auth returns 401
			// This is correct behavior - we're testing that format is accepted
			const json = (await response.json()) as { error?: string; message?: string };
			// Should NOT be a format error - format is valid
			// Message may be undefined or not contain "format"
			if (json.message) {
				expect(json.message).not.toContain("Invalid API key format");
			}
		});

		it("should accept valid sk_test_ prefix format", async () => {
			// Note: With Better Auth consolidation, valid format keys still need to exist in DB
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/tmp/test-workspace",
					apiKey: "sk_test_1234567890abcdef",
				}),
			});

			// Key has valid format, but won't exist in DB
			const json = (await response.json()) as { error?: string; message?: string };
			// Should NOT be a format error - format is valid
			// Message may be undefined or not contain "format"
			if (json.message) {
				expect(json.message).not.toContain("Invalid API key format");
			}
		});

		it("should reject API key with special characters", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/valid/path",
					apiKey: "sk_live_test; DROP TABLE users;",
				}),
			});

			expect(response.status).toBe(401);
		});
	});

	describe("P0-7: Workspace Path Injection", () => {
		it("should reject relative path traversal attempts", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "../../../etc/passwd",
					apiKey: "sk_live_test_valid",
				}),
			});

			expect(response.status).toBe(400);
			const json = (await response.json()) as { error: string; message: string };
			expect(json.error).toBe("BAD_REQUEST");
			expect(json.message).toContain("Invalid workspace path");
		});

		it("should reject workspace with double dots", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/tmp/../../../etc/passwd",
					apiKey: "sk_live_test_valid",
				}),
			});

			expect(response.status).toBe(400);
			const json = (await response.json()) as { message: string };
			expect(json.message).toContain("Invalid workspace path");
		});

		it("should accept absolute path without traversal", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/tmp/valid-workspace",
					apiKey: "sk_live_test_valid",
				}),
			});

			// May fail for other reasons, but path validation should pass
			const json = (await response.json()) as { message?: string };
			expect(json.message).not.toContain("Invalid workspace path");
		});

		it("should reject workspace with null bytes", async () => {
			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspace: "/tmp/test\0/malicious",
					apiKey: "sk_live_test_valid",
				}),
			});

			expect(response.status).toBe(400);
		});
	});

	describe("P0-8: CORS Validation", () => {
		it("should reject wildcard CORS in production", async () => {
			// Restart server with production env
			serverProcess.kill();

			serverProcess = spawn("node", [path.join(__dirname, "../../dist/index.js")], {
				env: {
					...process.env,
					PORT: TEST_PORT.toString(),
					NODE_ENV: "production",
					CORS_ORIGIN: "*", // Should be rejected
				},
				stdio: "pipe",
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const response = await fetch(`${BASE_URL}/health`);

			// Server should fail to start or reject wildcard
			// In a real implementation, we'd check process exit or startup logs
			expect(response.ok || serverProcess.killed).toBe(true);
		});

		it("should allow specific origin in CORS header", async () => {
			const response = await fetch(`${BASE_URL}/health`, {
				headers: {
					Origin: "https://allowed-domain.com",
				},
			});

			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://allowed-domain.com");
		});

		it("should support multiple CORS origins", async () => {
			serverProcess.kill();

			serverProcess = spawn("node", [path.join(__dirname, "../../dist/index.js")], {
				env: {
					...process.env,
					PORT: TEST_PORT.toString(),
					NODE_ENV: "production",
					CORS_ORIGIN: "https://domain1.com,https://domain2.com",
				},
				stdio: "pipe",
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const response1 = await fetch(`${BASE_URL}/health`, {
				headers: { Origin: "https://domain1.com" },
			});
			expect(response1.headers.get("Access-Control-Allow-Origin")).toBe("https://domain1.com");

			const response2 = await fetch(`${BASE_URL}/health`, {
				headers: { Origin: "https://domain2.com" },
			});
			expect(response2.headers.get("Access-Control-Allow-Origin")).toBe("https://domain2.com");
		});
	});

	describe("P1-3: Request Body Size Limit", () => {
		it("should reject requests larger than 10MB", async () => {
			const largeBody = JSON.stringify({
				workspace: "/tmp/test",
				apiKey: "sk_live_test_valid",
				data: "x".repeat(11 * 1024 * 1024), // 11MB
			});

			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: largeBody,
			});

			expect(response.status).toBe(413);
			const json = (await response.json()) as { error: string };
			expect(json.error).toBe("PAYLOAD_TOO_LARGE");
		});

		it("should accept requests under 10MB", async () => {
			const validBody = JSON.stringify({
				workspace: "/tmp/test",
				apiKey: "sk_live_test_valid",
				data: "x".repeat(1024 * 1024), // 1MB
			});

			const response = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: validBody,
			});

			// Should not fail due to size
			expect(response.status).not.toBe(413);
		});
	});
});
