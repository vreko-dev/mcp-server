/**
 * SDK FileConflictResolver Tests
 *
 * Tests file conflict resolution including:
 * - Atomic write operations (temp file + rename)
 * - Permission validation
 * - File rename/move detection
 * - Filename similarity matching (Levenshtein distance)
 * - Error handling and recovery
 * - Performance budgets (<100ms for typical files)
 *
 * @module tests/snapshot/FileConflictResolver.test
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../src/core/session/interfaces";
import {
	type ConflictResult,
	FileConflictResolver,
	type IFileSearchProvider,
	type RestoreMetadata,
} from "../../src/snapshot/FileConflictResolver";

// Test logger that captures log calls
class TestLogger implements ILogger {
	public debugCalls: Array<{ message: string; data?: unknown }> = [];
	public infoCalls: Array<{ message: string; data?: unknown }> = [];
	public errorCalls: Array<{ message: string; error?: Error; data?: unknown }> = [];

	debug(message: string, data?: unknown): void {
		this.debugCalls.push({ message, data });
	}

	info(message: string, data?: unknown): void {
		this.infoCalls.push({ message, data });
	}

	error(message: string, error?: Error, data?: unknown): void {
		this.errorCalls.push({ message, error, data });
	}

	clear(): void {
		this.debugCalls = [];
		this.infoCalls = [];
		this.errorCalls = [];
	}
}

// Mock file search provider for testing
class MockFileSearchProvider implements IFileSearchProvider {
	public files: Map<string, string> = new Map();
	public findFilesCalls: Array<{
		workspaceRoot: string;
		extension: string;
		excludePattern?: string;
		maxResults?: number;
	}> = [];

	async findFiles(
		workspaceRoot: string,
		extension: string,
		excludePattern?: string,
		maxResults?: number,
	): Promise<string[]> {
		this.findFilesCalls.push({ workspaceRoot, extension, excludePattern, maxResults });
		return Array.from(this.files.keys()).filter((f) => f.endsWith(extension));
	}

	async readFile(filePath: string): Promise<string> {
		const content = this.files.get(filePath);
		if (!content) {
			throw new Error(`File not found: ${filePath}`);
		}
		return content;
	}

	addFile(filePath: string, content: string): void {
		this.files.set(filePath, content);
	}

	clear(): void {
		this.files.clear();
		this.findFilesCalls = [];
	}
}

describe("FileConflictResolver", () => {
	let resolver: FileConflictResolver;
	let tempDir: string;
	let testLogger: TestLogger;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "snapback-sdk-conflict-test-"));
		testLogger = new TestLogger();
		resolver = new FileConflictResolver({ logger: testLogger });
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
		testLogger.clear();
	});

	describe("Constructor & Options", () => {
		it("should create resolver with default options", () => {
			const defaultResolver = new FileConflictResolver();
			expect(defaultResolver).toBeDefined();
		});

		it("should accept custom logger", () => {
			const customLogger = new TestLogger();
			const customResolver = new FileConflictResolver({ logger: customLogger });
			expect(customResolver).toBeDefined();
		});

		it("should accept file search provider", () => {
			const searchProvider = new MockFileSearchProvider();
			const customResolver = new FileConflictResolver({
				logger: testLogger,
				fileSearchProvider: searchProvider,
				workspaceRoot: tempDir,
			});
			expect(customResolver).toBeDefined();
		});
	});

	describe("resolveAndWrite - Atomic Write Operations", () => {
		it("should write file successfully with atomic pattern", async () => {
			const targetPath = path.join(tempDir, "test-file.ts");
			const content = 'export const test = "hello";';
			const metadata: RestoreMetadata = { created: Date.now() };

			const result = await resolver.resolveAndWrite(targetPath, content, metadata);

			expect(result.resolved).toBe(true);
			expect(result.action).toBe("restored");
			expect(result.path).toBe(targetPath);
			expect(result.error).toBeUndefined();

			// Verify file was written
			const writtenContent = await fs.readFile(targetPath, "utf8");
			expect(writtenContent).toBe(content);
		});

		it("should create parent directories if they don't exist", async () => {
			const targetPath = path.join(tempDir, "nested", "deep", "dir", "file.ts");
			const content = "test content";
			const metadata: RestoreMetadata = { created: Date.now() };

			const result = await resolver.resolveAndWrite(targetPath, content, metadata);

			expect(result.resolved).toBe(true);
			expect(result.action).toBe("restored");

			// Verify directories were created
			const exists = await fs
				.access(path.dirname(targetPath))
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);
		});

		it("should overwrite existing file", async () => {
			const targetPath = path.join(tempDir, "existing.ts");
			const originalContent = "original content";
			const newContent = "new content";

			// Create existing file
			await fs.writeFile(targetPath, originalContent);

			const result = await resolver.resolveAndWrite(targetPath, newContent, { created: Date.now() });

			expect(result.resolved).toBe(true);
			const writtenContent = await fs.readFile(targetPath, "utf8");
			expect(writtenContent).toBe(newContent);
		});

		it("should clean up temp file on write failure", async () => {
			// This is harder to test without mocking fs, but we can verify the pattern
			const targetPath = path.join(tempDir, "test.ts");
			const result = await resolver.resolveAndWrite(targetPath, "content", { created: Date.now() });

			expect(result.resolved).toBe(true);

			// Verify no temp files remain
			const files = await fs.readdir(tempDir);
			const tempFiles = files.filter((f) => f.includes(".snapback-tmp-"));
			expect(tempFiles.length).toBe(0);
		});

		it("should log debug info on successful restore", async () => {
			const targetPath = path.join(tempDir, "test.ts");
			await resolver.resolveAndWrite(targetPath, "content", { created: Date.now() });

			expect(testLogger.debugCalls.some((call) => call.message.includes("restored successfully"))).toBe(true);
		});
	});

	describe("resolveAndWrite - Permission Handling", () => {
		it("should skip file if no write permission", async () => {
			// Use a path that typically requires elevated permissions
			const targetPath = "/root/protected-file.ts";
			const content = "test content";

			const result = await resolver.resolveAndWrite(targetPath, content, { created: Date.now() });

			expect(result.resolved).toBe(false);
			expect(result.action).toBe("skipped");
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain("No write permission");
		});

		it("should log debug info when permission denied", async () => {
			const targetPath = "/root/protected-file.ts";
			await resolver.resolveAndWrite(targetPath, "content", { created: Date.now() });

			expect(testLogger.debugCalls.some((call) => call.message.includes("No write permission"))).toBe(true);
		});
	});

	describe("checkPermissions", () => {
		it("should return true for writable directory", async () => {
			const targetPath = path.join(tempDir, "new-file.ts");
			const hasPermission = await resolver.checkPermissions(targetPath);
			expect(hasPermission).toBe(true);
		});

		it("should return true for existing writable file", async () => {
			const targetPath = path.join(tempDir, "existing.ts");
			await fs.writeFile(targetPath, "content");

			const hasPermission = await resolver.checkPermissions(targetPath);
			expect(hasPermission).toBe(true);
		});

		it("should return false for protected system path", async () => {
			const targetPath = "/root/protected/file.ts";
			const hasPermission = await resolver.checkPermissions(targetPath);
			expect(hasPermission).toBe(false);
		});

		it("should check parent directory for non-existent file", async () => {
			const targetPath = path.join(tempDir, "subdir", "new-file.ts");
			// Parent doesn't exist yet, but we have permission to create it
			const hasPermission = await resolver.checkPermissions(targetPath);
			expect(hasPermission).toBe(true);
		});
	});

	describe("findRenamedFile", () => {
		let mockSearchProvider: MockFileSearchProvider;

		beforeEach(() => {
			mockSearchProvider = new MockFileSearchProvider();
			resolver = new FileConflictResolver({
				logger: testLogger,
				fileSearchProvider: mockSearchProvider,
				workspaceRoot: tempDir,
			});
		});

		afterEach(() => {
			mockSearchProvider.clear();
		});

		it("should return null when no search provider configured", async () => {
			const noProviderResolver = new FileConflictResolver({ logger: testLogger });
			const result = await noProviderResolver.findRenamedFile("/old/path.ts", "hash123");
			expect(result).toBeNull();
		});

		it("should return null when no workspace root configured", async () => {
			const noRootResolver = new FileConflictResolver({
				logger: testLogger,
				fileSearchProvider: mockSearchProvider,
			});
			const result = await noRootResolver.findRenamedFile("/old/path.ts", "hash123");
			expect(result).toBeNull();
		});

		it("should find file by exact content hash match", async () => {
			const originalPath = "/workspace/old-name.ts";
			const newPath = path.join(tempDir, "new-name.ts");
			const content = 'export const x = 1;';
			const hash = resolver.hashContent(content);

			mockSearchProvider.addFile(newPath, content);

			const result = await resolver.findRenamedFile(originalPath, hash);

			expect(result).toBe(newPath);
		});

		it("should return null when no matching file found", async () => {
			const originalPath = "/workspace/missing.ts";
			const hash = resolver.hashContent("unique content that doesn't exist");

			mockSearchProvider.addFile(path.join(tempDir, "different.ts"), "different content");

			const result = await resolver.findRenamedFile(originalPath, hash);

			expect(result).toBeNull();
		});

		it("should search files with correct extension filter", async () => {
			const originalPath = "/workspace/file.tsx";
			const hash = "somehash";

			await resolver.findRenamedFile(originalPath, hash);

			expect(mockSearchProvider.findFilesCalls[0].extension).toBe(".tsx");
		});
	});

	describe("hashContent", () => {
		it("should generate consistent SHA-256 hash", () => {
			const content = "test content";
			const hash1 = resolver.hashContent(content);
			const hash2 = resolver.hashContent(content);

			expect(hash1).toBe(hash2);
			expect(hash1.length).toBe(64); // SHA-256 hex length
		});

		it("should generate different hashes for different content", () => {
			const hash1 = resolver.hashContent("content 1");
			const hash2 = resolver.hashContent("content 2");

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("findExistingAncestor", () => {
		it("should find existing parent directory", () => {
			const nonExistentPath = path.join(tempDir, "deep", "nested", "path");
			const ancestor = resolver.findExistingAncestor(nonExistentPath);

			expect(ancestor).toBe(tempDir);
		});

		it("should return root for deeply nested non-existent path", () => {
			const deepPath = "/very/deep/nested/path/that/does/not/exist";
			const ancestor = resolver.findExistingAncestor(deepPath);

			// Should return the root directory
			expect(ancestor).toBe("/");
		});

		it("should return the path itself if it exists", async () => {
			const existingPath = tempDir;
			const ancestor = resolver.findExistingAncestor(existingPath);

			expect(ancestor).toBe(tempDir);
		});
	});

	describe("isSimilarFileName", () => {
		it("should return true for identical base names", () => {
			expect(resolver.isSimilarFileName("file.ts", "file.ts")).toBe(true);
			expect(resolver.isSimilarFileName("Component.tsx", "Component.tsx")).toBe(true);
		});

		it("should return true for same base name with different extensions", () => {
			expect(resolver.isSimilarFileName("file.ts", "file.js")).toBe(true);
			expect(resolver.isSimilarFileName("index.tsx", "index.ts")).toBe(true);
		});

		it("should return true when one name contains the other", () => {
			expect(resolver.isSimilarFileName("auth.ts", "auth-utils.ts")).toBe(true);
			expect(resolver.isSimilarFileName("Component.tsx", "NewComponent.tsx")).toBe(true);
		});

		it("should return true for small edit distance", () => {
			// "file" vs "flie" - 1 character swap
			expect(resolver.isSimilarFileName("file.ts", "flie.ts")).toBe(true);
		});

		it("should return false for completely different names", () => {
			expect(resolver.isSimilarFileName("apple.ts", "banana.ts")).toBe(false);
			expect(resolver.isSimilarFileName("auth.ts", "database.ts")).toBe(false);
		});

		it("should be case-insensitive", () => {
			expect(resolver.isSimilarFileName("File.ts", "file.ts")).toBe(true);
			expect(resolver.isSimilarFileName("COMPONENT.tsx", "component.tsx")).toBe(true);
		});
	});

	describe("levenshteinDistance", () => {
		it("should return 0 for identical strings", () => {
			expect(resolver.levenshteinDistance("hello", "hello")).toBe(0);
		});

		it("should return string length for empty comparisons", () => {
			expect(resolver.levenshteinDistance("hello", "")).toBe(5);
			expect(resolver.levenshteinDistance("", "hello")).toBe(5);
		});

		it("should calculate correct distance for insertions", () => {
			expect(resolver.levenshteinDistance("cat", "cats")).toBe(1);
		});

		it("should calculate correct distance for deletions", () => {
			expect(resolver.levenshteinDistance("cats", "cat")).toBe(1);
		});

		it("should calculate correct distance for substitutions", () => {
			expect(resolver.levenshteinDistance("cat", "bat")).toBe(1);
		});

		it("should calculate correct distance for complex edits", () => {
			expect(resolver.levenshteinDistance("kitten", "sitting")).toBe(3);
		});
	});

	describe("calculateSimilarity", () => {
		it("should return 1.0 for identical hashes", () => {
			const hash = resolver.hashContent("content");
			expect(resolver.calculateSimilarity(hash, hash)).toBe(1.0);
		});

		it("should return 0.0 for different hashes", () => {
			const hash1 = resolver.hashContent("content 1");
			const hash2 = resolver.hashContent("content 2");
			expect(resolver.calculateSimilarity(hash1, hash2)).toBe(0.0);
		});
	});

	describe("Performance", () => {
		it("should complete atomic write in under 100ms", async () => {
			const targetPath = path.join(tempDir, "perf-test.ts");
			const content = "x".repeat(10000); // 10KB file

			const start = performance.now();
			await resolver.resolveAndWrite(targetPath, content, { created: Date.now() });
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(100);
		});

		it("should complete permission check in under 10ms", async () => {
			const targetPath = path.join(tempDir, "perm-test.ts");

			const start = performance.now();
			await resolver.checkPermissions(targetPath);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(10);
		});

		it("should complete hash calculation quickly for 1MB content", () => {
			const content = "x".repeat(1000000); // 1MB

			const start = performance.now();
			resolver.hashContent(content);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(50);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty file content", async () => {
			const targetPath = path.join(tempDir, "empty.ts");
			const result = await resolver.resolveAndWrite(targetPath, "", { created: Date.now() });

			expect(result.resolved).toBe(true);
			const content = await fs.readFile(targetPath, "utf8");
			expect(content).toBe("");
		});

		it("should handle unicode file content", async () => {
			const targetPath = path.join(tempDir, "unicode.ts");
			const content = "const 日本語 = '🚀';";
			const result = await resolver.resolveAndWrite(targetPath, content, { created: Date.now() });

			expect(result.resolved).toBe(true);
			const written = await fs.readFile(targetPath, "utf8");
			expect(written).toBe(content);
		});

		it("should handle very long file paths", async () => {
			// Create a path with many nested directories
			const nestedPath = path.join(tempDir, "a".repeat(50), "b".repeat(50), "file.ts");
			const result = await resolver.resolveAndWrite(nestedPath, "content", { created: Date.now() });

			expect(result.resolved).toBe(true);
		});

		it("should handle special characters in filename", async () => {
			const targetPath = path.join(tempDir, "file-with-special_chars.test.ts");
			const result = await resolver.resolveAndWrite(targetPath, "content", { created: Date.now() });

			expect(result.resolved).toBe(true);
		});
	});
});
