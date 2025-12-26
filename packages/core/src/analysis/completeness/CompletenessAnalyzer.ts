/**
 * Completeness Analyzer
 *
 * Detects incomplete implementations: TODO comments, empty catch blocks,
 * NotImplementedError, empty function bodies, placeholder code.
 *
 * Uses @babel/parser + @babel/traverse for AST-based detection.
 *
 * @module analysis/completeness/CompletenessAnalyzer
 */

import { type ParserOptions, parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { AnalysisContext, AnalysisIssue, Analyzer, AnalyzerResult } from "../types.js";

/**
 * AST-based completeness analyzer
 */
export class CompletenessAnalyzer implements Analyzer {
	readonly id = "completeness";
	readonly name = "Completeness Detection";
	readonly filePatterns = ["*.ts", "*.tsx", "*.js", "*.jsx"];

	private readonly todoPatterns = [
		/\/\/\s*TODO\b/gi,
		/\/\/\s*FIXME\b/gi,
		/\/\/\s*XXX\b/gi,
		/\/\/\s*HACK\b/gi,
		/\/\*\s*TODO\b/gi,
		/\/\*\s*FIXME\b/gi,
	];

	private readonly placeholderPatterns = [
		/throw\s+new\s+Error\s*\(\s*['"`].*not\s*implemented.*['"`]\s*\)/gi,
		/throw\s+new\s+Error\s*\(\s*['"`]TODO.*['"`]\s*\)/gi,
		/NotImplementedError/gi,
		/throw\s+new\s+Error\s*\(\s*['"`]STUB['"`]\s*\)/gi,
	];

	private readonly parserOptions: ParserOptions = {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
		errorRecovery: true,
	};

	async analyze(context: AnalysisContext): Promise<AnalyzerResult> {
		const startTime = performance.now();
		const issues: AnalysisIssue[] = [];
		let filesAnalyzed = 0;
		let nodesVisited = 0;
		const parseErrors: string[] = [];

		for (const [file, content] of context.contents) {
			if (!this.shouldAnalyzeFile(file)) continue;
			filesAnalyzed++;

			// Line-based detection for comments
			this.checkTodoComments(content, file, issues);
			this.checkPlaceholderPatterns(content, file, issues);

			// AST-based detection for structural issues
			try {
				const ast = parse(content, {
					...this.parserOptions,
					plugins: this.getPluginsForFile(file),
				});

				const result = this.analyzeAST(ast, content, file);
				issues.push(...result.issues);
				nodesVisited += result.nodesVisited;
			} catch (error) {
				parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
				// Parsing errors are handled by SyntaxAnalyzer, don't duplicate
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
				patternsChecked: ["TODO", "FIXME", "EMPTY_CATCH", "EMPTY_FUNCTION", "NOT_IMPLEMENTED", "PLACEHOLDER"],
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

	private getPluginsForFile(file: string): ParserOptions["plugins"] {
		const plugins: ParserOptions["plugins"] = ["typescript"];
		if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
			plugins.push("jsx");
		}
		return plugins;
	}

	/**
	 * Check for TODO/FIXME comments
	 */
	private checkTodoComments(content: string, file: string, issues: AnalysisIssue[]): void {
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			for (const pattern of this.todoPatterns) {
				// Reset lastIndex for global patterns
				pattern.lastIndex = 0;

				if (pattern.test(line)) {
					// Extract the TODO content
					const todoContent = line.trim().slice(0, 100);

					issues.push({
						id: `completeness/todo/${file}/${lineNum}`,
						severity: "medium",
						type: "INCOMPLETE_IMPLEMENTATION",
						message: `TODO/FIXME: ${todoContent}`,
						file,
						line: lineNum,
						snippet: todoContent,
					});
					break; // Only report once per line
				}
			}
		}
	}

	/**
	 * Check for placeholder/stub patterns
	 */
	private checkPlaceholderPatterns(content: string, file: string, issues: AnalysisIssue[]): void {
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			for (const pattern of this.placeholderPatterns) {
				pattern.lastIndex = 0;

				if (pattern.test(line)) {
					issues.push({
						id: `completeness/placeholder/${file}/${lineNum}`,
						severity: "high",
						type: "INCOMPLETE_IMPLEMENTATION",
						message: 'Placeholder implementation: "not implemented" or similar',
						file,
						line: lineNum,
						fix: "Implement the functionality or remove the placeholder",
						snippet: line.trim().slice(0, 100),
					});
					break;
				}
			}
		}
	}

	/**
	 * AST-based detection of empty/incomplete code
	 */
	private analyzeAST(
		ast: ReturnType<typeof parse>,
		_content: string,
		file: string,
	): { issues: AnalysisIssue[]; nodesVisited: number } {
		const issues: AnalysisIssue[] = [];
		let nodesVisited = 0;

		traverse(ast, {
			enter() {
				nodesVisited++;
			},

			// Empty catch blocks
			CatchClause: (path) => {
				const body = path.node.body;
				if (body.body.length === 0) {
					issues.push({
						id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
						severity: "medium",
						type: "INCOMPLETE_IMPLEMENTATION",
						message: "Empty catch block - errors silently swallowed",
						file,
						line: path.node.loc?.start.line,
						fix: "Add error handling, rethrow, or log the error",
					});
				} else if (body.body.length === 1) {
					// Check for comment-only catch blocks
					const stmt = body.body[0];
					if (stmt.type === "EmptyStatement") {
						issues.push({
							id: `completeness/empty-catch/${file}/${path.node.loc?.start.line}`,
							severity: "medium",
							type: "INCOMPLETE_IMPLEMENTATION",
							message: "Catch block contains only empty statement",
							file,
							line: path.node.loc?.start.line,
							fix: "Add proper error handling",
						});
					}
				}
			},

			// Empty function bodies (excluding type declarations and interface methods)
			FunctionDeclaration: (path) => {
				if (path.node.body.body.length === 0) {
					const funcName = path.node.id?.name || "anonymous";
					// Skip if it's likely a stub for interface implementation
					const hasOverrideDecorator = false; // Would need to check decorators

					if (!hasOverrideDecorator) {
						issues.push({
							id: `completeness/empty-fn/${file}/${path.node.loc?.start.line}`,
							severity: "medium",
							type: "INCOMPLETE_IMPLEMENTATION",
							message: `Empty function body: ${funcName}()`,
							file,
							line: path.node.loc?.start.line,
							fix: "Implement the function or mark as abstract/stub if intentional",
						});
					}
				}
			},

			// Empty method bodies
			ClassMethod: (path) => {
				// Skip abstract methods, getters with explicit return, etc.
				if (path.node.abstract) return;
				if (path.node.kind === "get" || path.node.kind === "set") return;

				const body = path.node.body;
				if (body && body.body.length === 0) {
					const methodName = path.node.key.type === "Identifier" ? path.node.key.name : "anonymous";

					// Skip constructor with only super() call
					if (methodName === "constructor") return;

					issues.push({
						id: `completeness/empty-method/${file}/${path.node.loc?.start.line}`,
						severity: "medium",
						type: "INCOMPLETE_IMPLEMENTATION",
						message: `Empty method body: ${methodName}()`,
						file,
						line: path.node.loc?.start.line,
						fix: "Implement the method or mark as abstract if intentional",
					});
				}
			},

			// Arrow functions that just throw or are empty (might be intentional)
			ArrowFunctionExpression: (path) => {
				const body = path.node.body;

				// Check if it's a block body that's empty
				if (body.type === "BlockStatement" && body.body.length === 0) {
					// Only warn if it's assigned to a variable (likely meant to be implemented)
					const parent = path.parent;
					if (parent.type === "VariableDeclarator") {
						const varName = parent.id.type === "Identifier" ? parent.id.name : "anonymous";
						issues.push({
							id: `completeness/empty-arrow/${file}/${path.node.loc?.start.line}`,
							severity: "low",
							type: "INCOMPLETE_IMPLEMENTATION",
							message: `Empty arrow function: ${varName}`,
							file,
							line: path.node.loc?.start.line,
							fix: "Implement the function or use () => {} if intentionally empty",
						});
					}
				}
			},

			// Check for console.log that might be debug code
			CallExpression: (path) => {
				const callee = path.node.callee;
				if (
					callee.type === "MemberExpression" &&
					callee.object.type === "Identifier" &&
					callee.object.name === "console" &&
					callee.property.type === "Identifier" &&
					callee.property.name === "log"
				) {
					// Check if it looks like debug code
					const firstArg = path.node.arguments[0];
					if (firstArg && firstArg.type === "StringLiteral") {
						const msg = firstArg.value.toLowerCase();
						if (
							msg.includes("debug") ||
							msg.includes("test") ||
							msg.includes("todo") ||
							msg.includes("remove")
						) {
							issues.push({
								id: `completeness/debug-log/${file}/${path.node.loc?.start.line}`,
								severity: "low",
								type: "DEBUG_CODE",
								message: `Debug console.log left in code: "${firstArg.value.slice(0, 50)}"`,
								file,
								line: path.node.loc?.start.line,
								fix: "Remove debug logging before commit",
							});
						}
					}
				}
			},
		});

		return { issues, nodesVisited };
	}
}
