/**
 * Context MCP Tools
 *
 * MCP tools for managing project context in user workspaces.
 * These tools allow LLMs to initialize, build, validate, and query context.
 *
 * @module tools/ctx-tools
 */

import type { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { getContextRuntime } from "../ctx";
import { formatJsonResponse } from "../utils/format";

/** Extended ctx tool definition with annotations */
interface CtxToolDefinition extends MCPTool {
	annotations?: {
		title?: string;
		readOnlyHint?: boolean;
		destructiveHint?: boolean;
	};
}

// Tool definitions with MCP annotations
export const ctxToolDefinitions: CtxToolDefinition[] = [
	{
		name: "snapback.ctx_init",
		description:
			"Initialize context system in workspace. Creates .snapback/ctx/context.json with project defaults. Call this once per project setup.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
				force: {
					type: "boolean",
					description: "Force regenerate even if context.json exists",
					default: false,
				},
			},
		},
		annotations: {
			title: "Initialize Context",
			readOnlyHint: false,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_build",
		description:
			"Rebuild .ctx from context.json. Run after modifying context.json to regenerate the obfuscated LLM-readable format.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
			},
		},
		annotations: {
			title: "Build Context",
			readOnlyHint: false,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_validate",
		description:
			"Validate context freshness. Checks if .ctx is in sync with context.json. Returns validation status and hash.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
			},
		},
		annotations: {
			title: "Validate Context",
			readOnlyHint: true,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_constraint",
		description:
			"Get a constraint value for runtime decision-making. Returns threshold, current value, and unit for the specified domain and name.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
				domain: {
					type: "string",
					description: "Constraint domain (e.g., 'extension', 'web', 'bundle')",
				},
				name: {
					type: "string",
					description: "Constraint name (e.g., 'bundle', 'fcp', 'size')",
				},
			},
			required: ["domain", "name"],
		},
		annotations: {
			title: "Get Constraint",
			readOnlyHint: true,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_blockers",
		description:
			"Get current project blockers. Returns list of blocking issues with current vs target values. Use for prioritization decisions.",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
			},
		},
		annotations: {
			title: "Get Blockers",
			readOnlyHint: true,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_check",
		description:
			"Check a value against a constraint. Returns pass/fail status, ratio, and severity level (ok/warning/critical).",
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
				domain: {
					type: "string",
					description: "Constraint domain (e.g., 'extension', 'web')",
				},
				name: {
					type: "string",
					description: "Constraint name (e.g., 'bundle', 'fcp')",
				},
				value: {
					type: "number",
					description: "Value to check against constraint (in base units: bytes, ms)",
				},
			},
			required: ["domain", "name", "value"],
		},
		annotations: {
			title: "Check Constraint",
			readOnlyHint: true,
			destructiveHint: false,
		},
	},
	{
		name: "snapback.ctx_status",
		description: `**Purpose:** Quick context health check - get project status at a glance.

**Signal Words (when to auto-trigger):**
- "project status", "context health", "what's the status"
- "blockers", "what's blocking", "priorities"
- At the start of a session to understand project state

**Returns:**
- Context sync status (valid/stale)
- Project phase and priority
- Active blockers count and labels
- Key constraint thresholds
- Overall health indicator

**Use this instead of multiple ctx_* calls when you just need a quick overview.**`,
		inputSchema: {
			type: "object",
			properties: {
				workspaceRoot: {
					type: "string",
					description: "Workspace root path (defaults to current directory)",
				},
			},
		},
		annotations: {
			title: "Context Status",
			readOnlyHint: true,
			destructiveHint: false,
		},
	},
];

// Zod schemas for validation
const CtxInitSchema = z.object({
	workspaceRoot: z.string().optional(),
	force: z.boolean().optional().default(false),
});

const CtxBuildSchema = z.object({
	workspaceRoot: z.string().optional(),
});

const CtxValidateSchema = z.object({
	workspaceRoot: z.string().optional(),
});

const CtxConstraintSchema = z.object({
	workspaceRoot: z.string().optional(),
	domain: z.string(),
	name: z.string(),
});

const CtxBlockersSchema = z.object({
	workspaceRoot: z.string().optional(),
});

const CtxCheckSchema = z.object({
	workspaceRoot: z.string().optional(),
	domain: z.string(),
	name: z.string(),
	value: z.number(),
});

const CtxStatusSchema = z.object({
	workspaceRoot: z.string().optional(),
});

// Tool handlers
export async function handleCtxInit(args: unknown) {
	const parsed = CtxInitSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const result = await runtime.init({ force: parsed.force });

	return {
		content: formatJsonResponse(result, `Context initialized at ${result.path}`),
	};
}

export async function handleCtxBuild(args: unknown) {
	const parsed = CtxBuildSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const result = await runtime.build();

	return {
		content: formatJsonResponse(result, `.ctx built (${result.size} bytes, hash: ${result.hash})`),
	};
}

export async function handleCtxValidate(args: unknown) {
	const parsed = CtxValidateSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const result = runtime.validate();

	const status = result.valid ? "Context is valid and in sync" : `Context invalid: ${result.reason}`;

	return {
		content: formatJsonResponse(result, status),
	};
}

export async function handleCtxConstraint(args: unknown) {
	const parsed = CtxConstraintSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const constraint = runtime.getConstraint(parsed.domain, parsed.name);

	if (!constraint) {
		return {
			content: [{ type: "text" as const, text: `No constraint found: ${parsed.domain}.${parsed.name}` }],
			isError: true,
		};
	}

	const threshold = runtime.getThreshold(parsed.domain, parsed.name);

	return {
		content: formatJsonResponse(
			{ constraint, thresholdInBaseUnits: threshold },
			`${parsed.domain}.${parsed.name}: max ${constraint.max}${constraint.unit}`,
		),
	};
}

export async function handleCtxBlockers(args: unknown) {
	const parsed = CtxBlockersSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const blockers = runtime.getBlockers();

	const summary =
		blockers.length === 0
			? "No blockers"
			: `${blockers.length} blocker(s): ${blockers.map((b) => b.label).join(", ")}`;

	return {
		content: formatJsonResponse(blockers, summary),
	};
}

export async function handleCtxCheck(args: unknown) {
	const parsed = CtxCheckSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	const result = runtime.checkConstraint(parsed.domain, parsed.name, parsed.value);

	const status = result.pass
		? `PASS: ${parsed.value} <= ${result.threshold} (${(result.ratio * 100).toFixed(1)}%)`
		: `FAIL: ${parsed.value} > ${result.threshold} (${(result.ratio * 100).toFixed(1)}%, severity: ${result.severity})`;

	return {
		content: formatJsonResponse(result, status),
	};
}

export async function handleCtxStatus(args: unknown) {
	const parsed = CtxStatusSchema.parse(args);
	const workspaceRoot = parsed.workspaceRoot || process.cwd();
	const runtime = getContextRuntime(workspaceRoot);

	// Gather all status information
	const validation = runtime.validate();
	const context = runtime.load();
	const blockers = runtime.getBlockers();

	// Calculate health score
	let healthScore = 100;
	const healthIssues: string[] = [];

	// Deduct for stale context
	if (!validation.valid) {
		healthScore -= 20;
		healthIssues.push(`Context stale: ${validation.reason}`);
	}

	// Deduct for blockers
	if (blockers.length > 0) {
		healthScore -= blockers.length * 10;
		healthIssues.push(`${blockers.length} blocker(s) active`);
	}

	// Determine health indicator
	const healthIndicator =
		healthScore >= 80 ? "🟢 healthy" : healthScore >= 50 ? "🟡 attention needed" : "🔴 critical issues";

	// Build status response
	const status = {
		health: {
			score: healthScore,
			indicator: healthIndicator,
			issues: healthIssues,
		},
		context: {
			valid: validation.valid,
			reason: validation.reason,
			hash: validation.hash,
		},
		project: {
			id: context.meta.id,
			type: context.meta.type,
			phase: context.meta.phase,
			priority: context.meta.priority,
		},
		blockers: {
			count: blockers.length,
			items: blockers.map((b) => ({
				key: b.key,
				label: b.label,
				current: b.current,
				target: b.target,
			})),
		},
		decisions: {
			priority: context.decisions.priority,
		},
		quality: {
			typescript: context.quality.typescript,
			coverage: context.quality.coverage,
		},
	};

	// Format summary text
	const summaryParts: string[] = [
		`${healthIndicator} (score: ${healthScore}/100)`,
		"",
		`**Project:** ${context.meta.id} (${context.meta.type})`,
		`**Phase:** ${context.meta.phase} | **Priority:** ${context.meta.priority}`,
		"",
	];

	if (!validation.valid) {
		summaryParts.push(`⚠️ Context: ${validation.reason}`);
	} else {
		summaryParts.push(`✅ Context: valid (hash: ${validation.hash?.slice(0, 8)}...)`);
	}

	if (blockers.length > 0) {
		summaryParts.push("");
		summaryParts.push(`**Blockers (${blockers.length}):**`);
		for (const b of blockers) {
			summaryParts.push(`  • ${b.label}: ${b.current} → ${b.target}`);
		}
	} else {
		summaryParts.push("✅ No blockers");
	}

	if (context.decisions.priority.length > 0) {
		summaryParts.push("");
		summaryParts.push(`**Priorities:** ${context.decisions.priority.join(" > ")}`);
	}

	return {
		content: formatJsonResponse(status, summaryParts.join("\n")),
	};
}
