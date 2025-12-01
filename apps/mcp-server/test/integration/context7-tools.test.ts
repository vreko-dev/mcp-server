import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
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

vi.mock("../../src/context7/index.js", () => {
	// Mock the Context7Service class
	class MockContext7Service {
		resolveLibraryId() {
			return Promise.resolve({
				content: [
					{
						type: "text",
						text: "Library found",
					},
				],
			});
		}

		getLibraryDocs() {
			return Promise.resolve({
				content: [
					{
						type: "text",
						text: "Documentation content",
					},
				],
			});
		}
	}

	return {
		Context7Service: MockContext7Service,
	};
});

vi.mock("@snapback/sdk", async (importOriginal) => {
	const actual = await importOriginal();

	// Mock the StorageBrokerAdapter class
	const mockStorageBrokerAdapterInstance = {
		initialize: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
	};

	const MockStorageBrokerAdapter = vi.fn(() => mockStorageBrokerAdapterInstance);

	return {
		...actual,
		StorageBrokerAdapter: MockStorageBrokerAdapter,
	};
});

// Mock event bus and IPC clients to avoid connection errors
vi.mock("@snapback/events", () => {
	const mockEventBus = {
		connect: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn(),
	};

	return {
		SnapBackEventBus: vi.fn(() => mockEventBus),
	};
});

vi.mock("../../src/client/extension-ipc.js", () => {
	const mockExtensionClient = {
		connect: vi.fn().mockResolvedValue(undefined),
		createSnapshot: vi.fn().mockResolvedValue({
			id: "test-snapshot",
			timestamp: Date.now(),
			meta: {},
		}),
	};

	return {
		ExtensionIPCClient: vi.fn(() => mockExtensionClient),
	};
});

describe("MCP Server Context7 Tools Integration", () => {
	let _server: Server;
	let _transport: StdioServerTransport;

	beforeEach(async () => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Set environment variables for Context7
		process.env.CONTEXT7_API_KEY = "test-key-12345";
		process.env.CONTEXT7_API_URL = "https://test.context7.com/api";

		// Start server to set up handlers
		const result = await startServer();
		_server = result.server;
		_transport = result.transport;
	});

	afterEach(() => {
		// Reset any changed state
		vi.resetAllMocks();

		// Clean up environment variables
		delete process.env.CONTEXT7_API_KEY;
		delete process.env.CONTEXT7_API_URL;
	});

	describe("ctx7.resolve-library-id tool", () => {
		it("should handle resolve-library-id tool calls", async () => {
			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with ctx7.resolve-library-id request
			const request = {
				method: "tools/call",
				params: {
					name: "ctx7.resolve-library-id",
					arguments: {
						libraryName: "react",
					},
				},
			};

			const result = await handler(request);

			expect(result.content[0].type).toBe("text");
			// The result should contain our mocked response
			expect(result.content[0].text).toBe("Library found");
		});

		it("should handle resolve-library-id tool errors gracefully", async () => {
			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with ctx7.resolve-library-id request with invalid input
			const request = {
				method: "tools/call",
				params: {
					name: "ctx7.resolve-library-id",
					arguments: {
						libraryName: "", // Invalid input
					},
				},
			};

			const result = await handler(request);

			// Should return an error for invalid input
			expect(result.isError).toBe(true);
		});
	});

	describe("ctx7.get-library-docs tool", () => {
		it("should handle get-library-docs tool calls", async () => {
			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with ctx7.get-library-docs request
			const request = {
				method: "tools/call",
				params: {
					name: "ctx7.get-library-docs",
					arguments: {
						context7CompatibleLibraryID: "/vercel/next.js",
					},
				},
			};

			const result = await handler(request);

			// Check that we got a successful response
			expect(result.content[0].type).toBe("text");
			// The result should contain our mocked response
			expect(result.content[0].text).toBe("Documentation content");
		});

		it("should handle get-library-docs tool errors gracefully", async () => {
			// Get the request handler for CallToolRequestSchema
			const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
				(call) => call[0] === CallToolRequestSchema,
			);
			expect(callHandlerCalls).toHaveLength(1);
			const handler = callHandlerCalls[0][1];

			// Call the handler with ctx7.get-library-docs request with invalid input
			const request = {
				method: "tools/call",
				params: {
					name: "ctx7.get-library-docs",
					arguments: {
						context7CompatibleLibraryID: "", // Invalid input
					},
				},
			};

			const result = await handler(request);

			// Should return an error for invalid input
			expect(result.isError).toBe(true);
		});
	});
});
