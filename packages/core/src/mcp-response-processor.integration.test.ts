import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MCPClientManager } from "./mcp-client.js";

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

describe("MCP Response Processor Integration", () => {
	let clientManager: MCPClientManager;

	beforeEach(() => {
		clientManager = new MCPClientManager();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should process tool responses through MCP client", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "test_tool",
					description: "A test tool",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("test", "stdio", "test-mcp");

		// Mock a tool call response
		const toolResponse = {
			content: [{ type: "text", text: "Hello, World!" }],
			isError: false,
		};
		mockClient.request.mockResolvedValueOnce(toolResponse);

		// Call the tool
		const result = await clientManager.callToolWithResilience("test", "test_tool", {});

		// Verify the response is processed correctly
		expect(result).toEqual({
			content: "Hello, World!",
			isError: false,
		});
	});

	it("should handle error responses through MCP client", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "error_tool",
					description: "A tool that errors",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("test", "stdio", "test-mcp");

		// Mock an error response
		const errorResponse = {
			content: [],
			isError: true,
			error: { message: "Something went wrong" },
		};
		mockClient.request.mockResolvedValueOnce(errorResponse);

		// Call the tool
		const result = await clientManager.callToolWithResilience("test", "error_tool", {});

		// Verify the error response is processed correctly
		expect(result).toEqual({
			content: "Something went wrong",
			isError: true,
			error: { message: "Something went wrong" },
		});
	});

	it("should handle JSON content responses", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "json_tool",
					description: "A tool that returns JSON",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("test", "stdio", "test-mcp");

		// Mock a JSON response
		const jsonResponse = {
			content: [{ type: "json", json: { key: "value", nested: { num: 42 } } }],
			isError: false,
		};
		mockClient.request.mockResolvedValueOnce(jsonResponse);

		// Call the tool
		const result = await clientManager.callToolWithResilience("test", "json_tool", {});

		// Verify the JSON response is processed correctly
		expect(result).toEqual({
			content: { key: "value", nested: { num: 42 } },
			isError: false,
		});
	});

	it("should handle mixed content responses", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "mixed_tool",
					description: "A tool that returns mixed content",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("test", "stdio", "test-mcp");

		// Mock a mixed content response
		const mixedResponse = {
			content: [
				{ type: "text", text: "First part" },
				{ type: "json", json: { key: "value" } },
				{ type: "text", text: "Last part" },
			],
			isError: false,
		};
		mockClient.request.mockResolvedValueOnce(mixedResponse);

		// Call the tool
		const result = await clientManager.callToolWithResilience("test", "mixed_tool", {});

		// Verify the mixed content response is processed correctly
		expect(result).toEqual({
			content: ["First part", { key: "value" }, "Last part"],
			isError: false,
		});
	});

	it("should handle tool not found errors gracefully", async () => {
		// Connect to a server
		mockClient.request.mockResolvedValueOnce({
			tools: [
				{
					name: "existing_tool",
					description: "An existing tool",
					inputSchema: {},
				},
			],
		});
		await clientManager.connectToServer("test", "stdio", "test-mcp");

		// Try to call a non-existent tool by name
		try {
			await clientManager.callToolByName("test.nonexistent_tool", {});
			// Should not reach here
			expect(true).toBe(false);
		} catch (error) {
			// Verify the error response is processed correctly
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("Tool test.nonexistent_tool not found on any connected MCP server");
		}
	});
});
