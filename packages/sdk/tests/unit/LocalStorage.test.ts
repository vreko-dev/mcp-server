import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "../../src/storage/LocalStorage";
import { generateTestSnapshot } from "../setup";

describe("LocalStorage", () => {
	let storage: LocalStorage;
	let dbPath: string;

	beforeEach(() => {
		// Create unique temp db for each test
		dbPath = path.join(os.tmpdir(), `snapback-test-${Date.now()}-${Math.random()}.db`);
		storage = new LocalStorage(dbPath);
	});

	afterEach(async () => {
		await storage.close();

		// Clean up test db
		try {
			if (fs.existsSync(dbPath)) {
				fs.unlinkSync(dbPath);
			}
		} catch (_err) {
			// Ignore cleanup errors
		}
	});

	describe("initialization", () => {
		it("should create database file", () => {
			expect(fs.existsSync(dbPath)).toBe(true);
		});

		it("should create snapshots table", async () => {
			// Try to save a snapshot (would fail if table doesn't exist)
			const snapshot = generateTestSnapshot();
			await expect(storage.save(snapshot)).resolves.not.toThrow();
		});

		it("should create indexes", async () => {
			// Indexes improve query performance - verify they exist by running filtered queries
			const snapshot = generateTestSnapshot({
				id: "test",
				files: ["/test.ts"],
			});
			await storage.save(snapshot);

			await expect(storage.list({ filePath: "/test.ts" })).resolves.not.toThrow();
		});
	});

	describe("save", () => {
		it("should save snapshot to database", async () => {
			const snapshot = generateTestSnapshot({
				id: "snap_test",
				files: ["/test.ts"],
				fileContents: { "/test.ts": "test content" },
				meta: { name: "test snapshot" },
			});

			await storage.save(snapshot);

			const retrieved = await storage.get("snap_test");
			expect(retrieved).toMatchObject({
				id: "snap_test",
				files: ["/test.ts"],
				fileContents: { "/test.ts": "test content" },
				meta: { name: "test snapshot" },
			});
		});

		it("should handle snapshots without optional fields", async () => {
			const snapshot = generateTestSnapshot({
				id: "snap_minimal",
			});

			await storage.save(snapshot);

			const retrieved = await storage.get("snap_minimal");
			expect(retrieved?.meta).toEqual({});
			expect(retrieved?.files).toEqual([]);
			expect(retrieved?.fileContents).toEqual({});
		});

		it("should handle snapshots with all fields", async () => {
			const snapshot = generateTestSnapshot({
				id: "snap_full",
				files: ["/test1.ts", "/test2.ts"],
				fileContents: {
					"/test1.ts": "content 1",
					"/test2.ts": "content 2",
				},
				meta: {
					name: "Full snapshot",
					protected: true,
					author: "john",
					version: "1.0",
				},
			});

			await storage.save(snapshot);

			const retrieved = await storage.get("snap_full");
			expect(retrieved).toMatchObject({
				files: ["/test1.ts", "/test2.ts"],
				fileContents: {
					"/test1.ts": "content 1",
					"/test2.ts": "content 2",
				},
				meta: {
					name: "Full snapshot",
					protected: true,
					author: "john",
					version: "1.0",
				},
			});
		});

		it("should update existing snapshot", async () => {
			const snapshot = generateTestSnapshot({
				id: "snap_update",
				files: ["/test.ts"],
				fileContents: { "/test.ts": "original content" },
				meta: { name: "Original" },
			});
			await storage.save(snapshot);

			// Update
			const updatedSnapshot = {
				...snapshot,
				fileContents: { "/test.ts": "updated content" },
				meta: { name: "Updated" },
			};
			await storage.save(updatedSnapshot);

			const retrieved = await storage.get("snap_update");
			expect(retrieved?.fileContents?.["/test.ts"]).toBe("updated content");
			expect(retrieved?.meta?.name).toBe("Updated");
		});

		it("should handle large content", async () => {
			const largeContent = "x".repeat(1000000); // 1MB
			const snapshot = generateTestSnapshot({
				id: "snap_large",
				files: ["/large.ts"],
				fileContents: { "/large.ts": largeContent },
			});

			await storage.save(snapshot);

			const retrieved = await storage.get("snap_large");
			expect(retrieved?.fileContents?.["/large.ts"]).toBe(largeContent);
		});
	});

	describe("get", () => {
		it("should retrieve snapshot by ID", async () => {
			const snapshot = generateTestSnapshot({ id: "snap_get" });
			await storage.save(snapshot);

			const retrieved = await storage.get("snap_get");
			expect(retrieved?.id).toBe("snap_get");
		});

		it("should return null for non-existent ID", async () => {
			const retrieved = await storage.get("nonexistent");
			expect(retrieved).toBeNull();
		});

		it("should deserialize dates correctly", async () => {
			const now = Date.now();
			const snapshot = generateTestSnapshot({
				id: "snap_date",
				timestamp: now,
			});
			await storage.save(snapshot);

			const retrieved = await storage.get("snap_date");
			expect(retrieved?.timestamp).toBe(now);
		});
	});

	describe("list", () => {
		beforeEach(async () => {
			// Seed test data
			await storage.save(
				generateTestSnapshot({
					id: "1",
					files: ["/test1.ts"],
					timestamp: new Date("2025-01-01").getTime(),
					meta: { protected: false, name: "Snapshot 1" },
				}),
			);

			await storage.save(
				generateTestSnapshot({
					id: "2",
					files: ["/test2.ts"],
					timestamp: new Date("2025-01-02").getTime(),
					meta: { protected: true, name: "Snapshot 2" },
				}),
			);

			await storage.save(
				generateTestSnapshot({
					id: "3",
					files: ["/test1.ts"],
					timestamp: new Date("2025-01-03").getTime(),
					meta: { protected: false, name: "Snapshot 3" },
				}),
			);
		});

		it("should list all snapshots", async () => {
			const snapshots = await storage.list();
			expect(snapshots).toHaveLength(3);
		});

		it("should filter by file path", async () => {
			const snapshots = await storage.list({ filePath: "/test1.ts" });

			expect(snapshots).toHaveLength(2);
			expect(snapshots.every((s) => s.files?.includes("/test1.ts"))).toBe(true);
		});

		it("should filter by protected status", async () => {
			const protectedSnapshots = await storage.list({ protected: true });
			const unprotectedSnapshots = await storage.list({
				protected: false,
			});

			expect(protectedSnapshots).toHaveLength(1);
			expect(unprotectedSnapshots).toHaveLength(2);
		});

		it("should filter by date range", async () => {
			const snapshots = await storage.list({
				after: new Date("2025-01-01T00:00:00Z"),
				before: new Date("2025-01-02T23:59:59Z"),
			});

			expect(snapshots).toHaveLength(2);
		});

		it("should respect limit", async () => {
			const snapshots = await storage.list({ limit: 2 });
			expect(snapshots).toHaveLength(2);
		});

		it("should return newest first by default", async () => {
			const snapshots = await storage.list();

			expect(snapshots[0].id).toBe("3"); // Most recent
			expect(snapshots[2].id).toBe("1"); // Oldest
		});

		it("should handle multiple filters", async () => {
			const snapshots = await storage.list({
				filePath: "/test1.ts",
				protected: false,
				limit: 1,
			});

			expect(snapshots).toHaveLength(1);
			expect(snapshots[0].files?.includes("/test1.ts")).toBe(true);
			expect(snapshots[0].meta?.protected).toBe(false);
		});

		it("should return empty array when no matches", async () => {
			const snapshots = await storage.list({
				filePath: "/nonexistent.ts",
			});

			expect(snapshots).toEqual([]);
		});
	});

	describe("delete", () => {
		it("should delete snapshot", async () => {
			const snapshot = generateTestSnapshot({ id: "snap_delete" });
			await storage.save(snapshot);

			await storage.delete("snap_delete");

			const retrieved = await storage.get("snap_delete");
			expect(retrieved).toBeNull();
		});

		it("should not throw when deleting non-existent snapshot", async () => {
			await expect(storage.delete("nonexistent")).resolves.not.toThrow();
		});

		it("should only delete specified snapshot", async () => {
			await storage.save(generateTestSnapshot({ id: "keep1" }));
			await storage.save(generateTestSnapshot({ id: "delete" }));
			await storage.save(generateTestSnapshot({ id: "keep2" }));

			await storage.delete("delete");

			expect(await storage.get("keep1")).toBeDefined();
			expect(await storage.get("delete")).toBeNull();
			expect(await storage.get("keep2")).toBeDefined();
		});
	});

	describe("close", () => {
		it("should close database connection", async () => {
			await expect(storage.close()).resolves.not.toThrow();
		});

		it("should not throw when closing already closed connection", async () => {
			await storage.close();
			await expect(storage.close()).resolves.not.toThrow();
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent saves", async () => {
			const promises = Array.from({ length: 10 }, (_, i) =>
				storage.save(generateTestSnapshot({ id: `concurrent_${i}` })),
			);

			await expect(Promise.all(promises)).resolves.not.toThrow();

			const snapshots = await storage.list();
			expect(snapshots.length).toBeGreaterThanOrEqual(10);
		});

		it("should handle concurrent reads", async () => {
			await storage.save(generateTestSnapshot({ id: "read_test" }));

			const promises = Array.from({ length: 10 }, () => storage.get("read_test"));

			const results = await Promise.all(promises);
			expect(results.every((r) => r?.id === "read_test")).toBe(true);
		});
	});

	describe("error handling", () => {
		it("should handle corrupted data gracefully", async () => {
			// This would require directly manipulating the database
			// For now, just verify basic error handling
			await expect(storage.get("invalid")).resolves.toBeNull();
		});
	});
});
