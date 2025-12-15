#!/usr/bin/env npx tsx
/**
 * Consumers Signal - Import Fan-In Analysis
 *
 * STATUS: 📝 TODO - Needs implementation
 *
 * EXTRACTION SOURCE: apps/vscode/src/engine/graph/ImportAnalyzer.ts
 *
 * This script counts how many files import each of the given files.
 * High fan-in = more impact when changed = higher risk.
 *
 * EXTRACTION STEPS:
 * 1. Read ImportAnalyzer.ts to understand the import graph building
 * 2. Simplify to just count consumers (files that import the target)
 * 3. Use madge or grep-based approach for simplicity
 *
 * INPUTS (via --files or SNAPBACK_FILES env):
 * - Comma-separated list of file paths
 *
 * OUTPUTS (JSON to stdout):
 * {
 *   "status": "pass" | "fail",
 *   "score": number (based on max fan-in),
 *   "details": {
 *     "files": [
 *       { "file": "types.ts", "consumers": 15 },
 *       { "file": "utils.ts", "consumers": 8 }
 *     ],
 *     "maxConsumers": 15,
 *     "avgConsumers": 11.5
 *   }
 * }
 *
 * TARGET: ~50 LOC
 */

import { execSync } from "node:child_process";
import { basename, extname } from "node:path";

// =============================================================================
// TYPES
// =============================================================================

interface ScriptResult {
	status: "pass" | "fail";
	score: number;
	reason?: string;
	details: {
		files: Array<{ file: string; consumers: number }>;
		maxConsumers: number;
		avgConsumers: number;
	};
}

// =============================================================================
// TODO: Implement proper import analysis
// Reference: apps/vscode/src/engine/graph/ImportAnalyzer.ts
// =============================================================================

function countConsumers(filePath: string): number {
	try {
		// Simple grep-based approach
		// TODO: Replace with proper AST-based analysis from ImportAnalyzer.ts
		const baseName = basename(filePath, extname(filePath));
		const result = execSync(
			`grep -r "from.*['\\"].*${baseName}['\\"]" --include="*.ts" --include="*.tsx" . 2>/dev/null | wc -l`,
			{
				encoding: "utf8",
				timeout: 10000,
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		return Number.parseInt(result.trim(), 10) || 0;
	} catch {
		return 0;
	}
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

function parseArgs(): string[] {
	const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
	if (filesArg) {
		return filesArg.replace("--files=", "").split(",").filter(Boolean);
	}
	return (process.env.SNAPBACK_FILES ?? "").split(",").filter(Boolean);
}

function main(): void {
	const files = parseArgs();

	if (files.length === 0) {
		const result: ScriptResult = {
			status: "pass",
			score: 0,
			details: { files: [], maxConsumers: 0, avgConsumers: 0 },
		};
		console.log(JSON.stringify(result));
		return;
	}

	// Count consumers for each file
	const fileConsumers = files.map((file) => ({
		file,
		consumers: countConsumers(file),
	}));

	const maxConsumers = Math.max(...fileConsumers.map((f) => f.consumers));
	const avgConsumers = fileConsumers.reduce((sum, f) => sum + f.consumers, 0) / files.length;

	// Score: 1 point per consumer above threshold (5)
	const score = Math.max(0, maxConsumers - 5);

	const result: ScriptResult = {
		status: maxConsumers > 20 ? "fail" : "pass",
		score,
		details: {
			files: fileConsumers,
			maxConsumers,
			avgConsumers: Math.round(avgConsumers * 10) / 10,
		},
	};

	if (maxConsumers > 20) {
		result.reason = `High fan-in detected: ${maxConsumers} consumers`;
	}

	console.log(JSON.stringify(result));
}

main();
