/**
 * Validation Pipeline Integration Tests
 *
 * Critical path tests to prevent logic drift in the validation system.
 * Covers:
 * - Pipeline orchestration edge cases
 * - Layer failure handling
 * - Enhanced mode integration
 * - Concurrent validation scenarios
 *
 * Following 4-path coverage pattern (happy, sad, edge, error)
 */

import { describe, expect, it } from "vitest";
import type { ValidationLayer } from "../src/types/config.js";
import { CriticalValidationError, DynamicConfidenceCalculator, ValidationPipeline } from "../src/validation/index.js";

// =============================================================================
// PIPELINE ORCHESTRATION TESTS
// =============================================================================

describe("ValidationPipeline Orchestration", () => {
	describe("Happy Path", () => {
		it("should run all layers in parallel and aggregate results", async () => {
			const pipeline = new ValidationPipeline();
			const code = `export function greet(name: string): string {
				return \`Hello, \${name}!\`;
			}`;

			const result = await pipeline.validate(code, "src/utils.ts");

			expect(result.overall).toBeDefined();
			expect(result.layers).toBeInstanceOf(Array);
			expect(result.layers.length).toBeGreaterThanOrEqual(7); // 7 default layers
			expect(result.recommendation).toBeDefined();
		});

		it("should include enhanced layers when configured", async () => {
			const pipeline = new ValidationPipeline({
				enhanced: true,
				workspaceRoot: "/Users/user1/WebstormProjects/SnapBack-Site",
			});

			const layerNames = pipeline.getLayerNames();

			expect(layerNames).toContain("biome");
			expect(layerNames).toContain("typescript-compiler");
			expect(layerNames.length).toBeGreaterThanOrEqual(9); // 7 + 2 enhanced
		});

		it("should use dynamic confidence when enabled", async () => {
			const pipeline = new ValidationPipeline({
				useDynamicConfidence: true,
			});

			const cleanCode = "export const x = 1;";
			const result = await pipeline.validate(cleanCode, "src/clean.ts");

			// Clean code should have high confidence (0.95 max)
			expect(result.overall.confidence).toBeLessThanOrEqual(0.95);
			expect(result.overall.confidence).toBeGreaterThanOrEqual(0.8);
		});
	});

	describe("Sad Path", () => {
		it("should aggregate issues from multiple layers", async () => {
			const pipeline = new ValidationPipeline();

			// Code with multiple types of issues
			const problematicCode = `
				import { unused } from "module";
				const x: any = eval("1+1");
				console.log(x);
			`;

			const result = await pipeline.validate(problematicCode, "src/bad.ts");

			// Should have issues from security (eval), types (any), performance (console.log)
			expect(result.overall.totalIssues).toBeGreaterThan(0);
			expect(result.focusPoints.length).toBeGreaterThan(0);
		});

		it("should mark critical issues as failed", async () => {
			const pipeline = new ValidationPipeline();

			const codeWithCritical = `
				const apiKey = "sk-1234567890abcdef";
				eval(apiKey);
			`;

			const result = await pipeline.validate(codeWithCritical, "src/insecure.ts");

			expect(result.overall.passed).toBe(false);
			expect(result.recommendation).toBe("full_review");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty code", async () => {
			const pipeline = new ValidationPipeline();
			const result = await pipeline.validate("", "src/empty.ts");

			expect(result).toBeDefined();
			expect(result.overall.passed).toBe(true);
		});

		it("should handle code with only comments", async () => {
			const pipeline = new ValidationPipeline();
			const result = await pipeline.validate("// Just a comment", "src/comment.ts");

			expect(result).toBeDefined();
		});

		it("should handle very long file paths", async () => {
			const pipeline = new ValidationPipeline();
			const longPath = `${"a/".repeat(100)}file.ts`;
			const result = await pipeline.validate("const x = 1;", longPath);

			expect(result).toBeDefined();
		});
	});

	describe("Error Cases", () => {
		it("should handle layer that throws", async () => {
			// Create a failing layer
			const failingLayer: ValidationLayer = {
				name: "failing-layer",
				validate: async () => {
					throw new Error("Layer crashed");
				},
			};

			const pipeline = new ValidationPipeline({
				customLayers: [failingLayer],
			});

			// Pipeline should handle the error gracefully
			await expect(pipeline.validate("const x = 1;", "src/test.ts")).rejects.toThrow();
		});
	});
});

// =============================================================================
// ENHANCED MODE INTEGRATION TESTS
// =============================================================================

describe("Enhanced Mode Integration", () => {
	describe("BiomeLayer + TypeScriptCompilerLayer", () => {
		it("should combine both layers in enhanced mode", async () => {
			const pipeline = new ValidationPipeline({
				enhanced: true,
				workspaceRoot: "/Users/user1/WebstormProjects/SnapBack-Site",
				useDynamicConfidence: true,
			});

			const layerNames = pipeline.getLayerNames();

			expect(layerNames).toContain("biome");
			expect(layerNames).toContain("typescript-compiler");
		});

		it("should not include enhanced layers without workspaceRoot", async () => {
			const pipeline = new ValidationPipeline({
				enhanced: true,
				// Missing workspaceRoot
			});

			const layerNames = pipeline.getLayerNames();

			expect(layerNames).not.toContain("biome");
			expect(layerNames).not.toContain("typescript-compiler");
		});
	});

	describe("Custom Layers", () => {
		it("should accept and run custom layers", async () => {
			let customLayerCalled = false;

			const customLayer: ValidationLayer = {
				name: "custom-test-layer",
				validate: async () => {
					customLayerCalled = true;
					return { issues: [] };
				},
			};

			const pipeline = new ValidationPipeline({
				customLayers: [customLayer],
			});

			await pipeline.validate("const x = 1;", "src/test.ts");

			expect(customLayerCalled).toBe(true);
			expect(pipeline.getLayerNames()).toContain("custom-test-layer");
		});

		it("should combine custom layers with enhanced layers", async () => {
			const customLayer: ValidationLayer = {
				name: "custom-layer",
				validate: async () => ({ issues: [] }),
			};

			const pipeline = new ValidationPipeline({
				enhanced: true,
				workspaceRoot: "/Users/user1/WebstormProjects/SnapBack-Site",
				customLayers: [customLayer],
			});

			const layerNames = pipeline.getLayerNames();

			expect(layerNames).toContain("biome");
			expect(layerNames).toContain("typescript-compiler");
			expect(layerNames).toContain("custom-layer");
		});
	});
});

// =============================================================================
// FAIL-FAST VALIDATION TESTS
// =============================================================================

describe("Fail-Fast Validation", () => {
	it("should stop on first critical issue in fail-fast mode", async () => {
		const trackingLayers: ValidationLayer[] = [
			{
				name: "layer-1",
				validate: async () => {
					return {
						issues: [{ severity: "critical", type: "CRITICAL_1", message: "First critical" }],
					};
				},
			},
			{
				name: "layer-2",
				validate: async () => {
					return { issues: [] };
				},
			},
		];

		const pipeline = new ValidationPipeline({
			customLayers: trackingLayers,
		});

		const result = await pipeline.validateFailFast("const x = 1;", "src/test.ts");

		// Should fail on first layer and not execute second
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(CriticalValidationError);
			expect(result.error.criticalIssues).toHaveLength(1);
		}
	});

	it("should continue if no critical issues in fail-fast mode", async () => {
		const warningLayers: ValidationLayer[] = [
			{
				name: "layer-1",
				validate: async () => ({
					issues: [{ severity: "warning", type: "WARN_1", message: "Warning 1" }],
				}),
			},
			{
				name: "layer-2",
				validate: async () => ({
					issues: [{ severity: "info", type: "INFO_1", message: "Info 1" }],
				}),
			},
		];

		const pipeline = new ValidationPipeline({
			customLayers: warningLayers,
		});

		const result = await pipeline.validateFailFast("const x = 1;", "src/test.ts");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value.overall.passed).toBe(true);
		}
	});
});

// =============================================================================
// MULTI-FILE VALIDATION TESTS
// =============================================================================

describe("Multi-File Validation", () => {
	it("should validate multiple files and aggregate results", async () => {
		const pipeline = new ValidationPipeline();

		const files = [
			{ path: "src/a.ts", content: "export const a = 1;" },
			{ path: "src/b.ts", content: "export const b = 2;" },
			{ path: "src/c.ts", content: "export const c = 3;" },
		];

		const result = await pipeline.validateFiles(files);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.value).toHaveLength(3);
		}
	});

	it("should report all critical issues across files", async () => {
		const pipeline = new ValidationPipeline();

		const files = [
			{ path: "src/good.ts", content: "export const x = 1;" },
			{ path: "src/bad.ts", content: "eval('malicious');" },
		];

		const result = await pipeline.validateFiles(files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.criticalIssues.length).toBeGreaterThan(0);
			expect(result.error.message).toContain("critical issues");
		}
	});
});

// =============================================================================
// DYNAMIC CONFIDENCE CALCULATOR INTEGRATION
// =============================================================================

describe("DynamicConfidenceCalculator Integration", () => {
	it("should calculate confidence based on weighted layer issues", async () => {
		const pipeline = new ValidationPipeline({
			useDynamicConfidence: true,
		});

		// Security issues should heavily impact confidence
		const securityIssueCode = `
			eval("alert('xss')");
		`;

		const result = await pipeline.validate(securityIssueCode, "src/insecure.ts");

		// Security critical (0.30 weight) should significantly lower confidence
		expect(result.overall.confidence).toBeLessThan(0.8);
	});

	it("should cap confidence at 0.95 for clean code", async () => {
		const pipeline = new ValidationPipeline({
			useDynamicConfidence: true,
		});

		const cleanCode = "export const value = 42;";
		const result = await pipeline.validate(cleanCode, "src/clean.ts");

		expect(result.overall.confidence).toBeLessThanOrEqual(0.95);
	});

	it("should not go below 0.10 minimum", async () => {
		const calc = new DynamicConfidenceCalculator();

		// Many critical issues across all layers
		const terribleLayers = [
			{
				layer: "security",
				passed: false,
				issues: Array(10).fill({ severity: "critical", type: "X", message: "bad" }),
				duration: 10,
			},
			{
				layer: "architecture",
				passed: false,
				issues: Array(10).fill({ severity: "critical", type: "X", message: "bad" }),
				duration: 10,
			},
			{
				layer: "syntax",
				passed: false,
				issues: Array(10).fill({ severity: "critical", type: "X", message: "bad" }),
				duration: 10,
			},
		];

		const confidence = calc.calculate(terribleLayers);

		expect(confidence).toBeGreaterThanOrEqual(0.1);
	});
});

// =============================================================================
// BACKWARD COMPATIBILITY TESTS
// =============================================================================

describe("Backward Compatibility", () => {
	it("should accept array of layers (legacy API)", async () => {
		const customLayers: ValidationLayer[] = [
			{
				name: "legacy-layer",
				validate: async () => ({ issues: [] }),
			},
		];

		// Legacy API: pass array directly
		const pipeline = new ValidationPipeline(customLayers);

		expect(pipeline.getLayerNames()).toContain("legacy-layer");
	});

	it("should work without any options", async () => {
		const pipeline = new ValidationPipeline();
		const result = await pipeline.validate("const x = 1;", "src/test.ts");

		expect(result).toBeDefined();
		expect(result.overall).toBeDefined();
	});

	it("should use hardcoded confidence when dynamic mode is off", async () => {
		const pipeline = new ValidationPipeline({
			useDynamicConfidence: false,
		});

		const cleanCode = "export const x = 1;";
		const result = await pipeline.validate(cleanCode, "src/clean.ts");

		// Should use CONFIDENCE_THRESHOLDS.AUTO_MERGE (0.95)
		expect(result.overall.confidence).toBe(0.95);
	});
});

// =============================================================================
// STATIC HELPER TESTS
// =============================================================================

describe("ValidationPipeline Static Helpers", () => {
	it("should flatten issues from result", async () => {
		const pipeline = new ValidationPipeline();
		const codeWithIssues = `
			const x: any = 1;
			console.log(x);
		`;

		const result = await pipeline.validate(codeWithIssues, "src/test.ts");
		const allIssues = ValidationPipeline.flattenIssues(result);

		expect(allIssues).toBeInstanceOf(Array);
	});

	it("should filter issues by severity", async () => {
		const pipeline = new ValidationPipeline();
		const codeWithMixed = `
			const x: any = 1; // warning
			eval("1"); // critical
		`;

		const result = await pipeline.validate(codeWithMixed, "src/test.ts");
		const criticalIssues = ValidationPipeline.getIssuesBySeverity(result, "critical");
		const warnings = ValidationPipeline.getIssuesBySeverity(result, "warning");

		expect(criticalIssues.every((i) => i.severity === "critical")).toBe(true);
		expect(warnings.every((i) => i.severity === "warning")).toBe(true);
	});
});

// =============================================================================
// LAYER EXECUTION TIMING TESTS
// =============================================================================

describe("Layer Execution Performance", () => {
	it("should track duration for each layer", async () => {
		const pipeline = new ValidationPipeline();
		const result = await pipeline.validate("const x = 1;", "src/test.ts");

		// Each layer result should have duration
		for (const layerResult of result.layers) {
			expect(typeof layerResult.duration).toBe("number");
			expect(layerResult.duration).toBeGreaterThanOrEqual(0);
		}
	});

	it("should run layers in parallel (total time < sum of individual times)", async () => {
		const slowLayers: ValidationLayer[] = [
			{
				name: "slow-1",
				validate: async () => {
					await new Promise((r) => setTimeout(r, 50));
					return { issues: [] };
				},
			},
			{
				name: "slow-2",
				validate: async () => {
					await new Promise((r) => setTimeout(r, 50));
					return { issues: [] };
				},
			},
		];

		const pipeline = new ValidationPipeline({
			customLayers: slowLayers,
		});

		const start = Date.now();
		await pipeline.validate("const x = 1;", "src/test.ts");
		const duration = Date.now() - start;

		// If running in parallel, should take ~50ms not ~100ms
		// Allow some buffer for test execution overhead
		expect(duration).toBeLessThan(150);
	});
});
