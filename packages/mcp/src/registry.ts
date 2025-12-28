/**
 * Tool Registry
 *
 * Central registry for MCP tool handlers.
 * Tool definitions are in tools/consolidated/registry.ts (7 consolidated tools)
 *
 * @module registry
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import { CONSOLIDATED_TOOLS } from "./tools/consolidated/registry.js";

/**
 * Extended tool definition with annotations
 */
export interface SnapBackTool extends MCPTool {
	annotations?: {
		title?: string;
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
		idempotentHint?: boolean;
	};
	tier?: "free" | "pro";
	deprecated?: boolean;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;

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
 * Standard tool result
 */
export interface ToolResult {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
}

/**
 * Handler registry - maps tool names to handler functions
 */
const handlerRegistry: Map<string, ToolHandler> = new Map();

/**
 * Register a tool handler
 */
export function registerHandler(toolName: string, handler: ToolHandler): void {
	handlerRegistry.set(toolName, handler);
}

/**
 * Get handler for a tool
 */
export function getHandler(toolName: string): ToolHandler | undefined {
	return handlerRegistry.get(toolName);
}

/**
 * Get all tools (consolidated)
 * @deprecated Use CONSOLIDATED_TOOLS directly from tools/consolidated/registry.js
 */
export function listFacadeTools(): SnapBackTool[] {
	return CONSOLIDATED_TOOLS;
}

/**
 * Legacy FACADE_TOOLS export for backward compatibility
 * @deprecated Import CONSOLIDATED_TOOLS from tools/consolidated/registry.js instead
 */
export const FACADE_TOOLS = CONSOLIDATED_TOOLS;

/**
 * Export for convenience
 */
export const tools = CONSOLIDATED_TOOLS;
