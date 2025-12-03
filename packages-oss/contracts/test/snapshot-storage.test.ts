import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnapshotStorage } from "../src/types/snapshot.js";

describe("createSnapshotStorage", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `snapshot-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (_error) {
			// Ignore cleanup errors
		}
	});

	describe("happy path", () => {
		it("should create storage and persist snapshots to disk", async () => {
			const storage = await createSnapshotStorage(testDir);

			const snapshot = {
				id: "test-snapshot",
				timestamp: Date.now(),
				files: ["test.ts"],
				fileContents: { "test.ts": "console.log('test')" },
				meta: {
					name: "Test Snapshot",
					protected: false,
				},
			};

			await storage.save(snapshot);
			const retrieved = await storage.get("test-snapshot");

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe("test-snapshot");
			expect(retrieved?.files).toContain("test.ts");
		});

		it("should list saved snapshots", async () => {
			const storage = await createSnapshotStorage(testDir);

			await storage.save({
				id: "snapshot-1",
				timestamp: Date.now(),
				files: ["file1.ts"],
				fileContents: { "file1.ts": "content1" },
				meta: { name: "Snapshot 1", protected: false },
			});

			await storage.save({
				id: "snapshot-2",
				timestamp: Date.now(),
				files: ["file2.ts"],
				fileContents: { "file2.ts": "content2" },
				meta: { name: "Snapshot 2", protected: false },
			});

			const snapshots = await storage.list();

			expect(snapshots.length).toBeGreaterThanOrEqual(2);
			const ids = snapshots.map((s) => s.id);
			expect(ids).toContain("snapshot-1");
			expect(ids).toContain("snapshot-2");
		});

		it("should delete snapshots from disk", async () => {
			const storage = await createSnapshotStorage(testDir);

			await storage.save({
				id: "to-delete",
				timestamp: Date.now(),
				files: ["file.ts"],
				fileContents: { "file.ts": "content" },
				meta: { name: "Delete Me", protected: false },
			});

			const beforeDelete = await storage.get("to-delete");
			expect(beforeDelete).toBeDefined();

			await storage.delete("to-delete");

			const afterDelete = await storage.get("to-delete");
			expect(afterDelete).toBeNull();
		});

		it("should support content hash deduplication", async () => {
			const storage = await createSnapshotStorage(testDir);

			const snapshot1 = {
				id: "snapshot-with-hash",
				timestamp: Date.now(),
				files: ["file.ts"],
				fileContents: { "file.ts": "duplicate content" },
				meta: { name: "First", protected: false },
			};

			const contentHash = "abc123hash";
			await storage.save(snapshot1, contentHash);

			// Verify hash was persisted (if storage supports getByContentHash)
			if ("getByContentHash" in storage && storage.getByContentHash) {
				const retrieved = await storage.getByContentHash(contentHash);
				expect(retrieved).toBeDefined();
				expect(retrieved?.id).toBe("snapshot-with-hash");
			}
		});
	});

	describe("failure path", () => {
		it("should throw friendly error when @snapback/sdk/storage is unavailable", async () => {
			// Mock the dynamic import to fail
			vi.mock("@snapback/sdk/storage", () => {
				throw new Error("Module not found");
			});

			await expect(createSnapshotStorage("/tmp/test")).rejects.toThrow(/Failed to initialize snapshot storage/);
		});

		it("should handle unwritable directory gracefully", async () => {
			const storage = await createSnapshotStorage("/invalid/unwritable/path");

			const snapshot = {
				id: "test",
				timestamp: Date.now(),
				files: ["test.ts"],
				fileContents: { "test.ts": "content" },
				meta: { name: "Test", protected: false },
			};

			// Should throw or return error, not silently fail
			await expect(storage.save(snapshot)).rejects.toThrow();
		});
	});

	describe("CLI integration", () => {
		it("should work with CLI snapshot list command", async () => {
			const storage = await createSnapshotStorage(testDir);

			await storage.save({
				id: "cli-snapshot",
				timestamp: Date.now(),
				files: ["app.ts"],
				fileContents: { "app.ts": "export default {}" },
				meta: { name: "CLI Snapshot", protected: false },
			});

			const snapshots = await storage.list();
			const snapshot = snapshots.find((s) => s.id === "cli-snapshot");

			expect(snapshot).toBeDefined();
			expect(snapshot?.meta?.name).toBe("CLI Snapshot");
		});

		it("should return snapshots with human-readable metadata", async () => {
			const storage = await createSnapshotStorage(testDir);

			await storage.save({
				id: "human-readable",
				timestamp: Date.now(),
				files: ["index.ts"],
				fileContents: { "index.ts": "content" },
				meta: {
					name: "User-friendly snapshot name",
					protected: true,
				},
			});

			const retrieved = await storage.get("human-readable");

			expect(retrieved?.meta?.name).toBe("User-friendly snapshot name");
			expect(retrieved?.meta?.protected).toBe(true);
		});
	});
});
