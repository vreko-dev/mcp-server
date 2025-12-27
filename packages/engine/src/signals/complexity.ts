#!/usr/bin/env npx tsx
/**
 * SnapBack Signal Script: Complexity
 *
 * Computes aggregate complexity score for file changes.
 * Used to track complexity creep over a session.
 *
 * Target: ~60 LOC
 *
 * SOURCE REFERENCE:
 * Extracted from: packages/core/src/risk-analyzer.ts, analyzeFileComplexity() method
 *
 * The original complexity calculation (lines 275-315):
 *
 * 1. Base complexity on line count:
 *    const lineComplexity = Math.min(1, fileChange.lineCount / 1000);
 *
 * 2. Function definitions:
 *    const functionCount = (content.match(/function\s+\w+|\w+\s*=>|\w+\s*:\s*function/g) || []).length;
 *    patternComplexity += Math.min(0.3, functionCount * 0.05);
 *
 * 3. Nested structures:
 *    const nestedCount = (content.match(/[{}]/g) || []).length;
 *    patternComplexity += Math.min(0.2, nestedCount * 0.01);
 *
 * 4. Conditional statements:
 *    const conditionCount = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;
 *    patternComplexity += Math.min(0.2, conditionCount * 0.05);
 *
 * 5. Complex operations:
 *    const complexOps = (content.match(/try\s*{|catch\s*\(|throw\s+new|eval\s*\(|setTimeout|setInterval/g) || []).length;
 *    patternComplexity += Math.min(0.3, complexOps * 0.1);
 *
 * INPUT FORMAT (via stdin):
 * {
 *   "files": [
 *     { "path": "src/index.ts", "content": "...", "lineCount": 100 }
 *   ]
 * }
 *
 * OUTPUT FORMAT (to stdout):
 * {
 *   "signal": "complexity",
 *   "value": 0.45,
 *   "metadata": {
 *     "avgComplexity": 0.45,
 *     "maxComplexity": 0.72,
 *     "highComplexityFiles": ["src/bigFile.ts"]
 *   }
 * }
 */

import type { FileChange, SignalOutput } from "../types.js";

// =============================================================================
// INPUT PARSING
// =============================================================================

interface Input {
	files: FileChange[];
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
// COMPLEXITY CALCULATION
// =============================================================================

/** File input for complexity calculation - exported for testing */
export interface ComplexityInput {
	files: FileChange[];
}

/** Complexity result for a single file - exported for testing */
export interface FileComplexityResult {
	path: string;
	complexity: number;
}

/** Aggregate complexity result - exported for testing */
export interface ComplexityResult {
	avgComplexity: number;
	maxComplexity: number;
	highComplexityFiles: string[];
	fileCount: number;
	value: number;
}

/**
 * Calculate complexity for a single file
 *
 * SOURCE: packages/core/src/risk-analyzer.ts, analyzeFileComplexity() (lines 275-315)
 *
 * Returns value 0-1 where:
 * - 0.0-0.3 = Low complexity
 * - 0.3-0.5 = Medium complexity
 * - 0.5-0.7 = High complexity
 * - 0.7-1.0 = Very high complexity
 *
 * Exported for direct testing
 */
export function calculateFileComplexity(content: string, lineCount: number): number {
	// Base complexity on line count (normalized to 0-1)
	const lineComplexity = Math.min(1, lineCount / 1000);

	// Count function definitions
	const functionCount = (content.match(/function\s+\w+|\w+\s*=>|\w+\s*:\s*function/g) || []).length;

	// Count nested structures (braces)
	const nestedCount = (content.match(/[{}]/g) || []).length;

	// Count conditional statements
	const conditionCount = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;

	// Count complex operations
	const complexOps = (
		content.match(/try\s*{|catch\s*\(|throw\s+new|eval\s*\(|setTimeout\s*\(|setInterval\s*\(/g) || []
	).length;

	// Calculate pattern complexity
	let patternComplexity = 0;
	patternComplexity += Math.min(0.3, functionCount * 0.05);
	patternComplexity += Math.min(0.2, nestedCount * 0.01);
	patternComplexity += Math.min(0.2, conditionCount * 0.05);
	patternComplexity += Math.min(0.3, complexOps * 0.1);

	// Combine and cap at 1.0
	return Math.min(1, lineComplexity + patternComplexity);
}

/**
 * Calculate aggregate complexity for multiple files - exported for testing
 */
export function calculateComplexityAggregate(files: FileChange[]): ComplexityResult {
	if (files.length === 0) {
		return {
			avgComplexity: 0,
			maxComplexity: 0,
			highComplexityFiles: [],
			fileCount: 0,
			value: 0,
		};
	}

	const complexities = files.map((file) => ({
		path: file.path,
		complexity: calculateFileComplexity(file.content, file.lineCount),
	}));

	const avgComplexity = complexities.reduce((sum, c) => sum + c.complexity, 0) / complexities.length;
	const maxComplexity = Math.max(...complexities.map((c) => c.complexity));
	const highComplexityFiles = complexities.filter((c) => c.complexity > 0.7).map((c) => c.path);

	return {
		avgComplexity: Math.round(avgComplexity * 100) / 100,
		maxComplexity: Math.round(maxComplexity * 100) / 100,
		highComplexityFiles,
		fileCount: files.length,
		value: Math.round(avgComplexity * 100) / 100,
	};
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
	try {
		const input = await readInput();

		// Skip if no files
		if (input.files.length === 0) {
			const output: SignalOutput = {
				signal: "complexity",
				value: 0,
				metadata: {
					avgComplexity: 0,
					maxComplexity: 0,
					highComplexityFiles: [],
				},
				timestamp: Date.now(),
			};
			console.log(JSON.stringify(output));
			process.exit(0);
		}

		// Calculate complexity for each file
		const complexities = input.files.map((file) => ({
			path: file.path,
			complexity: calculateFileComplexity(file.content, file.lineCount),
		}));

		// Aggregate metrics
		const avgComplexity = complexities.reduce((sum, c) => sum + c.complexity, 0) / complexities.length;
		const maxComplexity = Math.max(...complexities.map((c) => c.complexity));
		const highComplexityFiles = complexities.filter((c) => c.complexity > 0.7).map((c) => c.path);

		const output: SignalOutput = {
			signal: "complexity",
			value: Math.round(avgComplexity * 100) / 100,
			metadata: {
				avgComplexity: Math.round(avgComplexity * 100) / 100,
				maxComplexity: Math.round(maxComplexity * 100) / 100,
				highComplexityFiles,
				fileCount: input.files.length,
			},
			timestamp: Date.now(),
		};

		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (error) {
		console.error(
			JSON.stringify({
				signal: "complexity",
				value: -1,
				error: error instanceof Error ? error.message : String(error),
			}),
		);
		process.exit(1);
	}
}

// Only run main() when executed directly (CLI mode), not when imported
if (typeof require !== "undefined" && require.main === module) {
	main();
} else if (typeof import.meta !== "undefined" && (import.meta as any).url === `file://${process.argv[1]}`) {
	main();
}
