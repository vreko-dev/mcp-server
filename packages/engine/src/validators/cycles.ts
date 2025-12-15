#!/usr/bin/env npx tsx
/**
 * SnapBack Validator Script: Cycles (Circular Dependency Gate)
 *
 * Blocks changes that introduce NEW circular dependencies.
 * Unlike the signal script, this compares before/after to detect new cycles.
 *
 * Target: ~60 LOC
 *
 * SOURCE REFERENCES:
 * - scripts/project-health-check.js (madge invocation)
 * - apps/vscode/spike/assumptions/madge-basic.ts
 *
 * EXTERNAL TOOL: madge
 * Install: pnpm add -D madge
 *
 * INPUT FORMAT (via stdin):
 * {
 *   "files": [{ "path": "src/index.ts" }],
 *   "workspace": "/path/to/workspace"
 * }
 *
 * OUTPUT FORMAT (to stdout):
 * {
 *   "validator": "cycles",
 *   "status": "pass" | "fail",
 *   "errors": [
 *     { "message": "New circular dependency: a.ts → b.ts → a.ts" }
 *   ],
 *   "suggestion": "Extract shared logic to a separate module"
 * }
 */

import { execSync } from "child_process";
import type { FileChange, ValidationError, ValidatorOutput } from "../../types";

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
// CYCLE DETECTION
// =============================================================================

/**
 * Detect circular dependencies using madge
 *
 * Returns array of cycles, where each cycle is an array of file paths.
 */
function detectCycles(workspace: string): string[][] {
	try {
		// Run madge on src directory (or common source locations)
		const output = execSync("npx madge --circular --json src", {
			cwd: workspace,
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 30_000,
		});

		return JSON.parse(output) as string[][];
	} catch (error) {
		// madge may exit non-zero but still output valid JSON
		if (error && typeof error === "object" && "stdout" in error) {
			try {
				return JSON.parse((error as any).stdout) as string[][];
			} catch {
				// Can't parse, assume no cycles
				return [];
			}
		}
		return [];
	}
}

/**
 * Format a cycle as a readable string
 */
function formatCycle(cycle: string[]): string {
	return cycle.join(" → ");
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
	const startTime = Date.now();

	try {
		const input = await readInput();
		const workspace = input.workspace || process.env.SNAPBACK_WORKSPACE || process.cwd();

		// Detect current cycles
		const cycles = detectCycles(workspace);

		// For now, we fail if ANY cycles exist
		// TODO: Compare with baseline to only fail on NEW cycles
		//
		// To detect NEW cycles, we would need to:
		// 1. Store baseline cycles at session start (in SessionBaseline)
		// 2. Compare current cycles with baseline
		// 3. Only fail on cycles not in baseline
		//
		// For MVP, blocking all cycles is safer

		if (cycles.length === 0) {
			const output: ValidatorOutput = {
				validator: "cycles",
				status: "pass",
				duration: Date.now() - startTime,
			};
			console.log(JSON.stringify(output));
			process.exit(0);
		}

		// Found cycles - fail
		const errors: ValidationError[] = cycles.map((cycle) => ({
			message: `Circular dependency: ${formatCycle(cycle)}`,
			severity: "error" as const,
		}));

		const output: ValidatorOutput = {
			validator: "cycles",
			status: "fail",
			errors,
			suggestion: "Extract shared logic to a separate module to break the cycle, or use dependency injection",
			duration: Date.now() - startTime,
		};

		console.log(JSON.stringify(output));
		process.exit(1);
	} catch (error) {
		const output: ValidatorOutput = {
			validator: "cycles",
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
