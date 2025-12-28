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

import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { INTERNAL_SEPARATOR, messages, WIRE_PREFIX } from "../../branding/index.js";
import { handleCheckPatterns, handleValidate } from "../../facades/handlers.js";
import { handleQuickCheck } from "../../facades/quick-check.js";
import type { SnapBackTool, ToolHandler, ToolResult } from "../../registry.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Check tool parameters
 */
export interface CheckParams {
	/** Mode: q=quick, f=full, p=patterns, b=build, i=impact */
	m?: "q" | "f" | "p" | "b" | "i";
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

		case "b": {
			// Build mode - actually run build command
			const result = await handleBuildCheck(context);
			return formatCheckResult(result, "B");
		}

		case "i": {
			// Impact mode - analyze bundle size impact of file removals
			const result = await handleImpactAnalysis(files, context);
			return formatCheckResult(result, "I");
		}

		default:
			return {
				content: [
					{
						type: "text",
						text: `!|Invalid mode "${mode}". Use q=quick, f=full, p=patterns, b=build, i=impact`,
					},
				],
				isError: true,
			};
	}
};

/**
 * Handle build verification mode
 */
async function handleBuildCheck(context: { workspaceRoot: string }): Promise<ToolResult> {
	return new Promise((resolve) => {
		const proc = spawn("pnpm", ["build"], {
			cwd: context.workspaceRoot,
			shell: true,
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stderr = "";

		proc.stderr?.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			const passed = code === 0;
			const errors = passed ? [] : ["Build failed"];
			const warnings: string[] = [];

			// Parse stderr for error messages
			if (!passed && stderr) {
				const lines = stderr.split("\n").filter((l) => l.includes("error") || l.includes("Error"));
				errors.push(...lines.slice(0, 3));
			}

			resolve({
				content: [
					{
						type: "text",
						text: JSON.stringify({
							passed,
							errors,
							warnings,
							message: passed ? "Build succeeded" : "Build failed",
						}),
					},
				],
				isError: !passed,
			});
		});

		proc.on("error", (err) => {
			resolve({
				content: [
					{
						type: "text",
						text: JSON.stringify({
							passed: false,
							errors: [err.message],
							warnings: [],
							message: "Build command failed to execute",
						}),
					},
				],
				isError: true,
			});
		});
	});
}

/**
 * Handle impact analysis mode
 */
async function handleImpactAnalysis(files: string[], context: { workspaceRoot: string }): Promise<ToolResult> {
	if (files.length === 0) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed: false,
						errors: ["No files specified for impact analysis"],
						warnings: [],
					}),
				},
			],
			isError: true,
		};
	}

	// Calculate total size of files
	let totalBytes = 0;
	let lineCount = 0;
	const analyzedFiles: Array<{ file: string; sizeKB: number; lines: number }> = [];

	for (const file of files) {
		const fullPath = join(context.workspaceRoot, file);
		if (existsSync(fullPath)) {
			const stats = statSync(fullPath);
			const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
			totalBytes += stats.size;

			// Rough line count estimation (assuming ~50 bytes per line)
			const estimatedLines = Math.round(stats.size / 50);
			lineCount += estimatedLines;

			analyzedFiles.push({
				file: basename(file),
				sizeKB,
				lines: estimatedLines,
			});
		}
	}

	const totalKB = Math.round((totalBytes / 1024) * 100) / 100;

	// Provide ROI assessment
	let roiLevel: "low" | "medium" | "high" = "low";
	let recommendation = "Reconsider - low impact";

	if (totalKB > 50) {
		roiLevel = "high";
		recommendation = "High ROI - proceed with removal";
	} else if (totalKB > 20) {
		roiLevel = "medium";
		recommendation = "Medium ROI - consider removal";
	}

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify({
					passed: true,
					analysis: {
						filesAnalyzed: analyzedFiles.length,
						totalKB,
						lineCount,
						files: analyzedFiles,
						roiLevel,
						recommendation,
					},
					message: `Impact: ${totalKB}KB across ${analyzedFiles.length} file(s) - ${roiLevel.toUpperCase()} ROI`,
					warnings: [],
					errors: [],
				}),
			},
		],
	};
}

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
	description: `Validate code. m:q|f|p|b|i f:files code:str

**Modes:**
- q (default): Quick parallel check (TypeScript + lint)
- f: Full 7-layer comprehensive validation
- p: Pattern-only check
- b: Build verification (runs pnpm build)
- i: Impact analysis (bundle size ROI for file removals)

**Wire Format:** MODE|OK|0E|0W or MODE|ERR|3E|1W|issues...`,
	inputSchema: {
		type: "object",
		properties: {
			m: {
				type: "string",
				enum: ["q", "f", "p", "b", "i"],
				description: "Mode: q=quick, f=full, p=patterns, b=build, i=impact",
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
