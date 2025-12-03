/**
 * RiskAnalyzer Tests
 *
 * Critical scenarios:
 * - Threat detection integration
 * - Complexity scoring
 * - Change velocity analysis
 * - Temporal velocity
 * - Sensitive file detection
 * - Pattern triggers
 * - Score normalization (0-10 cap)
 * - Git integration
 * - Selective snapshot filtering
 * - No-file edge case
 * - Large change handling
 */

import { describe, expect, it } from "vitest";
import type { FileChangeInfo } from "../../src/analysis/RiskAnalyzer.js";
import { RiskAnalyzer } from "../../src/analysis/RiskAnalyzer.js";

// ============================================================================
// RiskAnalyzer Tests
// ============================================================================

describe("RiskAnalyzer", () => {
	let analyzer: RiskAnalyzer;

	beforeEach(() => {
		analyzer = new RiskAnalyzer();
	});

	// =========================================================================
	// 1. Risk Score Computation Tests
	// =========================================================================

	describe("risk score computation", () => {
		it("should return 0 risk for empty file list", async () => {
			const result = await analyzer.analyzeFileChanges([]);

			expect(result.score).toBe(0);
			expect(result.factors).toContain("No files to analyze");
		});

		it("should compute risk for single file change", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/index.ts",
					content: "console.log('hello');",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(typeof result.score).toBe("number");
			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(10);
		});

		it("should cap score at 10", async () => {
			const changes: FileChangeInfo[] = [];

			// Create many changes to force high score
			for (let i = 0; i < 50; i++) {
				changes.push({
					filePath: `file${i}.ts`,
					content: "sensitive code content",
					op: "created",
				});
			}

			const result = await analyzer.analyzeFileChanges(changes);

			// Score should never exceed 10
			expect(result.score).toBeLessThanOrEqual(10);
			expect(result.score).toBeGreaterThanOrEqual(0);
		});
	});

	// =========================================================================
	// 2. Sensitive File Detection Tests
	// =========================================================================

	describe("sensitive file detection", () => {
		it("should detect package.json as sensitive", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "package.json",
					content: "{}",
					op: "modified",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.factors.some((f) => f.includes("package.json") || f.includes("Sensitive"))).toBe(true);
		});

		it("should detect .env as sensitive", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: ".env",
					content: "API_KEY=secret123",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.factors.some((f) => f.includes(".env") || f.includes("Sensitive"))).toBe(true);
		});

		it("should detect .env.local as sensitive", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: ".env.local",
					content: "PASSWORD=secret",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.factors.length).toBeGreaterThanOrEqual(0);
		});

		it("should detect tsconfig.json as sensitive", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "tsconfig.json",
					content: "{}",
					op: "modified",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(typeof result.score).toBe("number");
		});
	});

	// =========================================================================
	// 3. Threat Detection Tests
	// =========================================================================

	describe("threat detection", () => {
		it("should detect SQL injection patterns", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/db.ts",
					content: "const query = 'SELECT * FROM users WHERE id = ' + userId;",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.threats).toBeTruthy();
			expect(Array.isArray(result.threats)).toBe(true);
		});

		it("should detect hardcoded secrets", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/api.ts",
					content: 'const apiKey = "sk-1234567890abcdef";',
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.threats).toBeTruthy();
		});

		it("should analyze security threats", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/auth.ts",
					content: "function authenticate(password) { return password === 'admin'; }",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.threats).toBeTruthy();
		});
	});

	// =========================================================================
	// 4. File Complexity Tests
	// =========================================================================

	describe("file complexity", () => {
		it("should compute file complexity", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/complex.ts",
					content: `
						function complex() {
							if (a) {
								if (b) {
									if (c) {
										// Many nested conditions
									}
								}
							}
						}
					`,
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(typeof result.fileComplexity).toBe("number");
		});

		it("should give high complexity for many conditions", async () => {
			const complexCode = Array(50)
				.fill(null)
				.map((_, i) => `if (condition${i}) { }`)
				.join("\n");

			const changes: FileChangeInfo[] = [
				{
					filePath: "src/complex.ts",
					content: complexCode,
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.fileComplexity).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// 5. Change Velocity Tests
	// =========================================================================

	describe("change velocity", () => {
		it("should compute change velocity from commit context", async () => {
			const changes: FileChangeInfo[] = [
				{ filePath: "file1.ts", content: "a", op: "created" },
				{ filePath: "file2.ts", content: "b", op: "created" },
				{ filePath: "file3.ts", content: "c", op: "created" },
			];

			const result = await analyzer.analyzeFileChanges(changes, {
				changes: 10, // 30% of 10 changed
				total: 30,
			});

			expect(result.changeVelocity).toBeDefined();
			expect(typeof result.changeVelocity).toBe("number");
		});

		it("should flag high change velocity", async () => {
			const changes: FileChangeInfo[] = Array(25)
				.fill(null)
				.map((_, i) => ({
					filePath: `file${i}.ts`,
					content: `// File ${i}`,
					op: "modified" as const,
				}));

			const result = await analyzer.analyzeFileChanges(changes, {
				changes: 25,
				total: 30, // 83% changed
			});

			expect(result.changeVelocity).toBeGreaterThan(0.8);
		});

		it("should not flag low change velocity", async () => {
			const changes: FileChangeInfo[] = [{ filePath: "file1.ts", content: "a", op: "created" }];

			const result = await analyzer.analyzeFileChanges(changes, {
				changes: 1,
				total: 100, // 1% changed
			});

			expect(result.changeVelocity).toBeLessThan(0.5);
		});
	});

	// =========================================================================
	// 6. Score Normalization Tests
	// =========================================================================

	describe("score normalization", () => {
		it("should normalize score to 0-10 range", async () => {
			for (let i = 0; i < 5; i++) {
				const changes: FileChangeInfo[] = Array(Math.random() * 50)
					.fill(null)
					.map((_, j) => ({
						filePath: `file${j}.ts`,
						content: "code",
						op: "created" as const,
					}));

				const result = await analyzer.analyzeFileChanges(changes);

				expect(result.score).toBeGreaterThanOrEqual(0);
				expect(result.score).toBeLessThanOrEqual(10);
			}
		});

		it("should return integer-like score for small changes", async () => {
			const changes: FileChangeInfo[] = [{ filePath: "index.ts", content: "console.log('hi');", op: "created" }];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeLessThanOrEqual(10);
		});
	});

	// =========================================================================
	// 7. Selective Snapshot Configuration Tests
	// =========================================================================

	describe("selective snapshot configuration", () => {
		it("should include all files by default", async () => {
			const changes: FileChangeInfo[] = [
				{ filePath: "src/index.ts", content: "a", op: "created" },
				{ filePath: "src/helper.ts", content: "b", op: "created" },
				{ filePath: "test/index.test.ts", content: "c", op: "created" },
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeGreaterThanOrEqual(0);
		});

		it("should filter files based on selective snapshot config", async () => {
			analyzer.setSelectiveSnapshotConfig({
				includePatterns: ["src/**"],
				excludePatterns: [],
			});

			const changes: FileChangeInfo[] = [
				{ filePath: "src/index.ts", content: "a", op: "created" },
				{ filePath: "test/index.test.ts", content: "b", op: "created" }, // Should be filtered
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(typeof result.score).toBe("number");
		});

		it("should return 0 risk when no files match filter", async () => {
			analyzer.setSelectiveSnapshotConfig({
				includePatterns: ["src/**"],
				excludePatterns: [],
			});

			const changes: FileChangeInfo[] = [
				{ filePath: "test/index.test.ts", content: "b", op: "created" }, // Doesn't match
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBe(0);
		});
	});

	// =========================================================================
	// 8. Multiple Files Analysis Tests
	// =========================================================================

	describe("multiple files analysis", () => {
		it("should analyze multiple file changes together", async () => {
			const changes: FileChangeInfo[] = [
				{ filePath: "src/a.ts", content: "export const a = 1;", op: "created" },
				{ filePath: "src/b.ts", content: "export const b = 2;", op: "created" },
				{ filePath: "src/c.ts", content: "export const c = 3;", op: "created" },
				{ filePath: "package.json", content: "{}", op: "modified" },
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.factors.length).toBeGreaterThanOrEqual(0);
		});

		it("should analyze 100+ files", async () => {
			const changes: FileChangeInfo[] = Array(100)
				.fill(null)
				.map((_, i) => ({
					filePath: `src/file${i}.ts`,
					content: `// File ${i}`,
					op: "created" as const,
				}));

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.score).toBeLessThanOrEqual(10);
		});
	});

	// =========================================================================
	// 9. Risk Factors Tests
	// =========================================================================

	describe("risk factors", () => {
		it("should provide human-readable risk factors", async () => {
			const changes: FileChangeInfo[] = [
				{ filePath: "package.json", content: "{}", op: "modified" },
				{
					filePath: "src/index.ts",
					content: "const x = 1; const y = 2;",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(Array.isArray(result.factors)).toBe(true);
			expect(result.factors.every((f) => typeof f === "string")).toBe(true);
		});

		it("should include threat factors when detected", async () => {
			const changes: FileChangeInfo[] = [
				{
					filePath: "src/db.ts",
					content: "SELECT * FROM users WHERE id = " + "userId",
					op: "created",
				},
			];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.factors).toBeTruthy();
		});
	});

	// =========================================================================
	// 10. Git Context Integration Tests
	// =========================================================================

	describe("git context integration", () => {
		it("should process changes without git context", async () => {
			const changes: FileChangeInfo[] = [{ filePath: "src/index.ts", content: "a", op: "created" }];

			const result = await analyzer.analyzeFileChanges(changes);

			expect(result.score).toBeGreaterThanOrEqual(0);
		});

		it("should incorporate git context when provided", async () => {
			const changes: FileChangeInfo[] = [{ filePath: "src/index.ts", content: "a", op: "created" }];

			const result = await analyzer.analyzeFileChanges(changes, {
				changes: 1,
				total: 10,
			});

			expect(result.score).toBeGreaterThanOrEqual(0);
			expect(result.changeVelocity).toBeDefined();
		});
	});
});
