#!/usr/bin/env npx tsx
/**
 * SnapBack Validator Script: Types (TypeScript Type Checking)
 *
 * Runs TypeScript type checking on the workspace.
 * Returns pass/fail with specific errors if any.
 *
 * Target: ~50 LOC
 *
 * SOURCE REFERENCE:
 * - scripts/validate-project.ts (TypeScript validation section)
 *
 * EXTERNAL TOOL: tsc (TypeScript compiler)
 * Command: npx tsc --noEmit
 *
 * The --noEmit flag runs type checking without generating output files.
 *
 * INPUT FORMAT (via stdin):
 * {
 *   "files": [{ "path": "src/index.ts" }],
 *   "workspace": "/path/to/workspace"
 * }
 *
 * OUTPUT FORMAT (to stdout):
 * {
 *   "validator": "types",
 *   "status": "pass" | "fail",
 *   "errors": [
 *     { "message": "Type 'string' is not assignable...", "file": "src/index.ts", "line": 42 }
 *   ],
 *   "suggestion": "Fix type errors before applying"
 * }
 */

import { execSync } from "node:child_process";
import type { FileChange, ValidationError, ValidatorOutput } from "../types.js";

// =============================================================================
// INPUT PARSING
// =============================================================================

interface Input {
	files: FileChange[];
	workspace: string;
}

async function readInput(): Promise<Input> {
	return new Promise((resolve, reject) => {
		let data = "";
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch (e) {
				reject(new Error(`Invalid JSON input: ${e}`));
			}
		});
		process.stdin.on("error", reject);
	});
}

// =============================================================================
// TYPE CHECKING
// =============================================================================

/**
 * Parse TypeScript error output into structured errors - exported for testing
 *
 * TypeScript error format:
 *   src/index.ts(42,10): error TS2322: Type 'string' is not assignable to type 'number'.
 */
export function parseTypeScriptErrors(output: string): ValidationError[] {
	const errors: ValidationError[] = [];
	const lines = output.split("\n");

	// Regex to match TypeScript error format
	const errorRegex = /^(.+)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/;

	for (const line of lines) {
		const match = line.match(errorRegex);
		if (match) {
			errors.push({
				file: match[1],
				line: Number.parseInt(match[2], 10),
				column: Number.parseInt(match[3], 10),
				message: match[4],
				severity: "error",
			});
		}
	}

	return errors;
}

/** Type check result - exported for testing */
export interface TypeCheckResult {
	passed: boolean;
	errors: ValidationError[];
}

/**
 * Run TypeScript type checking - exported for testing
 *
 * SOURCE: scripts/validate-project.ts, lines 344-369
 *
 * Uses tsc --noEmit to check types without emitting files.
 */
export function runTypeCheck(workspace: string): TypeCheckResult {
	try {
		execSync("npx tsc --noEmit", {
			cwd: workspace,
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 60_000, // 60 second timeout for large projects
		});

		// If we get here, tsc exited with code 0 (no errors)
		return { passed: true, errors: [] };
	} catch (error) {
		// tsc exits with code 1 if there are type errors
		if (error && typeof error === "object") {
			const stderr = (error as any).stderr?.toString() || "";
			const stdout = (error as any).stdout?.toString() || "";
			const output = stderr + stdout;

			const errors = parseTypeScriptErrors(output);

			// If we found parseable errors, return them
			if (errors.length > 0) {
				return { passed: false, errors };
			}

			// If no parseable errors but tsc failed, return generic error
			return {
				passed: false,
				errors: [
					{
						message: "TypeScript compilation failed",
						severity: "error",
					},
				],
			};
		}

		// Unknown error
		return {
			passed: false,
			errors: [
				{
					message: error instanceof Error ? error.message : "Unknown error",
					severity: "error",
				},
			],
		};
	}
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
	const startTime = Date.now();

	try {
		const input = await readInput();
		const workspace = input.workspace || process.env.SNAPBACK_WORKSPACE || process.cwd();

		// Run type checking
		const { passed, errors } = runTypeCheck(workspace);

		const output: ValidatorOutput = {
			validator: "types",
			status: passed ? "pass" : "fail",
			errors: passed ? undefined : errors,
			suggestion: passed ? undefined : "Fix TypeScript type errors before applying changes",
			duration: Date.now() - startTime,
		};

		console.log(JSON.stringify(output));
		process.exit(passed ? 0 : 1);
	} catch (error) {
		const output: ValidatorOutput = {
			validator: "types",
			status: "fail",
			errors: [
				{
					message: error instanceof Error ? error.message : String(error),
					severity: "error",
				},
			],
			duration: Date.now() - startTime,
		};

		console.log(JSON.stringify(output));
		process.exit(1);
	}
}

main();
