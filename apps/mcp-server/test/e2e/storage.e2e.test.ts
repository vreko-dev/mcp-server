import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystemStorage } from "@snapback/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * E2E tests for storage - NO MOCKS
 *
 * These tests verify that storage actually works with real file system operations.
 * If these pass, we know:
 * 1. Snapshots are actually written to disk
 * 2. IDs returned from create() can be used with retrieve()
 * 3. Data persists between operations
 * 4. Storage contract is honored
 *
 * This would have caught the mock storage bug!
 */
describe("Storage E2E (Real FileSystem)", () => {
	let tmpDir: string;
	let storage: FileSystemStorage;

	beforeEach(async () => {
		// Create real temporary directory
		tmpDir = await mkdtemp(join(tmpdir(), "snapback-test-"));
		storage = new FileSystemStorage(tmpDir);
	});

	afterEach(async () => {
		// Cleanup
		await rm(tmpDir, { recursive: true, force: true });
	});

	describe("create() contract", () => {
		it("should return a snapshot with valid ID and timestamp", async () => {
			const snapshot = await storage.create({
				trigger: "test",
				content: "E2E test snapshot",
			});

			// Verify contract
			expect(snapshot.id).toBeDefined();
			expect(snapshot.id).toMatch(/snap-\d+/);
			expect(snapshot.timestamp).toBeGreaterThan(0);
			expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
		});

		it("should actually write data to disk", async () => {
			const snapshot = await storage.create({
				trigger: "test",
				content: "Test data",
			});

			// Verify we can retrieve what we created
			const retrieved = await storage.retrieve(snapshot.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved?.id).toBe(snapshot.id);
			expect(retrieved?.timestamp).toBe(snapshot.timestamp);
		});

		it("should persist data between storage instances", async () => {
			// Create snapshot with first instance
			const snapshot1 = await storage.create({
				trigger: "test",
				content: "Persistent data",
			});

			// Create new storage instance pointing to same directory
			const storage2 = new FileSystemStorage(tmpDir);

			// Should be able to retrieve snapshot created by first instance
			const retrieved = await storage2.retrieve(snapshot1.id);
			expect(retrieved).not.toBeNull();
			expect(retrieved?.id).toBe(snapshot1.id);
		});
	});

	describe("list() contract", () => {
		it("should return empty array when no snapshots exist", async () => {
			const list = await storage.list();
			expect(Array.isArray(list)).toBe(true);
			expect(list).toHaveLength(0);
		});

		it("should include created snapshots in list", async () => {
			const snapshot = await storage.create({
				trigger: "test",
				content: "List test",
			});

			const list = await storage.list();
			expect(list).toHaveLength(1);
			expect(list[0].id).toBe(snapshot.id);
		});

		it("should list multiple snapshots", async () => {
			const snap1 = await storage.create({ trigger: "test1" });
			const snap2 = await storage.create({ trigger: "test2" });
			const snap3 = await storage.create({ trigger: "test3" });

			const list = await storage.list();
			expect(list).toHaveLength(3);

			const ids = list.map((s) => s.id);
			expect(ids).toContain(snap1.id);
			expect(ids).toContain(snap2.id);
			expect(ids).toContain(snap3.id);
		});
	});

	describe("retrieve() contract", () => {
		it("should return null for non-existent snapshot", async () => {
			const retrieved = await storage.retrieve("snap-nonexistent");
			expect(retrieved).toBeNull();
		});

		it("should retrieve exact snapshot data that was created", async () => {
			const original = await storage.create({
				trigger: "e2e-test",
				content: "Test content",
			});

			const retrieved = await storage.retrieve(original.id);

			expect(retrieved).not.toBeNull();
			expect(retrieved).toEqual(original);
		});
	});

	describe("Full workflow E2E", () => {
		it("should handle complete snapshot lifecycle", async () => {
			// 1. Create snapshot
			const created = await storage.create({
				trigger: "workflow-test",
				content: "Complete workflow",
			});
			expect(created.id).toBeDefined();

			// 2. Verify it appears in list
			const list1 = await storage.list();
			expect(list1).toHaveLength(1);
			expect(list1[0].id).toBe(created.id);

			// 3. Retrieve by ID
			const retrieved = await storage.retrieve(created.id);
			expect(retrieved).toEqual(created);

			// 4. Create another snapshot
			const created2 = await storage.create({
				trigger: "second-snapshot",
			});

			// 5. Verify both in list
			const list2 = await storage.list();
			expect(list2).toHaveLength(2);

			const ids = list2.map((s) => s.id);
			expect(ids).toContain(created.id);
			expect(ids).toContain(created2.id);

			// 6. Retrieve each by ID
			const retrieved1 = await storage.retrieve(created.id);
			const retrieved2 = await storage.retrieve(created2.id);

			expect(retrieved1).toEqual(created);
			expect(retrieved2).toEqual(created2);
		});
	});

	describe("What would have caught the mock storage bug", () => {
		it("CRITICAL: create() must not return fake data", async () => {
			const snapshot = await storage.create({ trigger: "test" });

			// If storage was fake, this would fail because:
			// 1. Mock returns { id: "snap-fake" }
			// 2. retrieve() returns null (not implemented)
			// 3. This assertion fails
			const retrieved = await storage.retrieve(snapshot.id);
			expect(retrieved).not.toBeNull(); // ← Would catch mock!
		});

		it("CRITICAL: retrieve() must not always return null", async () => {
			const snapshot = await storage.create({ trigger: "test" });

			// Mock storage had: retrieve: async () => null
			// This would fail if storage was fake
			const retrieved = await storage.retrieve(snapshot.id);
			expect(retrieved).toBeDefined();
			expect(retrieved).not.toBeNull();
		});

		it("CRITICAL: list() must not always return empty array", async () => {
			await storage.create({ trigger: "test" });

			// Mock storage had: list: async () => []
			// This would fail if storage was fake
			const list = await storage.list();
			expect(list.length).toBeGreaterThan(0); // ← Would catch mock!
		});
	});
});
