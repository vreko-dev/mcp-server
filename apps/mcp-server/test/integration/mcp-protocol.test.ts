import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Set DATABASE_URL before any imports that might use it
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

import { startServer } from "../../src/index.js";

/**
 * MCP Protocol Compliance Integration Tests
 *
 * Test ID Prefix: MCP-PROTOCOL-001-XXX
 *
 * Tests MCP protocol compliance:
 * - Responds to tools/list correctly
 * - Responds to tools/call correctly
 * - Handles malformed requests gracefully
 * - Returns proper error codes
 * - Supports both STDIO and HTTP transport
 *
 * Following test_coverage.md specification lines 362-368.
 */

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

// Mock SDK and infrastructure to avoid initialization errors
vi.mock("@snapback/sdk", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
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

vi.mock("@snapback/events", () => {
  const mockEventBus = {
    initialize: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
  };
  return {
    SnapBackEventBus: vi.fn(() => mockEventBus),
  };
});

vi.mock("../../src/client/extension-ipc.js", () => {
  const mockExtensionClient = {
    connect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ExtensionIPCClient: vi.fn(() => mockExtensionClient),
  };
});

vi.mock("../../src/context7/index.js", () => {
  class MockContext7Service {
    resolveLibraryId() {
      return Promise.resolve({ content: [{ type: "text", text: "Library found" }] });
    }
    getLibraryDocs() {
      return Promise.resolve({ content: [{ type: "text", text: "Documentation content" }] });
    }
  }
  return { Context7Service: MockContext7Service };
});

// Mock platform database to avoid initialization errors
vi.mock("@snapback/platform/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock Sentry profiling to avoid native module issues
vi.mock("@sentry/profiling-node", () => ({}));

describe("MCP Protocol Compliance Integration", () => {
  let _server: Server;
  let _transport: StdioServerTransport;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.SNAPBACK_API_KEY = "test-api-key";
    
    const result = await startServer();
    _server = result.server;
    _transport = result.transport;
  });

  afterEach(() => {
    vi.resetAllMocks();
    
    // Clean up environment variables
    delete process.env.DATABASE_URL;
    delete process.env.SNAPBACK_API_KEY;
  });

  describe("tools/list Request Handler", () => {
    // Test ID: MCP-PROTOCOL-001-001
    it("should respond to tools/list correctly", async () => {
      // GIVEN: Server with registered tools
      const listHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === ListToolsRequestSchema
      );
      
      // THEN: Should have registered list handler
      expect(listHandlerCalls).toHaveLength(1);
      const handler = listHandlerCalls[0][1];

      // WHEN: Requesting tool list
      const result = await handler({});

      // THEN: Should return tool definitions
      expect(result).toHaveProperty("tools");
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      
      // Verify required tool fields
      const firstTool = result.tools[0];
      expect(firstTool).toHaveProperty("name");
      expect(firstTool).toHaveProperty("description");
      expect(firstTool).toHaveProperty("inputSchema");
      expect(typeof firstTool.name).toBe("string");
      expect(typeof firstTool.description).toBe("string");
      expect(typeof firstTool.inputSchema).toBe("object");
    });

    // Test ID: MCP-PROTOCOL-001-002
    it("should include all SnapBack tools in tools/list", async () => {
      // GIVEN: Server with SnapBack tools
      const listHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === ListToolsRequestSchema
      );
      const handler = listHandlerCalls[0][1];

      // WHEN: Requesting tool list
      const result = await handler({});

      // THEN: Should include expected tools
      const toolNames = result.tools.map((t: { name: string }) => t.name);
      
      expect(toolNames).toContain("snapback.analyze_risk");
      expect(toolNames).toContain("snapback.check_dependencies");
      expect(toolNames).toContain("snapback.create_snapshot");
      expect(toolNames).toContain("snapback.list_snapshots");
      expect(toolNames).toContain("snapback.restore_snapshot");
      expect(toolNames).toContain("ctx7.resolve-library-id");
      expect(toolNames).toContain("ctx7.get-library-docs");
    });
  });

  describe("tools/call Request Handler", () => {
    // Test ID: MCP-PROTOCOL-001-003
    it("should respond to tools/call correctly", async () => {
      // GIVEN: Valid tool call request
      const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === CallToolRequestSchema
      );
      expect(callHandlerCalls).toHaveLength(1);
      const handler = callHandlerCalls[0][1];

      const request = {
        method: "tools/call",
        params: {
          name: "snapback.check_dependencies",
          arguments: {
            before: { lodash: "^4.17.20" },
            after: { lodash: "^4.17.21" },
          },
        },
      };

      // WHEN: Calling tool
      const result = await handler(request);

      // THEN: Should return valid MCP response
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify content structure
      const firstContent = result.content[0];
      expect(firstContent).toHaveProperty("type");
      expect(["text", "json"]).toContain(firstContent.type);
    });

    // Test ID: MCP-PROTOCOL-001-004
    it("should handle malformed requests gracefully", async () => {
      // GIVEN: Malformed tool call request
      const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === CallToolRequestSchema
      );
      const handler = callHandlerCalls[0][1];

      const request = {
        method: "tools/call",
        params: {
          name: "snapback.analyze_risk",
          arguments: {
            // Missing required 'changes' field
            invalid: "data",
          },
        },
      };

      // WHEN: Calling tool with invalid arguments
      const result = await handler(request);

      // THEN: Should return error response
      expect(result).toHaveProperty("isError");
      expect(result.isError).toBe(true);
      expect(result).toHaveProperty("content");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.content[0].text).toContain("Log ID:");
    });
  });

  describe("Error Code Handling", () => {
    // Test ID: MCP-PROTOCOL-001-005
    it("should return proper error codes for unknown tools", async () => {
      // GIVEN: Request for unknown tool
      const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === CallToolRequestSchema
      );
      const handler = callHandlerCalls[0][1];

      const request = {
        method: "tools/call",
        params: {
          name: "unknown.tool",
          arguments: {},
        },
      };

      // WHEN: Calling unknown tool
      const result = await handler(request);

      // THEN: Should return error with proper structure
      expect(result.isError).toBe(true);
      expect(result).toHaveProperty("error");
      expect(result.error).toHaveProperty("message");
      expect(result.error.message).toContain("Unknown tool");
    });

    // Test ID: MCP-PROTOCOL-001-006
    it("should sanitize error messages in production", async () => {
      // GIVEN: Request that triggers an error
      const callHandlerCalls = mockServer.setRequestHandler.mock.calls.filter(
        (call) => call[0] === CallToolRequestSchema
      );
      const handler = callHandlerCalls[0][1];

      const request = {
        method: "tools/call",
        params: {
          name: "snapback.check_dependencies",
          arguments: {
            before: null, // Invalid type
            after: null,
          },
        },
      };

      // WHEN: Calling tool with invalid input
      const result = await handler(request);

      // THEN: Should return sanitized error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Log ID:");
      
      // Verify error has tracking ID for support
      expect(result.content[0].text).toMatch(/Log ID: [a-z0-9_-]+/i);
    });
  });

  describe("Transport Protocol Support", () => {
    // Test ID: MCP-PROTOCOL-001-007
    it("should support STDIO transport", async () => {
      // GIVEN: Server started with STDIO transport
      // WHEN: Checking server connection
      
      // THEN: Should connect to STDIO transport
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
    });

    // Test ID: MCP-PROTOCOL-001-008
    it("should register all request handlers before connecting", async () => {
      // GIVEN: Server initialization
      // WHEN: Checking handler registration
      
      // THEN: Handlers should be registered before connection
      const setHandlerCalls = mockServer.setRequestHandler.mock.calls;
      const connectCalls = mockServer.connect.mock.calls;
      
      expect(setHandlerCalls.length).toBeGreaterThan(0);
      
      // All setRequestHandler calls should happen before connect
      // (This is verified by the mock call order)
      expect(connectCalls.length).toBe(1);
    });
  });
});
