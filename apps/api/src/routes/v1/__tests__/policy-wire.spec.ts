import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import analyzeRoute from "../src/routes/guardian.analyze";
import policyRoute from "../src/routes/policy.current";

// Test IDs: polw-001, polw-002
describe("Policy Integration", () => {
	describe("polw-001: Analyze returns {decision,rules_hit,confidence}", () => {
		it("should return policy decision data from analyze endpoint", async () => {
			const app = new Hono();
			app.route("/", analyzeRoute);

			const mockRequest = {
				content: 'console.log("test");',
				filePath: "/test/file.js",
				context: {
					sessionId: "test-session",
					requestId: "test-request",
					client: "vscode",
				},
			};

			const response = await app.request("/guardian/analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(mockRequest),
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toHaveProperty("decision");
			expect(result).toHaveProperty("confidence");
			expect(result).toHaveProperty("rules_hit");

			// Validate decision values
			expect(["allow", "review", "block"]).toContain(result.decision);

			// Validate confidence is a number between 0 and 1
			expect(typeof result.confidence).toBe("number");
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);

			// Validate rules_hit is an array
			expect(Array.isArray(result.rules_hit)).toBe(true);
		});
	});

	describe("polw-002: Policy version endpoint returns cacheable version", () => {
		it("should return policy version with cache headers", async () => {
			const app = new Hono();
			app.route("/", policyRoute);

			const response = await app.request("/policy/current", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const result = await response.json();
			expect(result).toHaveProperty("version");
			expect(result).toHaveProperty("lastUpdated");
			expect(result).toHaveProperty("checksum");

			// Check for cache headers
			const cacheControl = response.headers.get("Cache-Control");
			expect(cacheControl).toBeDefined();
			expect(cacheControl).toContain("max-age");
		});
	});
});
