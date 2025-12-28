/**
 * lookup_exports Tests
 *
 * TDD RED Phase: Tests for resolving valid import paths
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Returns export completions for valid partial paths
 * - Sad: Returns empty when no matches found
 * - Edge: Multiple matches, nested exports
 * - Error: Handles invalid package gracefully
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleLookupExports } from "../../src/facades/handlers.js";
import type { ToolContext } from "../../src/registry.js";

// ============================================================================
// Test Setup
// ============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-lookup-exports");

function createTestContext(overrides?: Partial<ToolContext>): ToolContext {
	return {
		workspaceRoot: TEST_WORKSPACE,
		tier: "pro",
		userId: "test-user",
		...overrides,
	};
}

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create .snapback directory
	const snapbackDir = join(TEST_WORKSPACE, ".snapback");
	if (!existsSync(snapbackDir)) {
		mkdirSync(snapbackDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

/**
 * Create a mock package with exports
 */
function createMockPackage(name: string, exports: Record<string, string> | string, files?: Record<string, string>) {
	const pkgDir = join(TEST_WORKSPACE, "node_modules", ...name.split("/"));
	mkdirSync(pkgDir, { recursive: true });

	// Create package.json with exports
	const packageJson = {
		name,
		version: "1.0.0",
		exports,
		main: typeof exports === "string" ? exports : exports["."],
	};
	writeFileSync(join(pkgDir, "package.json"), JSON.stringify(packageJson, null, 2));

	// Create source files
	if (files) {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = join(pkgDir, filePath);
			const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
			mkdirSync(dir, { recursive: true });
			writeFileSync(fullPath, content);
		}
	}
}

/**
 * Create the local packages (like @snapback/core)
 */
function createLocalPackages() {
	// Create @snapback/core package
	const coreDir = join(TEST_WORKSPACE, "packages", "core");
	mkdirSync(coreDir, { recursive: true });

	// package.json with exports map
	const corePackageJson = {
		name: "@snapback/core",
		version: "0.1.0",
		exports: {
			".": "./dist/index.js",
			"./analysis": "./dist/analysis/index.js",
			"./signals": "./dist/signals/index.js",
			"./types": "./dist/types/index.js",
		},
	};
	writeFileSync(join(coreDir, "package.json"), JSON.stringify(corePackageJson, null, 2));

	// Create source files
	const srcDir = join(coreDir, "src");
	mkdirSync(join(srcDir, "analysis"), { recursive: true });
	mkdirSync(join(srcDir, "signals"), { recursive: true });
	mkdirSync(join(srcDir, "types"), { recursive: true });

	writeFileSync(
		join(srcDir, "index.ts"),
		`export { createSnapshot } from "./snapshot.js";
export { validateInput } from "./validation.js";`,
	);
	writeFileSync(
		join(srcDir, "analysis", "index.ts"),
		`export { analyzeSkippedTests } from "./skipped-tests.js";
export { analyzeCoverage } from "./coverage.js";`,
	);
	writeFileSync(
		join(srcDir, "signals", "index.ts"),
		`export { PressureSignal } from "./pressure.js";
export { TemperatureSignal } from "./temperature.js";`,
	);
	writeFileSync(
		join(srcDir, "types", "index.ts"),
		`export type { Snapshot } from "./snapshot.js";
export type { Analysis } from "./analysis.js";`,
	);
}

// ============================================================================
// Tests
// ============================================================================

describe("lookup_exports", () => {
	const ctx = createTestContext();

	beforeEach(() => {
		setupTestWorkspace();
		createLocalPackages();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should return export completions for partial package path", async () => {
			const result = await handleLookupExports(
				{
					query: "@snapback/core/an",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			expect(Array.isArray(data.matches)).toBe(true);
			expect(data.matches.length).toBeGreaterThan(0);

			// Should match ./analysis
			const analysisMatch = data.matches.find((m: { path: string }) => m.path === "@snapback/core/analysis");
			expect(analysisMatch).toBeDefined();
		});

		it("should return exports from matched subpath", async () => {
			const result = await handleLookupExports(
				{
					query: "@snapback/core/analysis",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			expect(data.matches.length).toBeGreaterThan(0);

			// Should have exports info
			const match = data.matches[0];
			expect(match.exports).toBeDefined();
			expect(match.exports).toContain("analyzeSkippedTests");
		});

		it("should return all subpaths for package root query", async () => {
			const result = await handleLookupExports(
				{
					query: "@snapback/core",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();

			// Should list all available subpaths
			const paths = data.matches.map((m: { path: string }) => m.path);
			expect(paths).toContain("@snapback/core");
			expect(paths).toContain("@snapback/core/analysis");
			expect(paths).toContain("@snapback/core/signals");
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty matches for non-existent package", async () => {
			const result = await handleLookupExports(
				{
					query: "@nonexistent/package",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			expect(data.matches.length).toBe(0);
		});

		it("should return empty matches for non-matching subpath", async () => {
			const result = await handleLookupExports(
				{
					query: "@snapback/core/nonexistent",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			expect(data.matches.length).toBe(0);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should handle packages with simple main export only", async () => {
			createMockPackage("simple-pkg", "./dist/index.js", {
				"dist/index.js": "export const foo = 1;",
			});

			const result = await handleLookupExports(
				{
					query: "simple-pkg",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			expect(data.matches.length).toBe(1);
		});

		it("should handle relative paths in local packages", async () => {
			const result = await handleLookupExports(
				{
					query: "./packages/core/src/ana",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			// Should find analysis directory
			if (data.matches.length > 0) {
				const match = data.matches[0];
				expect(match.path).toContain("analysis");
			}
		});

		it("should include type information when available", async () => {
			const result = await handleLookupExports(
				{
					query: "@snapback/core/types",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			// The match should exist if the package was found
			if (data.matches.length > 0) {
				const match = data.matches[0];
				expect(match.path).toBe("@snapback/core/types");
				// hasTypes should be true when we have type exports in the source
				// Note: exports may be extracted from src/types/index.ts
				expect(match.hasTypes).toBeDefined();
			}
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe("Error Handling", () => {
		it("should handle missing query gracefully", async () => {
			const result = await handleLookupExports({}, ctx);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBe(true);
			expect(data.error).toBeDefined();
		});

		it("should handle malformed package.json gracefully", async () => {
			// Create package with invalid package.json
			const pkgDir = join(TEST_WORKSPACE, "node_modules", "malformed-pkg");
			mkdirSync(pkgDir, { recursive: true });
			writeFileSync(join(pkgDir, "package.json"), "{ invalid json }");

			const result = await handleLookupExports(
				{
					query: "malformed-pkg",
				},
				ctx,
			);
			const data = JSON.parse(result.content[0].text);

			expect(result.isError).toBeFalsy();
			expect(data.matches).toBeDefined();
			// Should handle gracefully with empty matches
		});
	});
});
