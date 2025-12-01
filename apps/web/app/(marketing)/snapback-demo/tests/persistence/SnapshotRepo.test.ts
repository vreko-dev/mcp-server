import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../persistence/db.js";
import { SnapshotRepo } from "../../persistence/SnapshotRepo.js";

describe("SnapshotRepo", () => {
	let snapshotRepo: SnapshotRepo;

	beforeEach(async () => {
		snapshotRepo = new SnapshotRepo();
		// Clear the database before each test
		await db.snapshots.clear();
	});

	describe("create", () => {
		it("should create a new snapshot", async () => {
			const snapshotData = {
				fileId: "file1",
				content: "test content",
				timestamp: new Date(),
				name: "test-snapshot",
				protectionLevel: "watch" as const,
			};

			const snapshot = await snapshotRepo.create(snapshotData);

			expect(snapshot.id).toBeDefined();
			expect(snapshot.fileId).toBe(snapshotData.fileId);
			expect(snapshot.content).toBe(snapshotData.content);
			expect(snapshot.timestamp).toEqual(snapshotData.timestamp);
			expect(snapshot.name).toBe(snapshotData.name);
			expect(snapshot.protectionLevel).toBe(snapshotData.protectionLevel);
		});
	});

	describe("getByFileId", () => {
		it("should retrieve snapshots for a file sorted newest first", async () => {
			// Create test snapshots
			const snapshot1 = await snapshotRepo.create({
				fileId: "file1",
				content: "content1",
				timestamp: new Date(Date.now() - 1000),
				name: "snapshot1",
				protectionLevel: "watch",
			});

			const snapshot2 = await snapshotRepo.create({
				fileId: "file1",
				content: "content2",
				timestamp: new Date(),
				name: "snapshot2",
				protectionLevel: "warn",
			});

			const snapshots = await snapshotRepo.getByFileId("file1");

			expect(snapshots).toHaveLength(2);
			expect(snapshots[0].id).toBe(snapshot2.id); // Newest first
			expect(snapshots[1].id).toBe(snapshot1.id);
		});

		it("should return empty array for non-existent file", async () => {
			const snapshots = await snapshotRepo.getByFileId("non-existent");
			expect(snapshots).toHaveLength(0);
		});
	});

	describe("getById", () => {
		it("should retrieve a specific snapshot by ID", async () => {
			const snapshotData = {
				fileId: "file1",
				content: "test content",
				timestamp: new Date(),
				name: "test-snapshot",
				protectionLevel: "watch" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);
			const retrievedSnapshot = await snapshotRepo.getById(createdSnapshot.id);

			expect(retrievedSnapshot).toEqual(createdSnapshot);
		});

		it("should return undefined for non-existent snapshot", async () => {
			const snapshot = await snapshotRepo.getById("non-existent");
			expect(snapshot).toBeUndefined();
		});
	});

	describe("update", () => {
		it("should update a snapshot", async () => {
			const snapshotData = {
				fileId: "file1",
				content: "original content",
				timestamp: new Date(),
				name: "test-snapshot",
				protectionLevel: "watch" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);

			await snapshotRepo.update(createdSnapshot.id, {
				content: "updated content",
				protectionLevel: "block",
			});

			const updatedSnapshot = await snapshotRepo.getById(createdSnapshot.id);

			expect(updatedSnapshot?.content).toBe("updated content");
			expect(updatedSnapshot?.protectionLevel).toBe("block");
			// Other fields should remain unchanged
			expect(updatedSnapshot?.fileId).toBe(snapshotData.fileId);
			expect(updatedSnapshot?.name).toBe(snapshotData.name);
		});
	});

	describe("delete", () => {
		it("should delete a snapshot", async () => {
			const snapshotData = {
				fileId: "file1",
				content: "test content",
				timestamp: new Date(),
				name: "test-snapshot",
				protectionLevel: "watch" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);

			await snapshotRepo.delete(createdSnapshot.id);

			const deletedSnapshot = await snapshotRepo.getById(createdSnapshot.id);
			expect(deletedSnapshot).toBeUndefined();
		});
	});
});
