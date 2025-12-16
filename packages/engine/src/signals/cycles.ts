#!/usr/bin/env npx tsx
/**
 * SnapBack Signal Script: Cycles (Circular Dependencies)
 *
 * Detects circular dependencies using madge.
 * Returns count of cycles and the specific cycles found.
 *
 * Target: ~50 LOC
 *
 * SOURCE REFERENCES:
 * - scripts/project-health-check.js (madge invocation)
 * - apps/vscode/spike/assumptions/madge-basic.ts
 *
 * EXTERNAL TOOL: madge
 * Install: pnpm add -D madge
 * Docs: https://github.com/pahen/madge
 *
 * The madge command used:
 *   npx madge --circular --json <path>
 *
 * Returns JSON array of cycles, e.g.:
 *   [["a.ts", "b.ts", "a.ts"], ["c.ts", "d.ts", "c.ts"]]
 *
 * INPUT FORMAT (via stdin):
 * {
 *   "files": [{ "path": "src/index.ts" }],
 *   "workspace": "/path/to/workspace"
 * }
 *
 * OUTPUT FORMAT (to stdout):
 * {
 *   "signal": "cycles",
 *   "value": 2,
 *   "metadata": {
 *     "cycles": [["a.ts", "b.ts", "a.ts"]],
 *     "affectedFiles": ["a.ts", "b.ts"]
 *   }
 * }
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import type { FileChange, SignalOutput } from "../types.js";

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
 * SOURCE: scripts/project-health-check.js, lines 37-49
 *
 * madge --circular --json returns:
 * - Empty array [] if no cycles
 * - Array of cycles if found, e.g. [["a.ts", "b.ts", "a.ts"]]
 */
function detectCycles(workspace: string, files: FileChange[]): string[][] {
	// Determine directories to scan
	// We scan the parent directories of changed files to catch cycles they might create
	const dirsToScan = new Set<string>();
	for (const file of files) {
		const dir = dirname(file.path);
		// Add the directory (relative to workspace)
		dirsToScan.add(dir === "." ? "src" : dir);
	}

	// If no specific dirs, scan common source directories
	if (dirsToScan.size === 0) {
		dirsToScan.add("src");
	}

	const allCycles: string[][] = [];

	for (const dir of dirsToScan) {
		const targetPath = join(workspace, dir);

		try {
			// Run madge with JSON output
			const output = execSync(`npx madge --circular --json "${targetPath}"`, {
				cwd: workspace,
				encoding: "utf8",
				stdio: ["pipe", "pipe", "pipe"],
				timeout: 30_000, // 30 second timeout
			});

			// Parse JSON output
			const cycles = JSON.parse(output) as string[][];
			allCycles.push(...cycles);
		} catch (error) {
			// madge exits with code 1 if there are errors, but still outputs JSON
			// Try to parse the stdout from the error
			if (error && typeof error === "object" && "stdout" in error) {
				try {
					const cycles = JSON.parse((error as any).stdout) as string[][];
					allCycles.push(...cycles);
				} catch {
					// If we can't parse, assume no cycles (graceful degradation)
					console.error(`Warning: Could not parse madge output for ${dir}`);
				}
			}
		}
	}

	// Deduplicate cycles (same cycle might be found from different dirs)
	const uniqueCycles = allCycles.filter(
		(cycle, index, self) => index === self.findIndex((c) => JSON.stringify(c) === JSON.stringify(cycle)),
	);

	return uniqueCycles;
}

/**
 * Get all files affected by cycles - exported for testing
 */
export function getAffectedFiles(cycles: string[][]): string[] {
	const files = new Set<string>();
	for (const cycle of cycles) {
		for (const file of cycle) {
			files.add(file);
		}
	}
	return Array.from(files);
}

/** Cycles signal result - exported for testing */
export interface CyclesResult {
	cycles: string[][];
	affectedFiles: string[];
	cycleCount: number;
}

/**
 * Analyze cycles results from raw cycle data - exported for testing
 */
export function analyzeCycles(cycles: string[][]): CyclesResult {
	return {
		cycles,
		affectedFiles: getAffectedFiles(cycles),
		cycleCount: cycles.length,
	};
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
	try {
		const input = await readInput();
		const workspace = input.workspace || process.env.SNAPBACK_WORKSPACE || process.cwd();

		// Detect cycles
		const cycles = detectCycles(workspace, input.files);
		const affectedFiles = getAffectedFiles(cycles);

		const output: SignalOutput = {
			signal: "cycles",
			value: cycles.length,
			metadata: {
				cycles,
				affectedFiles,
				cycleCount: cycles.length,
			},
			timestamp: Date.now(),
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (error) {
		console.error(
			JSON.stringify({
				signal: "cycles",
				value: -1,
				error: error instanceof Error ? error.message : String(error),
			}),
		);
		process.exit(1);
	}
}

main();
