/**
 * MCP Server Factory
 *
 * Creates and configures the MCP server with all tools registered.
 * This is the main entry point for server creation.
 *
 * @module server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { SnapBackAPIClient } from "./client/api-client.js";
import { CommonErrors, createRequestContext, log, logError, logSuccess } from "./errors.js";
import { facadeHandlers } from "./facades/handlers.js";
import { getIntelligence } from "./facades/intelligence.js";
import { FACADE_TOOLS, getHandler, registerHandler, type ToolContext, type ToolResult } from "./registry.js";
import { getToolSchema, validateInput } from "./validation.js";

/**
 * SessionHealth summary added to all tool responses
 * Provides workspace vitals visibility to AI agents
 */
interface SessionHealth {
	pulse: string; // "resting" | "elevated" | "racing" | "critical"
	pressure: number; // 0-100
	trajectory: string; // "stable" | "escalating" | "critical" | "recovering"
	snapshotRecommended: boolean;
	hint?: string;
}

/**
 * Enhance a tool result with SessionHealth data
 * Appends vitals information to the response for AI agent visibility
 */
function enhanceWithSessionHealth(result: ToolResult, workspaceRoot: string): ToolResult {
	// Skip enhancement for error results or meta queries
	if (result.isError) {
		return result;
	}

	try {
		const intel = getIntelligence(workspaceRoot);
		const vitals = intel.getVitalsSnapshot(workspaceRoot);

		if (!vitals) {
			return result;
		}

		// Build compact session health summary
		const sessionHealth: SessionHealth = {
			pulse: vitals.pulse.level,
			pressure: vitals.pressure.value,
			trajectory: vitals.trajectory,
			snapshotRecommended: vitals.pressure.value > 60 || vitals.trajectory === "escalating",
		};

		// Add hint for elevated states
		if (vitals.trajectory === "critical" || vitals.pressure.value > 80) {
			sessionHealth.hint = "Consider creating a snapshot before continuing";
		} else if (vitals.pulse.level === "racing") {
			sessionHealth.hint = "High change velocity detected - take care with modifications";
		}

		// Parse existing result and add _sessionHealth
		const originalText = result.content[0]?.text;
		if (originalText) {
			try {
				const parsed = JSON.parse(originalText);
				const enhanced = {
					...parsed,
					_sessionHealth: sessionHealth,
				};
				return {
					content: [{ type: "text", text: JSON.stringify(enhanced, null, 2) }],
					isError: false,
				};
			} catch {
				// If not JSON, append as separate block
				return {
					content: [
						...result.content,
						{ type: "text", text: `\n_sessionHealth: ${JSON.stringify(sessionHealth)}` },
					],
					isError: false,
				};
			}
		}

		return result;
	} catch {
		// If vitals retrieval fails, return original result
		return result;
	}
}

/**
 * Options for creating an MCP server
 */
export interface McpServerOptions {
	/** Absolute path to workspace root */
	workspaceRoot: string;
	/** User tier for gating features */
	tier: "free" | "pro" | "enterprise";
	/** Optional API client for backend operations */
	apiClient?: SnapBackAPIClient;
	/** Optional auth context */
	auth?: {
		apiKey?: string;
		userId?: string;
	};
	/** Optional telemetry sink */
	telemetry?: {
		log: (event: string, data: Record<string, unknown>) => void;
	};
}

/**
 * Create an MCP server with all tools registered
 *
 * @param options - Server configuration options
 * @returns Configured MCP Server instance
 *
 * @example
 * ```typescript
 * const server = createMcpServer({
 *   workspaceRoot: "/path/to/workspace",
 *   tier: "pro",
 * });
 * ```
 */
export function createMcpServer(options: McpServerOptions): Server {
	const { workspaceRoot, tier } = options;

	const server = new Server(
		{
			name: "snapback-mcp",
			version: "1.0.0",
		},
		{
			capabilities: {
				tools: {},
				resources: {},
			},
		},
	);

	// Create handler context
	const context: ToolContext = {
		workspaceRoot,
		tier,
		userId: options.auth?.userId,
	};

	// Register all facade handlers
	for (const [name, handler] of Object.entries(facadeHandlers)) {
		registerHandler(name, handler);
	}

	// Log server creation
	console.error(`[SnapBack MCP] Server created for workspace: ${workspaceRoot}`);
	console.error(`[SnapBack MCP] Tier: ${tier}`);
	console.error(`[SnapBack MCP] ${FACADE_TOOLS.length} facade tools registered`);

	// Handle ListTools - return only facades (clean catalog)
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		// Filter by tier if needed
		const availableTools = FACADE_TOOLS.filter((tool) => {
			if (tool.tier === "pro" && tier === "free") {
				return false;
			}
			return true;
		});

		return {
			tools: availableTools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				annotations: tool.annotations,
			})),
		};
	});

	// Handle CallTool - route to appropriate handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		// P1-003: Create request context for structured logging
		const reqCtx = createRequestContext(name, { userId: context.userId, tier: context.tier });
		log("info", reqCtx, "Tool call started", { args: Object.keys(args || {}) });

		// P0-002: Tier gating BEFORE handler execution
		const toolDef = FACADE_TOOLS.find((t) => t.name === name);
		if (toolDef?.tier === "pro" && tier === "free") {
			logError(reqCtx, "E301_TIER_GATE_BLOCKED", "Tool requires pro tier");
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(CommonErrors.tierGateBlocked(name, "pro", tier)),
					},
				],
				isError: true,
			};
		}

		// P0-003: Input validation with Zod schemas
		const schema = getToolSchema(name);
		if (schema) {
			const validation = validateInput(schema, args || {});
			if (!validation.valid) {
				logError(reqCtx, "E104_VALIDATION_FAILED", validation.error);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								error: "E104_VALIDATION_FAILED",
								message: validation.error,
								tool: name,
								issues: validation.issues,
							}),
						},
					],
					isError: true,
				};
			}
		}

		// Get handler
		const handler = getHandler(name);
		if (!handler) {
			logError(reqCtx, "E501_UNKNOWN_TOOL", `Unknown tool: ${name}`);
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: "E501_UNKNOWN_TOOL",
							message: `Unknown tool: ${name}`,
							suggestion: "Use meta to list available tools",
						}),
					},
				],
				isError: true,
			};
		}

		try {
			// Call handler with args and context
			const result = await handler(args || {}, context);
			logSuccess(reqCtx, "Tool call completed", { isError: result.isError });

			// Enhance successful responses with SessionHealth (skip for 'meta' tool)
			const enhanced = name === "meta" ? result : enhanceWithSessionHealth(result, workspaceRoot);

			return {
				content: enhanced.content.map((c) => ({ type: "text" as const, text: c.text })),
				isError: enhanced.isError,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logError(reqCtx, "E502_HANDLER_ERROR", message);
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(CommonErrors.handlerError(name, message)),
					},
				],
				isError: true,
			};
		}
	});

	return server;
}
