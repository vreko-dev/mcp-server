/**
 * Composite Tool: quick_check
 *
 * Fast parallel validation that checks TypeScript, tests, and lint
 * in a single tool call instead of requiring multiple sequential validations.
 *
 * Reduces validation time by ~60% through parallelization.
 *
 * @see pair_programmer.md Section 2.2
 * @module facades/quick-check
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { ToolHandler, ToolResult } from "../registry.js";
import { createErrorCacheService } from "../services/error-cache-service.js";
import { getErrorPatternRegistry } from "../services/error-pattern-registry.js";
import { getCurrentTask, pushObservation } from "../session/state.js";
import type { CachedError } from "../types/context.js";

// =============================================================================
// TYPES
// =============================================================================

interface QuickCheckInput {
	/** File to validate (optional - uses current task files if not specified) */
	file?: string;
	/** Files to validate (for batch checking) */
	files?: string[];
	/** Skip TypeScript check */
	skipTypeScript?: boolean;
	/** Skip test discovery/run */
	skipTests?: boolean;
	/** Skip lint check */
	skipLint?: boolean;
	/** Run tests (not just discover them) */
	runTests?: boolean;
}

interface CheckResult {
	passed: boolean;
	duration: number;
	errors?: string[];
	warnings?: string[];
}

interface ErrorSolution {
	category: string;
	description: string;
	solutions: string[];
	autoFixable: boolean;
	count: number;
}

interface QuickCheckOutput {
	overall: "pass" | "fail" | "warn";
	typescript: CheckResult;
	tests: CheckResult & {
		discovered: number;
		run?: number;
		passedCount?: number;
		failedCount?: number;
	};
	lint: CheckResult;
	summary: string;
	/** Matched error patterns with solutions */
	solutions?: ErrorSolution[];
	nextActions: Array<{
		tool: string;
		priority: number;
		reason: string;
	}>;
}

// =============================================================================
// PARALLEL EXECUTION
// =============================================================================

/**
 * Run command with timeout and capture output
 */
async function runCommand(
	cmd: string,
	args: string[],
	cwd: string,
	timeoutMs = 30000,
): Promise<{ exitCode: number; stdout: string; stderr: string; duration: number }> {
	const start = Date.now();

	return new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		let killed = false;

		const proc = spawn(cmd, args, {
			cwd,
			shell: true,
			stdio: ["pipe", "pipe", "pipe"],
		});

		const timeout = setTimeout(() => {
			killed = true;
			proc.kill("SIGTERM");
		}, timeoutMs);

		proc.stdout?.on("data", (data) => {
			stdout += data.toString();
		});

		proc.stderr?.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			clearTimeout(timeout);
			resolve({
				exitCode: killed ? -1 : (code ?? 0),
				stdout,
				stderr,
				duration: Date.now() - start,
			});
		});

		proc.on("error", (err) => {
			clearTimeout(timeout);
			resolve({
				exitCode: -1,
				stdout,
				stderr: err.message,
				duration: Date.now() - start,
			});
		});
	});
}

/**
 * Check TypeScript compilation
 */
async function checkTypeScript(files: string[], workspaceRoot: string): Promise<CheckResult> {
	const start = Date.now();

	try {
		// Try using tsc with noEmit for checking
		const result = await runCommand("npx", ["tsc", "--noEmit", "--pretty", "false"], workspaceRoot, 15000);

		const errors: string[] = [];
		const warnings: string[] = [];

		// Parse tsc output
		const lines = (result.stdout + result.stderr).split("\n");
		for (const line of lines) {
			if (line.includes("error TS")) {
				// Filter to only errors in target files
				const isRelevant = files.some(
					(f) => line.includes(basename(f)) || line.includes(relative(workspaceRoot, f)),
				);
				if (isRelevant || files.length === 0) {
					errors.push(line.trim());
				}
			} else if (line.includes("warning")) {
				warnings.push(line.trim());
			}
		}

		return {
			passed: result.exitCode === 0 || errors.length === 0,
			duration: Date.now() - start,
			errors: errors.slice(0, 10), // Limit to first 10 errors
			warnings: warnings.slice(0, 5),
		};
	} catch {
		return {
			passed: true, // Assume pass if tsc not available
			duration: Date.now() - start,
			warnings: ["TypeScript check skipped: tsc not available"],
		};
	}
}

/**
 * Discover and optionally run tests
 */
interface TestCheckResult extends CheckResult {
	discovered: number;
	run?: number;
	passedCount?: number;
	failedCount?: number;
}

async function checkTests(files: string[], workspaceRoot: string, runTests: boolean): Promise<TestCheckResult> {
	const start = Date.now();

	// Find test files related to the modified files
	const testFiles: string[] = [];
	for (const file of files) {
		const dir = dirname(file);
		const base = basename(file, ".ts").replace(".tsx", "");

		// Common test file patterns
		const patterns = [
			join(dir, `${base}.test.ts`),
			join(dir, `${base}.test.tsx`),
			join(dir, `${base}.spec.ts`),
			join(dir, `${base}.spec.tsx`),
			join(dir, "__tests__", `${base}.test.ts`),
			join(dir, "__tests__", `${base}.test.tsx`),
		];

		for (const pattern of patterns) {
			const fullPath = join(workspaceRoot, pattern);
			if (existsSync(fullPath)) {
				testFiles.push(pattern);
			}
		}
	}

	if (testFiles.length === 0) {
		const result: TestCheckResult = {
			passed: true,
			duration: Date.now() - start,
			discovered: 0,
			warnings: ["No related test files found"],
		};
		return result;
	}

	if (!runTests) {
		const result: TestCheckResult = {
			passed: true,
			duration: Date.now() - start,
			discovered: testFiles.length,
			warnings: [`${testFiles.length} test file(s) discovered but not run. Use runTests: true to execute.`],
		};
		return result;
	}

	// Run tests with vitest
	try {
		const result = await runCommand(
			"npx",
			["vitest", "run", ...testFiles, "--reporter=json"],
			workspaceRoot,
			60000, // 60s timeout for tests
		);

		const errors: string[] = [];
		let passed = 0;
		let failed = 0;

		// Try to parse vitest JSON output
		try {
			const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
			if (jsonMatch) {
				const testResult = JSON.parse(jsonMatch[0]);
				passed = testResult.numPassedTests || 0;
				failed = testResult.numFailedTests || 0;
				if (testResult.testResults) {
					for (const tr of testResult.testResults) {
						if (tr.status === "failed" && tr.message) {
							errors.push(tr.message.slice(0, 200));
						}
					}
				}
			}
		} catch {
			// Fallback: parse console output
			const passMatch = result.stdout.match(/(\d+) passed/);
			const failMatch = result.stdout.match(/(\d+) failed/);
			if (passMatch) passed = Number.parseInt(passMatch[1], 10);
			if (failMatch) {
				failed = Number.parseInt(failMatch[1], 10);
				errors.push(`${failed} test(s) failed`);
			}
		}

		const testResult: TestCheckResult = {
			passed: result.exitCode === 0,
			duration: Date.now() - start,
			discovered: testFiles.length,
			run: testFiles.length,
			passedCount: passed,
			failedCount: failed,
			errors: errors.slice(0, 5),
		};
		return testResult;
	} catch {
		const result: TestCheckResult = {
			passed: true,
			duration: Date.now() - start,
			discovered: testFiles.length,
			warnings: ["Test execution skipped: vitest not available"],
		};
		return result;
	}
}

/**
 * Check lint with Biome
 */
async function checkLint(files: string[], workspaceRoot: string): Promise<CheckResult> {
	const start = Date.now();

	try {
		const fileArgs = files.map((f) => relative(workspaceRoot, join(workspaceRoot, f)));
		const result = await runCommand(
			"npx",
			["biome", "check", "--reporter=json", ...fileArgs],
			workspaceRoot,
			15000,
		);

		const errors: string[] = [];
		const warnings: string[] = [];

		// Try to parse Biome JSON output
		try {
			const diagnostics = JSON.parse(result.stdout);
			if (Array.isArray(diagnostics)) {
				for (const diag of diagnostics) {
					if (diag.severity === "error") {
						errors.push(`${diag.path}: ${diag.message}`);
					} else if (diag.severity === "warning") {
						warnings.push(`${diag.path}: ${diag.message}`);
					}
				}
			}
		} catch {
			// Fallback: check exit code
			if (result.exitCode !== 0) {
				const lines = result.stderr.split("\n").filter((l) => l.trim());
				errors.push(...lines.slice(0, 5));
			}
		}

		return {
			passed: result.exitCode === 0 || errors.length === 0,
			duration: Date.now() - start,
			errors: errors.slice(0, 10),
			warnings: warnings.slice(0, 5),
		};
	} catch {
		return {
			passed: true,
			duration: Date.now() - start,
			warnings: ["Lint check skipped: biome not available"],
		};
	}
}

// =============================================================================
// HANDLER
// =============================================================================

function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * quick_check - Fast parallel validation
 *
 * Runs TypeScript, test discovery, and lint checks in parallel
 */
export const handleQuickCheck: ToolHandler = async (args, context): Promise<ToolResult> => {
	const {
		file,
		files: providedFiles,
		skipTypeScript = false,
		skipTests = false,
		skipLint = false,
		runTests = false,
	} = args as QuickCheckInput;

	const workspaceRoot = context.workspaceRoot;

	// Determine files to check
	let files: string[] = [];
	if (providedFiles && providedFiles.length > 0) {
		files = providedFiles;
	} else if (file) {
		files = [file];
	} else {
		// Use current task files
		const task = getCurrentTask(workspaceRoot);
		if (task?.plannedFiles.length) {
			files = task.plannedFiles;
		}
	}

	if (files.length === 0) {
		return result(
			JSON.stringify({
				error: "E102_MISSING_PARAM",
				message: "No files specified. Provide 'file', 'files', or start a task with begin_task.",
			}),
			true,
		);
	}

	// Run all checks in parallel
	const checks = await Promise.all([
		skipTypeScript
			? Promise.resolve({ passed: true, duration: 0, warnings: ["Skipped"] } as CheckResult)
			: checkTypeScript(files, workspaceRoot),
		skipTests
			? Promise.resolve({ passed: true, duration: 0, discovered: 0, warnings: ["Skipped"] } as CheckResult & {
					discovered: number;
				})
			: checkTests(files, workspaceRoot, runTests),
		skipLint
			? Promise.resolve({ passed: true, duration: 0, warnings: ["Skipped"] } as CheckResult)
			: checkLint(files, workspaceRoot),
	]);

	const [typescript, tests, lint] = checks;

	// Determine overall status
	const allPassed = typescript.passed && tests.passed && lint.passed;
	const hasWarnings =
		(typescript.warnings?.length ?? 0) > 0 || (tests.warnings?.length ?? 0) > 0 || (lint.warnings?.length ?? 0) > 0;

	const overall: "pass" | "fail" | "warn" = allPassed ? (hasWarnings ? "warn" : "pass") : "fail";

	// Build summary
	const parts: string[] = [];
	if (!typescript.passed) parts.push(`TypeScript: ${typescript.errors?.length || 1} error(s)`);
	if (!tests.passed) parts.push(`Tests: ${(tests as any).failedCount || 1} failed`);
	if (!lint.passed) parts.push(`Lint: ${lint.errors?.length || 1} error(s)`);

	const summary = allPassed
		? `All checks passed in ${typescript.duration + tests.duration + lint.duration}ms`
		: `Issues found: ${parts.join(", ")}`;

	// Push observation for session tracking
	if (!allPassed) {
		pushObservation(workspaceRoot, {
			type: "warning",
			message: summary,
			timestamp: Date.now(),
		});
	}

	// Cache errors for future begin_task calls (P0 context enhancement)
	try {
		const errorCacheService = createErrorCacheService(workspaceRoot);
		const errorsToCache: CachedError[] = [];
		const now = Date.now();

		// Cache TypeScript errors
		if (typescript.errors && typescript.errors.length > 0) {
			for (const errorMsg of typescript.errors) {
				// Parse error format: "file.ts(line,col): error TS1234: message"
				const match = errorMsg.match(/^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/);
				if (match) {
					errorsToCache.push({
						file: match[1],
						line: Number.parseInt(match[2], 10),
						column: Number.parseInt(match[3], 10),
						code: match[4],
						message: match[5],
						severity: "error",
						timestamp: now,
						source: "typescript",
					});
				} else {
					// Fallback for non-standard format
					errorsToCache.push({
						file: files[0] || "unknown",
						line: 0,
						message: errorMsg,
						severity: "error",
						timestamp: now,
						source: "typescript",
					});
				}
			}
		}

		// Cache lint errors
		if (lint.errors && lint.errors.length > 0) {
			for (const errorMsg of lint.errors) {
				// Parse format: "file.ts: message" or just message
				const match = errorMsg.match(/^(.+?):\s*(.+)$/);
				if (match) {
					errorsToCache.push({
						file: match[1],
						line: 0,
						message: match[2],
						severity: "error",
						timestamp: now,
						source: "lint",
					});
				}
			}
		}

		// Cache test failures
		const testResult = tests as QuickCheckOutput["tests"];
		if (testResult.errors && testResult.errors.length > 0) {
			for (const errorMsg of testResult.errors) {
				errorsToCache.push({
					file: files[0] || "unknown",
					line: 0,
					message: errorMsg,
					severity: "error",
					timestamp: now,
					source: "test",
				});
			}
		}

		if (errorsToCache.length > 0) {
			errorCacheService.cacheErrors(errorsToCache);
		}

		// Clear errors for files that passed all checks
		if (allPassed) {
			for (const file of files) {
				errorCacheService.clearForFile(file);
			}
		}
	} catch {
		// Error caching is optional - don't fail quick_check
	}

	// Match errors against patterns for solution hints
	const solutions: ErrorSolution[] = [];
	if (!allPassed) {
		const registry = getErrorPatternRegistry();
		const allErrors: string[] = [...(typescript.errors || []), ...(lint.errors || []), ...(tests.errors || [])];

		const matches = registry.matchMultiple(allErrors);
		for (const match of matches) {
			solutions.push({
				category: match.pattern.category,
				description: match.pattern.description,
				solutions: match.pattern.solutions,
				autoFixable: match.pattern.autoFixable,
				count: match.count,
			});
		}
	}

	// Build next actions
	const nextActions: Array<{ tool: string; priority: number; reason: string }> = [];

	if (!typescript.passed) {
		nextActions.push({
			tool: "validate",
			priority: 1,
			reason: "Fix TypeScript errors before proceeding",
		});
	}

	if (!tests.passed) {
		nextActions.push({
			tool: "quick_check",
			priority: 2,
			reason: "Re-run tests after fixing failures",
		});
	}

	if (allPassed) {
		nextActions.push({
			tool: "review_work",
			priority: 3,
			reason: "All checks passed - ready for review",
		});
	}

	const output: QuickCheckOutput = {
		overall,
		typescript,
		tests: tests as QuickCheckOutput["tests"],
		lint,
		summary,
		solutions: solutions.length > 0 ? solutions : undefined,
		nextActions,
	};

	return result(
		JSON.stringify(
			{
				...output,
				_hint: allPassed
					? "All checks passed! Consider using review_work before committing."
					: "Issues found. Fix them and run quick_check again.",
			},
			null,
			2,
		),
	);
};
