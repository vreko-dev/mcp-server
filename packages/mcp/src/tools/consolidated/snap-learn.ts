/**
 * Snap Learn Tool
 *
 * Mid-session learning capture. Replaces:
 * - learn
 *
 * @see stress_test_remediation.md
 * @module tools/consolidated/snap-learn
 */

import { INTERNAL_SEPARATOR, messages, WIRE_PREFIX } from "../../branding/index.js";
import { handleLearn } from "../../facades/handlers.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Snap.learn parameters
 */
export interface SnapLearnParams {
	/** Learning type: pat=pattern, pit=pitfall, eff=efficiency, disc=discovery, wf=workflow */
	type?: "pat" | "pit" | "eff" | "disc" | "wf";
	/** Trigger text */
	t: string;
	/** Action text */
	a: string;
	/** Source (optional) */
	s?: string;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle snap.learn
 */
export const handleSnapLearn: ToolHandler = async (args, context) => {
	const params = args as unknown as SnapLearnParams;

	// Map short type to full type
	const typeMap: Record<string, string> = {
		pat: "pattern",
		pit: "pitfall",
		eff: "efficiency",
		disc: "discovery",
		wf: "workflow",
	};

	const learnArgs: Record<string, unknown> = {
		type: typeMap[params.type || "pat"] || "pattern",
		trigger: params.t,
		action: params.a,
		source: params.s || "snap.learn",
	};

	const result = await handleLearn(learnArgs, context);

	// Format as compact response
	try {
		const content = result.content[0]?.text || "";
		const data = JSON.parse(content);
		const learnType = params.type || "pat";
		const fullType = typeMap[learnType] || "pattern";

		// 🧢|L|OK|id|type
		const wire = `${WIRE_PREFIX}|L|OK|${data.id || "?"}|${learnType}`;
		const humanMessage = messages.learning.captured(fullType);

		return {
			content: [
				{
					type: "text",
					text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}`,
				},
			],
		};
	} catch {
		return result;
	}
};

// =============================================================================
// Tool Definition
// =============================================================================

export const snapLearnTool: SnapBackTool = {
	name: "snap_learn",
	description: `Capture mid-session learning. t:trigger a:action type:pat|pit|eff|disc|wf

**Types:**
- pat: pattern (default)
- pit: pitfall
- eff: efficiency
- disc: discovery
- wf: workflow

**Wire Format:** L|OK|id|type`,
	inputSchema: {
		type: "object",
		properties: {
			type: {
				type: "string",
				enum: ["pat", "pit", "eff", "disc", "wf"],
				description: "Learning type (default: pat)",
			},
			t: {
				type: "string",
				description: "Trigger",
			},
			a: {
				type: "string",
				description: "Action",
			},
			s: {
				type: "string",
				description: "Source (optional)",
			},
		},
		required: ["t", "a"],
	},
	annotations: {
		title: "🧢 SnapBack Learn",
		readOnlyHint: false,
		idempotentHint: false,
	},
	tier: "free",
};
