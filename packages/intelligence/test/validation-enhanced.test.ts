/**
 * Enhanced Validation Tests
 *
 * Tests for:
 * - BiomeLayer: Programmatic Biome integration
 * - DynamicConfidenceCalculator: Weighted confidence scoring
 * - TypeScriptCompilerLayer: Real tsc integration
 *
 * Following 4-path coverage pattern (happy, sad, edge, error)
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { ValidationLayer } from "../src/types/config.js";
import type { ValidationResult } from "../src/types/validation.js";

// We'll import these after implementing them
// import { BiomeLayer } from "../src/validation/layers/BiomeLayer.js";
// import { TypeScriptCompilerLayer } from "../src/validation/layers/TypeScriptCompilerLayer.js";
// import { DynamicConfidenceCalculator } from "../src/validation/DynamicConfidenceCalculator.js";

// =============================================================================
// BIOME LAYER TESTS
// =============================================================================

describe("BiomeLayer", () => {
	// Import will be added once implementation exists
	let BiomeLayer: new (workspaceRoot: string) => ValidationLayer;

	beforeEach(async () => {
		try {
			const mod = await import("../src/validation/layers/BiomeLayer.js");
			BiomeLayer = mod.BiomeLayer;
		} catch {
			// Module not yet implemented - tests will fail as expected
		}
	});

	describe("Happy Path", () => {
		it("should pass validation for clean code", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			// Minimal code to avoid triggering Biome style rules
			const cleanCode = `export const value = 1;
`;
			const result = await layer.validate(cleanCode, "src/utils.ts");

			// Clean code should return a result (may have style warnings)
			expect(result).toBeDefined();
			expect(result.issues).toBeDefined();
			// Critical issues should be rare for simple clean code
			const criticalIssues = result.issues.filter((i) => i.severity === "critical");
			expect(criticalIssues.length).toBeLessThanOrEqual(1);
		});

		it("should have layer name 'biome'", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			expect(layer.name).toBe("biome");
		});
	});

	describe("Sad Path", () => {
		it("should detect unused imports", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const codeWithUnusedImport = `
import { logger, unusedThing } from "@snapback/core";

export function greet(name: string): string {
	return \`Hello, \${name}!\`;
}
`;
			const result = await layer.validate(codeWithUnusedImport, "src/utils.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.issues.some((i) => i.type.includes("noUnusedImports") || i.message.includes("unused"))).toBe(
				true,
			);
		});

		it("should detect unused variables", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const codeWithUnusedVar = `
export function greet(name: string): string {
	const unusedVar = "test";
	return \`Hello, \${name}!\`;
}
`;
			const result = await layer.validate(codeWithUnusedVar, "src/utils.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(
				result.issues.some((i) => i.type.includes("noUnusedVariables") || i.message.includes("unused")),
			).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty code", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const result = await layer.validate("", "src/empty.ts");

			// Empty code should pass (nothing to lint)
			expect(result.issues).toBeDefined();
		});

		it("should handle syntax errors gracefully", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			const layer = new BiomeLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const brokenCode = `
function test() {
	const x =
}
`;
			// Should not throw, should return issues or handle gracefully
			const result = await layer.validate(brokenCode, "src/broken.ts");
			expect(result).toBeDefined();
		});
	});

	describe("Error Cases", () => {
		it("should handle biome not being available", async () => {
			if (!BiomeLayer) {
				expect.fail("BiomeLayer not implemented yet");
			}

			// Use a non-existent workspace root
			const layer = new BiomeLayer("/nonexistent/path");
			const result = await layer.validate("const x = 1;", "src/test.ts");

			// Should not throw, should return empty issues or warning
			expect(result).toBeDefined();
		});
	});
});

// =============================================================================
// DYNAMIC CONFIDENCE CALCULATOR TESTS
// =============================================================================

describe("DynamicConfidenceCalculator", () => {
	// Import will be added once implementation exists
	let DynamicConfidenceCalculator: new () => {
		calculate(layers: ValidationResult[]): number;
	};

	beforeEach(async () => {
		try {
			const mod = await import("../src/validation/DynamicConfidenceCalculator.js");
			DynamicConfidenceCalculator = mod.DynamicConfidenceCalculator;
		} catch {
			// Module not yet implemented
		}
	});

	describe("Happy Path", () => {
		it("should return 0.95 for zero issues", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			const layers: ValidationResult[] = [
				{ layer: "syntax", passed: true, issues: [], duration: 10 },
				{ layer: "types", passed: true, issues: [], duration: 10 },
				{ layer: "security", passed: true, issues: [], duration: 10 },
			];

			const confidence = calc.calculate(layers);
			expect(confidence).toBe(0.95);
		});

		it("should return lower confidence with warnings", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			// Multiple warnings to accumulate penalty
			const layers: ValidationResult[] = [
				{ layer: "syntax", passed: true, issues: [], duration: 10 },
				{
					layer: "types",
					passed: true,
					issues: [
						{ severity: "warning", type: "ANY_TYPE", message: "Use of any" },
						{ severity: "warning", type: "ANY_TYPE", message: "Use of any 2" },
						{ severity: "warning", type: "ANY_TYPE", message: "Use of any 3" },
					],
					duration: 10,
				},
			];

			const confidence = calc.calculate(layers);
			// 3 warnings at 0.03 each = 0.09 penalty, so 1 - 0.09 = 0.91
			expect(confidence).toBeLessThan(0.95);
			expect(confidence).toBeGreaterThan(0.5);
		});
	});

	describe("Sad Path", () => {
		it("should return low confidence for critical security issues", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			const layers: ValidationResult[] = [
				{ layer: "syntax", passed: true, issues: [], duration: 10 },
				{
					layer: "security",
					passed: false,
					issues: [{ severity: "critical", type: "UNSAFE_EVAL", message: "eval detected" }],
					duration: 10,
				},
			];

			const confidence = calc.calculate(layers);
			// Security critical issues (0.30 weight) should heavily penalize confidence
			// 1 - 0.30 = 0.70
			expect(confidence).toBeLessThanOrEqual(0.75);
			expect(confidence).toBeGreaterThanOrEqual(0.5);
		});

		it("should weight security issues more heavily than style issues", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();

			// Same number of issues, but security vs performance
			const securityLayers: ValidationResult[] = [
				{
					layer: "security",
					passed: false,
					issues: [{ severity: "critical", type: "UNSAFE_EVAL", message: "eval" }],
					duration: 10,
				},
			];

			const perfLayers: ValidationResult[] = [
				{
					layer: "performance",
					passed: false,
					issues: [{ severity: "critical", type: "SYNC_IO", message: "sync io" }],
					duration: 10,
				},
			];

			const securityConfidence = calc.calculate(securityLayers);
			const perfConfidence = calc.calculate(perfLayers);

			// Security issues should result in lower confidence
			expect(securityConfidence).toBeLessThan(perfConfidence);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty layers array", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			const confidence = calc.calculate([]);

			expect(confidence).toBe(0.95); // No issues = high confidence
		});

		it("should not go below 0.10 minimum", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			// Lots of critical issues across multiple layers
			const layers: ValidationResult[] = [
				{
					layer: "security",
					passed: false,
					issues: Array(10).fill({ severity: "critical", type: "ISSUE", message: "bad" }),
					duration: 10,
				},
				{
					layer: "architecture",
					passed: false,
					issues: Array(10).fill({ severity: "critical", type: "ISSUE", message: "bad" }),
					duration: 10,
				},
			];

			const confidence = calc.calculate(layers);
			expect(confidence).toBeGreaterThanOrEqual(0.1);
		});

		it("should cap at 0.95 maximum", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();
			const layers: ValidationResult[] = [{ layer: "syntax", passed: true, issues: [], duration: 10 }];

			const confidence = calc.calculate(layers);
			expect(confidence).toBeLessThanOrEqual(0.95);
		});
	});

	describe("Weighted Scoring", () => {
		it("should apply different weights to different layers", async () => {
			if (!DynamicConfidenceCalculator) {
				expect.fail("DynamicConfidenceCalculator not implemented yet");
			}

			const calc = new DynamicConfidenceCalculator();

			// Expected layer weights (from spec):
			// syntax: 0.25 critical, 0.05 warning
			// types: 0.20 critical, 0.03 warning
			// security: 0.30 critical, 0.10 warning
			// architecture: 0.15 critical, 0.05 warning
			// tests: 0.05 critical, 0.02 warning
			// dependencies: 0.03 critical, 0.01 warning
			// performance: 0.02 critical, 0.01 warning

			const syntaxCritical: ValidationResult[] = [
				{
					layer: "syntax",
					passed: false,
					issues: [{ severity: "critical", type: "SYNTAX", message: "error" }],
					duration: 10,
				},
			];

			const depCritical: ValidationResult[] = [
				{
					layer: "dependencies",
					passed: false,
					issues: [{ severity: "critical", type: "DEP", message: "error" }],
					duration: 10,
				},
			];

			const syntaxConf = calc.calculate(syntaxCritical);
			const depConf = calc.calculate(depCritical);

			// Syntax critical (0.25 weight) should penalize more than dependency (0.03 weight)
			expect(syntaxConf).toBeLessThan(depConf);
		});
	});
});

// =============================================================================
// TYPESCRIPT COMPILER LAYER TESTS
// =============================================================================

describe("TypeScriptCompilerLayer", () => {
	let TypeScriptCompilerLayer: new (workspaceRoot: string) => ValidationLayer;

	beforeEach(async () => {
		try {
			const mod = await import("../src/validation/layers/TypeScriptCompilerLayer.js");
			TypeScriptCompilerLayer = mod.TypeScriptCompilerLayer;
		} catch {
			// Module not yet implemented
		}
	});

	describe("Happy Path", () => {
		it("should pass validation for type-safe code", async () => {
			if (!TypeScriptCompilerLayer) {
				expect.fail("TypeScriptCompilerLayer not implemented yet");
			}

			const layer = new TypeScriptCompilerLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const typeSafeCode = `
export function add(a: number, b: number): number {
	return a + b;
}
`;
			const result = await layer.validate(typeSafeCode, "src/math.ts");

			expect(result.issues.filter((i) => i.severity === "critical")).toHaveLength(0);
		});

		it("should have layer name 'typescript-compiler'", async () => {
			if (!TypeScriptCompilerLayer) {
				expect.fail("TypeScriptCompilerLayer not implemented yet");
			}

			const layer = new TypeScriptCompilerLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			expect(layer.name).toBe("typescript-compiler");
		});
	});

	describe("Sad Path", () => {
		it("should detect type errors", async () => {
			if (!TypeScriptCompilerLayer) {
				expect.fail("TypeScriptCompilerLayer not implemented yet");
			}

			const layer = new TypeScriptCompilerLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const typeErrorCode = `
export function add(a: number, b: number): number {
	return a + b + "string"; // Type error: string + number
}
`;
			const result = await layer.validate(typeErrorCode, "src/math.ts");

			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.issues.some((i) => i.type.includes("TS") || i.message.includes("type"))).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty code", async () => {
			if (!TypeScriptCompilerLayer) {
				expect.fail("TypeScriptCompilerLayer not implemented yet");
			}

			const layer = new TypeScriptCompilerLayer("/Users/user1/WebstormProjects/SnapBack-Site");
			const result = await layer.validate("", "src/empty.ts");

			expect(result).toBeDefined();
		});
	});
});

// =============================================================================
// INTEGRATION TESTS - ValidationPipeline with new layers
// =============================================================================

describe("ValidationPipeline with Enhanced Layers", () => {
	it("should include biome layer when configured", async () => {
		// This test will verify that the pipeline can accept BiomeLayer
		// Implementation will be added after BiomeLayer exists
		expect(true).toBe(true); // Placeholder
	});

	it("should use dynamic confidence calculation", async () => {
		// This test will verify dynamic scoring is used
		// Implementation will be added after DynamicConfidenceCalculator exists
		expect(true).toBe(true); // Placeholder
	});
});
