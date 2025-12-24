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
// Main server exports
export { createMcpServer, type McpServerOptions } from "./server.js";
// Tool types
export type { SnapBackToolDefinition, ToolHandler } from "./tools/types.js";
export { runStdioMcpServer } from "./transport/stdio.js";
