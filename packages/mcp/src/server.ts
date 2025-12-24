/**
 * MCP Server Factory
 *
 * Creates and configures the MCP server with all tools registered.
 * This is the main entry point for server creation.
 *
 * @module server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { SnapBackAPIClient } from "./client/api-client.js";
import { facadeTools } from "./tools/facades.js";

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

	// Store context for handlers
	const _context = {
		workspaceRoot,
		tier,
		apiClient: options.apiClient,
		auth: options.auth,
		telemetry: options.telemetry,
	};

	// Log server creation
	console.error(`[SnapBack MCP] Server created for workspace: ${workspaceRoot}`);
	console.error(`[SnapBack MCP] Tier: ${tier}`);

	// Register facade tools
	// Tool handlers will be implemented in Phase 3
	for (const [name] of Object.entries(facadeTools)) {
		console.error(`[SnapBack MCP] Tool registered: ${name}`);
	}

	return server;
}
