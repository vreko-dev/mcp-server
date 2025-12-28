/**
 * Consolidated Tools Registry
 *
 * Central registry for all 7 consolidated tools.
 * Reduces 24 legacy tools to 7 token-efficient tools.
 *
 * @see stress_test_remediation.md
 * @module tools/consolidated/registry
 */

import type { SnapBackTool, ToolHandler } from "../../registry.js";
import { checkTool, handleCheck } from "./check.js";
import { handleSnap, snapTool } from "./snap.js";
import { handleSnapEnd, snapEndTool } from "./snap-end.js";
import { handleSnapFix, snapFixTool } from "./snap-fix.js";
import { handleSnapHelp, snapHelpTool } from "./snap-help.js";
import { handleSnapLearn, snapLearnTool } from "./snap-learn.js";
import { handleSnapViolation, snapViolationTool } from "./snap-violation.js";

// =============================================================================
// Tool Registry
// =============================================================================

/**
 * All consolidated tools for registration
 */
export const CONSOLIDATED_TOOLS: SnapBackTool[] = [
	snapTool,
	snapEndTool,
	snapFixTool,
	snapHelpTool,
	snapLearnTool,
	snapViolationTool,
	checkTool,
];

/**
 * Handler map for routing
 */
export const CONSOLIDATED_HANDLERS: Record<string, ToolHandler> = {
	snap: handleSnap,
	snap_end: handleSnapEnd,
	snap_fix: handleSnapFix,
	snap_help: handleSnapHelp,
	snap_learn: handleSnapLearn,
	snap_violation: handleSnapViolation,
	check: handleCheck,
};

/**
 * Check if a tool name is a consolidated tool
 */
export function isConsolidatedTool(name: string): boolean {
	return name in CONSOLIDATED_HANDLERS;
}

/**
 * Get handler for consolidated tool
 */
export function getConsolidatedHandler(name: string): ToolHandler | undefined {
	return CONSOLIDATED_HANDLERS[name];
}

// =============================================================================
// Tool Mapping (Legacy → Consolidated)
// =============================================================================

/**
 * Maps legacy tool names to their consolidated equivalents
 * Used for deprecation warnings and migration guidance
 */
export const LEGACY_TO_CONSOLIDATED: Record<string, { tool: string; mode?: string; message: string }> = {
	begin_task: {
		tool: "snap",
		mode: "s",
		message: 'Use snap({m:"s", t:"task", f:["files"]}) instead',
	},
	get_context: {
		tool: "snap",
		mode: "x",
		message: 'Use snap({m:"x"}) instead',
	},
	prepare_workspace: {
		tool: "snap",
		mode: "s",
		message: 'Use snap({m:"s"}) which includes prepare behavior',
	},
	get_learnings: {
		tool: "snap",
		mode: "s",
		message: 'Learnings included in snap({m:"s"}) response',
	},
	quick_check: {
		tool: "check",
		mode: "q",
		message: 'Use check({m:"q", f:["files"]}) instead',
	},
	check_patterns: {
		tool: "check",
		mode: "p",
		message: 'Use check({m:"p", code:"..."}) instead',
	},
	validate: {
		tool: "check",
		mode: "f",
		message: 'Use check({m:"f", code:"..."}) instead',
	},
	complete_task: {
		tool: "snap_end",
		message: "Use snap_end({ok:1, l:[...]}) instead",
	},
	review_work: {
		tool: "snap_end",
		message: "Use snap_end({ok:1}) instead - includes review",
	},
	what_changed: {
		tool: "snap_end",
		message: "Use snap_end({ok:1}) instead - includes changes",
	},
	learn: {
		tool: "snap_learn",
		message: 'Use snap_learn({t:"trigger", a:"action"}) instead',
	},
	snapshot_list: {
		tool: "snap_fix",
		message: "Use snap_fix() with no params for list",
	},
	snapshot_restore: {
		tool: "snap_fix",
		message: 'Use snap_fix({id:"snapshot_id"}) instead',
	},
	compare_snapshots: {
		tool: "snap_fix",
		message: 'Use snap_fix({id:"id1", diff:"id2"}) instead',
	},
	report_violation: {
		tool: "snap_violation",
		message: 'Use snap_violation({type:"...", file:"..."}) instead',
	},
	meta: {
		tool: "snap_help",
		message: "Use snap_help() instead",
	},
	get_pairing_protocol: {
		tool: "snap_help",
		message: "Use snap_help() instead",
	},
};

/**
 * Get migration guidance for a legacy tool
 */
export function getMigrationGuidance(legacyTool: string): string | undefined {
	const mapping = LEGACY_TO_CONSOLIDATED[legacyTool];
	return mapping?.message;
}
