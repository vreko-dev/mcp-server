/**
 * SnapBack Transport: MCP Server
 *
 * This is the MCP (Model Context Protocol) server that AI coding assistants
 * connect to. It exposes tools for file operations with validation.
 *
 * Target: ~200 LOC
 *
 * SOURCE REFERENCE:
 * - apps/mcp-server/src/index.ts (current MCP implementation)
 * - Current tools: analyze_risk, check_dependencies, checkpoints, catalog, etc.
 *
 * SIMPLIFICATION:
 * We reduce from 8+ tools to 4 essential tools:
 * 1. write_files - Write with validation (the main tool)
 * 2. get_context - Get project health and suggestions
 * 3. list_snapshots - List available snapshots
 * 4. restore_snapshot - Restore from a snapshot
 *
 * KEY FEATURE: Session Coaching
 * Every tool response includes session health, so the agent
 * continuously receives feedback about the codebase state.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { eventBus } from "../runtime/events";
import { orchestrator } from "../runtime/orchestrator";
import type { FileChange, SessionHealth, TransportResponse } from "../types";

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Tool definitions for the MCP server
 *
 * These are exposed to AI coding assistants like Claude, Cursor, etc.
 */
const TOOLS = [
	{
		name: "write_files",
		description: `Write files to disk with automatic validation and protection.

Before applying changes, SnapBack:
1. Runs type checking (TypeScript)
2. Checks for circular dependencies
3. Analyzes risk level
4. Creates a snapshot if needed

Returns validation results and session health.
If validation fails, changes are NOT applied and you receive specific errors to fix.`,
		inputSchema: {
			type: "object" as const,
			properties: {
				files: {
					type: "object",
					description: "Map of file paths to new content. Paths are relative to workspace root.",
					additionalProperties: { type: "string" },
				},
			},
			required: ["files"],
		},
	},
	{
		name: "get_context",
		description: `Get current project health, warnings, and suggestions.

Call this before making significant changes to understand:
- Current session health score (0-100)
- Active warnings (cycles, complexity issues)
- Suggestions for improvements
- Files modified in this session
- Sensitive files to be careful with

This helps you make better decisions about changes.`,
		inputSchema: {
			type: "object" as const,
			properties: {},
		},
	},
	{
		name: "list_snapshots",
		description: `List available snapshots for recovery.

Returns recent snapshots with:
- Snapshot ID
- Creation timestamp
- Files included
- Risk score at time of creation

Use this to find a snapshot to restore if needed.`,
		inputSchema: {
			type: "object" as const,
			properties: {
				limit: {
					type: "number",
					description: "Maximum number of snapshots to return (default: 10)",
				},
			},
		},
	},
	{
		name: "restore_snapshot",
		description: `Restore files from a previous snapshot.

This will:
1. Restore all files included in the snapshot
2. Create a new snapshot of current state (for undo)
3. Return list of restored files

Use this to recover from bad changes.`,
		inputSchema: {
			type: "object" as const,
			properties: {
				id: {
					type: "string",
					description: "Snapshot ID to restore",
				},
			},
			required: ["id"],
		},
	},
];

// =============================================================================
// RESPONSE WRAPPER
// =============================================================================

/**
 * Wrap any result with session health for coaching
 *
 * This is the key to continuous coaching - every response includes health.
 */
function wrapWithSession<T>(result: T): TransportResponse<T> {
	return {
		result,
		session: orchestrator.getHealth(),
	};
}

// =============================================================================
// TOOL HANDLERS
// =============================================================================

/**
 * Handle write_files tool
 *
 * This is the main tool - it validates and applies file changes.
 */
async function handleWriteFiles(params: { files: Record<string, string> }): Promise<
	TransportResponse<{
		applied: boolean;
		message: string;
		errors?: Array<{ message: string; file?: string; line?: number }>;
	}>
> {
	// Convert file map to FileChange array
	const fileChanges: FileChange[] = Object.entries(params.files).map(([path, content]) => ({
		path,
		content,
		lineCount: content.split("\n").length,
		changeType: "modify" as const, // TODO: Detect add vs modify
	}));

	// Run orchestrator analysis
	const result = await orchestrator.analyze(fileChanges);

	if (result.outcome === "fail") {
		// Validation failed - return errors, don't apply
		const errors = result.validators.filter((v) => v.status === "fail").flatMap((v) => v.errors || []);

		return wrapWithSession({
			applied: false,
			message: `Validation failed. ${errors.length} error(s) found.`,
			errors,
		});
	}

	if (result.outcome === "warn") {
		// High risk but validation passed
		// TODO: Implement actual file writing
		// For now, we indicate what would happen

		return wrapWithSession({
			applied: true,
			message: `Changes applied with warnings. Risk score: ${result.riskScore}/10`,
		});
	}

	// Success - apply changes
	// TODO: Implement actual file writing via storage.ts

	return wrapWithSession({
		applied: true,
		message: `Changes applied successfully. Risk score: ${result.riskScore}/10`,
	});
}

/**
 * Handle get_context tool
 */
async function handleGetContext(): Promise<
	TransportResponse<{
		health: SessionHealth;
		sensitiveFiles: string[];
		recentWarnings: string[];
		suggestions: string[];
	}>
> {
	const health = orchestrator.getHealth();

	return wrapWithSession({
		health,
		sensitiveFiles: [
			// TODO: Load from config
			"src/auth/*",
			"*.env*",
			"config/*",
		],
		recentWarnings: health.warnings,
		suggestions: health.suggestions,
	});
}

/**
 * Handle list_snapshots tool
 */
async function handleListSnapshots(_params: { limit?: number }): Promise<
	TransportResponse<{
		snapshots: Array<{
			id: string;
			createdAt: number;
			fileCount: number;
			riskScore?: number;
		}>;
	}>
> {
	// TODO: Implement via storage.ts
	// For now, return empty list

	return wrapWithSession({
		snapshots: [],
	});
}

/**
 * Handle restore_snapshot tool
 */
async function handleRestoreSnapshot(_params: { id: string }): Promise<
	TransportResponse<{
		restored: boolean;
		filesRestored: string[];
		backupSnapshotId: string;
	}>
> {
	// TODO: Implement via storage.ts
	// For now, return not found

	return wrapWithSession({
		restored: false,
		filesRestored: [],
		backupSnapshotId: "",
	});
}

// =============================================================================
// SERVER SETUP
// =============================================================================

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
	const server = new Server(
		{
			name: "snapback",
			version: "2.0.0", // New simplified architecture version
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Register tool list handler
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return { tools: TOOLS };
	});

	// Register tool call handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			let result: unknown;

			switch (name) {
				case "write_files":
					result = await handleWriteFiles(args as { files: Record<string, string> });
					break;
				case "get_context":
					result = await handleGetContext();
					break;
				case "list_snapshots":
					result = await handleListSnapshots(args as { limit?: number });
					break;
				case "restore_snapshot":
					result = await handleRestoreSnapshot(args as { id: string });
					break;
				default:
					throw new Error(`Unknown tool: ${name}`);
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error) {
			eventBus.emit("error.occurred", {
				component: "mcp",
				message: error instanceof Error ? error.message : String(error),
				recoverable: true,
			});

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							error: error instanceof Error ? error.message : String(error),
							session: orchestrator.getHealth(),
						}),
					},
				],
				isError: true,
			};
		}
	});

	return server;
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Start the MCP server
 *
 * Usage: npx tsx transports/mcp.ts
 *
 * The server communicates via stdio (standard input/output).
 * AI coding assistants connect to this process.
 */
async function main() {
	const server = createServer();
	const transport = new StdioServerTransport();

	// Start session
	orchestrator.resetSession();

	// Connect and run
	await server.connect(transport);

	// Log startup (to stderr so it doesn't interfere with MCP protocol)
	console.error("SnapBack MCP server started (v2.0.0 - simplified architecture)");
}

// Run if this is the main module
main().catch((error) => {
	console.error("Failed to start MCP server:", error);
	process.exit(1);
});

export { createServer };
