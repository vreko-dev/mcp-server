/**
 * MCP Tool Type Definitions
 *
 * Types for defining SnapBack MCP tools with annotations
 * and output schemas.
 *
 * @module tools/types
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Extended tool definition with MCP annotations and output schema
 */
export interface SnapBackToolDefinition extends MCPTool {
	annotations?: {
		/** Human-readable title for the tool */
		title?: string;
		/** If true, the tool does not modify any state */
		readOnlyHint?: boolean;
		/** If true, the tool may perform destructive updates */
		destructiveHint?: boolean;
		/** If true, calling the tool multiple times with same args has same effect */
		idempotentHint?: boolean;
		/** If true, tool interacts with external entities */
		openWorldHint?: boolean;
	};
	/** JSON Schema for structured output */
	outputSchema?: Record<string, unknown>;
	/** Internal: tier requirement */
	tier?: "free" | "pro";
	/** Whether this tool requires backend connectivity */
	requiresBackend?: boolean;
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TArgs = unknown, TResult = unknown> = (args: TArgs, context: ToolContext) => Promise<TResult>;

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
	workspaceRoot: string;
	tier: "free" | "pro" | "enterprise";
	userId?: string;
	sessionId?: string;
}

/**
 * Standard tool result with next_actions
 */
export interface ToolResult<T = unknown> {
	ok: boolean;
	timestamp: string;
	data?: T;
	error?: {
		code: string;
		message: string;
		hint?: string;
	};
	next_actions?: Array<{
		tool: string;
		priority: number;
		reason: string;
		condition?: string;
	}>;
	session?: {
		score?: number;
		coaching?: string;
	};
}

/**
 * Create a success result
 */
export function createSuccessResult<T>(data: T, nextActions?: ToolResult["next_actions"]): ToolResult<T> {
	return {
		ok: true,
		timestamp: new Date().toISOString(),
		data,
		next_actions: nextActions,
	};
}

/**
 * Create an error result
 */
export function createErrorResult(code: string, message: string, hint?: string): ToolResult<never> {
	return {
		ok: false,
		timestamp: new Date().toISOString(),
		error: { code, message, hint },
	};
}
