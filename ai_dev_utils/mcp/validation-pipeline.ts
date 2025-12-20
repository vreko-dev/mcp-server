/**
 * Validation Pipeline
 *
 * Implements Multiplier 3 from unified_context_system.md:
 * - Prevents 19% developer slowdown by auto-validating AI output
 * - 7 validation layers run in parallel
 * - Returns confidence score and review recommendation
 *
 * Time Impact:
 * - Without pipeline: 24 min (manual review)
 * - With pipeline: 30 sec (automated)
 */

import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DEV_UTILS = path.resolve(__dirname, "..");

// ============================================================================
// TYPES
// ============================================================================

export interface Issue {
	severity: "critical" | "warning" | "info";
	type: string;
	message: string;
	line?: number;
	fix?: string;
}

export interface ValidationResult {
	layer: string;
	passed: boolean;
	issues: Issue[];
	duration: number;
}

export interface PipelineResult {
	overall: {
		passed: boolean;
		confidence: number;
		totalIssues: number;
	};
	layers: ValidationResult[];
	recommendation: "auto_merge" | "quick_review" | "full_review";
	focusPoints: string[];
}

interface ValidationLayer {
	name: string;
	validate(code: string, filePath: string): Promise<{ issues: Issue[] }>;
}

// ============================================================================
// VALIDATION LAYERS
// ============================================================================

/**
 * Layer 1: Syntax Validation
 * Checks for basic syntax issues
 */
class SyntaxLayer implements ValidationLayer {
	name = "syntax";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

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
				line: this.findLine(code, ";;"),
				fix: "Remove extra semicolon",
			});
		}

		return { issues };
	}

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 2: Type Safety Checks
 * Checks for TypeScript type safety issues
 */
class TypeLayer implements ValidationLayer {
	name = "types";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

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
				line: this.findLine(code, "@ts-ignore"),
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

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 3: Test Coverage Checks
 * Validates test file patterns
 */
class TestLayer implements ValidationLayer {
	name = "tests";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

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
					line: this.findLine(code, pattern),
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

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 4: Architecture Validation
 * Checks for layer boundary and pattern violations
 */
class ArchitectureLayer implements ValidationLayer {
	name = "architecture";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// C-001: Layer Boundary Enforcement
		if (
			(filePath.includes("apps/vscode/") || filePath.includes("apps/web/") || filePath.includes("apps/cli/")) &&
			code.includes("@snapback/infrastructure")
		) {
			issues.push({
				severity: "critical",
				type: "LAYER_BOUNDARY_VIOLATION",
				message: "Presentation layer cannot import @snapback/infrastructure",
				line: this.findLine(code, "@snapback/infrastructure"),
				fix: "Use @snapback/core instead",
			});
		}

		// C-002: Service Layer for Business Logic
		if (filePath.includes("procedures/") && (code.includes("db.query") || code.includes("db.select"))) {
			issues.push({
				severity: "critical",
				type: "SERVICE_BYPASS",
				message: "Direct database access in procedure file",
				line: this.findLine(code, "db."),
				fix: "Move business logic to apps/api/src/services/",
			});
		}

		// Check for relative imports across package boundaries
		if (code.includes("from '../../../packages/") || code.includes("from '../../packages/")) {
			issues.push({
				severity: "warning",
				type: "WRONG_IMPORT_PATTERN",
				message: "Relative imports across package boundaries",
				line: this.findLine(code, "../packages/"),
				fix: "Use @snapback/* package imports",
			});
		}

		return { issues };
	}

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 5: Security Validation
 * Checks for security issues
 */
class SecurityLayer implements ValidationLayer {
	name = "security";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

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
				line: this.findLine(code, "eval(") || this.findLine(code, "new Function("),
				fix: "Avoid eval - use safer alternatives",
			});
		}

		return { issues };
	}

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 6: Dependency Validation
 * Checks for dependency issues
 */
class DependencyLayer implements ValidationLayer {
	name = "dependencies";

	async validate(code: string, _filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

		// Check for deprecated packages
		const deprecatedImports = ["moment", "request", "node-fetch@2"];
		for (const pkg of deprecatedImports) {
			if (code.includes(`from "${pkg}"`) || code.includes(`from '${pkg}'`)) {
				issues.push({
					severity: "warning",
					type: "DEPRECATED_DEPENDENCY",
					message: `Deprecated package: ${pkg}`,
					line: this.findLine(code, pkg),
					fix: "Use modern alternatives (dayjs, fetch, node-fetch@3)",
				});
			}
		}

		// Check for missing type imports
		if (code.includes("import type") && code.includes("import {")) {
			// This is fine - they're using type imports correctly
		}

		return { issues };
	}

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

/**
 * Layer 7: Performance Validation
 * Checks for performance issues
 */
class PerformanceLayer implements ValidationLayer {
	name = "performance";

	async validate(code: string, filePath: string): Promise<{ issues: Issue[] }> {
		const issues: Issue[] = [];

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
				line: this.findLine(code, "console.log"),
				fix: "Use logger from @snapback/core",
			});
		}

		// Check for synchronous file operations
		if (code.includes("fs.readFileSync") || code.includes("fs.writeFileSync")) {
			// Allow in scripts and tests
			if (!filePath.includes("scripts/") && !filePath.includes(".test.")) {
				issues.push({
					severity: "info",
					type: "SYNC_FILE_IO",
					message: "Synchronous file operation may block event loop",
					line: this.findLine(code, "Sync("),
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

	private findLine(code: string, search: string): number {
		const lines = code.split("\n");
		return lines.findIndex((l) => l.includes(search)) + 1;
	}
}

// ============================================================================
// VALIDATION PIPELINE
// ============================================================================

export class ValidationPipeline {
	private layers: ValidationLayer[] = [];

	constructor() {
		// Register validation layers in order
		this.layers = [
			new SyntaxLayer(),
			new TypeLayer(),
			new TestLayer(),
			new ArchitectureLayer(),
			new SecurityLayer(),
			new DependencyLayer(),
			new PerformanceLayer(),
		];
	}

	/**
	 * Validate code through all layers
	 */
	async validate(code: string, filePath: string): Promise<PipelineResult> {
		// Run all layers in parallel (they're all fast)
		const layerResults = await Promise.all(
			this.layers.map(async (layer) => {
				const start = Date.now();
				const result = await layer.validate(code, filePath);
				return {
					layer: layer.name,
					passed: result.issues.length === 0,
					issues: result.issues,
					duration: Date.now() - start,
				};
			}),
		);

		// Calculate totals
		const totalIssues = layerResults.reduce((sum, r) => sum + r.issues.length, 0);
		const criticalIssues = layerResults.flatMap((r) => r.issues).filter((i) => i.severity === "critical");
		const confidence = this.calculateConfidence(totalIssues, criticalIssues.length);
		const recommendation = this.getRecommendation(confidence, criticalIssues);

		return {
			overall: {
				passed: criticalIssues.length === 0,
				confidence,
				totalIssues,
			},
			layers: layerResults,
			recommendation,
			focusPoints: criticalIssues.map((i) => i.message),
		};
	}

	/**
	 * Calculate confidence score based on issues
	 */
	private calculateConfidence(totalIssues: number, criticalIssues: number): number {
		if (criticalIssues > 0) return 0.1;
		if (totalIssues === 0) return 0.95;
		if (totalIssues <= 2) return 0.7;
		if (totalIssues <= 5) return 0.5;
		return 0.2;
	}

	/**
	 * Determine review recommendation based on confidence
	 */
	private getRecommendation(
		confidence: number,
		criticalIssues: Issue[],
	): "auto_merge" | "quick_review" | "full_review" {
		if (criticalIssues.length > 0) return "full_review";
		if (confidence > 0.85) return "auto_merge";
		if (confidence > 0.5) return "quick_review";
		return "full_review";
	}

	/**
	 * Get layer names
	 */
	getLayerNames(): string[] {
		return this.layers.map((l) => l.name);
	}
}

// ============================================================================
// TEST FUNCTION
// ============================================================================

export async function testValidationPipeline(): Promise<void> {
	console.error("\n🧪 Testing Validation Pipeline...\n");

	const pipeline = new ValidationPipeline();

	// Test cases
	const testCases = [
		{
			name: "Clean code",
			filePath: "apps/api/src/services/user.ts",
			code: `
import { logger } from "@snapback/core";
import { User } from "@snapback/contracts";

export async function getUser(id: string): Promise<User | null> {
  logger.info("Fetching user", { id });
  return db.users.findById(id);
}`,
		},
		{
			name: "Code with violations",
			filePath: "apps/vscode/src/snapshot.ts",
			code: `
import { db } from "@snapback/infrastructure"; // Layer violation!
import { logger } from "@snapback/core";

export function createSnapshot(): any { // any type!
  console.log("Creating snapshot"); // console.log!
  eval("danger()"); // eval!
  return db.query("SELECT * FROM snapshots");
}`,
		},
		{
			name: "Test file with issues",
			filePath: "apps/api/test/user.test.ts",
			code: `
import { describe, it, expect } from "vitest";

describe("User", () => {
  it("should exist", () => {
    const user = getUser("123");
    expect(user).toBeTruthy(); // Vague assertion!
    expect(user).toBeDefined(); // Vague assertion!
  });
});`,
		},
	];

	for (const testCase of testCases) {
		console.error(`📋 ${testCase.name}:`);
		console.error(`   File: ${testCase.filePath}`);

		const result = await pipeline.validate(testCase.code, testCase.filePath);

		console.error(`   Confidence: ${(result.overall.confidence * 100).toFixed(0)}%`);
		console.error(`   Recommendation: ${result.recommendation}`);
		console.error(`   Total Issues: ${result.overall.totalIssues}`);

		if (result.focusPoints.length > 0) {
			console.error("   Critical Issues:");
			for (const fp of result.focusPoints) {
				console.error(`     ❌ ${fp}`);
			}
		}

		// Show layer breakdown
		for (const layer of result.layers) {
			if (layer.issues.length > 0) {
				console.error(`   ${layer.layer}: ${layer.issues.length} issues (${layer.duration}ms)`);
			}
		}

		console.error("");
	}

	console.error("✅ Validation pipeline test complete!");
}
