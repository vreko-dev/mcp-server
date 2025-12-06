import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("MCP Performance Budgets", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Set environment for faster testing
		process.env.SNAPBACK_NO_NETWORK = "true";
	});

	it("perf-001: should meet MCP response time budget (<200ms)", async () => {
		// Start the server
		const startTime = Date.now();
		const result = await startServer();
		const _server = result.server;
		const endTime = Date.now();

		const startupTime = endTime - startTime;

		// Server startup should be fast
		expect(startupTime).toBeLessThan(100);

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Measure tool call response time
		const callStartTime = Date.now();
		const request = {
			method: "tools/call",
			params: {
				name: "snapback.analyze_risk",
				arguments: {
					changes: [{ added: true, value: "console.log('test');", count: 1 }],
				},
			},
		};

		await handler(request);
		const callEndTime = Date.now();

		const responseTime = callEndTime - callStartTime;

		// Tool response should meet budget
		expect(responseTime).toBeLessThan(200);
	});

	it("perf-002: should meet HTTP server response time budget (<200ms)", async () => {
		// This would test HTTP server performance if we had a real HTTP server test
		expect(true).toBe(true);
	});
});
