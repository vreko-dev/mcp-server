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
- op: "blockers" - Get current project blockers
- op: "reset" - Reset/cleanup stale context (Quick Fix)
- op: "scan" - Scan for real-time blockers (Best Fix)`,
		inputSchema: {
			type: "object",
			properties: {
				op: {
					type: "string",
					enum: ["init", "build", "validate", "status", "constraint", "check", "blockers", "reset", "scan"],
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
Coordinates with Extension/CLI to provide unified project understanding.

**When to use:**
- Starting ANY new task (refactoring, feature, bug fix)
- Before making multi-file changes
- When unsure about project patterns or constraints
- After switching to a different area of the codebase

**Trigger keywords:** context, understand, patterns, constraints, what should I know

**Returns:**
- Project patterns and architectural constraints
- Recent learnings relevant to your task keywords
- Current workspace health and vitals
- Active violations to avoid repeating
- Cross-surface session state when Extension active

💡 Tip: Pair with check_patterns before committing.
💡 Consider using begin_task instead for full task lifecycle support.`,
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
	{
		name: "cleanup",
		description: `🧹 **RECLAIM SPACE** - Remove stale data and orphaned files.

Cleans up old snapshots, stale learnings, archived sessions, and orphaned blobs.
**Always runs dry-run first** to preview what would be deleted.

**Targets:**
- snapshots: Old snapshots beyond retention (default: 30 days, keep min 10)
- learnings: Stale/deprecated learnings (default: 90 days or architecture mismatch)
- sessions: Archived sessions older than retention
- blobs: Orphaned content blobs (no snapshot references them)
- all: Run all cleanup targets

**When to use:**
- Disk space is low
- After major architecture changes (stale learnings)
- Periodic maintenance (monthly recommended)
- Before starting fresh on a project

⚠️ DESTRUCTIVE: Archives data before deletion but cannot be undone.
💡 Tip: Always review dry-run output before executing.`,
		inputSchema: {
			type: "object",
			properties: {
				target: {
					type: "string",
					enum: ["snapshots", "learnings", "sessions", "blobs", "all"],
					default: "all",
					description: "What to clean up",
				},
				dryRun: {
					type: "boolean",
					default: true,
					description: "Preview only (default: true). Set false to execute.",
				},
				maxAge: {
					type: "number",
					description: "Days to retain (default varies by target: snapshots=30, learnings=90)",
				},
				keepCount: {
					type: "number",
					description: "Minimum items to keep regardless of age (default: 10 for snapshots)",
				},
			},
		},
		annotations: { title: "Cleanup", readOnlyHint: false, destructiveHint: true, idempotentHint: false },
		tier: "free",
	},

	// ==========================================================================
	// PAIR PROGRAMMER COMPOSITE TOOLS
	// These reduce 5+ tool calls to 1-2 for common workflows
	// ==========================================================================

	{
		name: "begin_task",
		description: `🚀 **START ANY TASK** - Single entry point for development tasks.

**CALL THIS FIRST** before any coding work. This is the unified entry point
that coordinates state across VS Code extension, CLI, and MCP.

Combines: get_context + snapshot_create + get_learnings + session.start
Reduces 5+ tool calls to 1 when starting any development work.

**What it does:**
- Auto-assesses risk of planned files
- Creates snapshot if risk warrants it (with deduplication)
- Retrieves relevant learnings for your task
- Loads project patterns and constraints
- Starts unified session tracking (shared with Extension/CLI)

**When to use:**
- Starting ANY new task (feature, bug fix, refactor)
- Before making multi-file changes
- When you want intelligent safety decisions
- After switching to a new area of the codebase

**Trigger keywords:** implement, add, create, fix, refactor, update, modify

**Returns:**
- Task ID for tracking (shared across Extension/CLI/MCP)
- Snapshot status (created/reused/skipped)
- Relevant learnings and patterns
- Risk assessment and recommendations
- Suggested next_actions
- _source: "daemon" when coordinated with Extension

💡 Tip: Provide file paths for better snapshot decisions.`,
		inputSchema: {
			type: "object",
			properties: {
				task: { type: "string", description: "Brief description of what you're about to do" },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Files you plan to modify (improves snapshot decisions)",
				},
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "Keywords for learning retrieval (auto-extracted if not provided)",
				},
				skipSnapshot: {
					type: "boolean",
					default: false,
					description: "Skip snapshot creation (default: auto-decides based on risk)",
				},
			},
			required: ["task"],
		},
		annotations: { title: "Begin Task", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "quick_check",
		description: `⚡ **FAST VALIDATION** - Parallel TypeScript, tests, and lint check.

Runs all validation in parallel for ~60% faster feedback.

**What it checks:**
- TypeScript compilation (noEmit)
- Related test file discovery/execution
- Biome lint validation

**When to use:**
- After making changes, before committing
- During iterative development
- To quickly verify code quality

**Options:**
- file/files: Specify files to check
- runTests: Actually run tests (not just discover)
- skipTypeScript/skipTests/skipLint: Skip specific checks

💡 Tip: Uses current task files if no files specified.`,
		inputSchema: {
			type: "object",
			properties: {
				file: { type: "string", description: "Single file to validate" },
				files: {
					type: "array",
					items: { type: "string" },
					description: "Multiple files to validate",
				},
				runTests: {
					type: "boolean",
					default: false,
					description: "Run tests (not just discover them)",
				},
				skipTypeScript: { type: "boolean", default: false, description: "Skip TypeScript check" },
				skipTests: { type: "boolean", default: false, description: "Skip test discovery" },
				skipLint: { type: "boolean", default: false, description: "Skip lint check" },
			},
		},
		annotations: { title: "Quick Check", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "what_changed",
		description: `📊 **CHANGE TRACKING** - See what changed since task start.

Unified change tracking across Extension, CLI, and MCP.
When Extension is active, shows AI-attributed changes with precise line counts.

**What it shows:**
- Files created/modified/deleted
- Lines changed per file
- AI-attributed changes (from Extension integration)
- Risk assessment based on changes
- Unified view of changes from all editing surfaces

**When to use:**
- Before committing to review changes
- To understand scope of modifications
- To verify AI vs human changes
- To get a unified view across Extension/CLI edits

**Trigger keywords:** changes, diff, modified, what did I change, review

**Options:**
- includeDiff: Include actual file diffs
- filterFiles: Only show specific files
- includeAIAttribution: Show AI attribution data

💡 Tip: Shows "_source: daemon" when Extension is actively tracking.`,
		inputSchema: {
			type: "object",
			properties: {
				includeDiff: {
					type: "boolean",
					default: false,
					description: "Include full diffs (default: summary only)",
				},
				filterFiles: {
					type: "array",
					items: { type: "string" },
					description: "Only show changes to these files",
				},
				includeAIAttribution: {
					type: "boolean",
					default: true,
					description: "Include AI attribution info",
				},
			},
		},
		annotations: { title: "What Changed", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "review_work",
		description: `📝 **PRE-COMMIT REVIEW** - Comprehensive review before committing.

Combines pattern validation, change summary, and learning suggestions.

**What it does:**
- Runs 7-layer validation on changed files
- Summarizes all modifications
- Suggests commit message
- Proposes learnings to capture
- Determines if ready to commit

**When to use:**
- Before committing any changes
- Before opening a PR
- After completing a feature/fix

**Returns:**
- readyToCommit: boolean
- validation issues (if any)
- suggestedCommitMessage
- suggestedLearnings

💡 Tip: Use complete_task to accept learnings and finalize.`,
		inputSchema: {
			type: "object",
			properties: {
				skipPatterns: {
					type: "boolean",
					default: false,
					description: "Skip pattern validation",
				},
				includeCommitMessage: {
					type: "boolean",
					default: true,
					description: "Generate suggested commit message",
				},
				files: {
					type: "array",
					items: { type: "string" },
					description: "Specific files to review (default: all changed)",
				},
			},
		},
		annotations: { title: "Review Work", readOnlyHint: true, idempotentHint: true },
		tier: "free",
	},
	{
		name: "complete_task",
		description: `✅ **FINISH TASK** - Gracefully end the current task.

Finalizes task with summary, optional snapshot, and learning capture.
Coordinates task completion across Extension, CLI, and MCP.

**What it does:**
- Generates task summary (files, lines, duration)
- Creates final snapshot (optional)
- Captures accepted learnings for future sessions
- Updates session statistics (shared with Extension)
- Clears task tracking state across all surfaces

**When to use:**
- After committing changes
- When abandoning a task
- When blocked and switching tasks
- Before starting a new unrelated task

**Trigger keywords:** done, finish, complete, commit, end task

**Options:**
- outcome: completed/abandoned/blocked
- createSnapshot: Create final safety snapshot
- acceptLearnings: Indices of suggested learnings to accept
- customLearning: Add a custom learning

💡 Tip: Use after review_work to capture suggested learnings.
💡 Learnings persist across sessions for personalized recommendations.`,
		inputSchema: {
			type: "object",
			properties: {
				outcome: {
					type: "string",
					enum: ["completed", "abandoned", "blocked"],
					default: "completed",
					description: "Outcome of the task",
				},
				createSnapshot: {
					type: "boolean",
					default: true,
					description: "Create final snapshot (default: true for completed)",
				},
				acceptLearnings: {
					type: "array",
					items: { type: "number" },
					description: "Indices of suggested learnings to accept",
				},
				customLearning: {
					type: "object",
					properties: {
						type: { type: "string", enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"] },
						trigger: { type: "string" },
						action: { type: "string" },
					},
					description: "Custom learning to add",
				},
				notes: { type: "string", description: "Notes about task completion" },
			},
		},
		annotations: { title: "Complete Task", readOnlyHint: false, idempotentHint: false },
		tier: "free",
	},
	{
		name: "get_pairing_protocol",
		description: `🤝 **PAIRING PROTOCOL** - Get AI agent guidance for SnapBack tools.

Returns context-aware protocol for optimal tool usage.
Designed for injection into system prompts.

**Returns:**
- Current task status (if any)
- Recent observations
- Risk areas in scope
- Session statistics
- Dynamic recommendations
- Quick reference table
- Full protocol text for system prompts

**When to use:**
- At session start to understand context
- When unsure which tool to use
- To get system prompt injection text`,
		inputSchema: {
			type: "object",
			properties: {},
		},
		annotations: { title: "Get Pairing Protocol", readOnlyHint: true, idempotentHint: true },
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
