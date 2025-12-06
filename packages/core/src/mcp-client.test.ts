import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the MCP SDK
const mockClient = {
	connect: vi.fn(),
	request: vi.fn(),
	close: vi.fn(),
};

const mockStdioTransport = {};
const mockWebSocketTransport = {};

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
	Client: vi.fn(() => mockClient),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
	StdioClientTransport: vi.fn(() => mockStdioTransport),
}));

vi.mock("@modelcontextprotocol/sdk/client/websocket.js", () => ({
	WebSocketClientTransport: vi.fn(() => mockWebSocketTransport),
}));

import { MCPClientManager } from "./mcp-client";

// Mock ZodObject for tests
const _mockZodObject = {
	parse: vi.fn((data) => data),
	safeParse: vi.fn((data) => ({ success: true, data })),
};

describe("MCPClientManager", () => {
	let clientManager: MCPClientManager;

	beforeEach(() => {
		clientManager = new MCPClientManager();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should connect to an MCP server and discover tools", async () => {
		// Mock the tools/list response
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "analyze_code",
					description: "Analyze code for issues",
					inputSchema: {},
				},
				{
					name: "search_docs",
					description: "Search documentation",
					inputSchema: {},
				},
			],
		});

		await clientManager.connectToServer("context7", "stdio", "context7-mcp");

		expect(mockClient.connect).toHaveBeenCalledWith(mockStdioTransport);
		expect(mockClient.request).toHaveBeenCalledWith({ method: "tools/list", params: {} }, expect.any(Object));

		const tools = clientManager.listAllTools();
		expect(tools).toHaveLength(1);
		expect(tools[0].server).toBe("context7");
		expect(tools[0].tools).toHaveLength(2);
	});

	it("should call a tool on a specific server", async () => {
		// First connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "analyze_code",
					description: "Analyze code",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("context7", "stdio", "context7-mcp");

		// Then call a tool
		const toolResponse = {
			content: [{ type: "json", json: "analysis complete" }],
		};
		mockClient.request.mockResolvedValueOnce(toolResponse);

		const result = await clientManager.callToolWithResilience("context7", "analyze_code", {
			code: 'console.log("hello")',
		});

		expect(mockClient.request).toHaveBeenCalledWith(
			{
				method: "tools/call",
				params: {
					name: "analyze_code",
					arguments: { code: 'console.log("hello")' },
				},
			},
			expect.any(Object),
		);
		// Expect the processed response format
		expect(result).toEqual({
			content: "analysis complete",
			isError: false,
		});
	});

	it("should route tool calls by name to the correct server", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "search_docs",
					description: "Search docs",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("context7", "stdio", "context7-mcp");

		// Call tool by name
		const toolResponse = {
			content: [{ type: "json", json: ["doc1", "doc2"] }],
		};
		mockClient.request.mockResolvedValueOnce(toolResponse);

		const result = await clientManager.callToolByName("context7.search_docs", {
			query: "react hooks",
		});

		expect(mockClient.request).toHaveBeenCalledWith(
			{
				method: "tools/call",
				params: {
					name: "search_docs",
					arguments: { query: "react hooks" },
				},
			},
			expect.any(Object),
		);
		// Expect the processed response format
		expect(result).toEqual({
			content: ["doc1", "doc2"],
			isError: false,
		});
	});

	it("should throw error when calling tool on disconnected server", async () => {
		await expect(clientManager.callToolWithResilience("context7", "analyze_code", {})).rejects.toThrow(
			"MCP server context7 not connected",
		);
	});

	it("should throw error when calling unknown tool by name", async () => {
		await expect(clientManager.callToolByName("unknown_tool", {})).rejects.toThrow(
			"Tool unknown_tool not found on any connected MCP server",
		);
	});

	it("should disconnect from a server", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "analyze_code",
					description: "Analyze code",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("context7", "stdio", "context7-mcp");

		// Verify it's connected
		expect(clientManager.listAllTools()).toHaveLength(1);

		// Disconnect
		await clientManager.disconnectFromServer("context7");

		// Verify it's disconnected
		expect(mockClient.close).toHaveBeenCalled();
		expect(clientManager.listAllTools()).toHaveLength(0);
	});
});
