/**
 * Tool Registry
 *
 * Central registry for all MCP tools.
 * - Lists facades as primary tools
 * - Routes calls to appropriate handlers
 * - Supports legacy tool names via migration map
 *
 * @module registry
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import { isLegacyTool, resolveFacadeName, warnLegacyUsage } from "./migrations.js";

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
 * Facade tool definitions
 *
 * These are the primary tools exposed to LLMs.
 * Each facade consolidates multiple legacy tools via op-based dispatch.
 */
export const FACADE_TOOLS: SnapBackTool[] = [
	{
		name: "snapback.analyze",
		description: `Analyze code changes for risks or validate package recommendations.

**Operations:**
- type: "risk" - Assess risk of code changes before applying
- type: "package" - Validate AI-suggested package installations

**When to use:**
- Before accepting AI-generated code
- When reviewing security-sensitive changes
- Before installing packages suggested by AI

Returns risk assessment with severity levels and mitigation steps.`,
		inputSchema: {
			type: "object",
			properties: {
				type: { type: "string", enum: ["risk", "package"], description: "Analysis type" },
				changes: { type: "array", description: "For risk: array of diff changes" },
				filePath: { type: "string", description: "For risk: path to file being changed" },
				packageName: { type: "string", description: "For package: name of package" },
				targetVersion: { type: "string", description: "For package: target version" },
			},
			required: ["type"],
		},
		annotations: { title: "Analyze", readOnlyHint: true },
		tier: "free",
	},
	{
		name: "snapback.prepare_workspace",
		description: `Pre-flight workspace check before making changes.

Combines workspace vitals + context status + snapshot recommendations.
Call this BEFORE any risky modification.

Returns:
- Protection score (0-100%)
- Snapshot recommendation
- Safe/risky operations
- Coaching suggestions`,
		inputSchema: {
			type: "object",
			properties: {
				workspaceId: { type: "string", description: "Workspace path (defaults to current)" },
			},
		},
		annotations: { title: "Prepare Workspace", readOnlyHint: true },
		tier: "free",
	},
	{
		name: "snapback.snapshot_create",
		description: `Create a restorable code snapshot before risky modifications.

**When to use:**
- Before major refactoring
- Before modifying auth/security/payment code
- Before AI-assisted multi-file refactors
- When protection score is low

Returns snapshot ID for later restoration.`,
		inputSchema: {
			type: "object",
			properties: {
				files: { type: "array", items: { type: "string" }, description: "Files to include" },
				reason: { type: "string", description: "Why this snapshot was created" },
				trigger: { type: "string", enum: ["manual", "mcp", "ai_assist", "session_end"] },
			},
			required: ["files"],
		},
		annotations: { title: "Create Snapshot", destructiveHint: false },
		tier: "pro",
	},
	{
		name: "snapback.snapshot_list",
		description: `List available snapshots for restoration.

**When to use:**
- Before choosing which snapshot to restore
- To verify a snapshot was created
- To see restore points`,
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", description: "Max snapshots to return (default: 20)" },
				since: { type: "string", format: "date-time", description: "Only show after this time" },
			},
		},
		annotations: { title: "List Snapshots", readOnlyHint: true },
		tier: "pro",
	},
	{
		name: "snapback.snapshot_restore",
		description: `Restore code from a previously created snapshot.

**When to use:**
- After AI changes broke something
- When tests fail after modifications
- To return to a known good state

⚠️ DESTRUCTIVE: Will overwrite current file contents.`,
		inputSchema: {
			type: "object",
			properties: {
				snapshotId: { type: "string", description: "ID of snapshot to restore" },
				files: { type: "array", items: { type: "string" }, description: "Specific files (optional)" },
				dryRun: { type: "boolean", description: "Preview without applying" },
			},
			required: ["snapshotId"],
		},
		annotations: { title: "Restore Snapshot", destructiveHint: true },
		tier: "pro",
	},
	{
		name: "snapback.validate",
		description: `Validate code against codebase patterns and best practices.

**Operations:**
- mode: "quick" - Fast pattern check
- mode: "comprehensive" - Full validation pipeline (7 layers)

**When to use:**
- Before committing code changes
- After implementing a feature
- To catch architectural violations early`,
		inputSchema: {
			type: "object",
			properties: {
				mode: { type: "string", enum: ["quick", "comprehensive"], default: "quick" },
				code: { type: "string", description: "Code to validate" },
				filePath: { type: "string", description: "Where this code will go" },
			},
			required: ["code", "filePath"],
		},
		annotations: { title: "Validate Code", readOnlyHint: true },
		tier: "free",
	},
	{
		name: "snapback.context",
		description: `Manage project context (init, build, validate, status, constraints).

**Operations:**
- op: "init" - Initialize context in workspace
- op: "build" - Rebuild .ctx from context.json
- op: "validate" - Check context freshness
- op: "status" - Quick health check
- op: "constraint" - Get a constraint value
- op: "check" - Check value against constraint
- op: "blockers" - Get current project blockers`,
		inputSchema: {
			type: "object",
			properties: {
				op: {
					type: "string",
					enum: ["init", "build", "validate", "status", "constraint", "check", "blockers"],
				},
				domain: { type: "string", description: "For constraint/check: domain name" },
				name: { type: "string", description: "For constraint/check: constraint name" },
				value: { type: "number", description: "For check: value to check" },
			},
			required: ["op"],
		},
		annotations: { title: "Context Management", readOnlyHint: false },
		tier: "free",
	},
	{
		name: "snapback.session",
		description: `Manage coding session lifecycle.

**Operations:**
- op: "start" - Begin a new session with personalized recommendations
- op: "recommendations" - Get personalized suggestions
- op: "stats" - Get current session statistics
- op: "end" - End session with learning prompts

Note: CLI owns session state, MCP provides read-only stats and next_actions hints.`,
		inputSchema: {
			type: "object",
			properties: {
				op: { type: "string", enum: ["start", "recommendations", "stats", "end"] },
				taskDescription: { type: "string", description: "For start: what you're working on" },
				files: { type: "array", items: { type: "string" }, description: "For start: planned files" },
				acceptLearnings: {
					type: "array",
					items: { type: "number" },
					description: "For end: indices to accept",
				},
			},
			required: ["op"],
		},
		annotations: { title: "Session Management", readOnlyHint: false },
		tier: "free",
	},
	{
		name: "snapback.learn",
		description: `Record learnings from development sessions.

**When to use:**
- After discovering a useful pattern
- When encountering a pitfall to avoid
- To capture workflow improvements

Learnings are stored locally and used for personalized recommendations.`,
		inputSchema: {
			type: "object",
			properties: {
				type: { type: "string", enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"] },
				trigger: { type: "string", description: "What triggers this learning" },
				action: { type: "string", description: "What to do when triggered" },
				source: { type: "string", description: "Where this learning came from" },
			},
			required: ["type", "trigger", "action"],
		},
		annotations: { title: "Record Learning", readOnlyHint: false },
		tier: "free",
	},
	{
		name: "snapback.acknowledge_risk",
		description: `Acknowledge current risk state and proceed with changes.

**When to use:**
- After reviewing elevated vitals and deciding to proceed
- When user explicitly says "I understand the risks"
- To create audit trail of risk acknowledgments`,
		inputSchema: {
			type: "object",
			properties: {
				files: { type: "array", items: { type: "string" }, description: "Files you intend to modify" },
				reason: { type: "string", description: "Why you are proceeding despite risk" },
			},
			required: ["files", "reason"],
		},
		annotations: { title: "Acknowledge Risk", readOnlyHint: false },
		tier: "free",
	},
	{
		name: "snapback.meta",
		description: `Get tool metadata and capabilities.

Returns catalog of available tools with their descriptions.`,
		inputSchema: {
			type: "object",
			properties: {},
		},
		annotations: { title: "Tool Metadata", readOnlyHint: true },
		tier: "free",
	},
];

/**
 * Handler registry - maps tool names to handler functions
 * Will be populated when legacy handlers are registered
 */
const handlerRegistry: Map<string, ToolHandler> = new Map();

/**
 * Register a tool handler
 */
export function registerHandler(toolName: string, handler: ToolHandler): void {
	handlerRegistry.set(toolName, handler);
}

/**
 * Get handler for a tool (resolves legacy names)
 */
export function getHandler(toolName: string): ToolHandler | undefined {
	// Check if it's a legacy name
	if (isLegacyTool(toolName)) {
		warnLegacyUsage(toolName);
		const facadeName = resolveFacadeName(toolName);
		return handlerRegistry.get(facadeName);
	}
	return handlerRegistry.get(toolName);
}

/**
 * Get all facade tools for ListTools
 */
export function listFacadeTools(): SnapBackTool[] {
	return FACADE_TOOLS;
}

/**
 * Export for convenience
 */
export const tools = FACADE_TOOLS;
