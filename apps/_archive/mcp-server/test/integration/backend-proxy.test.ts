import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startServer } from "../../src/index";

// Mock the MCP SDK
const mockServer = {
	setRequestHandler: vi.fn(),
	connect: vi.fn(),
};

const mockTransport = {};

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
	Server: vi.fn(() => mockServer),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: vi.fn(() => mockTransport),
}));

// Mock the SnapBackAPIClient
const mockAnalyzeFast = vi.fn();
const mockGetIterationStats = vi.fn();
const mockCreateSnapshot = vi.fn();
const mockGetCurrentSession = vi.fn();
const mockGetSafetyGuidelines = vi.fn();

// Create a mock API client instance
const mockApiClient = {
	analyzeFast: mockAnalyzeFast,
	getIterationStats: mockGetIterationStats,
	createSnapshot: mockCreateSnapshot,
	getCurrentSession: mockGetCurrentSession,
	getSafetyGuidelines: mockGetSafetyGuidelines,
};

vi.mock("../../src/client/snapback-api.js", () => {
	return {
		SnapBackAPIClient: vi.fn().mockImplementation(() => mockApiClient),
	};
});

// Mock the auth module
vi.mock("../../src/auth.js", () => ({
	authenticate: vi.fn().mockResolvedValue({ tier: "pro" }),
}));

describe("MCP Server Backend Proxy Integration", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Set environment variables for testing
		process.env.SNAPBACK_API_KEY = "test-api-key";
		process.env.SNAPBACK_API_URL = "https://api.snapback.dev";
	});

	afterEach(() => {
		// Reset any changed state
		vi.resetAllMocks();

		// Clear environment variables
		delete process.env.SNAPBACK_API_KEY;
		delete process.env.SNAPBACK_API_URL;
	});

	describe("snapback.analyze_risk tool", () => {
		it("should call the backend API and return formatted response", async () => {
			// Mock API response
			const mockApiResponse = {
				riskLevel: "high",
				score: 0.85,
				factors: ["security vulnerability", "complex logic"],
				analysisTimeMs: 45,
				issues: [
					{
						severity: "high",
						message: "Potential security vulnerability detected",
						line: 10,
						column: 5,
					},
				],
			};
			mockAnalyzeFast.mockResolvedValue(mockApiResponse);

			// Start server to set up handlers with mocked API client
			await startServer();

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with snapback.analyze_risk request
			const request = {
				method: "tools/call",
				params: {
					name: "snapback.analyze_risk",
					arguments: {
						changes: [
							{ added: true, value: "eval(userInput)" },
							{ removed: true, value: "console.log('old code')" },
						],
					},
				},
			};

			const result = await handler(request);

			// Check that the response contains the expected content
			expect(result.content).toHaveLength(3); // json, json, text
			expect(result.content[0].type).toBe("json");
			expect(result.content[0].json.riskLevel).toBe("high");
			expect(result.content[0].json.score).toBe(0.85);
			expect(result.content[0].json.factors).toContain("security vulnerability");

			// Check that the SARIF log is included
			expect(result.content[1].type).toBe("json");
			expect(result.content[1].json).toHaveProperty("$schema");

			// Check that the policy decision text is included
			expect(result.content[2].type).toBe("text");
			expect(result.content[2].text).toContain("Policy Decision");
			expect(result.content[2].text).toContain("BLOCK");

			expect(result.isError).toBeUndefined();

			// Verify that the backend API was called with the correct parameters
			expect(mockAnalyzeFast).toHaveBeenCalledWith({
				code: "eval(userInput)\nconsole.log('old code')",
				filePath: "mcp-analysis.ts",
				context: {
					projectType: "mcp-analysis",
					language: "typescript",
				},
			});
		});

		it("should handle backend API errors gracefully with fallback", async () => {
			// Mock API error
			mockAnalyzeFast.mockRejectedValue(new Error("Backend API unavailable"));

			// Start server to set up handlers with mocked API client
			await startServer();

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with snapback.analyze_risk request
			const request = {
				method: "tools/call",
				params: {
					name: "snapback.analyze_risk",
					arguments: {
						changes: [{ added: true, value: "eval(userInput)" }],
					},
				},
			};

			const result = await handler(request);

			// Check that the response contains the fallback content
			expect(result.content).toHaveLength(3); // json, json, text
			expect(result.content[0].type).toBe("json");
			expect(result.content[0].json.riskLevel).toBe("low");
			expect(result.content[0].json.score).toBe(0);

			// Check that the SARIF log is included
			expect(result.content[1].type).toBe("json");
			expect(result.content[1].json).toHaveProperty("$schema");

			// Check that the policy decision text is included with fallback warning
			expect(result.content[2].type).toBe("text");
			expect(result.content[2].text).toContain("Policy Decision");
			expect(result.content[2].text).toContain("⚠️ Using basic analysis");

			expect(result.isError).toBeUndefined();
		});
	});
});
