/**
 * Snap Help Tool
 *
 * Help and discovery. Replaces:
 * - meta
 * - get_pairing_protocol
 *
 * @see stress_test_remediation.md Section "Tool 4: snap.?"
 * @module tools/consolidated/snap-help
 */

import { BRAND_PREFIX, WIRE_PREFIX } from "../../branding/index.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Snap help parameters
 */
export interface SnapHelpParams {
	/** Query mode: tools=list active tools, status=current state */
	q?: "tools" | "status" | "wire";
}

// =============================================================================
// Active Tools Discovery
// =============================================================================

/**
 * Get active tools based on current session state
 */
function getActiveTools(): string {
	// List available consolidated tools with status
	const tools = [
		{ name: "snap", modes: "s|c|x", desc: "Start/Check/Context" },
		{ name: "snap_end", modes: "ok:1|0", desc: "Complete task" },
		{ name: "snap_fix", modes: "id|dry|diff", desc: "Restore snapshot" },
		{ name: "snap_learn", modes: "t+a", desc: "Capture learning" },
		{ name: "snap_violation", modes: "type+file", desc: "Report violation" },
		{ name: "check", modes: "f|m:q|f", desc: "Validate code" },
		{ name: "snap_help", modes: "q:tools|status|wire", desc: "This help" },
	];

	return tools.map((t) => `${t.name}(${t.modes}):${t.desc}`).join("|");
}

/**
 * Get current session status
 */
function getSessionStatus(): string {
	// Compact status format
	return "active|no-task|learnings:ready|snapshots:available";
}

/**
 * Get wire format reference with branding info
 */
function getWireReference(): string {
	return `${BRAND_PREFIX} Wire Format Reference

**Response Structure:**
[wire format for agent parsing]
---
[human-readable message for user display]

Agents: Parse BEFORE "---" for structured data, display AFTER "---" to user.

**Wire Format (agent-only):**
${WIRE_PREFIX}|S|task_id|snapshot_id|risk|protection|dirty|snapshot|learnings...
${WIRE_PREFIX}|C|status|errors|warnings|ts✓|lint✓|tests⏭️|issues...
${WIRE_PREFIX}|X|risk|protection|dirty|learnings...
${WIRE_PREFIX}|E|status|learningsL|filesF|lines+/-|learnings...
${WIRE_PREFIX}|R|count|id:age:files|... or R|OK|filesF|file1|...
${WIRE_PREFIX}|L|OK|learn_id|type
${WIRE_PREFIX}|V|OK|type|count|PROMOTE?|AUTOMATE?

Indicators: ✓=passed ⏭️=skipped L=low M=medium H=high`;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle snap_help
 */
export const handleSnapHelp: ToolHandler = async (args, _context) => {
	const params = args as unknown as SnapHelpParams;

	// Query mode: tools - list active tools
	if (params.q === "tools") {
		return { content: [{ type: "text", text: `${WIRE_PREFIX}|H|TOOLS|${getActiveTools()}` }] };
	}

	// Query mode: status - current session state
	if (params.q === "status") {
		return { content: [{ type: "text", text: `${WIRE_PREFIX}|H|STATUS|${getSessionStatus()}` }] };
	}

	// Query mode: wire - wire format reference
	if (params.q === "wire") {
		return { content: [{ type: "text", text: getWireReference() }] };
	}

	// Default: compact help with branded voice
	const help = `${BRAND_PREFIX} Here's the quick reference:

snap m:s|c|x → Start task / Check code / Get context
snap_end ok:1 l:["..."] → Complete task with learnings
snap_fix id:X → Restore snapshot (use dry:true to preview)
snap_learn t:trigger a:action → Capture a learning mid-session
snap_violation → Report a code violation
check f:file → Validate code (m:q quick, m:f full, m:p patterns)
snap_help q:tools|status|wire → This help

**Response format:** [wire]---[user message]
- Parse BEFORE "---" for structured data (agent-only)
- Display AFTER "---" to the user

Query modes: q:tools q:status q:wire`;

	return { content: [{ type: "text", text: help }] };
};

// =============================================================================
// Tool Definition
// =============================================================================

export const snapHelpTool: SnapBackTool = {
	name: "snap_help",
	description: `Help. Tools, state, stats.

**Query Modes:**
- q:"tools" - List active tools with modes
- q:"status" - Current session state
- q:"wire" - Wire format reference

**Wire Format:** H|TOOLS|... or H|STATUS|...`,
	inputSchema: {
		type: "object",
		properties: {
			q: {
				type: "string",
				enum: ["tools", "status", "wire"],
				description: "Query mode: tools=list active, status=session state, wire=format reference",
			},
		},
	},
	annotations: {
		title: "🧢 SnapBack Help",
		readOnlyHint: true,
		idempotentHint: true,
	},
	tier: "free",
};
