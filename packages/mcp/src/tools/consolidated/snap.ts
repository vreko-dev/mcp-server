/**
 * Unified Snap Tool
 *
 * Universal entry point that replaces:
 * - begin_task (mode: "s" = start)
 * - get_context (mode: "x" = context)
 * - quick_check (mode: "c" = check)
 * - prepare_workspace (mode: "s" with prepare behavior)
 * - get_learnings (included in start/context)
 *
 * Token-efficient design:
 * - Single tool reduces discovery overhead
 * - Compact wire format (~100 tokens vs ~1300)
 * - Mode-based dispatch minimizes parameters
 *
 * @see stress_test_remediation.md Section "Tool 1: snap"
 * @module tools/consolidated/snap
 */

import { basename } from "node:path";
import { compress, INTERNAL_SEPARATOR, messages } from "../../branding/index.js";
import { handleBeginTask } from "../../facades/begin-task.js";
import { handleQuickCheck } from "../../facades/quick-check.js";
import type { SnapBackTool, ToolContext, ToolHandler, ToolResult } from "../../registry.js";
import { getSessionFileTracker } from "../../services/session-file-tracker.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Snap tool parameters
 */
export interface SnapParams {
	/** Mode: s=start, c=check, x=context */
	m: "s" | "c" | "x";
	/** Task description (mode: s) */
	t?: string;
	/** Files to work on (mode: s, c) */
	f?: string[];
	/** Keywords for learning retrieval (mode: s, x) */
	k?: string[];
	/** Enable thorough 7-layer validation (mode: c) */
	thorough?: boolean;
	/** Intent: implement, debug, refactor, review, explore */
	i?: "implement" | "debug" | "refactor" | "review" | "explore";
	/** Goal for task completion validation */
	goal?: {
		metric: "bundle" | "performance" | "coverage";
		target: number;
		unit: string;
	};
}

/**
 * Compact response format for token efficiency
 */
interface CompactResponse {
	/** Response type: S=Start, C=Check, X=Context */
	type: "S" | "C" | "X";
	/** Task ID (for start) */
	id?: string;
	/** Snapshot ID (for restore/diff) */
	snapshotId?: string;
	/** Risk level: L/M/H */
	risk?: "L" | "M" | "H";
	/** Protection score 0-100 */
	protection?: number;
	/** Dirty file count */
	dirty?: number;
	/** Top learnings (truncated) */
	learnings?: string[];
	/** Hotspots with violations */
	hotspots?: string[];
	/** Snapshot status: created/reused/skipped */
	snapshot?: "created" | "reused" | "skipped";
	/** Check result: OK/ERR */
	status?: "OK" | "ERR";
	/** Error count */
	errors?: number;
	/** Warning count */
	warnings?: number;
	/** Issues (for check mode) */
	issues?: string[];
	/** Checked indicators: typescript|lint|tests */
	checked?: {
		typescript: boolean;
		lint: boolean;
		tests: boolean | "skipped";
	};
}

// =============================================================================
// Wire Format Helpers
// =============================================================================

/**
 * Format compact response as single line with 🧢 SnapBack branding
 * Format: 🧢|TYPE|field1|field2|...
 */
function formatWire(response: CompactResponse): string {
	const parts: string[] = ["🧢", response.type]; // Brand prefix for visual anchoring

	switch (response.type) {
		case "S":
			// S|task_id|snapshot_id|risk|protection|dirty|snapshot_status|learning1|learning2|hotspot1
			parts.push(
				response.id || "?",
				response.snapshotId || "none",
				response.risk || "L",
				String(response.protection ?? 100),
				String(response.dirty ?? 0),
				response.snapshot || "skipped",
			);
			if (response.learnings?.length) {
				parts.push(...response.learnings.slice(0, 3).map((l) => compress(l, 40)));
			}
			if (response.hotspots?.length) {
				parts.push(...response.hotspots.slice(0, 2));
			}
			break;

		case "C": {
			// C|status|errors|warnings|checked_indicators|issue1|issue2|issue3
			// checked_indicators: ts✓|lint✓|tests⏭️
			const indicators: string[] = [];
			if (response.checked) {
				if (response.checked.typescript) indicators.push("ts✓");
				if (response.checked.lint) indicators.push("lint✓");
				if (response.checked.tests === true) indicators.push("tests✓");
				else if (response.checked.tests === "skipped") indicators.push("tests⏭️");
			}
			parts.push(
				response.status || "OK",
				`${response.errors ?? 0}E`,
				`${response.warnings ?? 0}W`,
				indicators.join("|") || "none",
			);
			if (response.issues?.length) {
				parts.push(...response.issues.slice(0, 3).map((i) => compress(i, 40)));
			}
			break;
		}

		case "X":
			// X|risk|protection|dirty|learning1|learning2
			parts.push(response.risk || "L", String(response.protection ?? 100), String(response.dirty ?? 0));
			if (response.learnings?.length) {
				parts.push(...response.learnings.slice(0, 3).map((l) => compress(l, 40)));
			}
			break;
	}

	return parts.join("|");
}

// =============================================================================
// Mode Handlers
// =============================================================================

/**
 * Handle start mode - replaces begin_task
 */
async function handleStart(params: SnapParams, context: ToolContext): Promise<ToolResult> {
	const beginArgs: Record<string, unknown> = {
		task: params.t || "development task",
		files: params.f || [],
		keywords: params.k || [],
		intent: params.i || "implement",
		compact: true, // Always compact for consolidated tool
		goal: params.goal, // Pass through goal for tracking
	};

	// Initialize session file tracker for MCP-only mode
	// This ensures what_changed works even without daemon/extension
	const tracker = getSessionFileTracker(context.workspaceRoot);
	const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
	tracker.startTask(taskId, params.f || []);

	const result = await handleBeginTask(beginArgs, context);

	// Parse result and reformat as wire
	try {
		const content = result.content[0]?.text || "";
		// If already compact from begin_task, just return it
		if (content.startsWith("✓") || content.includes("|")) {
			return result;
		}

		// Otherwise parse JSON and compact it
		const data = JSON.parse(content);
		const snapshotStatus = data.snapshot?.created ? "created" : data.snapshot?.id ? "reused" : "skipped";
		const wire = formatWire({
			type: "S",
			id: data.taskId,
			snapshotId: data.snapshot?.id || "none",
			risk: (data.risk?.[0] || "l").toUpperCase() as "L" | "M" | "H",
			protection: data.protection || data.protectionScore || 100,
			dirty: data.dirtyFiles || 0,
			snapshot: snapshotStatus,
			learnings: data.learnings?.map((l: { action: string }) => l.action) || [],
			hotspots:
				data.hotspots?.map(
					(h: { file: string; violations: number }) => `${basename(h.file)}:${h.violations}v`,
				) || [],
		});

		// Add human-readable branded message
		const humanMessage =
			snapshotStatus === "created"
				? messages.snapshot.created(params.t)
				: snapshotStatus === "reused"
					? messages.snapshot.reused()
					: messages.session.taskStarted(params.t);

		return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}` }] };
	} catch {
		// If parsing fails, return original
		return result;
	}
}

/**
 * Handle check mode - replaces quick_check
 */
async function handleCheckMode(params: SnapParams, context: ToolContext): Promise<ToolResult> {
	const checkArgs: Record<string, unknown> = {
		files: params.f || [],
		runTests: false,
		skipTypeScript: false,
		skipTests: true,
		skipLint: false,
	};

	const result = await handleQuickCheck(checkArgs, context);

	// Parse and compact the result
	try {
		const content = result.content[0]?.text || "";
		const data = JSON.parse(content);

		const errorCount = data.errors?.length || 0;
		const warningCount = data.warnings?.length || 0;
		const passed = data.passed || errorCount === 0;

		const wire = formatWire({
			type: "C",
			status: passed ? "OK" : "ERR",
			errors: errorCount,
			warnings: warningCount,
			checked: {
				typescript: !params.thorough || data.typescript !== false,
				lint: !params.thorough || data.lint !== false,
				tests: params.thorough ? data.tests || false : "skipped",
			},
			issues: [
				...(data.errors || [])
					.slice(0, 2)
					.map((e: { message: string; file: string }) => `${basename(e.file)}:${e.message}`),
				...(data.warnings || [])
					.slice(0, 1)
					.map((w: { message: string; file: string }) => `${basename(w.file)}:${w.message}`),
			],
		});

		// Add human-readable branded message
		const humanMessage = passed
			? messages.validation.passed()
			: messages.validation.issues(errorCount, warningCount);

		return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}` }] };
	} catch {
		return result;
	}
}

/**
 * Handle context mode - get workspace context without starting task
 * Enhanced to include bundle size measurement when available
 */
async function handleContext(params: SnapParams, context: ToolContext): Promise<ToolResult> {
	// Use begin_task with lightweight context-only mode
	const beginArgs: Record<string, unknown> = {
		task: "get context",
		files: params.f || [],
		keywords: params.k || [],
		skipSnapshot: true,
		compact: true,
	};

	const result = await handleBeginTask(beginArgs, context);

	// Parse and reformat as context response
	try {
		const content = result.content[0]?.text || "";
		if (content.startsWith("✓") || content.includes("|")) {
			// Replace S| with X| for context mode
			return { content: [{ type: "text", text: content.replace(/^[S✓]/, "X") }] };
		}

		const data = JSON.parse(content);
		const wire = formatWire({
			type: "X",
			risk: (data.risk?.[0] || "l").toUpperCase() as "L" | "M" | "H",
			protection: data.protection || data.protectionScore || 100,
			dirty: data.dirtyFiles || 0,
			learnings: data.learnings?.map((l: { action: string }) => l.action) || [],
		});

		// Try to measure bundle size if in extension/bundle context
		const bundleInfo = await measureBundleSize(context.workspaceRoot);
		const bundleMsg = bundleInfo ? `\nBundle: ${bundleInfo.sizeKB}KB (${bundleInfo.status})` : "";

		return { content: [{ type: "text", text: wire + bundleMsg }] };
	} catch {
		return result;
	}
}

/**
 * Measure bundle size if esbuild metafile or dist directory exists
 */
async function measureBundleSize(workspaceRoot: string): Promise<{ sizeKB: number; status: string } | null> {
	const { existsSync, readdirSync, statSync } = await import("node:fs");
	const { join } = await import("node:path");

	// Check common dist output paths
	const distPaths = ["dist/extension.js", "dist/main.js", "dist/index.js", "dist/bundle.js"];

	for (const distPath of distPaths) {
		const fullPath = join(workspaceRoot, distPath);
		if (existsSync(fullPath)) {
			const stats = statSync(fullPath);
			const sizeKB = Math.round((stats.size / 1024) * 100) / 100;

			// Check against common limits
			let status = "ok";
			if (sizeKB > 2000) status = "over 2MB";
			else if (sizeKB > 1000) status = "over 1MB";

			return { sizeKB, status };
		}
	}

	// Fallback: sum all files in dist/
	const distDir = join(workspaceRoot, "dist");
	if (existsSync(distDir)) {
		try {
			const files = readdirSync(distDir, { withFileTypes: true });
			let totalBytes = 0;
			for (const file of files) {
				if (file.isFile() && file.name.endsWith(".js")) {
					const filePath = join(distDir, file.name);
					const stats = statSync(filePath);
					totalBytes += stats.size;
				}
			}
			if (totalBytes > 0) {
				const sizeKB = Math.round((totalBytes / 1024) * 100) / 100;
				let status = "ok";
				if (sizeKB > 2000) status = "over 2MB";
				else if (sizeKB > 1000) status = "over 1MB";
				return { sizeKB, status };
			}
		} catch {
			// Ignore errors
		}
	}

	return null;
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Unified snap handler
 */
export const handleSnap: ToolHandler = async (args, context) => {
	const params = args as unknown as SnapParams;

	switch (params.m) {
		case "s":
			return handleStart(params, context);
		case "c":
			return handleCheckMode(params, context);
		case "x":
			return handleContext(params, context);
		default:
			return {
				content: [
					{
						type: "text",
						text: `!|Invalid mode "${params.m}". Use s=start, c=check, x=context`,
					},
				],
				isError: true,
			};
	}
};

// =============================================================================
// Tool Definition
// =============================================================================

export const snapTool: SnapBackTool = {
	name: "snap",
	description: `🧢 SnapBack: ALWAYS start here. Universal entry point for all tasks.

**REQUIRED** before implementation. Provides:
- 🎯 Context + learnings loaded automatically
- 🛡️ Risk assessment and protection status
- 📸 Snapshot creation for safe rollback

**Modes:**
- m:"s" - Start task (FIRST call for any new work)
- m:"c" - Check code (validate before commit)
- m:"x" - Get context (quick status check)

**Wire Format:** 🧢|TYPE|field1|field2|...

**Token savings:** ~100 tokens vs ~1300 tokens (92% reduction)`,
	inputSchema: {
		type: "object",
		properties: {
			m: {
				type: "string",
				enum: ["s", "c", "x"],
				description: "Mode: s=start, c=check, x=context",
			},
			t: { type: "string", description: "Task description (mode:s)" },
			f: {
				type: "array",
				items: { type: "string" },
				description: "Files (mode:s,c)",
			},
			k: {
				type: "array",
				items: { type: "string" },
				description: "Keywords for learnings (mode:s,x)",
			},
			thorough: {
				type: "boolean",
				description: "Full 7-layer validation (mode:c)",
			},
			i: {
				type: "string",
				enum: ["implement", "debug", "refactor", "review", "explore"],
				description: "Intent for context loading",
			},
			goal: {
				type: "object",
				properties: {
					metric: {
						type: "string",
						enum: ["bundle", "performance", "coverage"],
						description: "Metric to track",
					},
					target: {
						type: "number",
						description: "Target value",
					},
					unit: {
						type: "string",
						description: "Unit (KB, ms, %)",
					},
				},
				description: "Goal for task completion (mode:s)",
			},
		},
		required: ["m"],
	},
	annotations: {
		title: "🧢 SnapBack",
		readOnlyHint: false,
		idempotentHint: false,
	},
	tier: "free",
};
