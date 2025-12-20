/**
 * Validation Layers
 *
 * Individual validation layers that run in parallel.
 * Each layer checks for a specific category of issues.
 */

import type { Issue, ValidationLayer } from "../../types/config.js";

/**
 * Helper to find line number for an issue
 */
function findLine(code: string, search: string): number {
	if (!code) {
		return 0;
	}
	const lines = code.split("\n");
	return lines.findIndex((l) => l.includes(search)) + 1;
}

/**
 * Layer 1: Syntax Validation
 * Checks for basic syntax issues
 */
export class SyntaxLayer implements ValidationLayer {
	name = "syntax";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null check
		if (!code) {
			return { issues };
		}

		// Check for unclosed brackets/parens
		const openBrackets = (code.match(/\{/g) || []).length;
		const closeBrackets = (code.match(/\}/g) || []).length;
		if (openBrackets !== closeBrackets) {
			issues.push({
				severity: "critical",
				type: "SYNTAX_ERROR",
				message: `Mismatched braces: ${openBrackets} open, ${closeBrackets} close`,
				fix: "Balance opening and closing braces",
			});
		}

		const openParens = (code.match(/\(/g) || []).length;
		const closeParens = (code.match(/\)/g) || []).length;
		if (openParens !== closeParens) {
			issues.push({
				severity: "critical",
				type: "SYNTAX_ERROR",
				message: `Mismatched parentheses: ${openParens} open, ${closeParens} close`,
				fix: "Balance opening and closing parentheses",
			});
		}

		// Check for common syntax mistakes
		if (code.includes(";;")) {
			issues.push({
				severity: "warning",
				type: "SYNTAX_WARNING",
				message: "Double semicolon detected",
				line: findLine(code, ";;"),
				fix: "Remove extra semicolon",
			});
		}

		return { issues };
	}
}

/**
 * Layer 2: Type Safety Checks
 * Checks for TypeScript type safety issues
 */
export class TypeLayer implements ValidationLayer {
	name = "types";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null check
		if (!code) {
			return { issues };
		}

		// Check for `any` type usage
		const anyMatches = code.match(/:\s*any\b/g) || [];
		if (anyMatches.length > 0) {
			issues.push({
				severity: "warning",
				type: "TYPE_SAFETY_BYPASS",
				message: `Found ${anyMatches.length} uses of 'any' type`,
				fix: "Use specific types or generics instead of 'any'",
			});
		}

		// Check for @ts-expect-error without explanation
		if (code.includes("@ts-ignore") && !code.includes("@ts-ignore -")) {
			issues.push({
				severity: "warning",
				type: "TS_IGNORE_NO_REASON",
				message: "@ts-ignore used without explanation",
				line: findLine(code, "@ts-ignore"),
				fix: "Add reason: // @ts-ignore - <reason>",
			});
		}

		// Check for non-null assertions
		const nonNullMatches = code.match(/\w+!/g) || [];
		if (nonNullMatches.length > 3) {
			issues.push({
				severity: "info",
				type: "EXCESSIVE_NON_NULL",
				message: `Found ${nonNullMatches.length} non-null assertions (!)`,
				fix: "Consider proper null checks instead",
			});
		}

		return { issues };
	}
}

/**
 * Layer 3: Test Coverage Checks
 * Validates test file patterns per C-003 and C-004
 */
export class TestLayer implements ValidationLayer {
	name = "tests";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null checks
		if (!code || !filePath) {
			return { issues };
		}

		// Only check test files
		if (!filePath.includes(".test.") && !filePath.includes("/test/")) {
			return { issues };
		}

		// Check for vague assertions (from CONSTRAINTS.md C-003)
		const vaguePatterns = [".toBeTruthy()", ".toBeDefined()", ".toBeFalsy()"];
		for (const pattern of vaguePatterns) {
			if (code.includes(pattern)) {
				issues.push({
					severity: "warning",
					type: "VAGUE_ASSERTION",
					message: `Found vague assertion: ${pattern}`,
					line: findLine(code, pattern),
					fix: "Use specific assertions: .toEqual(), .toBe(), .toMatchObject()",
				});
			}
		}

		// Check for 4-path coverage (C-004)
		const hasHappyPath = code.includes("should") && (code.includes("success") || code.includes("correct"));
		const hasSadPath = code.includes("fail") || code.includes("error") || code.includes("invalid");
		const hasEdgeCase = code.includes("edge") || code.includes("empty") || code.includes("null");
		const hasErrorCase = code.includes("throw") || code.includes("reject");

		const paths = [hasHappyPath, hasSadPath, hasEdgeCase, hasErrorCase].filter(Boolean).length;
		if (paths < 3) {
			issues.push({
				severity: "info",
				type: "INCOMPLETE_COVERAGE",
				message: `Only ${paths}/4 test paths covered (happy, sad, edge, error)`,
				fix: "Add tests for missing paths",
			});
		}

		return { issues };
	}
}

/**
 * Layer 4: Architecture Validation
 * Checks for layer boundary and pattern violations per C-001, C-002
 */
export class ArchitectureLayer implements ValidationLayer {
	name = "architecture";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null checks
		if (!code || !filePath) {
			return { issues };
		}

		// C-001: Layer Boundary Enforcement
		if (
			(filePath.includes("apps/vscode/") || filePath.includes("apps/web/") || filePath.includes("apps/cli/")) &&
			code.includes("@snapback/infrastructure")
		) {
			issues.push({
				severity: "critical",
				type: "LAYER_BOUNDARY_VIOLATION",
				message: "Presentation layer cannot import @snapback/infrastructure",
				line: findLine(code, "@snapback/infrastructure"),
				fix: "Use @snapback/core instead",
			});
		}

		// C-002: Service Layer for Business Logic
		if (filePath.includes("procedures/") && (code.includes("db.query") || code.includes("db.select"))) {
			issues.push({
				severity: "critical",
				type: "SERVICE_BYPASS",
				message: "Direct database access in procedure file",
				line: findLine(code, "db."),
				fix: "Move business logic to apps/api/src/services/",
			});
		}

		// Check for relative imports across package boundaries
		if (code.includes("from '../../../packages/") || code.includes("from '../../packages/")) {
			issues.push({
				severity: "warning",
				type: "WRONG_IMPORT_PATTERN",
				message: "Relative imports across package boundaries",
				line: findLine(code, "../packages/"),
				fix: "Use @snapback/* package imports",
			});
		}

		return { issues };
	}
}

/**
 * Layer 5: Security Validation
 * Checks for security issues per C-006
 */
export class SecurityLayer implements ValidationLayer {
	name = "security";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null check
		if (!code) {
			return { issues };
		}

		// Check for hardcoded secrets
		const secretPatterns = [
			/api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
			/secret\s*[:=]\s*["'][^"']+["']/i,
			/password\s*[:=]\s*["'][^"']+["']/i,
			/token\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/i,
		];

		for (const pattern of secretPatterns) {
			if (pattern.test(code)) {
				issues.push({
					severity: "critical",
					type: "HARDCODED_SECRET",
					message: "Possible hardcoded secret detected",
					fix: "Use environment variables for secrets",
				});
				break;
			}
		}

		// C-006: Privacy-First Telemetry
		if (code.includes("posthog") && (code.includes("fileContent") || code.includes("sourceCode"))) {
			issues.push({
				severity: "critical",
				type: "PRIVACY_VIOLATION",
				message: "File content must never be sent to external services",
				fix: "Only send metadata: file paths, timestamps, counts, hashes",
			});
		}

		// Check for eval usage
		if (code.includes("eval(") || code.includes("new Function(")) {
			issues.push({
				severity: "critical",
				type: "UNSAFE_EVAL",
				message: "eval() or new Function() detected - security risk",
				line: findLine(code, "eval(") || findLine(code, "new Function("),
				fix: "Avoid eval - use safer alternatives",
			});
		}

		return { issues };
	}
}

/**
 * Layer 6: Dependency Validation
 * Checks for dependency issues
 */
export class DependencyLayer implements ValidationLayer {
	name = "dependencies";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null check
		if (!code) {
			return { issues };
		}

		// Check for deprecated packages
		const deprecatedImports = ["moment", "request", "node-fetch@2"];
		for (const pkg of deprecatedImports) {
			if (code.includes(`from "${pkg}"`) || code.includes(`from '${pkg}'`)) {
				issues.push({
					severity: "warning",
					type: "DEPRECATED_DEPENDENCY",
					message: `Deprecated package: ${pkg}`,
					line: findLine(code, pkg),
					fix: "Use modern alternatives (dayjs, fetch, node-fetch@3)",
				});
			}
		}

		return { issues };
	}
}

/**
 * Layer 7: Performance Validation
 * Checks for performance issues per C-007
 */
export class PerformanceLayer implements ValidationLayer {
	name = "performance";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null checks
		if (!code || !filePath) {
			return { issues };
		}

		// C-007: Console.log in Production
		if (
			!filePath.includes(".test.") &&
			!filePath.includes("/test/") &&
			!filePath.includes("scripts/") &&
			code.includes("console.log")
		) {
			issues.push({
				severity: "warning",
				type: "NO_CONSOLE",
				message: "console.log in production code",
				line: findLine(code, "console.log"),
				fix: "Use logger from @snapback/core",
			});
		}

		// Check for synchronous file operations
		if (code.includes("fs.readFileSync") || code.includes("fs.writeFileSync")) {
			if (!filePath.includes("scripts/") && !filePath.includes(".test.")) {
				issues.push({
					severity: "info",
					type: "SYNC_FILE_IO",
					message: "Synchronous file operation may block event loop",
					line: findLine(code, "Sync("),
					fix: "Use async file operations or defer to background",
				});
			}
		}

		// Check for await in loops (potential N+1)
		if (code.includes("for") && code.includes("await ")) {
			const forAwaitPattern = /for\s*\([^)]+\)\s*\{[^}]*await\s+/s;
			if (forAwaitPattern.test(code)) {
				issues.push({
					severity: "info",
					type: "AWAIT_IN_LOOP",
					message: "Await in loop may cause N+1 performance issue",
					fix: "Consider Promise.all() for parallel execution",
				});
			}
		}

		return { issues };
	}
}
