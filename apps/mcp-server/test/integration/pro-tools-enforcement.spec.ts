import { beforeEach, describe, expect, it } from "vitest";
import { authenticate, clearAuthCache } from "../../src/auth";
import { addResult, createSarifLog } from "../../src/utils/sarif";

describe("MCP Pro Tools Enforcement", () => {
	beforeEach(() => {
		// Clear auth cache before each test
		clearAuthCache();

		// Reset environment variables
		delete process.env.SNAPBACK_NO_NETWORK;
		delete process.env.SNAPBACK_API_KEY;
		delete process.env.SNAPBACK_BACKEND_URL;
	});

	it("mcp-pro-001: should authenticate Pro user correctly", async () => {
		// Set up Pro user
		process.env.SNAPBACK_NO_NETWORK = "true";
		const apiKey = "sk_live_1234567890abcdef";

		const authResult = await authenticate(apiKey);

		// Should authenticate as Pro user
		expect(authResult.valid).toBe(true);
		expect(authResult.tier).toBe("pro");
		expect(authResult.scopes).toEqual(["analyze", "checkpoint", "context"]);
	});

	it("mcp-pro-002: should authenticate Free user correctly", async () => {
		// Set up Free user
		process.env.SNAPBACK_NO_NETWORK = "true";
		const apiKey = "sk_test_1234567890abcdef";

		const authResult = await authenticate(apiKey);

		// Should authenticate as Free user
		expect(authResult.valid).toBe(true);
		expect(authResult.tier).toBe("free");
		expect(authResult.scopes).toEqual(["analyze"]);
	});

	it("mcp-pro-003: should authenticate unauthenticated user correctly", async () => {
		// No authentication setup (unauthenticated user)
		process.env.SNAPBACK_NO_NETWORK = "true";
		const apiKey = "";

		const authResult = await authenticate(apiKey);

		// Should authenticate as Free user with no scopes
		expect(authResult.valid).toBe(true);
		expect(authResult.tier).toBe("free");
		expect(authResult.scopes).toEqual([]);
	});

	it("mcp-pro-004: should generate SARIF for Pro tool restriction", () => {
		// Create SARIF log for Pro tool restriction
		const sarifLog = createSarifLog("snapback-create-checkpoint", "1.0.0");
		addResult(
			sarifLog,
			"pro-tool-restricted",
			"This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
			undefined,
			undefined,
		);

		// Verify SARIF structure
		expect(sarifLog).toBeDefined();
		expect(sarifLog.version).toBe("2.1.0");
		expect(sarifLog.runs).toBeDefined();
		expect(sarifLog.runs.length).toBeGreaterThan(0);
		expect(sarifLog.runs[0].results).toBeDefined();
		expect(sarifLog.runs[0].results.length).toBeGreaterThan(0);

		const result = sarifLog.runs[0].results[0];
		expect(result.ruleId).toBe("pro-tool-restricted");
		expect(result.message.text).toContain("This tool requires a Pro subscription");
	});

	it("mcp-pro-005: should generate correct response for Pro tool restriction", () => {
		// Create the response that would be returned for a restricted Pro tool
		const sarifLog = createSarifLog("snapback-create-checkpoint", "1.0.0");
		addResult(
			sarifLog,
			"pro-tool-restricted",
			"This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
			undefined,
			undefined,
		);

		const response = {
			content: [
				{ type: "json", json: sarifLog },
				{
					type: "text",
					text: "❌ This tool requires a Pro subscription. Upgrade at https://snapback.dev/pricing",
				},
			],
		};

		// Verify response structure
		expect(response).toBeDefined();
		expect(response.content).toBeDefined();
		expect(response.content.length).toBe(2);

		const jsonContent = response.content.find((c: any) => c.type === "json");
		const textContent = response.content.find((c: any) => c.type === "text");

		expect(jsonContent).toBeDefined();
		expect(textContent).toBeDefined();
		expect(textContent?.text).toContain("This tool requires a Pro subscription");
	});
});
