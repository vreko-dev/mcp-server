/**
 * ErrorCacheService Tests
 *
 * TDD RED phase: These tests define expected behavior for the ErrorCacheService.
 * Tests are written first to guide implementation.
 *
 * @module test/services/error-cache-service
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ErrorCacheService } from "../../src/services/error-cache-service.js";
import type { CachedError } from "../../src/types/context.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-error-cache");

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

// =============================================================================
// Unit Tests
// =============================================================================

describe("ErrorCacheService", () => {
	let service: ErrorCacheService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new ErrorCacheService(TEST_WORKSPACE);
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	describe("cacheErrors", () => {
		it("should create cache directory if it does not exist", () => {
			const errors: CachedError[] = [
				{
					file: "src/index.ts",
					line: 10,
					message: "Property 'foo' does not exist",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
					code: "TS2339",
				},
			];

			service.cacheErrors(errors);

			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			expect(existsSync(cacheDir)).toBe(true);
		});

		it("should write errors to JSONL file by source type", () => {
			const errors: CachedError[] = [
				{
					file: "src/index.ts",
					line: 10,
					message: "Property 'foo' does not exist",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
					code: "TS2339",
				},
			];

			service.cacheErrors(errors);

			const tsErrorsPath = join(TEST_WORKSPACE, ".snapback", "errors", "typescript.jsonl");
			expect(existsSync(tsErrorsPath)).toBe(true);

			const content = readFileSync(tsErrorsPath, "utf8");
			const lines = content.split("\n").filter(Boolean);
			expect(lines.length).toBe(1);

			const parsed = JSON.parse(lines[0]);
			expect(parsed.file).toBe("src/index.ts");
			expect(parsed.code).toBe("TS2339");
		});

		it("should append multiple errors to the same file", () => {
			const errors1: CachedError[] = [
				{
					file: "src/a.ts",
					line: 1,
					message: "Error 1",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
			];

			const errors2: CachedError[] = [
				{
					file: "src/b.ts",
					line: 2,
					message: "Error 2",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
			];

			service.cacheErrors(errors1);
			service.cacheErrors(errors2);

			const tsErrorsPath = join(TEST_WORKSPACE, ".snapback", "errors", "typescript.jsonl");
			const content = readFileSync(tsErrorsPath, "utf8");
			const lines = content.split("\n").filter(Boolean);
			expect(lines.length).toBe(2);
		});

		it("should separate errors by source type", () => {
			const errors: CachedError[] = [
				{
					file: "src/a.ts",
					line: 1,
					message: "TS Error",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
				{
					file: "src/a.test.ts",
					line: 10,
					message: "Test failed",
					severity: "error",
					timestamp: Date.now(),
					source: "test",
				},
			];

			service.cacheErrors(errors);

			const tsPath = join(TEST_WORKSPACE, ".snapback", "errors", "typescript.jsonl");
			const testPath = join(TEST_WORKSPACE, ".snapback", "errors", "test.jsonl");

			expect(existsSync(tsPath)).toBe(true);
			expect(existsSync(testPath)).toBe(true);
		});
	});

	describe("getErrorsForFiles", () => {
		it("should return empty array when no cache exists", () => {
			const errors = service.getErrorsForFiles(["src/index.ts"]);
			expect(errors).toEqual([]);
		});

		it("should return cached errors for matching files", () => {
			// Pre-populate cache
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const cachedError = {
				file: "src/index.ts",
				line: 10,
				message: "Property 'foo' does not exist",
				severity: "error",
				timestamp: Date.now(),
				source: "typescript",
				code: "TS2339",
			};

			writeFileSync(join(cacheDir, "typescript.jsonl"), JSON.stringify(cachedError) + "\n");

			const errors = service.getErrorsForFiles(["src/index.ts"]);
			expect(errors.length).toBe(1);
			expect(errors[0].file).toBe("src/index.ts");
			expect(errors[0].code).toBe("TS2339");
		});

		it("should filter errors by file path", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const errors = [
				{
					file: "src/a.ts",
					line: 1,
					message: "Error A",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
				{
					file: "src/b.ts",
					line: 2,
					message: "Error B",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
				{
					file: "src/c.ts",
					line: 3,
					message: "Error C",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
			];

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			const result = service.getErrorsForFiles(["src/a.ts", "src/c.ts"]);
			expect(result.length).toBe(2);
			expect(result.map((e) => e.file).sort()).toEqual(["src/a.ts", "src/c.ts"]);
		});

		it("should exclude errors older than 7 days", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const now = Date.now();
			const oldTimestamp = now - 8 * 24 * 60 * 60 * 1000; // 8 days ago

			const errors = [
				{
					file: "src/old.ts",
					line: 1,
					message: "Old error",
					severity: "error",
					timestamp: oldTimestamp,
					source: "typescript",
				},
				{
					file: "src/new.ts",
					line: 2,
					message: "New error",
					severity: "error",
					timestamp: now,
					source: "typescript",
				},
			];

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			const result = service.getErrorsForFiles(["src/old.ts", "src/new.ts"]);
			expect(result.length).toBe(1);
			expect(result[0].file).toBe("src/new.ts");
		});

		it("should include age field in returned errors", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

			const error = {
				file: "src/index.ts",
				line: 1,
				message: "Error",
				severity: "error",
				timestamp: twoHoursAgo,
				source: "typescript",
			};

			writeFileSync(join(cacheDir, "typescript.jsonl"), JSON.stringify(error) + "\n");

			const result = service.getErrorsForFiles(["src/index.ts"]);
			expect(result.length).toBe(1);
			expect(result[0]).toHaveProperty("age");
			expect(result[0].age).toMatch(/\d+h/); // e.g., "2h"
		});

		it("should deduplicate errors with same file, line, and message", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const now = Date.now();
			const errors = [
				{
					file: "src/index.ts",
					line: 10,
					message: "Same error",
					severity: "error",
					timestamp: now - 1000,
					source: "typescript",
				},
				{
					file: "src/index.ts",
					line: 10,
					message: "Same error",
					severity: "error",
					timestamp: now,
					source: "typescript",
				},
			];

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			const result = service.getErrorsForFiles(["src/index.ts"]);
			expect(result.length).toBe(1);
		});
	});

	describe("prune", () => {
		it("should remove errors older than 7 days", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const now = Date.now();
			const oldTimestamp = now - 8 * 24 * 60 * 60 * 1000;

			const errors = [
				{
					file: "src/old.ts",
					line: 1,
					message: "Old",
					severity: "error",
					timestamp: oldTimestamp,
					source: "typescript",
				},
				{
					file: "src/new.ts",
					line: 2,
					message: "New",
					severity: "error",
					timestamp: now,
					source: "typescript",
				},
			];

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			const result = service.prune();
			expect(result.removed).toBe(1);

			const content = readFileSync(join(cacheDir, "typescript.jsonl"), "utf8");
			const lines = content.split("\n").filter(Boolean);
			expect(lines.length).toBe(1);
			expect(JSON.parse(lines[0]).file).toBe("src/new.ts");
		});

		it("should keep at most 100 entries per source type", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const now = Date.now();
			const errors = Array.from({ length: 150 }, (_, i) => ({
				file: `src/file${i}.ts`,
				line: i,
				message: `Error ${i}`,
				severity: "error",
				timestamp: now - i * 1000, // Most recent first
				source: "typescript",
			}));

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			const result = service.prune();
			expect(result.removed).toBe(50);

			const content = readFileSync(join(cacheDir, "typescript.jsonl"), "utf8");
			const lines = content.split("\n").filter(Boolean);
			expect(lines.length).toBe(100);
		});
	});

	describe("clearForFile", () => {
		it("should remove all cached errors for a specific file", () => {
			const cacheDir = join(TEST_WORKSPACE, ".snapback", "errors");
			mkdirSync(cacheDir, { recursive: true });

			const errors = [
				{
					file: "src/a.ts",
					line: 1,
					message: "Error A1",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
				{
					file: "src/a.ts",
					line: 2,
					message: "Error A2",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
				{
					file: "src/b.ts",
					line: 3,
					message: "Error B",
					severity: "error",
					timestamp: Date.now(),
					source: "typescript",
				},
			];

			writeFileSync(join(cacheDir, "typescript.jsonl"), errors.map((e) => JSON.stringify(e)).join("\n") + "\n");

			service.clearForFile("src/a.ts");

			const content = readFileSync(join(cacheDir, "typescript.jsonl"), "utf8");
			const lines = content.split("\n").filter(Boolean);
			expect(lines.length).toBe(1);
			expect(JSON.parse(lines[0]).file).toBe("src/b.ts");
		});
	});
});
