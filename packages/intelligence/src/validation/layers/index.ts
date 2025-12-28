/**
 * Validation Layers
 *
 * Individual validation layers that run in parallel.
 * Each layer checks for a specific category of issues.
 *
 * Enhanced layers (BiomeLayer, TypeScriptCompilerLayer) are exported at bottom.
 *
 * SecurityLayer++: Integrated SecretDetector + unsafe function patterns
 * PerformanceLayer++: O(n²), memory leaks, ReDoS detection
 *
 * @see https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns
 */

import { SecretDetector, type SecretFinding } from "../../policy/detectors/SecretDetector.js";
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
 * Check if file is a test file (for false positive prevention)
 */
function isTestFile(filePath: string): boolean {
	if (!filePath) return false;
	return (
		filePath.includes(".test.") ||
		filePath.includes(".spec.") ||
		filePath.includes("__tests__") ||
		filePath.includes("/test/") ||
		filePath.includes("/tests/")
	);
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
 * Layer 5: Security Validation (Enhanced SecurityLayer++)
 *
 * Checks for security issues per C-006 with enhanced detection:
 * - SecretDetector integration (AWS, GitHub, Stripe, JWT, DB strings, private keys)
 * - Unsafe function detection (eval, exec, innerHTML, dangerouslySetInnerHTML)
 * - Privacy-first telemetry enforcement
 *
 * @see https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns
 */
export class SecurityLayer implements ValidationLayer {
	name = "security";
	private secretDetector = new SecretDetector();

	// Additional secret patterns not in SecretDetector
	private static readonly ADDITIONAL_SECRET_PATTERNS = [
		// GitHub Fine-Grained Token (github_pat_) - format: github_pat_{chars}_{rest}
		{
			name: "GitHub Fine-Grained Token",
			pattern: /github_pat_[A-Za-z0-9]+_[A-Za-z0-9_]{20,}/g,
			severity: "critical" as const,
		},
		// JWT tokens
		{
			name: "JWT Token",
			pattern: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*/g,
			severity: "critical" as const,
		},
		// Database connection strings
		{
			name: "PostgreSQL Connection String",
			pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+/gi,
			severity: "critical" as const,
		},
		{
			name: "MongoDB Connection String",
			pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^/]+/gi,
			severity: "critical" as const,
		},
		// EC Private Key (in addition to RSA)
		{
			name: "EC Private Key",
			pattern: /-----BEGIN EC PRIVATE KEY-----/g,
			severity: "critical" as const,
		},
		// Stripe restricted key
		{
			name: "Stripe Restricted Key",
			pattern: /rk_(?:live|test)_[a-zA-Z0-9]{24}/g,
			severity: "critical" as const,
		},
	];

	// Unsafe function patterns
	private static readonly UNSAFE_FUNCTION_PATTERNS = [
		{
			pattern: /child_process\.exec\s*\(/,
			type: "COMMAND_INJECTION",
			severity: "critical" as const,
			message: "child_process.exec() enables shell command injection",
			fix: "Use execFile() or spawn() with arguments array instead",
		},
		{
			pattern: /\bexec\s*\(\s*`/,
			type: "COMMAND_INJECTION",
			severity: "critical" as const,
			message: "exec() with template literal enables command injection",
			fix: "Use execFile() with arguments array",
		},
		{
			pattern: /\.innerHTML\s*=/,
			type: "XSS_RISK",
			severity: "warning" as const,
			message: "innerHTML assignment enables XSS attacks",
			fix: "Use textContent, createTextNode(), or sanitize with DOMPurify",
		},
		{
			pattern: /dangerouslySetInnerHTML/,
			type: "XSS_RISK",
			severity: "warning" as const,
			message: "dangerouslySetInnerHTML is a React XSS vector",
			fix: "Sanitize content with DOMPurify before rendering",
		},
		{
			pattern: /spawn\s*\(\s*['"](?:sh|bash|cmd)['"]/,
			type: "SHELL_INJECTION",
			severity: "critical" as const,
			message: "Shell spawning enables command injection",
			fix: "Use direct program spawn: spawn('program', [args])",
		},
		{
			pattern: /spawn\s*\([^)]+,\s*\[[^\]]*\]\s*,\s*\{[^}]*shell\s*:\s*true/,
			type: "SHELL_INJECTION",
			severity: "critical" as const,
			message: "spawn with shell:true enables command injection",
			fix: "Remove shell:true option and use arguments array",
		},
	];

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null check
		if (!code) {
			return { issues };
		}

		// 1. Run SecretDetector integration (skips test files automatically)
		this.checkSecrets(code, filePath, issues);

		// 2. Check unsafe functions (applies to all files)
		this.checkUnsafeFunctions(code, filePath, issues);

		// 3. C-006: Privacy-First Telemetry
		this.checkPrivacyViolations(code, issues);

		// 4. Check for eval usage (existing)
		this.checkEvalUsage(code, issues);

		return { issues };
	}

	/**
	 * Integrate SecretDetector + additional patterns
	 */
	private checkSecrets(code: string, filePath: string, issues: Issue[]): void {
		// SecretDetector already skips test files
		const secretResult = this.secretDetector.detect(code, filePath);

		// Convert SecretDetector findings to Issue format
		for (const finding of secretResult.findings) {
			issues.push(this.adaptSecretFinding(finding));
		}

		// Skip additional pattern checks for test files
		if (isTestFile(filePath)) {
			return;
		}

		// Check additional patterns not in SecretDetector
		for (const pattern of SecurityLayer.ADDITIONAL_SECRET_PATTERNS) {
			const matches = code.matchAll(pattern.pattern);
			for (const match of matches) {
				issues.push({
					severity: pattern.severity,
					type: `SECRET_${pattern.name.toUpperCase().replace(/\s+/g, "_")}`,
					message: `${pattern.name} detected: ${match[0].substring(0, 20)}...`,
					line: this.findLineForMatch(code, match.index || 0),
					fix: "Use environment variables for secrets",
				});
			}
		}
	}

	/**
	 * Check for unsafe function calls
	 */
	private checkUnsafeFunctions(code: string, _filePath: string, issues: Issue[]): void {
		for (const unsafe of SecurityLayer.UNSAFE_FUNCTION_PATTERNS) {
			if (unsafe.pattern.test(code)) {
				// Reset lastIndex for global patterns
				unsafe.pattern.lastIndex = 0;
				const match = unsafe.pattern.exec(code);
				issues.push({
					severity: unsafe.severity,
					type: unsafe.type,
					message: unsafe.message,
					line: match ? this.findLineForMatch(code, match.index) : undefined,
					fix: unsafe.fix,
				});
			}
		}
	}

	/**
	 * C-006: Privacy-First Telemetry
	 */
	private checkPrivacyViolations(code: string, issues: Issue[]): void {
		if (code.includes("posthog") && (code.includes("fileContent") || code.includes("sourceCode"))) {
			issues.push({
				severity: "critical",
				type: "PRIVACY_VIOLATION",
				message: "File content must never be sent to external services",
				fix: "Only send metadata: file paths, timestamps, counts, hashes",
			});
		}
	}

	/**
	 * Check for eval usage
	 */
	private checkEvalUsage(code: string, issues: Issue[]): void {
		if (code.includes("eval(") || code.includes("new Function(")) {
			issues.push({
				severity: "critical",
				type: "UNSAFE_EVAL",
				message: "eval() or new Function() detected - security risk",
				line: findLine(code, "eval(") || findLine(code, "new Function("),
				fix: "Avoid eval - use safer alternatives",
			});
		}
	}

	/**
	 * Convert SecretDetector finding to Issue format
	 */
	private adaptSecretFinding(finding: SecretFinding): Issue {
		return {
			severity: finding.severity === "critical" || finding.severity === "high" ? "critical" : "warning",
			type: `SECRET_${finding.type.toUpperCase().replace(/[\s-]+/g, "_")}`,
			message: `${finding.type}: ${finding.snippet}...`,
			line: finding.line,
			fix: "Use environment variables for secrets",
		};
	}

	/**
	 * Find line number for a match index
	 */
	private findLineForMatch(code: string, index: number): number {
		const beforeMatch = code.substring(0, index);
		return (beforeMatch.match(/\n/g) || []).length + 1;
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
 * Layer 7: Performance Validation (Enhanced PerformanceLayer++)
 *
 * Checks for performance issues per C-007 with enhanced detection:
 * - O(n²) nested loop detection
 * - Memory leak patterns (addEventListener without cleanup)
 * - ReDoS vulnerability detection
 * - N+1 query patterns
 */
export class PerformanceLayer implements ValidationLayer {
	name = "performance";

	// ReDoS patterns - regex with nested quantifiers
	private static readonly REDOS_PATTERNS = [
		// (a+)+ pattern - catastrophic backtracking
		/\/[^/]*\([^)]*[+*]\)[^/]*[+*][^/]*\//,
		// Nested groups with quantifiers
		/\/[^/]*\(\?:[^)]*[+*]\)[^/]*[+*][^/]*\//,
		// Multiple adjacent quantifiers on groups
		/\/[^/]*\([^)]+\)[+*]{2,}[^/]*\//,
	];

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Defensive null checks
		if (!code || !filePath) {
			return { issues };
		}

		// C-007: Console.log in Production
		this.checkConsoleLog(code, filePath, issues);

		// Check for synchronous file operations
		this.checkSyncFileIO(code, filePath, issues);

		// Check for await in loops (potential N+1)
		this.checkAwaitInLoop(code, issues);

		// NEW: Check for O(n²) nested loops
		this.checkNestedLoops(code, issues);

		// NEW: Check for memory leaks (addEventListener without cleanup)
		this.checkMemoryLeaks(code, issues);

		// NEW: Check for ReDoS vulnerabilities
		this.checkReDoS(code, issues);

		// NEW: Check for shell injection via spawn
		this.checkSpawnShellOption(code, issues);

		return { issues };
	}

	/**
	 * C-007: Console.log in Production
	 */
	private checkConsoleLog(code: string, filePath: string, issues: Issue[]): void {
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
	}

	/**
	 * Check for synchronous file operations
	 */
	private checkSyncFileIO(code: string, filePath: string, issues: Issue[]): void {
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
	}

	/**
	 * Check for await in loops (potential N+1)
	 */
	private checkAwaitInLoop(code: string, issues: Issue[]): void {
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
	}

	/**
	 * Check for O(n²) nested loops
	 */
	private checkNestedLoops(code: string, issues: Issue[]): void {
		// Pattern 1: for inside for
		const nestedForPattern = /for\s*\([^)]*\)\s*\{[^{}]*for\s*\([^)]*\)\s*\{/s;
		if (nestedForPattern.test(code)) {
			issues.push({
				severity: "warning",
				type: "O_N2_ALGORITHM",
				message: "Nested for loops detected - potential O(n²) complexity",
				fix: "Consider using Map/Set for O(1) lookups or merge algorithm",
			});
		}

		// Pattern 2: forEach inside for/forEach
		const forWithForEachPattern = /for\s*\([^)]*\)\s*\{[^{}]*\.forEach\s*\(/s;
		if (forWithForEachPattern.test(code)) {
			issues.push({
				severity: "warning",
				type: "O_N2_ALGORITHM",
				message: "forEach inside for loop - potential O(n²) complexity",
				fix: "Consider using Map/Set for O(1) lookups",
			});
		}

		// Pattern 3: Nested forEach
		const nestedForEachPattern = /\.forEach\s*\([^)]*\)\s*\{[^{}]*\.forEach\s*\(/s;
		if (nestedForEachPattern.test(code)) {
			issues.push({
				severity: "warning",
				type: "O_N2_ALGORITHM",
				message: "Nested forEach detected - potential O(n²) complexity",
				fix: "Consider using Map/Set for O(1) lookups",
			});
		}
	}

	/**
	 * Check for memory leaks - addEventListener without cleanup
	 */
	private checkMemoryLeaks(code: string, issues: Issue[]): void {
		// Check if addEventListener is used
		if (code.includes("addEventListener")) {
			// Check if removeEventListener is also present
			if (!code.includes("removeEventListener")) {
				issues.push({
					severity: "warning",
					type: "MEMORY_LEAK",
					message: "addEventListener without corresponding removeEventListener - potential memory leak",
					line: findLine(code, "addEventListener"),
					fix: "Add cleanup: useEffect(() => { ...; return () => element.removeEventListener(...) })",
				});
			}
		}
	}

	/**
	 * Check for ReDoS vulnerabilities
	 */
	private checkReDoS(code: string, issues: Issue[]): void {
		for (const pattern of PerformanceLayer.REDOS_PATTERNS) {
			if (pattern.test(code)) {
				issues.push({
					severity: "critical",
					type: "REDOS",
					message: "Regex with nested quantifiers - ReDoS vulnerability (catastrophic backtracking)",
					fix: "Simplify regex or use safe-regex library to validate patterns",
				});
				break; // One ReDoS warning is enough
			}
		}
	}

	/**
	 * Check for spawn with shell option
	 */
	private checkSpawnShellOption(code: string, issues: Issue[]): void {
		// spawn with shell: true
		const spawnShellPattern = /spawn\s*\([^)]+,\s*\[[^\]]*\]\s*,\s*\{[^}]*shell\s*:\s*true/;
		if (spawnShellPattern.test(code)) {
			issues.push({
				severity: "warning",
				type: "SPAWN_SHELL",
				message: "spawn with shell:true may cause performance issues and security risks",
				line: findLine(code, "shell: true"),
				fix: "Remove shell:true and use arguments array directly",
			});
		}
	}
}

// =============================================================================
// Enhanced Layers - External tool integration
// =============================================================================

export { BiomeLayer } from "./BiomeLayer.js";
export { TypeScriptCompilerLayer } from "./TypeScriptCompilerLayer.js";
