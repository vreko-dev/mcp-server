/**
 * V2 Engine E2E Pipeline Tests
 *
 * Integration tests that verify the full V2 engine pipeline produces
 * expected results matching V1 Guardian behavior.
 *
 * V1 PARITY: These tests ensure the V2 engine:
 * - Detects high-risk patterns (threats, phantom deps, complexity)
 * - Produces consistent risk scores
 * - Handles edge cases gracefully
 *
 * NOTE: These tests actually execute signal scripts (no mocking)
 */

import { describe, expect, it } from "vitest";
import { calculateComplexityAggregate } from "../src/signals/complexity";
import { extractImports } from "../src/signals/phantom-deps";
import { detectThreats } from "../src/signals/threats";
import type { FileChange } from "../src/types";

// =============================================================================
// E2E PIPELINE TESTS
// =============================================================================

describe("V2 Engine E2E Pipeline", () => {
	describe("Full analysis pipeline", () => {
		it("should produce high risk score for code with multiple issues", () => {
			const testFile: FileChange = {
				path: "dangerous.ts",
				content: `
					const password = 'secret123';
					import missing from 'not-installed-pkg';
					function deeplyNested() {
						if (a) { if (b) { if (c) { if (d) {} } } }
					}
					eval(userInput);
				`,
				changeType: "add",
				lineCount: 10,
			};

			// Run threats detection
			const threats = detectThreats(testFile.content);
			expect(threats.length).toBeGreaterThan(0);

			// Verify high-risk patterns detected
			const threatDescriptions = threats.map((t) => t.description);
			expect(threatDescriptions).toContain("hardcoded password");
			expect(threatDescriptions).toContain("eval() usage");

			// Run complexity analysis
			const complexityResult = calculateComplexityAggregate([testFile]);
			expect(complexityResult.avgComplexity).toBeGreaterThan(0);

			// Run phantom deps check
			const imports = extractImports(testFile.content);
			expect(imports).toContain("not-installed-pkg");
		});

		it("should produce low risk score for clean code", () => {
			const cleanFile: FileChange = {
				path: "clean.ts",
				content: `
					export function add(a: number, b: number): number {
						return a + b;
					}
					
					export function multiply(a: number, b: number): number {
						return a * b;
					}
				`,
				changeType: "add",
				lineCount: 10,
			};

			// Run threats detection - should find nothing
			const threats = detectThreats(cleanFile.content);
			expect(threats.length).toBe(0);

			// Run complexity analysis - should be low
			const complexityResult = calculateComplexityAggregate([cleanFile]);
			expect(complexityResult.avgComplexity).toBeLessThan(0.3);

			// Run phantom deps check - no external imports
			const imports = extractImports(cleanFile.content);
			const externalImports = imports.filter((i) => !i.startsWith("."));
			expect(externalImports.length).toBe(0);
		});

		it("should handle multiple files with mixed risk levels", () => {
			const files: FileChange[] = [
				{
					path: "safe.ts",
					content: "const x = 1;",
					changeType: "add",
					lineCount: 1,
				},
				{
					path: "risky.ts",
					content: "rm -rf /; password = 'secret';",
					changeType: "add",
					lineCount: 2,
				},
				{
					path: "medium.ts",
					content: "exec(command);",
					changeType: "add",
					lineCount: 1,
				},
			];

			// Test each file's threat level
			const safeThreats = detectThreats(files[0].content);
			const riskyThreats = detectThreats(files[1].content);
			const mediumThreats = detectThreats(files[2].content);

			expect(safeThreats.length).toBe(0);
			expect(riskyThreats.length).toBeGreaterThanOrEqual(2);
			expect(mediumThreats.length).toBeGreaterThan(0);

			// Aggregate complexity
			const complexityResult = calculateComplexityAggregate(files);
			expect(complexityResult.fileCount).toBe(3);
		});
	});

	describe("V1 Guardian behavior equivalence", () => {
		it("should detect critical threats as V1 Guardian.findSecurityIssues()", () => {
			const codeWithSecurityIssues = `
				eval(userInput);
				new Function('return ' + data);
			`;

			const threats = detectThreats(codeWithSecurityIssues);

			// V1 Guardian.findSecurityIssues detected eval() and Function constructor
			expect(threats.some((t) => t.description.includes("eval"))).toBe(true);
		});

		it("should calculate complexity similar to V1 Guardian.calculateComplexity()", () => {
			// V1 used AST-based cyclomatic complexity
			// V2 uses regex-based pattern matching but should produce similar relative results
			const simpleCode: FileChange = {
				path: "simple.ts",
				content: "const x = 1;",
				changeType: "add",
				lineCount: 1,
			};

			const complexCode: FileChange = {
				path: "complex.ts",
				content: `
					function complex() {
						if (a) {
							for (let i = 0; i < 10; i++) {
								while (true) {
									switch (x) {
										case 1: break;
										case 2: break;
									}
								}
							}
						}
					}
				`,
				changeType: "add",
				lineCount: 20,
			};

			const simpleComplexity = calculateComplexityAggregate([simpleCode]);
			const highComplexity = calculateComplexityAggregate([complexCode]);

			// Complex code should have higher complexity
			expect(highComplexity.avgComplexity).toBeGreaterThan(simpleComplexity.avgComplexity);
		});

		it("should detect mock patterns as V1 MockReplacementPlugin", () => {
			const codeWithMocks = `
				jest.mock('./module');
				vi.mock('./other');
				sinon.stub(obj, 'method');
			`;

			const threats = detectThreats(codeWithMocks);

			// V1 MockReplacementPlugin detected these patterns
			expect(threats.some((t) => t.description.includes("jest.mock"))).toBe(true);
			expect(threats.some((t) => t.description.includes("vi.mock"))).toBe(true);
			expect(threats.some((t) => t.description.includes("sinon"))).toBe(true);
		});

		it("should detect secret patterns as V1 SecretDetectionPlugin", () => {
			const codeWithSecrets = `
				const awsKey = "AKIAIOSFODNN7EXAMPLE";
				const password = "secret123";
				const apiKey = "sk-1234567890123456789012345678901234";
			`;

			const threats = detectThreats(codeWithSecrets);

			// V1 SecretDetectionPlugin detected these patterns
			expect(threats.some((t) => t.description.includes("AWS"))).toBe(true);
			expect(threats.some((t) => t.description.includes("password"))).toBe(true);
			expect(threats.some((t) => t.description.includes("OpenAI"))).toBe(true);
		});
	});

	describe("Edge cases", () => {
		it("should handle empty files gracefully", () => {
			const emptyFile: FileChange = {
				path: "empty.ts",
				content: "",
				changeType: "add",
				lineCount: 0,
			};

			const threats = detectThreats(emptyFile.content);
			const complexity = calculateComplexityAggregate([emptyFile]);
			const imports = extractImports(emptyFile.content);

			expect(threats.length).toBe(0);
			expect(complexity.avgComplexity).toBe(0);
			expect(imports.length).toBe(0);
		});

		it("should handle very large content", () => {
			const largeContent = "const x = 1;\n".repeat(10000);
			const largeFile: FileChange = {
				path: "large.ts",
				content: largeContent,
				changeType: "add",
				lineCount: 10000,
			};

			// Should not throw
			const threats = detectThreats(largeFile.content);
			const complexity = calculateComplexityAggregate([largeFile]);

			expect(threats.length).toBe(0);
			// High line count = high complexity
			expect(complexity.avgComplexity).toBeGreaterThanOrEqual(0.9);
		});

		it("should handle special characters in content", () => {
			const specialContent = `
				const regex = /[{}\\[\\]().*+?^$|]/g;
				const template = \`
					Multi-line template with \${expression}
				\`;
			`;

			const threats = detectThreats(specialContent);
			const imports = extractImports(specialContent);

			// Should not throw
			expect(Array.isArray(threats)).toBe(true);
			expect(Array.isArray(imports)).toBe(true);
		});
	});
});
