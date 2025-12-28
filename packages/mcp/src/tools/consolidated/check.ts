/**
 * Unified Check Tool
 *
 * Validation with modes. Replaces:
 * - quick_check
 * - check_patterns
 * - validate
 *
 * @see stress_test_remediation.md
 * @module tools/consolidated/check
 */

import { basename } from "node:path";
import { INTERNAL_SEPARATOR, messages, WIRE_PREFIX } from "../../branding/index.js";
import { handleCheckPatterns, handleValidate } from "../../facades/handlers.js";
import { handleQuickCheck } from "../../facades/quick-check.js";
import type { SnapBackTool, ToolHandler } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Check tool parameters
 */
export interface CheckParams {
	/** Mode: q=quick, f=full, p=patterns */
	m?: "q" | "f" | "p";
	/** File(s) to check */
	f?: string | string[];
	/** Code to validate (for patterns/validate mode) */
	code?: string;
	/** Run tests */
	tests?: boolean;
}

// =============================================================================
// Handler
// =============================================================================

/**
 * Handle check tool
 */
export const handleCheck: ToolHandler = async (args, context) => {
	const params = args as unknown as CheckParams;
	const mode = params.m || "q";

	// Normalize files
	const files = params.f ? (Array.isArray(params.f) ? params.f : [params.f]) : [];

	switch (mode) {
		case "q": {
			// Quick mode - parallel validation
			const result = await handleQuickCheck(
				{
					files,
					runTests: params.tests || false,
					skipTypeScript: false,
					skipTests: !params.tests,
					skipLint: false,
				},
				context,
			);

			return formatCheckResult(result, "Q");
		}

		case "f": {
			// Full/comprehensive mode
			const result = await handleValidate(
				{
					mode: "comprehensive",
					code: params.code || "",
					filePath: files[0] || "",
				},
				context,
			);

			return formatCheckResult(result, "F");
		}

		case "p": {
			// Patterns mode - 7-layer pipeline
			const result = await handleCheckPatterns(
				{
					code: params.code || "",
					filePath: files[0] || "",
				},
				context,
			);

			return formatCheckResult(result, "P");
		}

		default:
			return {
				content: [{ type: "text", text: `!|Invalid mode "${mode}". Use q=quick, f=full, p=patterns` }],
				isError: true,
			};
	}
};

/**
 * Format check result as compact wire format with branding
 */
function formatCheckResult(
	result: { content: Array<{ type: string; text: string }>; isError?: boolean },
	prefix: string,
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
	try {
		const content = result.content[0]?.text || "";
		const data = JSON.parse(content);

		const errors = data.errors?.length || 0;
		const warnings = data.warnings?.length || 0;
		const passed = errors === 0;

		// 🧢|Q|OK|0E|0W or 🧢|Q|ERR|3E|1W|issue1|issue2
		const parts = [WIRE_PREFIX, prefix, passed ? "OK" : "ERR", `${errors}E`, `${warnings}W`];

		if (!passed && data.errors) {
			const issues = data.errors.slice(0, 3).map((e: { message?: string; file?: string }) => {
				const file = e.file ? basename(e.file) : "";
				const msg = (e.message || "error").slice(0, 30);
				return file ? `${file}:${msg}` : msg;
			});
			parts.push(...issues);
		}

		const wire = parts.join("|");

		// Add human-readable branded message
		const humanMessage = passed ? messages.validation.passed() : messages.validation.issues(errors, warnings);

		return { content: [{ type: "text", text: `${wire}${INTERNAL_SEPARATOR}${humanMessage}` }] };
	} catch {
		return result as { content: Array<{ type: "text"; text: string }>; isError?: boolean };
	}
}

// =============================================================================
// Tool Definition
// =============================================================================

export const checkTool: SnapBackTool = {
	name: "check",
	description: `Validate code. m:q|f|p f:files code:str

**Modes:**
- q (default): Quick parallel check (TypeScript + lint)
- f: Full 7-layer comprehensive validation
- p: Pattern-only check

**Wire Format:** MODE|OK|0E|0W or MODE|ERR|3E|1W|issues...`,
	inputSchema: {
		type: "object",
		properties: {
			m: {
				type: "string",
				enum: ["q", "f", "p"],
				description: "Mode: q=quick, f=full, p=patterns",
			},
			f: {
				oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
				description: "File(s) to check",
			},
			code: {
				type: "string",
				description: "Code to validate (for patterns mode)",
			},
			tests: {
				type: "boolean",
				description: "Run tests (quick mode only)",
			},
		},
	},
	annotations: {
		title: "🧢 SnapBack Check",
		readOnlyHint: true,
		idempotentHint: true,
	},
	tier: "free",
};
