/**
 * Snap Violation Tool
 *
 * Violation reporting with auto-promotion. Replaces:
 * - report_violation
 *
 * @see stress_test_remediation.md
 * @module tools/consolidated/snap-violation
 */

import { INTERNAL_SEPARATOR, messages, WIRE_PREFIX } from "../../branding/index.js";
import { handleReportViolation } from "../../facades/handlers.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Snap.violation parameters
 */
export interface SnapViolationParams {
	/** Violation type (e.g., 'silent-catch', 'layer-violation') */
	type: string;
	/** File where violation occurred */
	file: string;
	/** What went wrong */
	what: string;
	/** Why it happened */
	why: string;
	/** Prevention measure */
	prevent: string;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle snap.violation
 */
export const handleSnapViolation: ToolHandler = async (args, context) => {
	const params = args as unknown as SnapViolationParams;

	const violationArgs: Record<string, unknown> = {
		type: params.type,
		file: params.file,
		whatHappened: params.what,
		whyItHappened: params.why,
		prevention: params.prevent,
	};

	const result = await handleReportViolation(violationArgs, context);

	// Format as compact response
	try {
		const content = result.content[0]?.text || "";
		const data = JSON.parse(content);
		const count = data.count || 1;

		// 🧢|V|OK|type|count|promote?
		const parts = [WIRE_PREFIX, "V", "OK", params.type, String(count)];
		if (data.shouldPromote) parts.push("PROMOTE");
		if (data.shouldAutomate) parts.push("AUTOMATE");

		const wire = parts.join("|");

		// Add human-readable branded message
		const humanMessage = data.shouldAutomate
			? messages.violation.automate(params.type)
			: data.shouldPromote
				? messages.violation.promoted(params.type)
				: messages.violation.recorded(params.type, count);

		return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}` }] };
	} catch {
		return result;
	}
};

// =============================================================================
// Tool Definition
// =============================================================================

export const snapViolationTool: SnapBackTool = {
	name: "snap_violation",
	description: `Report violation. type:X file:Y what:Z why:W prevent:P

Auto-promotes to pattern after 3 occurrences.
Auto-marks for automation after 5 occurrences.

**Wire Format:** V|OK|type|count|PROMOTE?|AUTOMATE?`,
	inputSchema: {
		type: "object",
		properties: {
			type: {
				type: "string",
				description: "Violation type (e.g., 'silent-catch')",
			},
			file: {
				type: "string",
				description: "File where violation occurred",
			},
			what: {
				type: "string",
				description: "What went wrong",
			},
			why: {
				type: "string",
				description: "Why it happened",
			},
			prevent: {
				type: "string",
				description: "Prevention measure",
			},
		},
		required: ["type", "file", "what", "why", "prevent"],
	},
	annotations: {
		title: "🧢 SnapBack Violation",
		readOnlyHint: false,
		idempotentHint: false,
	},
	tier: "free",
};
