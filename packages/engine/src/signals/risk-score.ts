#!/usr/bin/env npx tsx
/**
 * SnapBack Signal Script: Risk Score
 *
 * Computes overall risk score (0-10) for a set of file changes.
 * This is the PRIMARY signal used for decision making.
 *
 * Target: ~80 LOC
 *
 * SOURCE REFERENCE:
 * Extracted from: packages/core/src/risk-analyzer.ts
 *
 * Key formulas from source:
 *
 * 1. Threat scoring (line 102-106):
 *    for (const threat of fileThreats) {
 *      totalRiskScore += threat.severity * 10;
 *    }
 *
 * 2. Complexity scoring (line 109-112):
 *    if (complexity > 0.7) {
 *      totalRiskScore += 3.0;
 *    }
 *
 * 3. Change velocity scoring (line 118-121):
 *    if (changeVelocity > 0.8) {
 *      totalRiskScore += 5.0;
 *    }
 *
 * 4. Temporal velocity scoring (line 125-128):
 *    if (temporalVelocity > 0.7) {
 *      totalRiskScore += 4.0;
 *    }
 *
 * 5. Sensitive files scoring (line 132-135):
 *    if (sensitiveFiles.length > 0) {
 *      totalRiskScore += 4.0 * sensitiveFiles.length;
 *    }
 *
 * 6. Pattern triggers scoring (line 139-142):
 *    if (patternTriggers.length > 0) {
 *      totalRiskScore += 3.0 * patternTriggers.length;
 *    }
 *
 * 7. Normalization (line 151):
 *    Math.min(10, totalRiskScore / (filteredFileChanges.length + 1))
 *
 * INPUT FORMAT (via stdin):
 * {
 *   "files": [
 *     { "path": "src/index.ts", "content": "...", "lineCount": 100, "changeType": "modify" }
 *   ],
 *   "workspace": "/path/to/workspace",
 *   "timestamp": 1234567890
 * }
 *
 * OUTPUT FORMAT (to stdout):
 * {
 *   "signal": "risk-score",
 *   "value": 3.5,
 *   "metadata": {
 *     "factors": ["Sensitive files modified", "High complexity"],
 *     "threats": 0,
 *     "sensitiveFiles": 1
 *   }
 * }
 */

import type { FileChange, SignalOutput } from "../types.js";

// =============================================================================
// INPUT PARSING
// =============================================================================

interface Input {
	files: FileChange[];
	workspace: string;
	timestamp: number;
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
// RISK SCORING LOGIC
// =============================================================================

/**
 * Sensitive file patterns
 *
 * SOURCE: packages/core/src/risk-analyzer.ts, analyzeSensitiveFiles() method
 */
/** Sensitive file patterns - exported for testing */
export const SENSITIVE_PATTERNS = [
	/\.env$/i,
	/config\.json$/i,
	/package\.json$/i,
	/secret/i,
	/password/i,
	/credential/i,
	/private/i,
	/auth/i,
	/\.pem$/i,
	/\.key$/i,
];

/**
 * Pattern triggers that indicate risky changes
 *
 * SOURCE: packages/core/src/risk-analyzer.ts, detectPatternTriggers() method
 */
/** Pattern triggers that indicate risky changes - exported for testing */
export const PATTERN_TRIGGERS = [
	{ pattern: /package\.json$|package-lock\.json$|pnpm-lock\.yaml$/, label: "Dependency changes" },
	{ pattern: /webpack\.config|vite\.config|rollup\.config|tsconfig\.json$/, label: "Build config changes" },
	{ pattern: /\.sql$|schema|migration|prisma/, label: "Database schema changes" },
	{ pattern: /docker|\.ya?ml$|kubernetes|k8s/, label: "Environment config changes" },
	{ pattern: /jest\.config|vitest|playwright|cypress/, label: "Test config changes" },
];

/**
 * Check if a file is sensitive - exported for testing
 */
export function isSensitiveFile(path: string): boolean {
	const lowerPath = path.toLowerCase();
	return SENSITIVE_PATTERNS.some((p) => p.test(lowerPath));
}

/**
 * Detect pattern triggers - exported for testing
 */
export function detectTriggers(path: string): string[] {
	const lowerPath = path.toLowerCase();
	return PATTERN_TRIGGERS.filter((t) => t.pattern.test(lowerPath)).map((t) => t.label);
}

/**
 * Calculate file complexity (simplified) - exported for testing
 *
 * SOURCE: packages/core/src/risk-analyzer.ts, analyzeFileComplexity() method
 *
 * Full implementation uses:
 * - Line count normalized to 0-1 (lineCount / 1000)
 * - Function count (function definitions)
 * - Nested structures (braces count)
 * - Conditional statements (if/switch/for/while)
 * - Complex operations (try/catch/throw/eval)
 */
export function calculateComplexity(content: string, lineCount: number): number {
	// Base complexity on line count
	const lineComplexity = Math.min(1, lineCount / 1000);

	// Count complex patterns
	const functionCount = (content.match(/function\s+\w+|\w+\s*=>|\w+\s*:\s*function/g) || []).length;
	const conditionCount = (content.match(/if\s*\(|switch\s*\(|for\s*\(|while\s*\(/g) || []).length;
	const nestedCount = (content.match(/[{}]/g) || []).length;

	// Calculate pattern complexity
	let patternComplexity = 0;
	patternComplexity += Math.min(0.3, functionCount * 0.05);
	patternComplexity += Math.min(0.2, conditionCount * 0.05);
	patternComplexity += Math.min(0.2, nestedCount * 0.01);

	return Math.min(1, lineComplexity + patternComplexity);
}

/**
 * Main risk score calculation - exported for testing
 *
 * SOURCE: packages/core/src/risk-analyzer.ts, analyzeFileChanges() method
 */
export function calculateRiskScore(files: FileChange[]): { score: number; factors: string[] } {
	let totalScore = 0;
	const factors: string[] = [];

	for (const file of files) {
		// Check for sensitive files (+4.0 each)
		if (isSensitiveFile(file.path)) {
			totalScore += 4.0;
			factors.push(`Sensitive file: ${file.path}`);
		}

		// Check for pattern triggers (+3.0 each)
		const triggers = detectTriggers(file.path);
		for (const trigger of triggers) {
			totalScore += 3.0;
			if (!factors.includes(trigger)) {
				factors.push(trigger);
			}
		}

		// Check complexity (+3.0 if high)
		const complexity = calculateComplexity(file.content, file.lineCount);
		if (complexity > 0.7) {
			totalScore += 3.0;
			factors.push(`High complexity: ${file.path}`);
		}
	}

	// Normalize to 0-10 scale
	// SOURCE: Line 151 of risk-analyzer.ts
	const normalizedScore = Math.min(10, totalScore / (files.length + 1));

	return { score: normalizedScore, factors };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
	try {
		const input = await readInput();

		const { score, factors } = calculateRiskScore(input.files);

		const output: SignalOutput = {
			signal: "risk-score",
			value: Math.round(score * 100) / 100, // Round to 2 decimal places
			metadata: {
				factors,
				fileCount: input.files.length,
				sensitiveFiles: input.files.filter((f) => isSensitiveFile(f.path)).length,
			},
			timestamp: Date.now(),
		};

		// Output JSON to stdout
		console.log(JSON.stringify(output));
		process.exit(0);
	} catch (error) {
		console.error(
			JSON.stringify({
				signal: "risk-score",
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
