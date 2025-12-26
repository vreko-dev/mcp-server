/**
 * Syntax Analyzer
 *
 * Uses @typescript-eslint/parser for real AST-based syntax validation.
 * Replaces bracket counting with proper parsing.
 *
 * @module analysis/ast/SyntaxAnalyzer
 */

import * as eslintParser from "@typescript-eslint/parser";
import type { AnalysisContext, AnalysisIssue, Analyzer, AnalyzerResult } from "../types.js";

interface ParseError {
	message: string;
	line: number;
	column: number;
}

/**
 * AST-based syntax analyzer using @typescript-eslint/parser
 */
export class SyntaxAnalyzer implements Analyzer {
	readonly id = "syntax";
	readonly name = "Syntax Analysis";
	readonly filePatterns = ["*.ts", "*.tsx", "*.js", "*.jsx"];

	async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
		const startTime = performance.now();
		const issues: AnalysisIssue[] = [];
		let filesAnalyzed = 0;
		let nodesVisited = 0;
		const parseErrors: string[] = [];

		for (const [file, content] of context.contents) {
			if (!this.shouldAnalyzeFile(file)) continue;
			filesAnalyzed++;

			try {
				// Parse with @typescript-eslint/parser
				const ast = eslintParser.parse(content, {
					sourceType: "module",
					ecmaFeatures: {
						jsx: file.endsWith(".tsx") || file.endsWith(".jsx"),
					},
					ecmaVersion: "latest",
					// Error recovery mode to get partial AST even with errors
					errorOnUnknownASTType: false,
				});

				// Count nodes for coverage metric
				nodesVisited += this.countNodes(ast);

				// Check for syntax issues that the parser didn't catch but still parsed
				this.checkSyntaxPatterns(content, file, issues);
			} catch (error) {
				// Parse error - this is a real syntax issue
				const parseError = this.extractParseError(error);
				parseErrors.push(`${file}: ${parseError.message}`);

				issues.push({
					id: `syntax/parse-error/${file}/${parseError.line}`,
					severity: "critical",
					type: "SYNTAX_ERROR",
					message: parseError.message,
					file,
					line: parseError.line,
					column: parseError.column,
					fix: "Fix the syntax error to allow parsing",
				});
			}
		}

		return {
			analyzer: this.id,
			success: true,
			issues,
			coverage: filesAnalyzed / Math.max(context.files.length, 1),
			duration: performance.now() - startTime,
			metadata: {
				filesAnalyzed,
				nodesVisited,
				parseErrors,
			},
		};
	}

	shouldRun(context: AnalysisContext): boolean {
		return context.files.some((f) => this.shouldAnalyzeFile(f));
	}

	private shouldAnalyzeFile(file: string): boolean {
		const ext = file.split(".").pop()?.toLowerCase();
		return ["ts", "tsx", "js", "jsx"].includes(ext || "");
	}

	/**
	 * Extract parse error information from parser exception
	 */
	private extractParseError(error: unknown): ParseError {
		if (error instanceof Error) {
			// @typescript-eslint/parser errors have line/column info
			const match = error.message.match(/\((\d+):(\d+)\)/);
			if (match) {
				return {
					message: error.message,
					line: Number.parseInt(match[1], 10),
					column: Number.parseInt(match[2], 10),
				};
			}
			return {
				message: error.message,
				line: 1,
				column: 1,
			};
		}
		return {
			message: String(error),
			line: 1,
			column: 1,
		};
	}

	/**
	 * Count AST nodes for coverage metrics
	 */
	private countNodes(node: unknown): number {
		if (!node || typeof node !== "object") return 0;

		let count = 1;
		for (const key of Object.keys(node)) {
			const value = (node as Record<string, unknown>)[key];
			if (Array.isArray(value)) {
				for (const item of value) {
					count += this.countNodes(item);
				}
			} else if (value && typeof value === "object" && "type" in value) {
				count += this.countNodes(value);
			}
		}
		return count;
	}

	/**
	 * Check for additional syntax patterns that may indicate issues
	 */
	private checkSyntaxPatterns(content: string, file: string, issues: AnalysisIssue[]): void {
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			// Check for double semicolons
			if (line.includes(";;")) {
				issues.push({
					id: `syntax/double-semicolon/${file}/${lineNum}`,
					severity: "low",
					type: "SYNTAX_WARNING",
					message: "Double semicolon detected",
					file,
					line: lineNum,
					column: line.indexOf(";;") + 1,
					fix: "Remove extra semicolon",
					snippet: line.trim(),
				});
			}

			// Check for console.assert with empty second argument
			if (/console\.assert\([^,]+,\s*\)/.test(line)) {
				issues.push({
					id: `syntax/empty-assert/${file}/${lineNum}`,
					severity: "medium",
					type: "SYNTAX_WARNING",
					message: "console.assert with empty message",
					file,
					line: lineNum,
					fix: "Add assertion message for debugging",
					snippet: line.trim(),
				});
			}

			// Check for likely typos: = instead of === in conditions
			if (/if\s*\([^=]*=\s*[^=]/.test(line) && !/if\s*\([^=]*[=!]==/.test(line)) {
				// Only warn if it looks like an assignment in a condition
				const assignMatch = line.match(/if\s*\(\s*(\w+)\s*=\s*[^=]/);
				if (assignMatch) {
					issues.push({
						id: `syntax/assignment-in-condition/${file}/${lineNum}`,
						severity: "medium",
						type: "SYNTAX_WARNING",
						message: "Possible assignment in condition (did you mean ===?)",
						file,
						line: lineNum,
						fix: "Use === for comparison, or wrap in extra parentheses if intentional",
						snippet: line.trim(),
					});
				}
			}
		}
	}
}
