/**
 * MCP Server Factory
 *
 * Creates and configures the MCP server with all tools registered.
 * This is the main entry point for server creation.
 *
 * B+ Strategy:
 * - Expose only facade tools in ListTools (clean catalog)
 * - Route legacy tool names to facades via migration map
 * - Deprecation warnings for legacy tool usage
 *
 * @module server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { SnapBackAPIClient } from "./client/api-client.js";
import { facadeHandlers } from "./facades/handlers.js";
import { isLegacyTool, resolveFacadeName, warnLegacyUsage } from "./migrations.js";
import { FACADE_TOOLS, getHandler, registerHandler, type ToolContext } from "./registry.js";

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

		// Check for legacy tool usage
		if (isLegacyTool(name)) {
			warnLegacyUsage(name);
		}

		// Resolve to facade name (legacy names map to facades)
		const facadeName = resolveFacadeName(name);

		// Get handler
		const handler = getHandler(facadeName);
		if (!handler) {
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: `Unknown tool: ${name}`,
							suggestion:
								facadeName !== name
									? `Did you mean '${facadeName}'?`
									: "Use snapback.meta to list available tools",
						}),
					},
				],
				isError: true,
			};
		}

		try {
			// Call handler with args and context
			const result = await handler(args || {}, context);
			return {
				content: result.content.map((c) => ({ type: "text" as const, text: c.text })),
				isError: result.isError,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[SnapBack MCP] Tool error (${name}): ${message}`);
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify({
							error: message,
							tool: name,
						}),
					},
				],
				isError: true,
			};
		}
	});

	return server;
}
