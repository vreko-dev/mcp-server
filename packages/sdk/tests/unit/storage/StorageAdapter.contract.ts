import type { Snapshot } from "@snapback/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StorageAdapter } from "../../../src/storage/StorageAdapter.js";

/**
 * Contract tests for StorageAdapter interface
 * All storage implementations must pass these tests
 */
export function testStorageAdapter(
	name: string,
	createStorage: () => Promise<StorageAdapter>,
	cleanup: (storage: StorageAdapter) => Promise<void>,
) {
	describe(`StorageAdapter: ${name}`, () => {
		let storage: StorageAdapter;

		beforeEach(async () => {
			storage = await createStorage();
		});

		afterEach(async () => {
			await cleanup(storage);
		});

		describe("save", () => {
			it("should save a snapshot", async () => {
				const snapshot: Snapshot = {
					id: "snap_test_1",
					timestamp: Date.now(),
					files: ["/test.ts"],
					fileContents: { "/test.ts": "test content" },
				};

				await storage.save(snapshot);

				const retrieved = await storage.get("snap_test_1");
				expect(retrieved).toMatchObject(snapshot);
			});

			it("should overwrite existing snapshot with same ID", async () => {
				const snapshot1: Snapshot = {
					id: "snap_test_1",
					timestamp: Date.now(),
					files: ["/test.ts"],
				};

				const snapshot2: Snapshot = {
					id: "snap_test_1",
					timestamp: Date.now() + 1000,
					files: ["/updated.ts"],
				};

				await storage.save(snapshot1);
				await storage.save(snapshot2);

				const retrieved = await storage.get("snap_test_1");
				expect(retrieved?.files).toEqual(["/updated.ts"]);
			});
		});

		describe("get", () => {
			it("should retrieve existing snapshot", async () => {
				const snapshot: Snapshot = {
					id: "snap_test_2",
					timestamp: Date.now(),
					files: ["/test.ts"],
				};

				await storage.save(snapshot);
				const retrieved = await storage.get("snap_test_2");

				expect(retrieved).toMatchObject(snapshot);
			});

			it("should return null for non-existent snapshot", async () => {
				const retrieved = await storage.get("non_existent");
				expect(retrieved).toBeNull();
			});
		});

		describe("list", () => {
			beforeEach(async () => {
				// Seed test data
				await storage.save({
					id: "1",
					timestamp: new Date("2025-01-01").getTime(),
					files: ["/file1.ts"],
					meta: { test: true },
				});

				await storage.save({
					id: "2",
					timestamp: new Date("2025-01-02").getTime(),
					files: ["/file2.ts"],
					meta: { test: true },
				});

				await storage.save({
					id: "3",
					timestamp: new Date("2025-01-03").getTime(),
					files: ["/file1.ts"],
					meta: { test: true },
				});
			});

			it("should list all snapshots", async () => {
				const snapshots = await storage.list();
				expect(snapshots).toHaveLength(3);
			});

			it("should return snapshots in descending timestamp order", async () => {
				const snapshots = await storage.list();
				expect(snapshots[0].id).toBe("3"); // Most recent
				expect(snapshots[2].id).toBe("1"); // Oldest
			});

			it("should filter by file path", async () => {
				const snapshots = await storage.list({
					filePath: "/file1.ts",
				});

				expect(snapshots).toHaveLength(2);
				expect(snapshots.every((s) => s.files?.includes("/file1.ts"))).toBe(true);
			});

			it("should respect limit", async () => {
				const snapshots = await storage.list({ limit: 2 });
				expect(snapshots).toHaveLength(2);
			});

			it("should filter by date range", async () => {
				const snapshots = await storage.list({
					after: new Date("2025-01-01"),
					before: new Date("2025-01-03"),
				});

				expect(snapshots).toHaveLength(2);
				expect(snapshots.map((s) => s.id).sort()).toEqual(["1", "2"]);
			});
		});

		describe("delete", () => {
			it("should delete existing snapshot", async () => {
				await storage.save({
					id: "snap_delete",
					timestamp: Date.now(),
					files: ["/test.ts"],
				});

				await storage.delete("snap_delete");

				const retrieved = await storage.get("snap_delete");
				expect(retrieved).toBeNull();
			});

			it("should not throw when deleting non-existent snapshot", async () => {
				await expect(storage.delete("non_existent")).resolves.not.toThrow();
			});
		});

		describe("close", () => {
			it("should close storage connection", async () => {
				await expect(storage.close()).resolves.not.toThrow();
			});
		});
	});
}

// This file exports the contract test suite
// Individual storage implementations will import and run these tests
