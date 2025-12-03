import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Snapback } from "../../src/Snapback.js";
import { MemoryStorage } from "../../src/storage/MemoryStorage.js";

describe("Snapback", () => {
	let snapback: Snapback;

	beforeEach(() => {
		snapback = new Snapback({
			storage: new MemoryStorage(),
		});
	});

	afterEach(async () => {
		await snapback.close();
	});

	it("should create a snapshot", async () => {
		const snapshot = await snapback.save("test.ts", "const x = 1;", "Test snapshot");

		expect(snapshot.id).toBeDefined();
		expect(snapshot.meta?.name).toBe("Test snapshot");
	});

	it("should list snapshots", async () => {
		await snapback.save("test1.ts", "const x = 1;");
		await snapback.save("test2.ts", "const y = 2;");

		const snapshots = await snapback.listSnapshots();
		expect(snapshots).toHaveLength(2);
	});

	it("should get a specific snapshot", async () => {
		const created = await snapback.save("test.ts", "const x = 1;", "Test snapshot");

		const retrieved = await snapback.getSnapshot(created.id);
		expect(retrieved).toBeDefined();
		expect(retrieved?.id).toBe(created.id);
	});

	it("should delete a snapshot", async () => {
		const snapshot = await snapback.save("test.ts", "const x = 1;");

		await snapback.deleteSnapshot(snapshot.id);

		const retrieved = await snapback.getSnapshot(snapshot.id);
		expect(retrieved).toBeNull();
	});

	it("should restore a snapshot", async () => {
		const snapshot = await snapback.save("test.ts", "const x = 1;");

		const result = await snapback.restoreSnapshot(snapshot.id);
		expect(result.success).toBe(true);
		expect(result.restoredFiles).toContain("test.ts");
	});

	it("should protect and unprotect snapshots", async () => {
		const snapshot = await snapback.save("test.ts", "const x = 1;");

		// Protect the snapshot
		await snapback.protectSnapshot(snapshot.id);
		const protectedSnapshot = await snapback.getSnapshot(snapshot.id);
		expect(protectedSnapshot?.meta?.protected).toBe(true);

		// Unprotect the snapshot
		await snapback.unprotectSnapshot(snapshot.id);
		const unprotectedSnapshot = await snapback.getSnapshot(snapshot.id);
		expect(unprotectedSnapshot?.meta?.protected).toBe(false);
	});

	it("should protect files", () => {
		snapback.protectFile("config.env", "block", "Environment file");

		const level = snapback.getProtectionLevel("config.env");
		expect(level).toBe("block");
	});

	it("should have access to managers", () => {
		expect(snapback.snapshots).toBeDefined();
		expect(snapback.protection).toBeDefined();
	});
});
