/**
 * SnapBack MCP Tool Definitions v2
 *
 * Updated based on LLM tool selection research + reviewer feedback:
 * - Tool renames: analyze_risk → assess_risk, check_dependencies → validate_dependencies
 * - Proper MCP ToolAnnotations (title, readOnlyHint, destructiveHint, idempotentHint)
 * - outputSchema with ranked next_actions for tool chaining
 * - Error handling with isError: true (per MCP spec)
 * - Wrapper aliases for ctx7.* → snapback.docs_*
 * - Separator changed from : to _ for internal tools
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/schema
 * @see ai_dev_utils/resources/mpc_defs/mcp-tool-naming-audit.md
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

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
 * Standard output schema with ranked next_actions
 * Enables LLMs to chain tools intelligently
 */
export const createOutputSchemaWithNextActions = (
	resultProperties: Record<string, unknown>,
): Record<string, unknown> => ({
	type: "object",
	properties: {
		...resultProperties,
		next_actions: {
			type: "array",
			description: "Ranked list of suggested next tools to call",
			items: {
				type: "object",
				properties: {
					tool: { type: "string", description: "Tool name to call next" },
					priority: {
						type: "number",
						description: "Priority 0-1, higher = more relevant",
					},
					reason: { type: "string", description: "Why this tool is suggested" },
					condition: {
						type: "string",
						description: "When to call this tool",
					},
				},
				required: ["tool", "priority", "reason"],
			},
		},
	},
});

// =============================================================================
// ANALYSIS TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.assess_risk
 *
 * Renamed from: snapback.analyze_risk
 * Rationale: "assess" is more measured than "detect_danger" (avoids brochure vibes)
 *            while being more decisive than generic "analyze"
 */
export const assessRiskTool: SnapBackToolDefinition = {
	name: "snapback.assess_risk",
	description: `Evaluates code changes for potential issues before applying them.

**When to call this tool:**
- BEFORE accepting AI-generated code from Cursor, Copilot, Claude, or Windsurf
- When reviewing diffs with security-sensitive changes (auth, payments, config)
- For changes touching database schemas or migrations
- When the user asks "is this safe?"

**When NOT to call:**
- Trivial formatting/typo fixes
- Changes already applied (use snapback.create_snapshot first next time)

Returns risk assessment with severity levels and specific mitigation steps.`,

	inputSchema: {
		type: "object",
		properties: {
			changes: {
				type: "array",
				description:
					"Array of diff changes. Each item has 'value' (line content), optional 'added'/'removed' booleans.",
				items: {
					type: "object",
					properties: {
						added: { type: "boolean" },
						removed: { type: "boolean" },
						value: { type: "string" },
						count: { type: "number" },
					},
					required: ["value"],
				},
			},
			filePath: {
				type: "string",
				description: "Path to file being changed (helps identify auth/config/migration files)",
			},
		},
		required: ["changes"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		risk_level: {
			type: "string",
			enum: ["safe", "low", "medium", "high", "critical"],
			description: "Overall risk assessment",
		},
		risk_score: {
			type: "number",
			minimum: 0,
			maximum: 100,
			description: "Numeric risk score (0-100)",
		},
		issues: {
			type: "array",
			items: {
				type: "object",
				properties: {
					severity: { type: "string", enum: ["info", "warning", "error"] },
					message: { type: "string" },
					line: { type: "number" },
					mitigation: { type: "string" },
				},
			},
			description: "Specific issues detected",
		},
		recommendations: {
			type: "array",
			items: { type: "string" },
			description: "Actionable recommendations",
		},
		session: {
			type: "object",
			properties: {
				score: { type: "number" },
				coaching: { type: "string" },
			},
			description: "Session health context",
		},
	}),

	annotations: {
		title: "Risk Assessment",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.validate_dependencies
 *
 * Renamed from: snapback.check_dependencies
 * Rationale: "validate" is more decisive than passive "check"
 */
export const validateDependenciesTool: SnapBackToolDefinition = {
	name: "snapback.validate_dependencies",
	description: `Validates dependency changes for breaking risks and vulnerabilities.

**When to call this tool:**
- After modifying package.json dependencies
- Before running npm/pnpm/yarn install with new packages
- When troubleshooting "module not found" or version conflicts
- After AI suggests adding a new dependency

Returns compatibility analysis and known vulnerability warnings.`,

	inputSchema: {
		type: "object",
		properties: {
			before: {
				type: "object",
				description: "Dependencies object before changes",
				additionalProperties: { type: "string" },
			},
			after: {
				type: "object",
				description: "Dependencies object after changes",
				additionalProperties: { type: "string" },
			},
		},
		required: ["before", "after"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		added: {
			type: "array",
			items: { type: "string" },
			description: "Newly added dependencies",
		},
		removed: {
			type: "array",
			items: { type: "string" },
			description: "Removed dependencies",
		},
		updated: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					from: { type: "string" },
					to: { type: "string" },
					breaking: { type: "boolean" },
				},
			},
			description: "Version changes",
		},
		vulnerabilities: {
			type: "array",
			items: {
				type: "object",
				properties: {
					package: { type: "string" },
					severity: { type: "string" },
					advisory: { type: "string" },
				},
			},
			description: "Known security vulnerabilities",
		},
		compatible: {
			type: "boolean",
			description: "Whether changes are safe to apply",
		},
	}),

	annotations: {
		title: "Dependency Validation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// PROTECTION TOOLS (Pro Tier)
// =============================================================================

/**
 * snapback.create_snapshot
 *
 * KEPT AS-IS per reviewer feedback: "Do not rename checkpoint tools. They're already ideal."
 */
export const createSnapshotTool: SnapBackToolDefinition = {
	name: "snapback.create_snapshot",
	description: `Creates a restorable code snapshot before risky modifications.

**When to call this tool:**
- Before major refactoring or breaking changes
- Before modifying auth, security, or payment code
- Before AI-assisted multi-file refactors
- When the user says "save a snapshot" or "create a backup"

**When NOT to call:**
- After every single save (use workspace vitals to decide)
- For trivial changes the user can easily redo

Returns snapshot ID for later restoration via snapback.restore_snapshot.`,

	inputSchema: {
		type: "object",
		properties: {
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files to include in snapshot",
			},
			reason: {
				type: "string",
				description: 'Why this snapshot was created (e.g., "Pre-auth refactor")',
			},
			trigger: {
				type: "string",
				enum: ["manual", "mcp", "ai_assist", "session_end"],
				description: "What triggered the snapshot",
			},
		},
		required: ["files"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		snapshot_id: {
			type: "string",
			description: "Unique ID to reference this snapshot",
		},
		timestamp: {
			type: "string",
			format: "date-time",
			description: "When snapshot was created",
		},
		file_count: {
			type: "number",
			description: "Number of files captured",
		},
		total_bytes: {
			type: "number",
			description: "Total size of snapshot",
		},
		reason: {
			type: "string",
			description: "Recorded reason for snapshot",
		},
	}),

	annotations: {
		title: "Create Restore Point",
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: false, // Each call creates a new snapshot
	},

	tier: "pro",
	requiresBackend: true,
};

/**
 * snapback.list_snapshots
 *
 * KEPT AS-IS, added title annotation for human readability
 */
export const listSnapshotsTool: SnapBackToolDefinition = {
	name: "snapback.list_snapshots",
	description: `Lists available snapshots for restoration.

**When to call this tool:**
- When user wants to see restore points
- Before choosing which snapshot to restore
- To verify a snapshot was created successfully

Returns recent snapshots with IDs, timestamps, and reasons.`,

	inputSchema: {
		type: "object",
		properties: {
			limit: {
				type: "number",
				description: "Max snapshots to return (default: 20)",
				default: 20,
			},
			since: {
				type: "string",
				format: "date-time",
				description: "Only show snapshots after this time",
			},
		},
	},

	outputSchema: createOutputSchemaWithNextActions({
		snapshots: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string" },
					timestamp: { type: "string" },
					reason: { type: "string" },
					file_count: { type: "number" },
				},
			},
			description: "Available snapshots, most recent first",
		},
		total: {
			type: "number",
			description: "Total snapshot count",
		},
	}),

	annotations: {
		title: "Restore Points",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "pro",
	requiresBackend: true,
};

/**
 * snapback.restore_snapshot
 *
 * KEPT AS-IS, added title annotation
 */
export const restoreSnapshotTool: SnapBackToolDefinition = {
	name: "snapback.restore_snapshot",
	description: `Restores code from a previously created snapshot.

**When to call this tool:**
- After AI changes broke something
- When tests fail after modifications
- When user asks to "undo" or "revert" changes
- To return to a known good state

Returns the restored file contents. The actual file writes happen automatically.`,

	inputSchema: {
		type: "object",
		properties: {
			snapshotId: {
				type: "string",
				description: "ID of snapshot to restore (from list_snapshots)",
			},
			files: {
				type: "array",
				items: { type: "string" },
				description: "Specific files to restore (optional, defaults to all)",
			},
			dryRun: {
				type: "boolean",
				description: "If true, show what would be restored without applying",
				default: false,
			},
		},
		required: ["snapshotId"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		restored: {
			type: "boolean",
			description: "Whether restoration was applied",
		},
		files_restored: {
			type: "array",
			items: { type: "string" },
			description: "Files that were restored",
		},
		snapshot_timestamp: {
			type: "string",
			description: "When the snapshot was originally created",
		},
	}),

	annotations: {
		title: "Revert to Snapshot",
		readOnlyHint: false,
		destructiveHint: true, // Overwrites current files
		idempotentHint: true, // Same snapshot ID = same result
	},

	tier: "pro",
	requiresBackend: true,
};

// =============================================================================
// DOCUMENTATION TOOLS (Free Tier)
// Wrapper aliases for ctx7.* → snapback.docs_* for discoverability
// =============================================================================

/**
 * snapback.docs_find
 *
 * Alias for: ctx7.resolve-library-id
 * Rationale: "snapback.docs_*" is more discoverable when user asks about "docs"
 */
export const docsFindTool: SnapBackToolDefinition = {
	name: "snapback.docs_find",
	description: `Finds the documentation ID for a library or package name.

**When to call this tool:**
- Before calling snapback.docs_fetch
- When user asks "how do I use [library]?"
- To verify the correct package name

Powered by Context7. Returns library ID for use with docs_fetch.`,

	inputSchema: {
		type: "object",
		properties: {
			libraryName: {
				type: "string",
				description: 'Package name to find docs for (e.g., "react", "express", "zod")',
			},
		},
		required: ["libraryName"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		library_id: {
			type: "string",
			description: "Context7-compatible library ID",
		},
		matches: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					description: { type: "string" },
				},
			},
			description: "Matching libraries if name is ambiguous",
		},
	}),

	annotations: {
		title: "Find Library Docs",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: true, // External API call
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.docs_fetch
 *
 * Alias for: ctx7.get-library-docs
 */
export const docsFetchTool: SnapBackToolDefinition = {
	name: "snapback.docs_fetch",
	description: `Fetches up-to-date documentation for a library.

**When to call this tool:**
- After snapback.docs_find returns a library_id
- When user needs API examples or usage patterns
- For understanding library configuration options

Powered by Context7. Returns formatted documentation with code examples.`,

	inputSchema: {
		type: "object",
		properties: {
			library_id: {
				type: "string",
				description: "Library ID from snapback.docs_find",
			},
			topic: {
				type: "string",
				description: 'Optional topic filter (e.g., "authentication", "hooks")',
			},
			tokens: {
				type: "number",
				description: "Max tokens to return (for large docs)",
			},
		},
		required: ["library_id"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		documentation: {
			type: "string",
			description: "Formatted documentation with code examples",
		},
		sections: {
			type: "array",
			items: { type: "string" },
			description: "Available documentation sections",
		},
		version: {
			type: "string",
			description: "Library version these docs apply to",
		},
	}),

	annotations: {
		title: "Fetch Library Docs",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// META TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.meta_list_tools
 *
 * Renamed from: catalog.list_tools
 * Rationale: Unified under snapback.* namespace, "meta_" prefix indicates meta-operation
 */
export const metaListToolsTool: SnapBackToolDefinition = {
	name: "snapback.meta_list_tools",
	description: `Lists tools available from connected external MCP servers.

**When to call this tool:**
- To discover what integrations are available
- When user asks "what can you do?" or "what tools do you have?"
- For debugging MCP connectivity issues

Returns catalog of connected MCP servers and their tools.`,

	inputSchema: {
		type: "object",
		properties: {},
	},

	outputSchema: createOutputSchemaWithNextActions({
		servers: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					status: { type: "string", enum: ["connected", "disconnected"] },
					tools: {
						type: "array",
						items: { type: "string" },
					},
				},
			},
			description: "Connected MCP servers and their tools",
		},
	}),

	annotations: {
		title: "List Connected Tools",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// WORKSPACE HEALTH TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.get_workspace_vitals
 *
 * Already well-named, kept as-is with enhanced outputSchema
 */
export const getWorkspaceVitalsTool: SnapBackToolDefinition = {
	name: "snapback.get_workspace_vitals",
	description: `Gets current workspace health signals before making changes.

**When to call this tool:**
- BEFORE any risky modification
- When planning refactoring or major changes
- When user asks "is it safe to continue?"
- To decide whether to create a snapshot first

Returns pulse (velocity), temperature (AI activity), pressure (risk), oxygen (coverage).`,

	inputSchema: {
		type: "object",
		properties: {
			workspaceId: {
				type: "string",
				description: "Workspace path (defaults to current)",
			},
		},
	},

	outputSchema: createOutputSchemaWithNextActions({
		pulse: {
			type: "object",
			properties: {
				level: {
					type: "string",
					enum: ["resting", "elevated", "racing", "critical"],
				},
				changesPerMinute: { type: "number" },
			},
			description: "Change velocity",
		},
		temperature: {
			type: "object",
			properties: {
				level: { type: "string", enum: ["cold", "warm", "hot", "burning"] },
				aiPercentage: { type: "number" },
			},
			description: "AI activity level",
		},
		pressure: {
			type: "object",
			properties: {
				value: { type: "number" },
				unsnapshotedChanges: { type: "number" },
			},
			description: "Risk accumulation (0-100)",
		},
		oxygen: {
			type: "object",
			properties: {
				value: { type: "number" },
			},
			description: "Snapshot coverage (%)",
		},
		trajectory: {
			type: "string",
			enum: ["stable", "escalating", "critical", "recovering"],
			description: "Overall workspace state",
		},
		guidance: {
			type: "object",
			properties: {
				shouldSnapshot: { type: "boolean" },
				reason: { type: "string" },
				suggestion: { type: "string" },
			},
			description: "Recommended action",
		},
	}),

	annotations: {
		title: "Workspace Health",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.acknowledge_risk
 *
 * Kept as-is - good naming
 */
export const acknowledgeRiskTool: SnapBackToolDefinition = {
	name: "snapback.acknowledge_risk",
	description: `Acknowledges current risk state and proceeds with changes.

**When to call this tool:**
- After reviewing elevated vitals and deciding to proceed
- When user explicitly says "I understand the risks"
- To create an audit trail of risk acknowledgments

Returns confirmation and reminder to snapshot after changes.`,

	inputSchema: {
		type: "object",
		properties: {
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files you intend to modify",
			},
			reason: {
				type: "string",
				description: "Why you are proceeding despite the risk",
			},
			workspaceId: {
				type: "string",
				description: "Workspace path (optional)",
			},
		},
		required: ["files", "reason"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		acknowledged: {
			type: "boolean",
			description: "Whether acknowledgment was recorded",
		},
		filesCount: {
			type: "number",
			description: "Number of files acknowledged",
		},
		timestamp: {
			type: "string",
			format: "date-time",
			description: "When acknowledgment was recorded",
		},
	}),

	annotations: {
		title: "Acknowledge Risk",
		readOnlyHint: false, // Creates audit record
		destructiveHint: false,
		idempotentHint: false, // Each call creates new record
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// INTELLIGENCE TOOLS (Free Tier)
// =============================================================================

/**
 * snapback.get_context
 *
 * Kept as-is - well-named
 */
export const getContextTool: SnapBackToolDefinition = {
	name: "snapback.get_context",
	description: `Gets architectural context for a development task.

**When to call this tool:**
- BEFORE implementing any code changes
- When you need to understand codebase patterns
- To check for relevant learnings from past sessions
- When user asks about project architecture or conventions

Returns patterns, constraints, learnings, and recent violations relevant to the task.`,

	inputSchema: {
		type: "object",
		properties: {
			task: {
				type: "string",
				description: "What you're about to implement",
			},
			files: {
				type: "array",
				items: { type: "string" },
				description: "Files you plan to modify",
			},
			keywords: {
				type: "array",
				items: { type: "string" },
				description: "Keywords to search in patterns/learnings",
			},
		},
		required: ["task"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		patterns: {
			type: "array",
			items: { type: "string" },
			description: "Relevant codebase patterns to follow",
		},
		constraints: {
			type: "array",
			items: { type: "string" },
			description: "Hard rules that must be followed",
		},
		learnings: {
			type: "array",
			items: {
				type: "object",
				properties: {
					trigger: { type: "string" },
					action: { type: "string" },
				},
			},
			description: "Past learnings relevant to this task",
		},
		violations: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string" },
					count: { type: "number" },
					prevention: { type: "string" },
				},
			},
			description: "Recent violations to avoid repeating",
		},
		hint: {
			type: "string",
			description: "Quick guidance for this task",
		},
	}),

	annotations: {
		title: "Get Codebase Context",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.check_patterns
 *
 * Kept as-is - verb-noun pattern is correct
 */
export const checkPatternsTool: SnapBackToolDefinition = {
	name: "snapback.check_patterns",
	description: `Validates code against codebase patterns before committing.

**When to call this tool:**
- BEFORE committing code changes
- After implementing a feature
- To catch architectural violations early

Returns list of violations and suggestions for fixing them.`,

	inputSchema: {
		type: "object",
		properties: {
			code: {
				type: "string",
				description: "Code to validate",
			},
			filePath: {
				type: "string",
				description: "Where this code will go",
			},
		},
		required: ["code", "filePath"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		valid: {
			type: "boolean",
			description: "Whether code passes all pattern checks",
		},
		violations: {
			type: "array",
			items: {
				type: "object",
				properties: {
					type: { type: "string" },
					message: { type: "string" },
					line: { type: "number" },
					fix: { type: "string" },
				},
			},
			description: "Pattern violations found",
		},
		suggestion: {
			type: "string",
			description: "Overall recommendation",
		},
	}),

	annotations: {
		title: "Pattern Validation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.validate_code
 *
 * 7-layer validation pipeline tool
 */
export const validateCodeTool: SnapBackToolDefinition = {
	name: "snapback.validate_code",
	description: `Run comprehensive 7-layer validation pipeline on code.

**Layers:**
1. Syntax (brackets, semicolons)
2. Types (any usage, @ts-ignore)
3. Tests (vague assertions, coverage)
4. Architecture (layer boundaries)
5. Security (secrets, eval)
6. Dependencies (deprecated packages)
7. Performance (console.log, sync I/O)

**When to call this tool:**
- Before committing complex changes
- For code review automation
- When you need detailed validation feedback

Returns confidence score, recommendation, and issues per layer with fix suggestions.`,

	inputSchema: {
		type: "object",
		properties: {
			code: {
				type: "string",
				description: "Code to run through validation pipeline",
			},
			filePath: {
				type: "string",
				description: "File path for context-aware validation",
			},
		},
		required: ["code", "filePath"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		confidence: {
			type: "string",
			description: "Confidence score as percentage",
		},
		recommendation: {
			type: "string",
			enum: ["auto_merge", "quick_review", "full_review"],
			description: "Merge recommendation",
		},
		passed: {
			type: "boolean",
			description: "Whether code passes validation",
		},
		totalIssues: {
			type: "number",
			description: "Total issue count across all layers",
		},
		layers: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					passed: { type: "boolean" },
					issues: { type: "number" },
					duration: { type: "string" },
				},
			},
			description: "Results per validation layer",
		},
	}),

	annotations: {
		title: "7-Layer Code Validation",
		readOnlyHint: true,
		destructiveHint: false,
		idempotentHint: true,
	},

	tier: "free",
	requiresBackend: false,
};

/**
 * snapback.record_learning
 *
 * Learning recording tool
 */
export const recordLearningTool: SnapBackToolDefinition = {
	name: "snapback.record_learning",
	description: `Records a learning from the current session for future reference.

**When to call this tool:**
- After discovering a useful pattern
- When encountering a pitfall to avoid
- To capture workflow improvements

**Types:**
- pattern: Reusable code pattern
- pitfall: Common mistake to avoid
- efficiency: Performance optimization
- discovery: New capability found
- workflow: Process improvement

Storage: .snapback/learnings/learnings.jsonl`,

	inputSchema: {
		type: "object",
		properties: {
			type: {
				type: "string",
				enum: ["pattern", "pitfall", "efficiency", "discovery", "workflow"],
				description: "Type of learning",
			},
			trigger: {
				type: "string",
				description: "What triggers this learning (keyword or situation)",
			},
			action: {
				type: "string",
				description: "What to do when triggered",
			},
			source: {
				type: "string",
				description: "Where this learning came from (task ID or session)",
			},
		},
		required: ["type", "trigger", "action", "source"],
	},

	outputSchema: createOutputSchemaWithNextActions({
		recorded: {
			type: "boolean",
			description: "Whether learning was recorded",
		},
		id: {
			type: "string",
			description: "Learning ID for reference",
		},
		message: {
			type: "string",
			description: "Confirmation message",
		},
	}),

	annotations: {
		title: "Record Learning",
		readOnlyHint: false, // Writes to storage
		destructiveHint: false,
		idempotentHint: false, // Each call creates new learning
	},

	tier: "free",
	requiresBackend: false,
};

// =============================================================================
// EXPORT ALL TOOLS
// =============================================================================

/**
 * Complete tool catalog with proper MCP structure
 */
export const snapbackToolDefinitions: SnapBackToolDefinition[] = [
	// Analysis (Free)
	assessRiskTool,
	validateDependenciesTool,

	// Protection (Pro)
	createSnapshotTool,
	listSnapshotsTool,
	restoreSnapshotTool,

	// Documentation (Free) - Aliases for ctx7.*
	docsFindTool,
	docsFetchTool,

	// Meta (Free)
	metaListToolsTool,

	// Workspace Health (Free)
	getWorkspaceVitalsTool,
	acknowledgeRiskTool,

	// Intelligence (Free)
	getContextTool,
	checkPatternsTool,
	validateCodeTool,
	recordLearningTool,
];

/**
 * Backward compatibility mappings
 * Old tool name → New tool name
 */
export const toolNameMigrations: Record<string, string> = {
	// Primary renames per research
	"snapback.analyze_risk": "snapback.assess_risk",
	"snapback.check_dependencies": "snapback.validate_dependencies",
	"catalog.list_tools": "snapback.meta_list_tools",

	// ctx7 → snapback.docs_* aliases (keep both working)
	"ctx7.resolve-library-id": "snapback.docs_find",
	"ctx7.get-library-docs": "snapback.docs_fetch",
};

/**
 * Helper to get tool by name (supports old names via migration)
 */
export function getToolByName(name: string): SnapBackToolDefinition | undefined {
	const migratedName = toolNameMigrations[name] || name;
	return snapbackToolDefinitions.find((t) => t.name === migratedName);
}

// =============================================================================
// ERROR HANDLING HELPER
// =============================================================================

/**
 * Standard error response per MCP spec
 * Returns isError: true so LLM can see and self-correct
 *
 * From feedback: "MCP strongly recommends tool execution errors be returned
 * as a tool result with isError: true, not as a protocol-level error."
 */
export function createErrorResult(
	message: string,
	suggestion?: string,
): {
	content: Array<{ type: "text"; text: string }>;
	isError: true;
} {
	const parts = [`❌ ${message}`];

	if (suggestion) {
		parts.push(`\n💡 Suggestion: ${suggestion}`);
	}

	return {
		content: [{ type: "text", text: parts.join("") }],
		isError: true,
	};
}

/**
 * Standard success response with next_actions
 */
export function createSuccessResult<T extends Record<string, unknown>>(
	data: T,
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
		condition?: string;
	}> = [],
): {
	content: Array<{ type: "json"; json: unknown } | { type: "text"; text: string }>;
} {
	const result = {
		...data,
		next_actions: nextActions,
	};

	// Generate human-readable summary
	let summary = "";
	if (nextActions.length > 0) {
		const topAction = nextActions.sort((a, b) => b.priority - a.priority)[0];
		summary = `\n\n💡 Suggested next: ${topAction.tool} (${topAction.reason})`;
	}

	return {
		content: [{ type: "json", json: result }, ...(summary ? [{ type: "text" as const, text: summary }] : [])],
	};
}
