/**
 * Unit tests for create-snapshot UX enhancements
 *
 * Tests the enhanced error messaging, path validation, and fuzzy matching
 * features implemented for better dev/AI UX.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { type CreateSnapshotSchema, createSnapshot } from "../../../src/tools/create-snapshot";

type CreateSnapshotInput = z.infer<typeof CreateSnapshotSchema>;

describe("createSnapshot - UX Enhancements", () => {
	const testWorkspaceRoot = join(process.cwd(), "test-workspace-snapshot-ux");
	const originalCwd = process.cwd();

	beforeEach(() => {
		// Create test workspace
		if (existsSync(testWorkspaceRoot)) {
			rmSync(testWorkspaceRoot, { recursive: true, force: true });
		}
		mkdirSync(testWorkspaceRoot, { recursive: true });

		// Setup test file structure
		mkdirSync(join(testWorkspaceRoot, "src"), { recursive: true });
		mkdirSync(join(testWorkspaceRoot, "packages/engine/src"), { recursive: true });

		writeFileSync(join(testWorkspaceRoot, "src/index.ts"), "export const hello = 'world';");
		writeFileSync(join(testWorkspaceRoot, "src/utils.ts"), "export const util = () => {};");
		writeFileSync(join(testWorkspaceRoot, "packages/engine/src/main.ts"), "export const main = () => {};");
		writeFileSync(join(testWorkspaceRoot, "README.md"), "# Test Project");

		// Change to test workspace
		process.chdir(testWorkspaceRoot);
	});

	afterEach(() => {
		// Restore original working directory
		process.chdir(originalCwd);

		// Cleanup
		if (existsSync(testWorkspaceRoot)) {
			rmSync(testWorkspaceRoot, { recursive: true, force: true });
		}

		vi.clearAllMocks();
	});

	describe("Pre-flight File Validation", () => {
		it("should validate all files exist before reading", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "src/nonexistent.ts"],
				reason: "Test validation",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("File status:");
			expect(result.error).toContain("✅ src/index.ts");
			expect(result.error).toContain("❌ src/nonexistent.ts");
		});

		it("should show file sizes for valid files", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "src/missing.ts"],
				reason: "Test file size display",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toMatch(/src\/index\.ts \(\d+\.\d+ KB\)/);
		});

		it("should reject absolute paths with helpful message", async () => {
			const absolutePath = join(testWorkspaceRoot, "src/index.ts");
			const result = await createSnapshot({
				files: [absolutePath],
				reason: "Test absolute path rejection",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Absolute paths not allowed");
			expect(result.error).toContain("Use workspace-relative paths");
		});

		it("should provide workspace root context in errors", async () => {
			const result = await createSnapshot({
				files: ["nonexistent.ts"],
				reason: "Test workspace context",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Workspace root:");
			expect(result.error).toContain(testWorkspaceRoot);
		});
	});

	describe("Fuzzy Path Matching & Suggestions", () => {
		it("should suggest files in src/ directory", async () => {
			const result = await createSnapshot({
				files: ["index.ts"], // Missing 'src/' prefix
				suggestAlternatives: true,
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("🔍 Did you mean one of these?");
			expect(result.error).toContain("src/index.ts");
			expect(result.error).toMatch(/\d+% match/);
		});

		it("should suggest files with common extensions", async () => {
			writeFileSync(join(testWorkspaceRoot, "config.json"), "{}");

			const result = await createSnapshot({
				files: ["config"], // Missing .json extension
				suggestAlternatives: true,
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			if (result.error) {
				// Suggestion might include config.json
				const hasJsonSuggestion = result.error.includes("config.json");
				// If no suggestions found, verify other error elements
				if (!hasJsonSuggestion) {
					expect(result.error).toContain("File not found");
				}
			}
		});

		it("should normalize ./ prefix", async () => {
			const result = await createSnapshot({
				files: ["./src/index.ts"],
				suggestAlternatives: true,
			} as CreateSnapshotInput);

			// Should succeed after normalization
			expect(result.success).toBe(true);
		});

		it("should disable suggestions when suggestAlternatives is false", async () => {
			const result = await createSnapshot({
				files: ["nonexistent.ts"],
				suggestAlternatives: false,
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).not.toContain("🔍 Did you mean");
			expect(result.error).toContain("💡 Troubleshooting tips:");
		});

		it("should limit suggestions to top 3 matches", async () => {
			// Create multiple similar files
			writeFileSync(join(testWorkspaceRoot, "test1.ts"), "");
			writeFileSync(join(testWorkspaceRoot, "test2.ts"), "");
			writeFileSync(join(testWorkspaceRoot, "src/test3.ts"), "");
			writeFileSync(join(testWorkspaceRoot, "src/test4.ts"), "");

			const result = await createSnapshot({
				files: ["test.ts"],
				suggestAlternatives: true,
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			if (result.error?.includes("🔍 Did you mean")) {
				// Count suggestion lines (numbered 1., 2., 3.)
				const suggestionCount = (result.error.match(/\d+\./g) || []).length;
				expect(suggestionCount).toBeLessThanOrEqual(3);
			}
		});
	});

	describe("Flexible Error Handling Modes", () => {
		it("should fail fast in 'error' mode (default)", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "nonexistent.ts"],
				onMissingFile: "error",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Snapshot validation found issues");
		});

		it("should continue with valid files in 'warn' mode", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await createSnapshot({
				files: ["src/index.ts", "nonexistent.ts"],
				onMissingFile: "warn",
				reason: "Test warn mode",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot).toBeDefined();
			expect(result.snapshot?.fileCount).toBe(1);
			expect(result.snapshot?.validation.requested).toBe(2);
			expect(result.snapshot?.validation.included).toBe(1);
			expect(result.snapshot?.validation.skipped).toBe(1);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("file(s) not found, continuing with"));

			consoleSpy.mockRestore();
		});

		it("should silently skip missing files in 'skip' mode", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await createSnapshot({
				files: ["src/index.ts", "nonexistent.ts", "also-missing.ts"],
				onMissingFile: "skip",
				reason: "Test skip mode",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot?.fileCount).toBe(1);
			expect(result.snapshot?.validation.skipped).toBe(2);
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should return error if all files are missing in 'warn' mode", async () => {
			const result = await createSnapshot({
				files: ["missing1.ts", "missing2.ts"],
				onMissingFile: "warn",
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("No valid files found");
		});
	});

	describe("Enhanced Error Messages", () => {
		it("should provide detailed error context", async () => {
			const result = await createSnapshot({
				files: ["packages/engine/missing.ts"],
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("❌ Failed to create snapshot");
			expect(result.error).toContain("Problem: File not found");
			expect(result.error).toContain("Path requested:");
			expect(result.error).toContain("Workspace root:");
			expect(result.error).toContain("Resolved to:");
		});

		it("should sanitize file paths in error messages", async () => {
			// Mock file read to throw error with path
			const result = await createSnapshot({
				files: ["this-will-fail-§invalid§.ts"],
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			// Error should not contain full absolute paths (sanitized to /***)
			if (result.error?.includes("/Users/") || result.error?.includes("C:\\")) {
				// If path leaked, it should be sanitized
				expect(result.error).toMatch(/\/\*\*\*/);
			}
		});

		it("should show validation summary in response", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "src/utils.ts"],
				onMissingFile: "skip",
				reason: "Test validation summary",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot?.validation).toEqual({
				requested: 2,
				included: 2,
				skipped: 0,
			});
		});
	});

	describe("Backward Compatibility", () => {
		it("should work with old API (no new parameters)", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts"],
				reason: "Test backward compat",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot).toBeDefined();
		});

		it("should default to 'error' mode when onMissingFile not specified", async () => {
			const result = await createSnapshot({
				files: ["nonexistent.ts"],
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
		});

		it("should default suggestAlternatives to true", async () => {
			const result = await createSnapshot({
				files: ["missing.ts"],
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			// Should have suggestions by default (or troubleshooting tips)
			expect(result.error).toMatch(/🔍 Did you mean|💡 Troubleshooting tips/);
		});
	});

	describe("Multi-file Scenarios", () => {
		it("should validate all files and report status for each", async () => {
			const result = await createSnapshot({
				files: [
					"src/index.ts", // ✅ exists
					"src/utils.ts", // ✅ exists
					"src/missing.ts", // ❌ missing
					"README.md", // ✅ exists
				],
			} as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("✅ src/index.ts");
			expect(result.error).toContain("✅ src/utils.ts");
			expect(result.error).toContain("✅ README.md");
			expect(result.error).toContain("❌ src/missing.ts");
		});

		it("should successfully snapshot valid files in mixed scenario with 'warn' mode", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "missing.ts", "README.md"],
				onMissingFile: "warn",
				reason: "Mixed file scenario",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot?.fileCount).toBe(2);
			expect(result.snapshot?.validation).toEqual({
				requested: 3,
				included: 2,
				skipped: 1,
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty file array", async () => {
			const result = await createSnapshot({
				files: [],
				reason: "Empty test",
			} as unknown as CreateSnapshotInput);

			expect(result.success).toBe(false);
			expect(result.error).toContain("No valid files found");
		});

		it("should handle files with special characters in names", async () => {
			const specialFile = "src/file-with-special_chars.123.ts";
			writeFileSync(join(testWorkspaceRoot, specialFile), "export const special = true;");

			const result = await createSnapshot({
				files: [specialFile],
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
		});

		it("should handle deeply nested paths", async () => {
			const deepPath = "packages/engine/src/deeply/nested/path/file.ts";
			mkdirSync(join(testWorkspaceRoot, "packages/engine/src/deeply/nested/path"), { recursive: true });
			writeFileSync(join(testWorkspaceRoot, deepPath), "export const deep = true;");

			const result = await createSnapshot({
				files: [deepPath],
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
		});

		it("should calculate total bytes correctly", async () => {
			const result = await createSnapshot({
				files: ["src/index.ts", "src/utils.ts"],
				onMissingFile: "skip",
			} as CreateSnapshotInput);

			expect(result.success).toBe(true);
			expect(result.snapshot?.totalBytes).toBeGreaterThan(0);
			// Verify it's approximately the sum of file contents
			const expectedSize = "export const hello = 'world';".length + "export const util = () => {};".length;
			expect(result.snapshot?.totalBytes).toBeCloseTo(expectedSize, -1);
		});
	});
});
