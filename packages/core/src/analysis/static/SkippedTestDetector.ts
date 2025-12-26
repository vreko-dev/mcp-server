/**
 * Skipped Test Detector
 *
 * Uses @babel/parser to detect skipped tests (describe.skip, it.skip, test.skip)
 * in test files. This helps AI agents identify RED PHASE TDD tests that may
 * be ready to enable.
 *
 * @module analysis/static/SkippedTestDetector
 */

import { parse } from "@babel/parser";
import type { Node } from "@babel/types";

export interface SkippedTest {
	/** Test type: describe, it, or test */
	type: "describe" | "it" | "test";
	/** Test name if extractable */
	name?: string;
	/** Line number (1-indexed) */
	line: number;
	/** Column number (1-indexed) */
	column: number;
	/** File path */
	file: string;
}

export interface SkippedTestResult {
	/** File analyzed */
	file: string;
	/** Skipped tests found */
	skipped: SkippedTest[];
	/** Whether parsing succeeded */
	parsed: boolean;
	/** Parse error if any */
	error?: string;
}

/**
 * Detect skipped tests in a file's source code
 *
 * @param code - Source code to analyze
 * @param filePath - Path to file (for error reporting)
 * @returns Detection result with skipped tests
 *
 * @example
 * ```typescript
 * const result = detectSkippedTests(`
 *   describe.skip("Feature", () => {
 *     it("should work", () => {});
 *   });
 * `, "feature.test.ts");
 *
 * // result.skipped = [{ type: "describe", name: "Feature", line: 2, ... }]
 * ```
 */
export function detectSkippedTests(code: string, filePath: string): SkippedTestResult {
	const skipped: SkippedTest[] = [];

	try {
		const ast = parse(code, {
			sourceType: "module",
			plugins: ["typescript", "jsx"],
			errorRecovery: true,
		});

		// Simple AST traversal without @babel/traverse (to avoid extra dependency in MCP)
		function visit(node: Node) {
			if (node.type === "CallExpression") {
				const callee = node.callee;

				// Check for .skip pattern: describe.skip, it.skip, test.skip
				if (
					callee.type === "MemberExpression" &&
					callee.property.type === "Identifier" &&
					callee.property.name === "skip" &&
					callee.object.type === "Identifier"
				) {
					const testType = callee.object.name;
					if (testType === "describe" || testType === "it" || testType === "test") {
						// Try to extract test name from first argument
						let name: string | undefined;
						if (node.arguments.length > 0) {
							const firstArg = node.arguments[0];
							if (firstArg.type === "StringLiteral") {
								name = firstArg.value;
							} else if (firstArg.type === "TemplateLiteral" && firstArg.quasis.length === 1) {
								name = firstArg.quasis[0].value.raw;
							}
						}

						skipped.push({
							type: testType as "describe" | "it" | "test",
							name,
							line: node.loc?.start.line ?? 0,
							column: node.loc?.start.column ?? 0,
							file: filePath,
						});
					}
				}

				// Also check for skip() as method call: describe("name", () => {}).skip
				// This is less common but supported by some frameworks
			}

			// Recursively visit all properties that could contain nodes
			for (const key of Object.keys(node)) {
				const value = (node as unknown as Record<string, unknown>)[key];
				if (value && typeof value === "object") {
					if (Array.isArray(value)) {
						for (const item of value) {
							if (item && typeof item === "object" && "type" in item) {
								visit(item as Node);
							}
						}
					} else if ("type" in value) {
						visit(value as Node);
					}
				}
			}
		}

		visit(ast.program as unknown as Node);

		return { file: filePath, skipped, parsed: true };
	} catch (error) {
		return {
			file: filePath,
			skipped: [],
			parsed: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Analyze multiple files for skipped tests
 *
 * @param files - Map of file path to content
 * @returns Array of results for each file
 */
export function analyzeSkippedTests(files: Map<string, string>): SkippedTestResult[] {
	const results: SkippedTestResult[] = [];

	for (const [filePath, content] of files) {
		// Only analyze test files
		if (filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__")) {
			results.push(detectSkippedTests(content, filePath));
		}
	}

	return results;
}

/**
 * Get summary of skipped tests across all files
 */
export function getSkippedTestSummary(results: SkippedTestResult[]): {
	totalSkipped: number;
	byType: { describe: number; it: number; test: number };
	filesWithSkipped: string[];
} {
	const summary = {
		totalSkipped: 0,
		byType: { describe: 0, it: 0, test: 0 },
		filesWithSkipped: [] as string[],
	};

	for (const result of results) {
		if (result.skipped.length > 0) {
			summary.filesWithSkipped.push(result.file);
			summary.totalSkipped += result.skipped.length;
			for (const test of result.skipped) {
				summary.byType[test.type]++;
			}
		}
	}

	return summary;
}
