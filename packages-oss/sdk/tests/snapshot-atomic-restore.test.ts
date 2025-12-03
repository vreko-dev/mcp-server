/**
 * Atomic Restore Test - SDK Integration
 * Tests the SnapshotManager's atomic restore functionality
 */

import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FileInput } from "@snapback-oss/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SnapshotManager } from "../src/snapshot/SnapshotManager.js";
import { LocalStorage } from "../src/storage/LocalStorage.js";

describe("SnapshotManager - Atomic Restore", () => {
	let manager: SnapshotManager;
	let storage: LocalStorage;
	let testDir: string;
	let storePath: string;

	beforeEach(async () => {
		// Create test directory
		testDir = path.join(process.cwd(), ".test-snapshots", `test-${Date.now()}`);
		await fs.mkdir(testDir, { recursive: true });

		storePath = path.join(testDir, "snapshots.db");
		storage = new LocalStorage(storePath);
		manager = new SnapshotManager(storage, {
			enableDeduplication: true,
			namingStrategy: "semantic",
			autoProtect: false,
		});
	});

	afterEach(async () => {
		// Clean up test directory
		if (existsSync(testDir)) {
			await fs.rm(testDir, { recursive: true, force: true });
		}
	});

	describe("Basic Restore", () => {
		it("should restore snapshot metadata without target path", async () => {
			// Create a snapshot
			const files: FileInput[] = [
				{ path: "file1.txt", content: "content 1", action: "modify" },
				{ path: "file2.txt", content: "content 2", action: "modify" },
			];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Restore without target path (metadata only)
			const result = await manager.restore(snapshot.id);

			expect(result.success).toBe(true);
			expect(result.restoredFiles).toEqual(["file1.txt", "file2.txt"]);
			expect(result.errors).toEqual([]);
		});

		it("should restore files to target directory", async () => {
			// Create a snapshot
			const files: FileInput[] = [
				{ path: "file1.txt", content: "Hello World", action: "modify" },
				{ path: "sub/file2.txt", content: "Nested file", action: "modify" },
			];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Restore to target directory
			const targetDir = path.join(testDir, "restore-target");
			const result = await manager.restore(snapshot.id, targetDir);

			expect(result.success).toBe(true);
			expect(result.restoredFiles).toEqual(["file1.txt", "sub/file2.txt"]);
			expect(result.errors).toEqual([]);

			// Verify files were restored
			const file1Content = await fs.readFile(path.join(targetDir, "file1.txt"), "utf-8");
			const file2Content = await fs.readFile(path.join(targetDir, "sub/file2.txt"), "utf-8");
			expect(file1Content).toBe("Hello World");
			expect(file2Content).toBe("Nested file");
		});

		it("should perform dry run without writing files", async () => {
			// Create a snapshot
			const files: FileInput[] = [{ path: "file1.txt", content: "content 1", action: "modify" }];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Dry run restore
			const targetDir = path.join(testDir, "dry-run-target");
			const result = await manager.restore(snapshot.id, targetDir, { dryRun: true });

			expect(result.success).toBe(true);
			expect(result.restoredFiles).toEqual(["file1.txt"]);
			expect(result.errors).toEqual([]);

			// Verify directory was NOT created
			expect(existsSync(targetDir)).toBe(false);
		});
	});

	describe("Atomicity Guarantees", () => {
		it("should use staging directory for atomic swap", async () => {
			// Create a snapshot
			const files: FileInput[] = [{ path: "file1.txt", content: "new content", action: "modify" }];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Create existing target directory with old content
			const targetDir = path.join(testDir, "atomic-target");
			await fs.mkdir(targetDir, { recursive: true });
			await fs.writeFile(path.join(targetDir, "old-file.txt"), "old content");

			// Restore (should use staging directory)
			const result = await manager.restore(snapshot.id, targetDir);

			expect(result.success).toBe(true);

			// Verify staging and backup directories were cleaned up
			expect(existsSync(`${targetDir}.staging`)).toBe(false);
			expect(existsSync(`${targetDir}.backup`)).toBe(false);

			// Verify new content is in place
			const newContent = await fs.readFile(path.join(targetDir, "file1.txt"), "utf-8");
			expect(newContent).toBe("new content");

			// Verify old file is gone
			expect(existsSync(path.join(targetDir, "old-file.txt"))).toBe(false);
		});

		it("should backup existing directory before restore", async () => {
			// Create a snapshot
			const files: FileInput[] = [{ path: "file1.txt", content: "new content", action: "modify" }];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Create existing target with content
			const targetDir = path.join(testDir, "backup-target");
			await fs.mkdir(targetDir, { recursive: true });
			await fs.writeFile(path.join(targetDir, "existing.txt"), "existing content");

			// Restore
			const result = await manager.restore(snapshot.id, targetDir);

			expect(result.success).toBe(true);

			// Backup should be cleaned up after successful restore
			expect(existsSync(`${targetDir}.backup`)).toBe(false);
		});
	});

	describe("Rollback on Failure", () => {
		it("should rollback on restore failure", async () => {
			// Create a snapshot with missing content (simulated corruption)
			const files: FileInput[] = [{ path: "file1.txt", content: "content 1", action: "modify" }];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			// Create existing target
			const targetDir = path.join(testDir, "rollback-target");
			await fs.mkdir(targetDir, { recursive: true });
			await fs.writeFile(path.join(targetDir, "original.txt"), "original content");

			// Corrupt the snapshot by removing file content
			if (snapshot.fileContents) {
				delete snapshot.fileContents["file1.txt"];
				await storage.save(snapshot);
			}

			// Attempt restore (should fail and rollback)
			const result = await manager.restore(snapshot.id, targetDir);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			// Verify original file is still there (rollback successful)
			expect(existsSync(path.join(targetDir, "original.txt"))).toBe(true);
			const originalContent = await fs.readFile(path.join(targetDir, "original.txt"), "utf-8");
			expect(originalContent).toBe("original content");
		});

		it("should clean up staging directory on failure", async () => {
			// Create a snapshot
			const files: FileInput[] = [{ path: "file1.txt", content: "content 1", action: "modify" }];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			const targetDir = path.join(testDir, "cleanup-target");

			// Corrupt snapshot
			if (snapshot.fileContents) {
				delete snapshot.fileContents["file1.txt"];
				await storage.save(snapshot);
			}

			// Attempt restore
			await manager.restore(snapshot.id, targetDir);

			// Verify staging directory was cleaned up
			expect(existsSync(`${targetDir}.staging`)).toBe(false);
		});
	});

	describe("Progress Tracking", () => {
		it("should report progress during restore", async () => {
			// Create a snapshot with multiple files
			const files: FileInput[] = [
				{ path: "file1.txt", content: "content 1", action: "modify" },
				{ path: "file2.txt", content: "content 2", action: "modify" },
				{ path: "file3.txt", content: "content 3", action: "modify" },
			];
			const snapshot = await manager.create(files, {
				description: "Test snapshot",
				protected: false,
			});

			const targetDir = path.join(testDir, "progress-target");
			const progressValues: number[] = [];

			// Restore with progress tracking
			const result = await manager.restore(snapshot.id, targetDir, {
				onProgress: (progress) => {
					progressValues.push(progress);
				},
			});

			expect(result.success).toBe(true);

			// Verify progress was reported
			expect(progressValues.length).toBeGreaterThan(0);
			expect(progressValues[progressValues.length - 1]).toBe(100);

			// Progress should be monotonically increasing
			for (let i = 1; i < progressValues.length; i++) {
				expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
			}
		});
	});
});
