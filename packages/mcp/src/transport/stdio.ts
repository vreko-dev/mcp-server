/**
 * Stdio Transport for MCP Server
 *
 * Runs the MCP server over stdio for integration with
 * Cursor, Claude Desktop, and other MCP clients.
 *
 * @module transport/stdio
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, type McpServerOptions } from "../server.js";

/**
 * Run MCP server with stdio transport
 *
 * This is the main entry point for CLI integration.
 * The server will communicate over stdin/stdout using
 * the MCP protocol.
 *
 * @param options - Server configuration options
 *
 * @example
 * ```typescript
 * // In CLI command handler:
 * await runStdioMcpServer({
 *   workspaceRoot: process.cwd(),
 *   tier: "pro",
 * });
 * ```
 */
export async function runStdioMcpServer(options: McpServerOptions): Promise<void> {
	const server = createMcpServer(options);
	const transport = new StdioServerTransport();

	// Connect server to transport
	await server.connect(transport);

	console.error("[SnapBack MCP] Server running on stdio transport");

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.error("[SnapBack MCP] Shutting down...");
		await server.close();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.error("[SnapBack MCP] Shutting down...");
		await server.close();
		process.exit(0);
	});
}
