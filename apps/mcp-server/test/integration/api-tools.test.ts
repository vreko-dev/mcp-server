import {
	CallToolRequestSchema,
	GetPromptRequestSchema,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startServer } from "../../src/index.js";

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
		createAPIClient: () => mockApiClient,
	};
});

describe("MCP Server API Integration", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Reset any changed state
		vi.resetAllMocks();
	});

	describe("analyze_suggestion tool", () => {
		it("should call the analyzeFast API and return formatted response", async () => {
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
			await startServer(mockApiClient);

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with analyze_suggestion request
			const request = {
				method: "tools/call",
				params: {
					name: "analyze_suggestion",
					arguments: {
						code: "eval(userInput)",
						file_path: "test.js",
						context: {
							projectType: "node",
							language: "javascript",
						},
					},
				},
			};

			const result = await handler(request);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("🔴");
			expect(result.content[0].text).toContain("HIGH");
			expect(result.content[0].text).toContain("BLOCK");
			expect(result.content[0].text).toContain("Potential security vulnerability detected");
			expect(result.isError).toBe(false);

			expect(mockAnalyzeFast).toHaveBeenCalledWith({
				code: "eval(userInput)",
				filePath: "test.js",
				context: {
					projectType: "node",
					language: "javascript",
				},
			});
		});

		it("should handle API errors gracefully", async () => {
			// Mock API error
			mockAnalyzeFast.mockRejectedValue(new Error("API unavailable"));

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with analyze_suggestion request
			const request = {
				method: "tools/call",
				params: {
					name: "analyze_suggestion",
					arguments: {
						code: "eval(userInput)",
						file_path: "test.js",
					},
				},
			};

			const result = await handler(request);

			expect(result.content[0].type).toBe("text");
			expect(result.isError).toBe(true);
		});
	});

	describe("check_iteration_safety tool", () => {
		it("should call the getIterationStats API and return formatted response", async () => {
			// Mock API response
			const mockApiResponse = {
				consecutiveAIEdits: 3,
				riskLevel: "medium",
				velocity: 5,
				recommendation: "Consider manual review of changes",
			};
			mockGetIterationStats.mockResolvedValue(mockApiResponse);

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with check_iteration_safety request
			const request = {
				method: "tools/call",
				params: {
					name: "check_iteration_safety",
					arguments: {
						file_path: "test.js",
					},
				},
			};

			const result = await handler(request);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("⚠️");
			expect(result.content[0].text).toContain("3");
			expect(result.content[0].text).toContain("MEDIUM");
			expect(result.content[0].text).toContain("Consider manual review");
			expect(result.isError).toBe(false);

			expect(mockGetIterationStats).toHaveBeenCalledWith("test.js");
		});
	});

	describe("create_snapshot tool", () => {
		it("should call the createSnapshot API and return formatted response", async () => {
			// Mock API response
			const mockApiResponse = {
				id: "snap-12345",
				timestamp: 1234567890,
				meta: {
					reason: "Manual snapshot via MCP",
				},
			};
			mockCreateSnapshot.mockResolvedValue(mockApiResponse);

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with create_snapshot request
			const request = {
				method: "tools/call",
				params: {
					name: "create_snapshot",
					arguments: {
						file_path: "test.js",
						reason: "Before major refactor",
					},
				},
			};

			const result = await handler(request);

			expect(result.content[0].type).toBe("text");
			expect(result.content[0].text).toContain("✅");
			expect(result.content[0].text).toContain("snap-12345");
			expect(result.content[0].text).toContain("Before major refactor");
			expect(result.isError).toBe(false);

			expect(mockCreateSnapshot).toHaveBeenCalledWith({
				filePath: "test.js",
				reason: "Before major refactor",
				source: "mcp",
			});
		});
	});

	describe("session/current resource", () => {
		it("should call the getCurrentSession API and return JSON response", async () => {
			// Mock API response
			const mockApiResponse = {
				consecutiveAIEdits: 2,
				lastEditTimestamp: 1234567890,
				filePath: "test.js",
				riskLevel: "low",
			};
			mockGetCurrentSession.mockResolvedValue(mockApiResponse);

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for ReadResourceRequestSchema
			const resourceHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === ReadResourceRequestSchema,
			);
			expect(resourceHandlerCalls).toHaveLength(1);
			const handler = resourceHandlerCalls[0][1];

			// Call the handler with session/current resource request
			const request = {
				method: "resources/read",
				params: {
					uri: "snapback://session/current",
				},
			};

			const result = await handler(request);

			expect(result.contents[0].uri).toBe("snapback://session/current");
			expect(result.contents[0].mimeType).toBe("application/json");
			expect(result.contents[0].text).toContain('"consecutiveAIEdits": 2');
			expect(result.contents[0].text).toContain('"filePath": "test.js"');

			expect(mockGetCurrentSession).toHaveBeenCalled();
		});
	});

	describe("guidelines/safety resource", () => {
		it("should call the getSafetyGuidelines API and return text response", async () => {
			// Mock API response
			const mockApiResponse = "Project-specific safety guidelines content";
			mockGetSafetyGuidelines.mockResolvedValue(mockApiResponse);

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for ReadResourceRequestSchema
			const resourceHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === ReadResourceRequestSchema,
			);
			expect(resourceHandlerCalls).toHaveLength(1);
			const handler = resourceHandlerCalls[0][1];

			// Call the handler with guidelines/safety resource request
			const request = {
				method: "resources/read",
				params: {
					uri: "snapback://guidelines/safety",
				},
			};

			const result = await handler(request);

			expect(result.contents[0].uri).toBe("snapback://guidelines/safety");
			expect(result.contents[0].mimeType).toBe("text/plain");
			expect(result.contents[0].text).toBe("Project-specific safety guidelines content");

			expect(mockGetSafetyGuidelines).toHaveBeenCalled();
		});
	});

	describe("safety_context prompt", () => {
		it("should call the getCurrentSession and getSafetyGuidelines APIs and return formatted prompt", async () => {
			// Mock API responses
			const mockSessionResponse = {
				consecutiveAIEdits: 1,
				lastEditTimestamp: 1234567890,
				filePath: "test.js",
				riskLevel: "low",
			};
			mockGetCurrentSession.mockResolvedValue(mockSessionResponse);

			const mockGuidelinesResponse = "Avoid removing input validation\nDon't introduce known vulnerable patterns";
			mockGetSafetyGuidelines.mockResolvedValue(mockGuidelinesResponse);

			// Start server to set up handlers with mocked API client
			await startServer(mockApiClient);

			// Get the request handler for GetPromptRequestSchema
			const promptHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === GetPromptRequestSchema,
			);
			expect(promptHandlerCalls).toHaveLength(1);
			const handler = promptHandlerCalls[0][1];

			// Call the handler with safety_context prompt request
			const request = {
				method: "prompts/get",
				params: {
					name: "safety_context",
					arguments: {
						file_path: "test.js",
					},
				},
			};

			const result = await handler(request);

			expect(result.messages[0].role).toBe("user");
			expect(result.messages[0].content.type).toBe("text");
			expect(result.messages[0].content.text).toContain("SnapBack Safety Context");
			expect(result.messages[0].content.text).toContain("Current Session");
			expect(result.messages[0].content.text).toContain("Avoid removing input validation");
			expect(result.messages[0].content.text).toContain("File: test.js");

			expect(mockGetCurrentSession).toHaveBeenCalled();
			expect(mockGetSafetyGuidelines).toHaveBeenCalled();
		});
	});
});
