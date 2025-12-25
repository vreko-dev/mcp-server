/**
 * Tool Registry
 *
 * Central registry for all MCP tools.
 * - Lists facades as primary tools
 * - Routes calls to appropriate handlers
 *
 * @module registry
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";

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
		name: "analyze",
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
		annotations: { title: "Analyze", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "prepare_workspace",
		description: `🛡️ **PRE-FLIGHT CHECK** - Assess workspace before risky modifications.

Combines vitals + context status + recommendations in one call.
Ideal for multi-file refactors or unfamiliar code areas.

**When to use:**
- Before major refactoring (3+ files)
- Before touching auth/security/payment code
- When protection score is unknown
- Starting work in unfamiliar codebase areas

**Returns:**
- Protection score (0-100%)
- Snapshot recommendation with reasoning
- List of safe vs risky operations
- Personalized coaching suggestions

💡 Tip: If score < 50%, consider snapshot_create first.`,
		inputSchema: {
			type: "object",
			properties: {
				workspaceId: { type: "string", description: "Workspace path (defaults to current)" },
			},
		},
		annotations: { title: "Prepare Workspace", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "snapshot_create",
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
		annotations: { title: "Create Snapshot", destructiveHint: false, idempotentHint: false },
		tier: "pro",
	},
	{
		name: "snapshot_list",
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
		annotations: { title: "List Snapshots", readOnlyHint: true, idempotentHint: true },
		tier: "pro",
	},
	{
		name: "snapshot_restore",
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
		annotations: { title: "Restore Snapshot", destructiveHint: true, idempotentHint: false },
		tier: "pro",
	},
	{
		name: "validate",
		description: `🔍 **CODE VALIDATION** - Quick or comprehensive code quality check.

**Operations:**
- mode: "quick" - Fast pattern check (~100ms)
- mode: "comprehensive" - Full 7-layer pipeline (~2s)

**When to use:**
- Quick: During iterative development for fast feedback
- Comprehensive: Before committing or after major changes
- Quick: When modifying a single file
- Comprehensive: When changes span multiple modules

💡 Tip: Use 'quick' during development, 'comprehensive' before commit.`,
		inputSchema: {
			type: "object",
			properties: {
				mode: { type: "string", enum: ["quick", "comprehensive"], default: "quick" },
				code: { type: "string", description: "Code to validate" },
				filePath: { type: "string", description: "Where this code will go" },
			},
			required: ["code", "filePath"],
		},
		annotations: { title: "Validate Code", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "context",
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
		annotations: { title: "Context Management", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "session",
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
		annotations: { title: "Session Management", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "learn",
		description: `💡 **CAPTURE KNOWLEDGE** - Record patterns, pitfalls, and workflows.

Stores learnings locally for personalized recommendations.
Builds your codebase-specific knowledge base over time.

**When to use:**
- After solving a tricky problem
- When discovering an undocumented pattern
- After fixing a bug with a non-obvious cause
- When a workflow optimization works well

**Learning types:**
- pattern: "When X, do Y"
- pitfall: "Never do X because Y"
- efficiency: "X is faster than Y"
- discovery: "X is possible using Y"
- workflow: "To achieve X, follow steps Y"

💡 Tip: Good learnings have clear triggers and actions.`,
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
		annotations: { title: "Record Learning", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "acknowledge_risk",
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
		annotations: { title: "Acknowledge Risk", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "get_context",
		description: `🚀 **CALL THIS FIRST** - Essential entry point for any development task.

Gathers workspace context, patterns, constraints, and relevant learnings.
Unlike snapshot_create, this is a READ-ONLY intelligence gathering tool.

**When to use:**
- Starting ANY new task (refactoring, feature, bug fix)
- Before making multi-file changes
- When unsure about project patterns or constraints
- After switching to a different area of the codebase

**Returns:**
- Project patterns and architectural constraints
- Recent learnings relevant to your task keywords
- Current workspace health and vitals
- Active violations to avoid repeating

💡 Tip: Pair with check_patterns before committing.`,
		inputSchema: {
			type: "object",
			properties: {
				task: { type: "string", description: "Brief description of what you're about to do" },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you plan to modify (optional)",
				},
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords for learning retrieval (optional)",
				},
			},
			required: ["task"],
		},
		annotations: { title: "Get Context", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "check_patterns",
		description: `✅ **PRE-COMMIT VALIDATION** - Catch violations before they become problems.

Runs 7-layer validation pipeline against codebase patterns.
This is your quality gate before any commit.

**When to use:**
- Before committing ANY code changes
- After implementing a feature or fix
- When modifying shared utilities or core modules
- Before opening a PR

**7-Layer Pipeline:**
1. Syntax - Parse errors
2. Types - TypeScript errors
3. Tests - Test coverage
4. Architecture - Layer boundary violations
5. Security - Known vulnerability patterns
6. Dependencies - Circular import detection
7. Performance - Known bottleneck patterns

💡 Tip: Use with get_context for comprehensive coverage.`,
		inputSchema: {
			type: "object",
			properties: {
				code: { type: "string", description: "Code to validate" },
				filePath: { type: "string", description: "Target file path" },
			},
			required: ["code", "filePath"],
		},
		annotations: { title: "Check Patterns", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "report_violation",
		description: `⚠️ **LEARNING FROM MISTAKES** - Record violations for pattern promotion.

Tracks mistakes to prevent recurrence. Auto-promotes frequent violations.
- 3 occurrences → promoted to pattern
- 5 occurrences → marked for automation

**When to use:**
- After catching an architectural boundary violation
- When tests reveal a repeated mistake pattern
- After debugging a recurring issue
- When check_patterns finds a new violation type

**Required fields:**
- type: e.g., 'layer-boundary-violation', 'vague-assertion'
- whatHappened: The actual mistake
- whyItHappened: Root cause analysis
- prevention: How to avoid next time

💡 Tip: The "why" matters most for learning.`,
		inputSchema: {
			type: "object",
			properties: {
				type: {
					type: "string",
					description: "Violation type (e.g., 'layer-boundary-violation', 'vague-assertion')",
				},
				file: { type: "string", description: "File where violation occurred" },
				whatHappened: { type: "string", description: "What went wrong" },
				whyItHappened: { type: "string", description: "Why this happened (reflection required)" },
				prevention: { type: "string", description: "What would have prevented this" },
			},
			required: ["type", "file", "whatHappened", "whyItHappened", "prevention"],
		},
		annotations: { title: "Report Violation", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "get_learnings",
		description: `📚 **KNOWLEDGE RETRIEVAL** - Learn from past successes and mistakes.

Searches your learning database by keywords.
Avoid reinventing solutions or repeating past mistakes.

**When to use:**
- Before implementing something you may have done before
- When encountering an unfamiliar error pattern
- After multiple violations in the same area
- Looking for established workflow patterns

**Learning types:**
- pattern: Proven solutions and approaches
- pitfall: Mistakes to avoid
- efficiency: Workflow optimizations
- discovery: Useful findings
- workflow: Step-by-step processes

💡 Tip: Broad keywords work better than specific queries.`,
		inputSchema: {
			type: "object",
			properties: {
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords to search for in learnings",
				},
				limit: { type: "number", description: "Max results to return (default: 10)" },
			},
			required: ["keywords"],
		},
		annotations: { title: "Get Learnings", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "meta",
		description: `Get tool metadata and capabilities.

Returns catalog of available tools with their descriptions.`,
		inputSchema: {
			type: "object",
			properties: {},
		},
		annotations: { title: "Tool Metadata", readOnlyHint: true, idempotentHint: true },
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
 * Get handler for a tool
 */
export function getHandler(toolName: string): ToolHandler | undefined {
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
