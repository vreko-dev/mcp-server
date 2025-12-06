import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStorage } from "../../../src/storage/MemoryStorage";
import { testStorageAdapter } from "./StorageAdapter.contract";

// Run contract tests
testStorageAdapter(
	"MemoryStorage",
	async () => new MemoryStorage(),
	async (storage) => storage.close(),
);

// Memory-specific tests
describe("MemoryStorage - Specific Behavior", () => {
	let storage: MemoryStorage;

	beforeEach(() => {
		storage = new MemoryStorage();
	});

	it("should start with empty storage", async () => {
		const snapshots = await storage.list();
		expect(snapshots).toHaveLength(0);
	});

	it("should isolate data between instances", async () => {
		const storage1 = new MemoryStorage();
		const storage2 = new MemoryStorage();

		await storage1.save({
			id: "snap_1",
			timestamp: Date.now(),
			files: ["/test.ts"],
		});

		const list1 = await storage1.list();
		const list2 = await storage2.list();

		expect(list1).toHaveLength(1);
		expect(list2).toHaveLength(0);
	});

	it("should clear data on close", async () => {
		await storage.save({
			id: "snap_1",
			timestamp: Date.now(),
			files: ["/test.ts"],
		});

		await storage.close();

		// After close, data should be cleared
		const snapshots = await storage.list();
		expect(snapshots).toHaveLength(0);
	});

	it("should handle rapid concurrent writes", async () => {
		const writes = Array.from({ length: 100 }, (_, i) =>
			storage.save({
				id: `snap_${i}`,
				timestamp: Date.now() + i,
				files: [`/file${i}.ts`],
			}),
		);

		await Promise.all(writes);

		const snapshots = await storage.list();
		expect(snapshots).toHaveLength(100);
	});

	it("should maintain sort order with rapid inserts", async () => {
		// Insert in random order
		await storage.save({ id: "3", timestamp: 3, files: [] });
		await storage.save({ id: "1", timestamp: 1, files: [] });
		await storage.save({ id: "2", timestamp: 2, files: [] });

		const snapshots = await storage.list();
		expect(snapshots.map((s) => s.id)).toEqual(["3", "2", "1"]);
	});
});
