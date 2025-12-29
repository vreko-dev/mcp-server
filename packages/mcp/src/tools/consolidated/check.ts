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
import { getSessionFileTracker } from "../../services/session-file-tracker.js";
import { createTieredLearningService } from "../../services/tiered-learning-service.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Check tool parameters
 */
export interface CheckParams {
	/** Mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings */
	m?: "q" | "f" | "p" | "b" | "i" | "c" | "d" | "l";
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

	// Track validated files for what_changed (MCP-only mode)
	if (files.length > 0 && mode !== "l") {
		const tracker = getSessionFileTracker(context.workspaceRoot);
		tracker.trackFiles(files, "validated");
	}

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

		case "c": {
			// Circular dependency mode - uses madge
			const result = await handleCircularCheck(files, context);
			return formatCheckResult(result, "C");
		}

		case "d": {
			// Doc freshness mode - check for stale documentation
			const result = await handleDocFreshnessCheck(context);
			return formatCheckResult(result, "D");
		}

		case "l": {
			// Learning maintenance mode - regenerate hot tier, show stats
			const result = await handleLearningsMaintenance(context);
			return formatCheckResult(result, "L");
		}

		default:
			return {
				content: [
					{
						type: "text",
						text: `!|Invalid mode "${mode}". Use q=quick, f=full, p=patterns, b=build, i=impact, l=learnings`,
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
 * Handle circular dependency check mode
 * Uses madge (already installed) to detect circular imports
 */
async function handleCircularCheck(targetDirs: string[], context: { workspaceRoot: string }): Promise<ToolResult> {
	try {
		// Dynamic import madge directly to avoid cross-package import issues
		const madgeModule = await import("madge");
		const madge = madgeModule.default || madgeModule;

		// If specific directories provided, check those; otherwise check all packages
		const dirsToCheck =
			targetDirs.length > 0
				? targetDirs.map((d) => join(context.workspaceRoot, d))
				: [
						join(context.workspaceRoot, "packages/core/src"),
						join(context.workspaceRoot, "packages/intelligence/src"),
						join(context.workspaceRoot, "packages/mcp/src"),
						join(context.workspaceRoot, "apps/web/src"),
						join(context.workspaceRoot, "apps/vscode/src"),
					];

		// Run madge on each directory and collect results
		const allCycles: Array<{ package: string; cycle: string[] }> = [];
		const affectedPackages: string[] = [];

		for (const dir of dirsToCheck) {
			if (!existsSync(dir)) continue;

			try {
				const result = await madge(dir, {
					fileExtensions: ["ts", "tsx", "js", "jsx"],
					excludeRegExp: [/node_modules/, /dist/, /\.next/, /\.test\./, /\.spec\./, /__tests__/, /__mocks__/],
					detectiveOptions: { ts: { skipTypeImports: true } },
				});

				const cycles = result.circular() as string[][];
				if (cycles.length > 0) {
					affectedPackages.push(basename(dir));
					for (const cycle of cycles) {
						allCycles.push({ package: basename(dir), cycle });
					}
				}
			} catch {
				// Skip directories that fail to parse
			}
		}

		const passed = allCycles.length === 0;
		const errors = allCycles.slice(0, 5).map((c: { package: string; cycle: string[] }) => ({
			file: c.package,
			message: c.cycle.join(" -> "),
		}));

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed,
						totalCycles: allCycles.length,
						affectedPackages,
						errors: passed ? [] : errors,
						warnings: [],
						message: passed
							? "No circular dependencies"
							: `${allCycles.length} cycles in ${affectedPackages.length} package(s)`,
					}),
				},
			],
			isError: !passed,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed: false,
						errors: [{ message: error instanceof Error ? error.message : String(error) }],
						warnings: [],
						message: "Circular dependency check failed",
					}),
				},
			],
			isError: true,
		};
	}
}

interface StaleDocInfo {
	path: string;
	hoursStale: number;
	newerSourceFiles: string[];
	severity: "warning" | "error";
}

/**
 * Handle documentation freshness check mode
 * Detects stale markdown files relative to source changes
 */
async function handleDocFreshnessCheck(context: { workspaceRoot: string }): Promise<ToolResult> {
	try {
		const { glob } = await import("glob");
		const { stat } = await import("node:fs/promises");
		const { dirname, relative } = await import("node:path");

		const staleHours = 72; // 3 days
		const now = Date.now();
		const staleThreshold = now - staleHours * 60 * 60 * 1000;

		// Find doc and source files
		const docFiles = await glob(["**/*.md", "**/CLAUDE.md", "**/*-audit.md", "**/*ROADMAP*.md"], {
			cwd: context.workspaceRoot,
			absolute: true,
			ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
		});

		const sourceFiles = await glob(["**/*.ts", "**/*.tsx"], {
			cwd: context.workspaceRoot,
			absolute: true,
			ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
		});

		// Get mtimes
		const getMtime = async (file: string): Promise<number> => {
			try {
				const stats = await stat(file);
				return stats.mtimeMs;
			} catch {
				return 0;
			}
		};

		const docMtimes = new Map<string, number>();
		const srcMtimes = new Map<string, number>();

		await Promise.all([
			...docFiles.map(async (f) => docMtimes.set(f, await getMtime(f))),
			...sourceFiles.map(async (f) => srcMtimes.set(f, await getMtime(f))),
		]);

		// Find stale docs
		const staleDocs: StaleDocInfo[] = [];

		for (const [docPath, docMtime] of docMtimes) {
			const hoursStale = Math.round((now - docMtime) / (60 * 60 * 1000));
			const docDir = dirname(docPath);

			// Find newer source files in same directory tree
			const newerSourceFiles: string[] = [];
			for (const [srcPath, srcMtime] of srcMtimes) {
				if (srcPath.startsWith(docDir) && srcMtime > docMtime) {
					newerSourceFiles.push(relative(context.workspaceRoot, srcPath));
				}
			}

			const isStale = docMtime < staleThreshold || newerSourceFiles.length > 0;

			if (isStale) {
				staleDocs.push({
					path: relative(context.workspaceRoot, docPath),
					hoursStale,
					newerSourceFiles: newerSourceFiles.slice(0, 5),
					severity: hoursStale > staleHours * 2 ? "error" : "warning",
				});
			}
		}

		// Sort by staleness
		staleDocs.sort((a, b) => b.hoursStale - a.hoursStale);

		const freshDocs = docMtimes.size - staleDocs.length;
		const freshnessValue = docMtimes.size > 0 ? Math.round((freshDocs / docMtimes.size) * 100) : 100;
		const passed = staleDocs.length === 0;

		const errors = staleDocs.slice(0, 5).map((doc: StaleDocInfo) => ({
			file: doc.path,
			message: `${doc.hoursStale}h stale${doc.newerSourceFiles.length > 0 ? ` (${doc.newerSourceFiles.length} newer src)` : ""}`,
		}));

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed,
						freshness: freshnessValue,
						staleCount: staleDocs.length,
						totalDocs: docMtimes.size,
						errors: passed ? [] : errors,
						warnings:
							staleDocs.filter((d: StaleDocInfo) => d.severity === "warning").length > 0
								? ["Some docs approaching stale"]
								: [],
						message: passed
							? `All ${docMtimes.size} docs fresh`
							: `${staleDocs.length}/${docMtimes.size} docs stale (${freshnessValue}% fresh)`,
					}),
				},
			],
			isError: !passed,
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed: false,
						errors: [{ message: error instanceof Error ? error.message : String(error) }],
						warnings: [],
						message: "Doc freshness check failed",
					}),
				},
			],
			isError: true,
		};
	}
}

/**
 * Handle learning maintenance mode
 * Regenerates hot tier based on usage patterns and shows statistics
 */
async function handleLearningsMaintenance(context: { workspaceRoot: string }): Promise<ToolResult> {
	try {
		const service = createTieredLearningService(context.workspaceRoot);

		// Get usage stats before regeneration
		const stats = service.getUsageStats();
		const totalTracked = Object.keys(stats).length;

		// Regenerate hot tier
		const result = await service.regenerateHotTier();

		// Calculate top learnings by usage
		const topLearnings = Object.entries(stats)
			.map(([id, data]) => ({ id, ...data }))
			.sort((a, b) => b.appliedCount * 3 + b.accessCount - (a.appliedCount * 3 + a.accessCount))
			.slice(0, 5);

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed: true,
						regeneration: {
							preserved: result.preserved,
							promoted: result.promoted,
							demoted: result.demoted,
							totalHot: result.totalHot,
						},
						stats: {
							totalTracked,
							topLearnings: topLearnings.map((l) => ({
								id: l.id.slice(0, 30),
								accessed: l.accessCount,
								applied: l.appliedCount,
							})),
						},
						errors: [],
						warnings:
							result.promoted === 0 && totalTracked > 0 ? ["No learnings met promotion threshold"] : [],
						message: `Hot tier: ${result.totalHot} learnings (${result.preserved} critical, ${result.promoted} promoted)`,
					}),
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						passed: false,
						errors: [{ message: error instanceof Error ? error.message : String(error) }],
						warnings: [],
						message: "Learning maintenance failed",
					}),
				},
			],
			isError: true,
		};
	}
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
	description: `Validate code. m:q|f|p|b|i|c|d|l f:files code:str

**Modes:**
- q (default): Quick parallel check (TypeScript + lint)
- f: Full 7-layer comprehensive validation
- p: Pattern-only check
- b: Build verification (runs pnpm build)
- i: Impact analysis (bundle size ROI for file removals)
- c: Circular dependency check (uses madge)
- d: Doc freshness check (detects stale documentation)
- l: Learning maintenance (regenerate hot tier, show usage stats)

**Wire Format:** MODE|OK|0E|0W or MODE|ERR|3E|1W|issues...`,
	inputSchema: {
		type: "object",
		properties: {
			m: {
				type: "string",
				enum: ["q", "f", "p", "b", "i", "c", "d", "l"],
				description: "Mode: q=quick, f=full, p=patterns, b=build, i=impact, c=circular, d=docs, l=learnings",
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
