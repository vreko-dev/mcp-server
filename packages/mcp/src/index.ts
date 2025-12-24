/**
 * @snapback/mcp - MCP Server Library
 *
 * Provides MCP server creation and transport for the SnapBack CLI.
 * This package contains no CLI concerns - it only knows how to create
 * and run an MCP server given configuration.
 *
 * @example
 * ```typescript
 * import { createMcpServer, runStdioMcpServer } from "@snapback/mcp";
 *
 * await runStdioMcpServer({
 *   workspaceRoot: "/path/to/workspace",
 *   config: loadedConfig,
 * });
 * ```
 *
 * @module @snapback/mcp
 */

// Client exports
export { type ApiClientConfig, SnapBackAPIClient } from "./client/api-client.js";
export { MCP_ROUTES, type McpRouteKey } from "./client/routes.js";
// Facade handlers
export { facadeHandlers } from "./facades/handlers.js";
// Migration utilities
export {
	FACADE_TO_LEGACY,
	isLegacyTool,
	resolveFacadeName,
	TOOL_MIGRATIONS,
} from "./migrations.js";
// Registry and tool types
export {
	FACADE_TOOLS,
	listFacadeTools,
	type SnapBackTool,
	type ToolContext,
	type ToolHandler,
	type ToolResult,
	tools,
} from "./registry.js";
// Main server exports
export { createMcpServer, type McpServerOptions } from "./server.js";

// Transport
export { runStdioMcpServer } from "./transport/stdio.js";
