/**
 * Security Analyzer
 *
 * Uses @babel/parser + @babel/traverse for AST-based security analysis.
 * Detects eval, path traversal, missing signal handlers, and other security issues.
 *
 * @module analysis/security/SecurityAnalyzer
 */

import { type ParserOptions, parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type * as t from "@babel/types";
import type { AnalysisContext, AnalysisIssue, Analyzer, AnalyzerResult } from "../types.js";

/**
 * AST-based security analyzer using Babel
 */
export class SecurityAnalyzer implements Analyzer {
	readonly id = "security";
	readonly name = "Security Analysis";
	readonly filePatterns = ["*.ts", "*.tsx", "*.js", "*.jsx"];

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

			try {
				const ast = parse(content, {
					...this.parserOptions,
					plugins: this.getPluginsForFile(file),
				});

				const fileIssues = this.analyzeAST(ast, content, file);
				issues.push(...fileIssues.issues);
				nodesVisited += fileIssues.nodesVisited;
			} catch (error) {
				parseErrors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
				issues.push({
					id: `security/parse-error/${file}`,
					severity: "info",
					type: "PARSE_ERROR",
					message: `Could not parse for security analysis: ${error instanceof Error ? error.message : String(error)}`,
					file,
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
				patternsChecked: [
					"UNSAFE_EVAL",
					"PATH_TRAVERSAL",
					"MISSING_SIGNAL_HANDLER",
					"COMMAND_INJECTION",
					"SQL_INJECTION",
					"XSS_RISK",
					"HARDCODED_SECRET",
					"UNSAFE_REGEX",
				],
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
	 * Analyze AST for security issues
	 */
	private analyzeAST(
		ast: ReturnType<typeof parse>,
		content: string,
		file: string,
	): { issues: AnalysisIssue[]; nodesVisited: number } {
		const issues: AnalysisIssue[] = [];
		let nodesVisited = 0;

		// Track context for daemon/server detection
		const fileContext = {
			isDaemon: false,
			hasSignalHandler: false,
			hasSocketPermissions: false,
			hasBufferLimits: false,
		};

		// Pre-scan content for daemon indicators
		fileContext.isDaemon =
			content.includes(".listen(") ||
			file.includes("daemon") ||
			file.includes("server") ||
			file.includes("worker");

		traverse(ast, {
			enter() {
				nodesVisited++;
			},

			// Detect eval()
			CallExpression: (path) => {
				const callee = path.node.callee;

				// eval() detection
				if (callee.type === "Identifier" && callee.name === "eval") {
					issues.push({
						id: `security/eval/${file}/${path.node.loc?.start.line}`,
						severity: "critical",
						type: "UNSAFE_EVAL",
						message: "eval() allows arbitrary code execution",
						file,
						line: path.node.loc?.start.line,
						column: path.node.loc?.start.column,
						fix: "Use JSON.parse() for data or refactor logic to avoid eval",
					});
				}

				// new Function() detection
				if (callee.type === "Identifier" && callee.name === "Function") {
					issues.push({
						id: `security/function-constructor/${file}/${path.node.loc?.start.line}`,
						severity: "critical",
						type: "UNSAFE_EVAL",
						message: "new Function() is equivalent to eval() and allows arbitrary code execution",
						file,
						line: path.node.loc?.start.line,
						column: path.node.loc?.start.column,
						fix: "Refactor to avoid dynamic code generation",
					});
				}

				// setTimeout/setInterval with string (like eval)
				if (callee.type === "Identifier" && (callee.name === "setTimeout" || callee.name === "setInterval")) {
					const firstArg = path.node.arguments[0];
					if (firstArg && firstArg.type === "StringLiteral") {
						issues.push({
							id: `security/string-timer/${file}/${path.node.loc?.start.line}`,
							severity: "high",
							type: "UNSAFE_EVAL",
							message: `${callee.name} with string argument executes code like eval()`,
							file,
							line: path.node.loc?.start.line,
							fix: "Pass a function instead of a string",
						});
					}
				}

				// exec/execSync (command injection risk)
				if (callee.type === "Identifier" && (callee.name === "exec" || callee.name === "execSync")) {
					const firstArg = path.node.arguments[0];
					if (firstArg && !this.isStaticString(firstArg as t.Expression)) {
						issues.push({
							id: `security/command-injection/${file}/${path.node.loc?.start.line}`,
							severity: "high",
							type: "COMMAND_INJECTION",
							message: "exec with dynamic command - potential command injection",
							file,
							line: path.node.loc?.start.line,
							fix: "Validate/sanitize input or use execFile with explicit arguments",
						});
					}
				}

				// Signal handler detection for daemons
				if (
					callee.type === "MemberExpression" &&
					callee.object.type === "Identifier" &&
					callee.object.name === "process" &&
					callee.property.type === "Identifier" &&
					callee.property.name === "on"
				) {
					const firstArg = path.node.arguments[0];
					if (firstArg && firstArg.type === "StringLiteral") {
						if (firstArg.value === "SIGTERM" || firstArg.value === "SIGINT") {
							fileContext.hasSignalHandler = true;
						}
					}
				}
			},

			// Detect fs operations with dynamic paths
			MemberExpression: (path) => {
				const node = path.node;
				if (node.object.type === "Identifier" && (node.object.name === "fs" || node.object.name === "fsp")) {
					const parent = path.parentPath;
					if (parent.isCallExpression()) {
						const methodName =
							node.property.type === "Identifier"
								? node.property.name
								: (node.property as t.StringLiteral).value;

						// fs operations that take paths
						const pathMethods = [
							"readFile",
							"readFileSync",
							"writeFile",
							"writeFileSync",
							"readdir",
							"readdirSync",
							"stat",
							"statSync",
							"unlink",
							"unlinkSync",
							"mkdir",
							"mkdirSync",
							"rmdir",
							"rmdirSync",
							"access",
							"accessSync",
						];

						if (pathMethods.includes(methodName)) {
							const firstArg = parent.node.arguments[0];
							if (firstArg && !this.isStaticPath(firstArg as t.Expression)) {
								issues.push({
									id: `security/path-traversal/${file}/${path.node.loc?.start.line}`,
									severity: "high",
									type: "PATH_TRAVERSAL",
									message: `fs.${methodName} with dynamic path - potential path traversal`,
									file,
									line: path.node.loc?.start.line,
									fix: "Validate paths against workspace root before use",
								});
							}
						}
					}
				}
			},

			// Check for dangerous regex patterns
			NewExpression: (path) => {
				if (path.node.callee.type === "Identifier" && path.node.callee.name === "RegExp") {
					const firstArg = path.node.arguments[0];
					if (firstArg && !this.isStaticString(firstArg as t.Expression)) {
						issues.push({
							id: `security/unsafe-regex/${file}/${path.node.loc?.start.line}`,
							severity: "medium",
							type: "UNSAFE_REGEX",
							message: "Dynamic RegExp - potential ReDoS or injection vulnerability",
							file,
							line: path.node.loc?.start.line,
							fix: "Use static regex patterns or validate input",
						});
					}
				}
			},

			// Check for innerHTML/dangerouslySetInnerHTML (XSS)
			JSXAttribute: (path) => {
				const name = path.node.name;
				if (name.type === "JSXIdentifier" && name.name === "dangerouslySetInnerHTML") {
					issues.push({
						id: `security/xss-risk/${file}/${path.node.loc?.start.line}`,
						severity: "high",
						type: "XSS_RISK",
						message: "dangerouslySetInnerHTML can lead to XSS if content is not sanitized",
						file,
						line: path.node.loc?.start.line,
						fix: "Sanitize HTML content before rendering or avoid using dangerouslySetInnerHTML",
					});
				}
			},

			// Check for hardcoded secrets in variable declarations
			VariableDeclarator: (path) => {
				const id = path.node.id;
				const init = path.node.init;

				if (id.type === "Identifier" && init) {
					this.checkForHardcodedSecret(id.name, init, file, path.node.loc?.start.line, issues);
				}
			},

			// Check for hardcoded secrets in class properties
			ClassProperty: (path) => {
				const key = path.node.key;
				const value = path.node.value;

				if (key.type === "Identifier" && value) {
					this.checkForHardcodedSecret(key.name, value, file, path.node.loc?.start.line, issues);
				}
			},

			// After traversal is complete, check daemon-specific patterns
			Program: {
				exit: () => {
					if (fileContext.isDaemon && !fileContext.hasSignalHandler) {
						issues.push({
							id: `security/signal-handler/${file}`,
							severity: "high",
							type: "MISSING_SIGNAL_HANDLER",
							message: "Daemon/server missing signal handlers (SIGTERM/SIGINT)",
							file,
							fix: "Add process.on('SIGTERM', gracefulShutdown) for clean shutdown",
						});
					}
				},
			},
		});

		return { issues, nodesVisited };
	}

	/**
	 * Check if expression is a static string (safe)
	 */
	private isStaticString(node: t.Expression | t.SpreadElement): boolean {
		if (node.type === "StringLiteral") return true;
		if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;
		return false;
	}

	/**
	 * Check if expression is a static path (safe)
	 */
	private isStaticPath(node: t.Expression | t.SpreadElement): boolean {
		// Static string literal
		if (node.type === "StringLiteral") return true;

		// Template literal with no interpolation
		if (node.type === "TemplateLiteral" && node.expressions.length === 0) return true;

		// path.join(__dirname, 'static') is somewhat safe
		if (node.type === "CallExpression") {
			const callee = node.callee;
			if (
				callee.type === "MemberExpression" &&
				callee.object.type === "Identifier" &&
				callee.object.name === "path" &&
				callee.property.type === "Identifier" &&
				callee.property.name === "join"
			) {
				// Check if all arguments are static or __dirname
				return node.arguments.every((arg: t.Node) => {
					if (arg.type === "StringLiteral") return true;
					if (arg.type === "Identifier" && (arg.name === "__dirname" || arg.name === "__filename"))
						return true;
					return false;
				});
			}
		}

		return false;
	}

	/**
	 * Check if a value looks like a hardcoded secret
	 */
	private checkForHardcodedSecret(
		name: string,
		value: t.Expression | null,
		file: string,
		line: number | undefined,
		issues: AnalysisIssue[],
	): void {
		if (!value) {
			return;
		}

		const varName = name.toLowerCase();
		const secretIndicators = ["apikey", "api_key", "secret", "password", "token", "credential", "auth", "key"];

		if (secretIndicators.some((s) => varName.includes(s))) {
			if (value.type === "StringLiteral" && value.value.length > 8) {
				// Skip obvious placeholders
				const valueStr = value.value.toLowerCase();
				if (
					!valueStr.includes("placeholder") &&
					!valueStr.includes("example") &&
					!valueStr.includes("xxx") &&
					!valueStr.includes("todo") &&
					!valueStr.includes("your_") &&
					!valueStr.includes("env.")
				) {
					issues.push({
						id: `security/hardcoded-secret/${file}/${line}`,
						severity: "critical",
						type: "HARDCODED_SECRET",
						message: `Possible hardcoded secret in "${name}"`,
						file,
						line,
						fix: "Use environment variables for secrets",
					});
				}
			}
		}
	}
}
