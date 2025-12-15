import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventBus } from "../../src/runtime/events";
import { type SnapshotManifest, Storage } from "../../src/runtime/storage";

describe("Storage", () => {
	let storage: Storage;
	let testDir: string;

	beforeEach(() => {
		// Create unique test directory for each test
		testDir = join(process.cwd(), "test-storage", `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
		storage = new Storage({
			rootDir: testDir,
			compress: true,
		});
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("constructor", () => {
		it("creates storage directories on initialization", () => {
			expect(existsSync(join(testDir, "snapshots"))).toBe(true);
			expect(existsSync(join(testDir, "blobs"))).toBe(true);
		});

		it("handles existing directories gracefully", () => {
			// Create second instance with same directory
			const storage2 = new Storage({
				rootDir: testDir,
				compress: false,
			});

			expect(existsSync(join(testDir, "snapshots"))).toBe(true);
			expect(existsSync(join(testDir, "blobs"))).toBe(true);
		});
	});

	describe("createSnapshot", () => {
		it("creates a snapshot with single file", async () => {
			const files = [{ path: "test.ts", content: "console.log('hello');" }];

			const manifest = await storage.createSnapshot(files);

			expect(manifest.id).toMatch(/^snap_/);
			expect(manifest.files).toHaveLength(1);
			expect(manifest.files[0].path).toBe("test.ts");
			expect(manifest.files[0].blobId).toMatch(/^[a-f0-9]{64}$/); // SHA-256
			expect(manifest.totalSize).toBeGreaterThan(0);
			expect(manifest.createdAt).toBeGreaterThan(0);
		});

		it("creates a snapshot with multiple files", async () => {
			const files = [
				{ path: "src/auth.ts", content: "export const auth = () => {}" },
				{ path: "src/user.ts", content: "export const user = {}" },
				{ path: "config.json", content: '{"version": "1.0.0"}' },
			];

			const manifest = await storage.createSnapshot(files);

			expect(manifest.files).toHaveLength(3);
			expect(manifest.totalSize).toBeGreaterThan(0);
		});

		it("stores blobs in sharded directories", async () => {
			const files = [{ path: "test.ts", content: "content" }];

			const manifest = await storage.createSnapshot(files);
			const blobId = manifest.files[0].blobId;
			const shard = blobId.slice(0, 2);

			expect(existsSync(join(testDir, "blobs", shard, blobId))).toBe(true);
		});

		it("deduplicates identical content (content-addressable)", async () => {
			const content = "export const duplicate = true;";
			const files1 = [{ path: "file1.ts", content }];
			const files2 = [{ path: "file2.ts", content }];

			const manifest1 = await storage.createSnapshot(files1);
			const manifest2 = await storage.createSnapshot(files2);

			// Same content should produce same blob ID
			expect(manifest1.files[0].blobId).toBe(manifest2.files[0].blobId);

			// Blob should only be stored once
			const blobId = manifest1.files[0].blobId;
			const shard = blobId.slice(0, 2);
			const blobFiles = readdirSync(join(testDir, "blobs", shard));
			expect(blobFiles).toHaveLength(1);
		});

		it("supports optional description", async () => {
			const files = [{ path: "test.ts", content: "content" }];

			const manifest = await storage.createSnapshot(files, {
				description: "Test snapshot",
			});

			expect(manifest.description).toBe("Test snapshot");
		});

		it("supports trigger metadata", async () => {
			const files = [{ path: "test.ts", content: "content" }];

			const manifest = await storage.createSnapshot(files, {
				trigger: "manual",
			});

			expect(manifest.trigger).toBe("manual");
		});

		it("emits snapshot.created event", async () => {
			const eventSpy = vi.fn();
			eventBus.on("snapshot.created", eventSpy);

			const files = [{ path: "test.ts", content: "content" }];
			const manifest = await storage.createSnapshot(files);

			expect(eventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					snapshotId: manifest.id,
					fileCount: 1,
					totalBytes: expect.any(Number),
					trigger: "auto",
					riskScore: 0,
				}),
			);

			eventBus.off("snapshot.created", eventSpy);
		});

		it("maps ai-detection trigger to risk in events", async () => {
			const eventSpy = vi.fn();
			eventBus.on("snapshot.created", eventSpy);

			const files = [{ path: "test.ts", content: "content" }];
			await storage.createSnapshot(files, { trigger: "ai-detection" });

			expect(eventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					trigger: "risk", // ai-detection mapped to risk
				}),
			);

			eventBus.off("snapshot.created", eventSpy);
		});

		it("calculates total size correctly", async () => {
			const files = [
				{ path: "file1.ts", content: "a".repeat(100) },
				{ path: "file2.ts", content: "b".repeat(200) },
			];

			const manifest = await storage.createSnapshot(files);

			expect(manifest.totalSize).toBe(300); // 100 + 200
		});
	});

	describe("getSnapshot", () => {
		it("retrieves existing snapshot", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const created = await storage.createSnapshot(files);

			const retrieved = storage.getSnapshot(created.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved?.id).toBe(created.id);
			expect(retrieved?.files).toHaveLength(1);
		});

		it("returns null for non-existent snapshot", () => {
			const result = storage.getSnapshot("snap_nonexistent");

			expect(result).toBeNull();
		});

		it("parses manifest JSON correctly", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const created = await storage.createSnapshot(files, {
				description: "Test description",
			});

			const retrieved = storage.getSnapshot(created.id);

			expect(retrieved?.description).toBe("Test description");
			expect(retrieved?.createdAt).toBe(created.createdAt);
		});
	});

	describe("listSnapshots", () => {
		it("returns empty array when no snapshots exist", () => {
			const snapshots = storage.listSnapshots();

			expect(snapshots).toEqual([]);
		});

		it("lists all snapshots sorted by creation time (newest first)", async () => {
			const files = [{ path: "test.ts", content: "content" }];

			// Create 3 snapshots with small delays
			const snapshot1 = await storage.createSnapshot(files);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const snapshot2 = await storage.createSnapshot(files);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const snapshot3 = await storage.createSnapshot(files);

			const snapshots = storage.listSnapshots();

			expect(snapshots).toHaveLength(3);
			// Should be sorted newest first
			expect(snapshots[0].id).toBe(snapshot3.id);
			expect(snapshots[1].id).toBe(snapshot2.id);
			expect(snapshots[2].id).toBe(snapshot1.id);
		});

		it("handles corrupted manifest files gracefully", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const valid = await storage.createSnapshot(files);

			// Write corrupted manifest
			const corruptedPath = join(testDir, "snapshots", "corrupted.json");
			mkdirSync(join(testDir, "snapshots"), { recursive: true });
			require("fs").writeFileSync(corruptedPath, "invalid json {");

			const snapshots = storage.listSnapshots();

			// Should only return valid snapshot, skip corrupted
			expect(snapshots).toHaveLength(1);
			expect(snapshots[0].id).toBe(valid.id);
		});
	});

	describe("deleteSnapshot", () => {
		it("deletes existing snapshot manifest", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const snapshot = await storage.createSnapshot(files);

			const deleted = storage.deleteSnapshot(snapshot.id);

			expect(deleted).toBe(true);
			expect(storage.getSnapshot(snapshot.id)).toBeNull();
		});

		it("returns false for non-existent snapshot", () => {
			const deleted = storage.deleteSnapshot("snap_nonexistent");

			expect(deleted).toBe(false);
		});

		it("orphans blobs (blobs remain after manifest deletion)", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const snapshot = await storage.createSnapshot(files);
			const blobId = snapshot.files[0].blobId;
			const shard = blobId.slice(0, 2);

			storage.deleteSnapshot(snapshot.id);

			// Blob should still exist (orphaned)
			expect(existsSync(join(testDir, "blobs", shard, blobId))).toBe(true);
		});
	});

	describe("restore", () => {
		it("restores files from snapshot", async () => {
			const files = [
				{ path: "src/auth.ts", content: "export const auth = () => {}" },
				{ path: "src/user.ts", content: "export const user = {}" },
			];
			const snapshot = await storage.createSnapshot(files);

			const restored = await storage.restore(snapshot.id);

			expect(restored).toHaveLength(2);
			expect(restored[0]).toEqual(files[0]);
			expect(restored[1]).toEqual(files[1]);
		});

		it("throws error for non-existent snapshot", async () => {
			await expect(storage.restore("snap_nonexistent")).rejects.toThrow("Snapshot not found: snap_nonexistent");
		});

		it("emits snapshot.restored event", async () => {
			const eventSpy = vi.fn();
			eventBus.on("snapshot.restored", eventSpy);

			const files = [{ path: "test.ts", content: "content" }];
			const snapshot = await storage.createSnapshot(files);
			await storage.restore(snapshot.id);

			expect(eventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					snapshotId: snapshot.id,
					filesRestored: 1,
					duration: expect.any(Number),
				}),
			);

			eventBus.off("snapshot.restored", eventSpy);
		});

		it("handles missing blobs gracefully", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const snapshot = await storage.createSnapshot(files);

			// Delete the blob manually
			const blobId = snapshot.files[0].blobId;
			const shard = blobId.slice(0, 2);
			rmSync(join(testDir, "blobs", shard, blobId));

			const restored = await storage.restore(snapshot.id);

			// Should return empty array (blob not found)
			expect(restored).toHaveLength(0);
		});
	});

	describe("compression", () => {
		it("compresses blobs when enabled", async () => {
			const compressedStorage = new Storage({
				rootDir: join(testDir, "compressed"),
				compress: true,
			});

			const files = [{ path: "test.ts", content: "a".repeat(1000) }];
			const snapshot = await compressedStorage.createSnapshot(files);
			const blobId = snapshot.files[0].blobId;
			const shard = blobId.slice(0, 2);
			const blobPath = join(testDir, "compressed", "blobs", shard, blobId);

			const stats = require("fs").statSync(blobPath);

			// Compressed size should be less than original
			expect(stats.size).toBeLessThan(1000);
		});

		it("does not compress blobs when disabled", async () => {
			const uncompressedStorage = new Storage({
				rootDir: join(testDir, "uncompressed"),
				compress: false,
			});

			const content = "a".repeat(100);
			const files = [{ path: "test.ts", content }];
			const snapshot = await uncompressedStorage.createSnapshot(files);
			const blobId = snapshot.files[0].blobId;
			const shard = blobId.slice(0, 2);
			const blobPath = join(testDir, "uncompressed", "blobs", shard, blobId);

			const stats = require("fs").statSync(blobPath);

			// Uncompressed size should match original
			expect(stats.size).toBe(Buffer.byteLength(content));
		});

		it("correctly decompresses compressed blobs on restore", async () => {
			const content = "export const test = true;";
			const files = [{ path: "test.ts", content }];

			const snapshot = await storage.createSnapshot(files);
			const restored = await storage.restore(snapshot.id);

			expect(restored[0].content).toBe(content);
		});

		it("handles uncompressed blobs in restore fallback", async () => {
			const uncompressedStorage = new Storage({
				rootDir: join(testDir, "uncompressed2"),
				compress: false,
			});

			const content = "export const test = true;";
			const files = [{ path: "test.ts", content }];

			const snapshot = await uncompressedStorage.createSnapshot(files);
			const restored = await uncompressedStorage.restore(snapshot.id);

			expect(restored[0].content).toBe(content);
		});
	});

	describe("content-addressable storage", () => {
		it("generates consistent SHA-256 hashes", async () => {
			const content = "deterministic content";
			const files1 = [{ path: "file1.ts", content }];
			const files2 = [{ path: "file2.ts", content }];

			const snapshot1 = await storage.createSnapshot(files1);
			const snapshot2 = await storage.createSnapshot(files2);

			expect(snapshot1.files[0].blobId).toBe(snapshot2.files[0].blobId);
			expect(snapshot1.files[0].blobId).toMatch(/^[a-f0-9]{64}$/);
		});

		it("does not duplicate blobs for identical content", async () => {
			const content = "shared content";

			// Create 5 snapshots with same content
			const snapshots: SnapshotManifest[] = [];
			for (let i = 0; i < 5; i++) {
				const snapshot = await storage.createSnapshot([{ path: `file${i}.ts`, content }]);
				snapshots.push(snapshot);
			}

			// All should have same blob ID
			const blobId = snapshots[0].files[0].blobId;
			expect(snapshots.every((s) => s.files[0].blobId === blobId)).toBe(true);

			// Only one blob file should exist
			const shard = blobId.slice(0, 2);
			const blobFiles = readdirSync(join(testDir, "blobs", shard));
			expect(blobFiles).toHaveLength(1);
		});

		it("stores different content in different blobs", async () => {
			const files = [
				{ path: "file1.ts", content: "content A" },
				{ path: "file2.ts", content: "content B" },
			];

			const snapshot = await storage.createSnapshot(files);

			// Different content should have different blob IDs
			expect(snapshot.files[0].blobId).not.toBe(snapshot.files[1].blobId);
		});
	});

	describe("snapshot ID generation", () => {
		it("generates unique IDs", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const ids = new Set<string>();

			for (let i = 0; i < 10; i++) {
				const snapshot = await storage.createSnapshot(files);
				ids.add(snapshot.id);
			}

			expect(ids.size).toBe(10); // All unique
		});

		it("uses correct ID format (snap_<timestamp>_<random>)", async () => {
			const files = [{ path: "test.ts", content: "content" }];
			const snapshot = await storage.createSnapshot(files);

			expect(snapshot.id).toMatch(/^snap_[a-z0-9]+_[a-z0-9]{6}$/);
		});
	});

	describe("edge cases", () => {
		it("handles empty file content", async () => {
			const files = [{ path: "empty.ts", content: "" }];

			const snapshot = await storage.createSnapshot(files);

			expect(snapshot.files[0].size).toBe(0);
			expect(snapshot.totalSize).toBe(0);

			const restored = await storage.restore(snapshot.id);
			expect(restored[0].content).toBe("");
		});

		it("handles large files efficiently", async () => {
			const largeContent = "x".repeat(1024 * 1024); // 1MB
			const files = [{ path: "large.ts", content: largeContent }];

			const start = Date.now();
			const snapshot = await storage.createSnapshot(files);
			const duration = Date.now() - start;

			expect(snapshot.files[0].size).toBe(1024 * 1024);
			expect(duration).toBeLessThan(1000); // Should complete in < 1s
		});

		it("handles special characters in file paths", async () => {
			const files = [
				{ path: "src/files with spaces.ts", content: "content" },
				{ path: "src/特殊字符.ts", content: "content" },
				{ path: "src/émojis-🎉.ts", content: "content" },
			];

			const snapshot = await storage.createSnapshot(files);
			const restored = await storage.restore(snapshot.id);

			expect(restored).toHaveLength(3);
			expect(restored.map((f) => f.path)).toEqual(files.map((f) => f.path));
		});

		it("handles concurrent snapshot creation", async () => {
			const files = [{ path: "test.ts", content: "content" }];

			// Create 10 snapshots concurrently
			const promises = Array.from({ length: 10 }, () => storage.createSnapshot(files));

			const snapshots = await Promise.all(promises);

			// All should succeed with unique IDs
			const ids = snapshots.map((s) => s.id);
			expect(new Set(ids).size).toBe(10);
		});
	});
});
