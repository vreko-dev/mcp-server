import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock core dependencies
const mockGuardian = {
	analyze: vi.fn(),
	addPlugin: vi.fn(),
};

const mockDepAnalyzer = {
	quickAnalyze: vi.fn(),
};

const mockMCPClientManager = {
	connectFromConfig: vi.fn(),
	getToolCatalog: vi.fn().mockReturnValue([]),
	callToolByName: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "test" }] }),
};

vi.mock("@snapback/core", async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		Guardian: vi.fn(() => mockGuardian),
		DependencyAnalyzer: vi.fn(() => mockDepAnalyzer),
		MCPClientManager: vi.fn(() => mockMCPClientManager),
		SecretDetectionPlugin: vi.fn(),
		MockReplacementPlugin: vi.fn(),
		PhantomDependencyPlugin: vi.fn(),
	};
});

vi.mock("@snapback/sdk", () => ({
	LocalStorage: MockLocalStorage,
}));

// Mock the storage factory
const mockStorage = {
	save: vi.fn(),
	get: vi.fn(),
	getByContentHash: vi.fn(),
	getStoredContentHash: vi.fn(),
	list: vi.fn(),
	close: vi.fn(),
};

const MockLocalStorage = vi.fn().mockImplementation(() => mockStorage);

// Mock the SnapBackAPIClient
const mockAnalyzeFast = vi.fn();
const mockGetIterationStats = vi.fn();
const mockCreateSnapshot = vi.fn();

// Create a mock API client instance
const mockApiClient = {
	analyzeFast: mockAnalyzeFast,
	getIterationStats: mockGetIterationStats,
	createSnapshot: mockCreateSnapshot,
	getCurrentSession: vi.fn(),
	getSafetyGuidelines: vi.fn(),
};

vi.mock("../src/client/snapback-api.js", () => {
	return {
		SnapBackAPIClient: vi.fn().mockImplementation(() => mockApiClient),
		createAPIClient: () => mockApiClient,
	};
});

describe("MCP Server", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Reset any changed state
		vi.resetAllMocks();
	});

	it("should initialize server with correct configuration", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Call the startServer function
		await serverModule.startServer();

		// Check that Server was instantiated with correct parameters
		expect(mockServer.setRequestHandler).toHaveBeenCalled();
		expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
	});

	it("should handle analyze_risk tool calls", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Call the startServer function to set up handlers
		await serverModule.startServer();

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Mock guardian response
		const mockRiskScore = {
			score: 0.8,
			factors: ["large insertion"],
			severity: "high",
		};
		mockGuardian.analyze.mockResolvedValue(mockRiskScore);

		// Call the handler with analyze_risk request
		const request = {
			method: "tools/call",
			params: {
				name: "snapback.analyze_risk",
				arguments: {
					changes: [{ added: true, value: "new code", count: 5 }],
				},
			},
		};

		const result = await handler(request);

		expect(result.content[0].type).toBe("json");
		expect(result.content[0].json.score).toBe(0.8);
		expect(result.content[0].json.severity).toBe("high");

		// Check that guardian was called with the changes (allowing for default properties)
		expect(mockGuardian.analyze).toHaveBeenCalled();
		const callArgs = mockGuardian.analyze.mock.calls[0][0];
		expect(callArgs).toHaveLength(1);
		expect(callArgs[0]).toMatchObject({
			added: true,
			value: "new code",
			count: 5,
		});
	});

	it("should handle check_dependencies tool calls", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Call the startServer function to set up handlers
		await serverModule.startServer();

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Mock dependency analyzer response
		const mockDepResult = {
			score: 0.7,
			breaking: ["react:1.0.0→2.0.0"],
		};
		mockDepAnalyzer.quickAnalyze.mockReturnValue(mockDepResult);

		// Call the handler with check_dependencies request
		const request = {
			method: "tools/call",
			params: {
				name: "snapback.check_dependencies",
				arguments: {
					before: { dependencies: { react: "1.0.0" } },
					after: { dependencies: { react: "2.0.0" } },
				},
			},
		};

		const result = await handler(request);

		expect(result.content[0].type).toBe("json");
		expect(result.content[0].json.score).toBe(0.7);
		expect(result.content[0].json.breaking).toContain("react:1.0.0→2.0.0");

		expect(mockDepAnalyzer.quickAnalyze).toHaveBeenCalledWith(
			{ dependencies: { react: "1.0.0" } },
			{ dependencies: { react: "2.0.0" } },
		);
	});

	it("should handle create_snapshot tool calls with new API", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Call the startServer function to set up handlers
		await serverModule.startServer();

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Mock API response
		const mockSnapshot = {
			id: "snap-test-id",
			timestamp: 1234567890,
			meta: {},
		};
		mockCreateSnapshot.mockResolvedValue(mockSnapshot);

		// Call the handler with create_snapshot request (new tool)
		const request = {
			method: "tools/call",
			params: {
				name: "snapback.create_checkpoint",
				arguments: {
					file_path: "test.js",
					reason: "test snapshot",
				},
			},
		};

		const result = await handler(request);

		expect(result.content[0].type).toBe("text");
		expect(result.content[0].text).toContain("Snapshot created successfully");
		expect(result.content[0].text).toContain("snap-test-id");

		expect(mockCreateSnapshot).toHaveBeenCalledWith({
			filePath: "test.js",
			reason: "test snapshot",
			source: "mcp",
		});
	});

	it("should handle list_snapshots tool calls with old API", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Mock storage response
		const mockSnapshots = [
			{ id: "snap-1", timestamp: 1234567890 },
			{ id: "snap-2", timestamp: 1234567891 },
		];
		mockStorage.list.mockResolvedValue(mockSnapshots);

		// Call the startServer function to set up handlers
		await serverModule.startServer();

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Call the handler with list_snapshots request (old tool)
		const request = {
			method: "tools/call",
			params: {
				name: "snapback.list_checkpoints",
				arguments: {},
			},
		};

		const result = await handler(request);

		expect(result.content[0].type).toBe("json");
		expect(Array.isArray(result.content[0].json)).toBe(true);
		expect(result.content[0].json).toEqual(mockSnapshots);

		// Verify that the storage list method was called
		expect(mockStorage.list).toHaveBeenCalled();
	});

	it("should throw error for unknown tools", async () => {
		// Import the server module
		const serverModule = await import("../src/index");

		// Call the startServer function to set up handlers
		await serverModule.startServer();

		// Get the request handler for CallToolRequestSchema
		const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
			(call) => call[0] === CallToolRequestSchema,
		);
		expect(callHandlerCalls).toHaveLength(1);
		const handler = callHandlerCalls[0][1];

		// Call the handler with unknown tool
		const request = {
			method: "tools/call",
			params: {
				name: "unknown_tool",
				arguments: {},
			},
		};

		const result = await handler(request);
		expect(result.isError).toBe(true);
		expect(result.content[0].text).toContain("Unknown tool: unknown_tool");
	});
});
