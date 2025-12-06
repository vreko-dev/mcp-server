/**
 * Unit tests for MCP Protocol
 * L1: Validates JSON-RPC message formatting and tool definitions
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

// ============================================
// MCP Protocol Types (aligned with @modelcontextprotocol/sdk)
// ============================================

const JSONRPCRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number()]),
	method: z.string(),
	params: z.unknown().optional(),
});

const JSONRPCResponseSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number()]),
	result: z.unknown().optional(),
	error: z
		.object({
			code: z.number(),
			message: z.string(),
			data: z.unknown().optional(),
		})
		.optional(),
});

const CallToolRequestSchema = z.object({
	jsonrpc: z.literal("2.0"),
	id: z.union([z.string(), z.number()]),
	method: z.literal("tools/call"),
	params: z.object({
		name: z.string(),
		arguments: z.record(z.unknown()).optional(),
	}),
});

const ListToolsResponseSchema = z.object({
	tools: z.array(
		z.object({
			name: z.string(),
			description: z.string().optional(),
			inputSchema: z.object({
				type: z.literal("object"),
				properties: z.record(z.unknown()).optional(),
				required: z.array(z.string()).optional(),
			}),
		}),
	),
});

// ============================================
// SnapBack Tool Definitions
// ============================================

const SNAPBACK_TOOLS = {
	"snapback.analyze_risk": {
		name: "snapback.analyze_risk",
		description: "Analyze code changes for potential risks before applying them",
		inputSchema: {
			type: "object" as const,
			properties: {
				diff: { type: "string", description: "The diff to analyze" },
				filePath: { type: "string", description: "Path to the file being changed" },
				context: {
					type: "object",
					properties: {
						aiTool: { type: "string" },
						timestamp: { type: "number" },
					},
				},
			},
			required: ["diff"],
		},
	},
	"snapback.check_dependencies": {
		name: "snapback.check_dependencies",
		description: "Check for dependency-related risks when package.json changes",
		inputSchema: {
			type: "object" as const,
			properties: {
				packageJson: { type: "string", description: "The package.json content" },
				lockfile: { type: "string", description: "Optional lockfile content" },
			},
			required: ["packageJson"],
		},
	},
	"snapback.create_checkpoint": {
		name: "snapback.create_checkpoint",
		description: "Create a code checkpoint (snapshot) before making risky changes",
		inputSchema: {
			type: "object" as const,
			properties: {
				files: {
					type: "array",
					items: { type: "string" },
					description: "List of file paths to include in checkpoint",
				},
				message: { type: "string", description: "Optional checkpoint message" },
			},
			required: ["files"],
		},
	},
	"snapback.list_checkpoints": {
		name: "snapback.list_checkpoints",
		description: "List all available code checkpoints for restoration",
		inputSchema: {
			type: "object" as const,
			properties: {
				limit: { type: "number", description: "Maximum number to return" },
				after: { type: "string", description: "ISO date string for filtering" },
			},
		},
	},
	"snapback.restore_checkpoint": {
		name: "snapback.restore_checkpoint",
		description: "Restore code from a previously created checkpoint",
		inputSchema: {
			type: "object" as const,
			properties: {
				checkpointId: { type: "string", description: "ID of checkpoint to restore" },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Optional list of specific files to restore",
				},
			},
			required: ["checkpointId"],
		},
	},
};

// ============================================
// Protocol Helpers
// ============================================

function createRequest(method: string, params?: unknown): z.infer<typeof JSONRPCRequestSchema> {
	return {
		jsonrpc: "2.0",
		id: `req-${Date.now()}`,
		method,
		params,
	};
}

function createToolCallRequest(toolName: string, args?: Record<string, unknown>) {
	return {
		jsonrpc: "2.0" as const,
		id: `tool-${Date.now()}`,
		method: "tools/call" as const,
		params: {
			name: toolName,
			arguments: args,
		},
	};
}

function createResponse(id: string | number, result?: unknown, error?: { code: number; message: string }) {
	const response: z.infer<typeof JSONRPCResponseSchema> = {
		jsonrpc: "2.0",
		id,
	};
	if (error) {
		response.error = error;
	} else {
		response.result = result;
	}
	return response;
}

// ============================================
// TESTS
// ============================================

describe("MCP Protocol", () => {
	describe("JSON-RPC Request Validation", () => {
		it("validates well-formed request", () => {
			const request = createRequest("tools/list");
			const result = JSONRPCRequestSchema.safeParse(request);

			expect(result.success).toBe(true);
		});

		it("rejects request without jsonrpc version", () => {
			const invalid = {
				id: "1",
				method: "tools/list",
			};

			const result = JSONRPCRequestSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("rejects request with wrong jsonrpc version", () => {
			const invalid = {
				jsonrpc: "1.0",
				id: "1",
				method: "tools/list",
			};

			const result = JSONRPCRequestSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("rejects request without id", () => {
			const invalid = {
				jsonrpc: "2.0",
				method: "tools/list",
			};

			const result = JSONRPCRequestSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("accepts numeric id", () => {
			const request = {
				jsonrpc: "2.0",
				id: 42,
				method: "tools/list",
			};

			const result = JSONRPCRequestSchema.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe("JSON-RPC Response Validation", () => {
		it("validates success response", () => {
			const response = createResponse("req-1", { tools: [] });
			const result = JSONRPCResponseSchema.safeParse(response);

			expect(result.success).toBe(true);
		});

		it("validates error response", () => {
			const response = createResponse("req-1", undefined, {
				code: -32600,
				message: "Invalid Request",
			});

			const result = JSONRPCResponseSchema.safeParse(response);
			expect(result.success).toBe(true);
		});

		it("response id matches request id", () => {
			const requestId = "test-req-123";
			const request = { ...createRequest("tools/list"), id: requestId };
			const response = createResponse(requestId, {});

			expect(response.id).toBe(request.id);
		});
	});

	describe("CallToolRequest Validation", () => {
		it("validates analyze_risk tool call", () => {
			const request = createToolCallRequest("snapback.analyze_risk", {
				diff: "+const x = 1;",
				filePath: "/src/index.ts",
			});

			const result = CallToolRequestSchema.safeParse(request);
			expect(result.success).toBe(true);
		});

		it("validates tool call with no arguments", () => {
			const request = createToolCallRequest("snapback.list_checkpoints");

			const result = CallToolRequestSchema.safeParse(request);
			expect(result.success).toBe(true);
		});

		it("rejects tool call with wrong method", () => {
			const invalid = {
				jsonrpc: "2.0",
				id: "test",
				method: "wrong/method",
				params: { name: "snapback.analyze_risk" },
			};

			const result = CallToolRequestSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("rejects tool call without name", () => {
			const invalid = {
				jsonrpc: "2.0",
				id: "test",
				method: "tools/call",
				params: { arguments: {} },
			};

			const result = CallToolRequestSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});
	});

	describe("Tool Definition Validation", () => {
		it("all SnapBack tools have valid schemas", () => {
			const toolList = Object.values(SNAPBACK_TOOLS);

			const result = ListToolsResponseSchema.safeParse({ tools: toolList });
			expect(result.success).toBe(true);
		});

		it("analyze_risk has required diff parameter", () => {
			const tool = SNAPBACK_TOOLS["snapback.analyze_risk"];

			expect(tool.inputSchema.required).toContain("diff");
		});

		it("create_checkpoint has required files parameter", () => {
			const tool = SNAPBACK_TOOLS["snapback.create_checkpoint"];

			expect(tool.inputSchema.required).toContain("files");
		});

		it("restore_checkpoint has required checkpointId parameter", () => {
			const tool = SNAPBACK_TOOLS["snapback.restore_checkpoint"];

			expect(tool.inputSchema.required).toContain("checkpointId");
		});

		it("list_checkpoints has no required parameters", () => {
			const tool = SNAPBACK_TOOLS["snapback.list_checkpoints"];

			expect(tool.inputSchema.required).toBeUndefined();
		});

		it("all tools have descriptions", () => {
			for (const tool of Object.values(SNAPBACK_TOOLS)) {
				expect(tool.description).toBeDefined();
				expect(tool.description.length).toBeGreaterThan(10);
			}
		});
	});

	describe("Tool Tier Gating", () => {
		const FREE_TOOLS = ["snapback.analyze_risk", "snapback.check_dependencies"];
		const PRO_TOOLS = ["snapback.create_checkpoint", "snapback.list_checkpoints", "snapback.restore_checkpoint"];

		it("free tools are accessible", () => {
			for (const toolName of FREE_TOOLS) {
				expect(SNAPBACK_TOOLS[toolName as keyof typeof SNAPBACK_TOOLS]).toBeDefined();
			}
		});

		it("pro tools are defined", () => {
			for (const toolName of PRO_TOOLS) {
				expect(SNAPBACK_TOOLS[toolName as keyof typeof SNAPBACK_TOOLS]).toBeDefined();
			}
		});

		it("tool count matches expected", () => {
			const totalTools = FREE_TOOLS.length + PRO_TOOLS.length;
			expect(Object.keys(SNAPBACK_TOOLS)).toHaveLength(totalTools);
		});
	});

	describe("Error Codes", () => {
		const MCP_ERROR_CODES = {
			PARSE_ERROR: -32700,
			INVALID_REQUEST: -32600,
			METHOD_NOT_FOUND: -32601,
			INVALID_PARAMS: -32602,
			INTERNAL_ERROR: -32603,
		};

		it("PARSE_ERROR is -32700", () => {
			expect(MCP_ERROR_CODES.PARSE_ERROR).toBe(-32700);
		});

		it("INVALID_REQUEST is -32600", () => {
			expect(MCP_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
		});

		it("METHOD_NOT_FOUND is -32601", () => {
			expect(MCP_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
		});

		it("error response structure is valid", () => {
			const errorResponse = {
				jsonrpc: "2.0",
				id: "req-1",
				error: {
					code: MCP_ERROR_CODES.METHOD_NOT_FOUND,
					message: "Tool not found: invalid.tool",
					data: { toolName: "invalid.tool" },
				},
			};

			const result = JSONRPCResponseSchema.safeParse(errorResponse);
			expect(result.success).toBe(true);
		});
	});

	describe("Message Serialization", () => {
		it("request serializes to valid JSON", () => {
			const request = createRequest("tools/list");
			const json = JSON.stringify(request);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(request);
		});

		it("response serializes to valid JSON", () => {
			const response = createResponse("1", { tools: Object.values(SNAPBACK_TOOLS) });
			const json = JSON.stringify(response);
			const parsed = JSON.parse(json);

			expect(parsed).toEqual(response);
		});

		it("handles special characters in tool arguments", () => {
			const request = createToolCallRequest("snapback.analyze_risk", {
				diff: '+const str = "hello\\nworld";',
				filePath: "/path/to/file with spaces.ts",
			});

			const json = JSON.stringify(request);
			const parsed = JSON.parse(json);

			expect(parsed.params.arguments.diff).toContain("\\n");
		});
	});
});
