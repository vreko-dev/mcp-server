/**
 * TestCoverageService Tests
 *
 * Tests for cached test coverage analysis.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns coverage context for files with coverage data
 * - Sad: Returns empty/defaults when no coverage exists
 * - Edge: Low coverage detection, test file inference, cache updates
 * - Error: Gracefully handles corrupted files
 *
 * @module test/services/test-coverage-service
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createTestCoverageService,
	getTestCoverageService,
	TestCoverageService,
	type TestRunResult,
} from "../../src/services/test-coverage-service.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-coverage");

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback/coverage directory
	const coverageDir = join(TEST_WORKSPACE, ".snapback", "coverage");
	if (!existsSync(coverageDir)) {
		mkdirSync(coverageDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

function createCoverageSummary(data: object) {
	const coverageDir = join(TEST_WORKSPACE, "coverage");
	if (!existsSync(coverageDir)) {
		mkdirSync(coverageDir, { recursive: true });
	}
	writeFileSync(join(coverageDir, "coverage-summary.json"), JSON.stringify(data, null, 2));
}

function createTestMap(mappings: Record<string, string[]>) {
	const cacheDir = join(TEST_WORKSPACE, ".snapback", "coverage");
	writeFileSync(join(cacheDir, "test-map.json"), JSON.stringify(mappings, null, 2));
}

function createTestFile(relativePath: string) {
	const fullPath = join(TEST_WORKSPACE, relativePath);
	const dir = join(fullPath, "..");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(fullPath, "// test file");
}

// =============================================================================
// Unit Tests
// =============================================================================

describe("TestCoverageService", () => {
	let service: TestCoverageService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new TestCoverageService(TEST_WORKSPACE);
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ===========================================================================
	// HAPPY PATH
	// ===========================================================================

	describe("Happy Path", () => {
		it("should return coverage context for files", () => {
			createCoverageSummary({
				total: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } },
				"src/utils.ts": { lines: { pct: 95 }, functions: { pct: 100 }, branches: { pct: 90 } },
			});

			const result = service.getContextForFiles([join(TEST_WORKSPACE, "src/utils.ts")]);

			expect(result.files[join(TEST_WORKSPACE, "src/utils.ts")]).toBeDefined();
			expect(result.files[join(TEST_WORKSPACE, "src/utils.ts")].coverage).toEqual({
				lines: 95,
				functions: 100,
				branches: 90,
			});
		});

		it("should calculate summary statistics", () => {
			createCoverageSummary({
				total: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } },
				"src/a.ts": { lines: { pct: 80 }, functions: { pct: 85 }, branches: { pct: 75 } },
				"src/b.ts": { lines: { pct: 90 }, functions: { pct: 95 }, branches: { pct: 85 } },
			});

			const result = service.getContextForFiles([
				join(TEST_WORKSPACE, "src/a.ts"),
				join(TEST_WORKSPACE, "src/b.ts"),
			]);

			expect(result.summary.totalFiles).toBe(2);
			expect(result.summary.averageCoverage).toBe(85); // (80 + 90) / 2
		});

		it("should return project-wide coverage", () => {
			createCoverageSummary({
				total: { lines: { pct: 85 }, functions: { pct: 90 }, branches: { pct: 80 } },
			});

			const coverage = service.getProjectCoverage();

			expect(coverage).toEqual({
				lines: 85,
				functions: 90,
				branches: 80,
			});
		});

		it("should detect files with tests via test map", () => {
			createTestMap({
				"src/utils.ts": ["test/utils.test.ts"],
			});

			const hasTests = service.hasTests(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(hasTests).toBe(true);
		});

		it("should return test files for a source file", () => {
			createTestMap({
				"src/utils.ts": ["test/utils.test.ts", "test/utils.spec.ts"],
			});

			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(testFiles).toContain("test/utils.test.ts");
			expect(testFiles).toContain("test/utils.spec.ts");
		});

		it("should track files with tests in summary", () => {
			createTestMap({
				"src/a.ts": ["test/a.test.ts"],
			});

			const result = service.getContextForFiles([
				join(TEST_WORKSPACE, "src/a.ts"),
				join(TEST_WORKSPACE, "src/b.ts"), // No test
			]);

			expect(result.summary.filesWithTests).toBe(1);
		});
	});

	// ===========================================================================
	// SAD PATH
	// ===========================================================================

	describe("Sad Path", () => {
		it("should return empty coverage when no coverage file exists", () => {
			const result = service.getContextForFiles([join(TEST_WORKSPACE, "src/utils.ts")]);

			expect(result.files[join(TEST_WORKSPACE, "src/utils.ts")].coverage).toBeUndefined();
		});

		it("should return zeros for project coverage when no data exists", () => {
			const coverage = service.getProjectCoverage();

			// Implementation returns default zeros when no coverage file exists
			expect(coverage).toEqual({
				lines: 0,
				functions: 0,
				branches: 0,
			});
		});

		it("should return false for hasTests when no tests exist", () => {
			const hasTests = service.hasTests(join(TEST_WORKSPACE, "src/unknown.ts"));

			expect(hasTests).toBe(false);
		});

		it("should return empty array for test files when none exist", () => {
			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/unknown.ts"));

			expect(testFiles).toEqual([]);
		});

		it("should return null for last test run when no cache exists", () => {
			const lastRun = service.getLastTestRun();

			expect(lastRun).toBeNull();
		});

		it("should handle empty file list", () => {
			const result = service.getContextForFiles([]);

			expect(result.summary.totalFiles).toBe(0);
			expect(result.summary.filesWithTests).toBe(0);
			expect(result.summary.averageCoverage).toBe(0);
		});
	});

	// ===========================================================================
	// EDGE CASES
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should find low coverage files", () => {
			createCoverageSummary({
				total: { lines: { pct: 60 }, functions: { pct: 70 }, branches: { pct: 50 } },
				"src/good.ts": { lines: { pct: 90 }, functions: { pct: 95 }, branches: { pct: 85 } },
				"src/bad.ts": { lines: { pct: 30 }, functions: { pct: 40 }, branches: { pct: 25 } },
				"src/medium.ts": { lines: { pct: 55 }, functions: { pct: 60 }, branches: { pct: 50 } },
			});

			const lowCoverage = service.getLowCoverageFiles(50);

			expect(lowCoverage).toContain("src/bad.ts");
			expect(lowCoverage).not.toContain("src/good.ts");
			expect(lowCoverage).not.toContain("src/medium.ts"); // 55 >= 50
		});

		it("should sort low coverage files by coverage ascending", () => {
			createCoverageSummary({
				total: { lines: { pct: 50 }, functions: { pct: 50 }, branches: { pct: 50 } },
				"src/worst.ts": { lines: { pct: 10 }, functions: { pct: 20 }, branches: { pct: 15 } },
				"src/bad.ts": { lines: { pct: 30 }, functions: { pct: 40 }, branches: { pct: 35 } },
				"src/ok.ts": { lines: { pct: 45 }, functions: { pct: 50 }, branches: { pct: 40 } },
			});

			const lowCoverage = service.getLowCoverageFiles(50);

			expect(lowCoverage[0]).toBe("src/worst.ts");
			expect(lowCoverage[1]).toBe("src/bad.ts");
			expect(lowCoverage[2]).toBe("src/ok.ts");
		});

		it("should infer test files from naming conventions", () => {
			// Create test files that match naming conventions
			createTestFile("src/utils.test.ts");
			createTestFile("src/helpers.spec.ts");

			const utilsTests = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.ts"));
			const helpersTests = service.getTestFiles(join(TEST_WORKSPACE, "src/helpers.ts"));

			expect(utilsTests).toContain(join(TEST_WORKSPACE, "src/utils.test.ts"));
			expect(helpersTests).toContain(join(TEST_WORKSPACE, "src/helpers.spec.ts"));
		});

		it("should infer test files from __tests__ directory", () => {
			createTestFile("src/__tests__/utils.test.ts");

			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(testFiles).toContain(join(TEST_WORKSPACE, "src/__tests__/utils.test.ts"));
		});

		it("should not infer tests for test files themselves", () => {
			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.test.ts"));

			expect(testFiles).toEqual([]);
		});

		it("should update test run cache", () => {
			const results: TestRunResult[] = [
				{ file: "test/a.test.ts", passed: true, duration: 100 },
				{ file: "test/b.test.ts", passed: false, duration: 200 },
			];

			service.updateFromTestRun(results);
			const lastRun = service.getLastTestRun();

			expect(lastRun).not.toBeNull();
			expect(lastRun!.results).toHaveLength(2);
			expect(lastRun!.results[0].passed).toBe(true);
			expect(lastRun!.results[1].passed).toBe(false);
			expect(lastRun!.timestamp).toBeGreaterThan(0);
		});

		it("should update test map", () => {
			service.updateTestMap({
				"src/utils.ts": ["test/utils.test.ts"],
				"src/helpers.ts": ["test/helpers.test.ts"],
			});

			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(testFiles).toContain("test/utils.test.ts");
		});

		it("should handle coverage from .vitest directory", () => {
			// Create coverage in .vitest location
			const vitestDir = join(TEST_WORKSPACE, ".vitest", "coverage");
			mkdirSync(vitestDir, { recursive: true });
			writeFileSync(
				join(vitestDir, "coverage-summary.json"),
				JSON.stringify({
					total: { lines: { pct: 75 }, functions: { pct: 80 }, branches: { pct: 70 } },
				}),
			);

			const coverage = service.getProjectCoverage();

			expect(coverage).toEqual({
				lines: 75,
				functions: 80,
				branches: 70,
			});
		});

		it("should handle tsx files", () => {
			createTestFile("src/Component.test.tsx");

			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/Component.tsx"));

			expect(testFiles).toContain(join(TEST_WORKSPACE, "src/Component.test.tsx"));
		});
	});

	// ===========================================================================
	// ERROR HANDLING
	// ===========================================================================

	describe("Error Handling", () => {
		it("should handle corrupted coverage file", () => {
			const coverageDir = join(TEST_WORKSPACE, "coverage");
			mkdirSync(coverageDir, { recursive: true });
			writeFileSync(join(coverageDir, "coverage-summary.json"), "{ invalid json");

			const coverage = service.getProjectCoverage();

			// Falls back to default zeros when coverage file is corrupted
			expect(coverage).toEqual({
				lines: 0,
				functions: 0,
				branches: 0,
			});
		});

		it("should handle corrupted test map", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "coverage");
			writeFileSync(join(cacheDir, "test-map.json"), "{ invalid json");

			const testFiles = service.getTestFiles(join(TEST_WORKSPACE, "src/utils.ts"));

			expect(testFiles).toEqual([]);
		});

		it("should handle corrupted last run cache", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "coverage");
			writeFileSync(join(cacheDir, "last-run.json"), "{ invalid json");

			const lastRun = service.getLastTestRun();

			expect(lastRun).toBeNull();
		});

		it("should create cache directory if it doesn't exist", () => {
			rmSync(join(TEST_WORKSPACE, ".snapback"), { recursive: true, force: true });

			service.updateFromTestRun([{ file: "test.ts", passed: true, duration: 100 }]);

			expect(existsSync(join(TEST_WORKSPACE, ".snapback", "coverage", "last-run.json"))).toBe(true);
		});
	});

	// ===========================================================================
	// FACTORY FUNCTIONS
	// ===========================================================================

	describe("Factory Functions", () => {
		it("should create service with createTestCoverageService", () => {
			const svc = createTestCoverageService(TEST_WORKSPACE);

			expect(svc).toBeInstanceOf(TestCoverageService);
		});

		it("should return singleton with getTestCoverageService", () => {
			const svc1 = getTestCoverageService(TEST_WORKSPACE);
			const svc2 = getTestCoverageService(TEST_WORKSPACE);

			expect(svc1).toBe(svc2);
		});

		it("should return different instances for different workspaces", () => {
			const svc1 = getTestCoverageService(TEST_WORKSPACE);
			const svc2 = getTestCoverageService("/different/workspace");

			expect(svc1).not.toBe(svc2);
		});
	});
});
