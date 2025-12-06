import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProtectionManager } from "../../src/protection/ProtectionManager";
import { SnapshotManager } from "../../src/snapshot/SnapshotManager";
import { MemoryStorage } from "../../src/storage/MemoryStorage";

describe("End-to-End Integration Tests", () => {
	let protectionManager: ProtectionManager;
	let snapshotManager: SnapshotManager;
	let storage: MemoryStorage;

	beforeEach(() => {
		// Setup protection manager with test patterns
		protectionManager = new ProtectionManager({
			patterns: [
				{ pattern: "**/*.config.ts", level: "block", enabled: true },
				{ pattern: "src/**/*.ts", level: "watch", enabled: true },
				{ pattern: "**/.env*", level: "block", enabled: true },
			],
			defaultLevel: "watch",
			enabled: true,
			autoProtectConfigs: true,
		});

		// Setup snapshot manager with memory storage
		storage = new MemoryStorage();
		snapshotManager = new SnapshotManager(storage, {
			enableDeduplication: true,
		});
	});

	afterEach(async () => {
		// Clean up memory storage
		await storage.close();
	});

	describe("Basic Snapshot Operations", () => {
		it("should create, list, get, and delete snapshots", async () => {
			// 1. Create snapshots
			const snapshot1 = await snapshotManager.createTest({
				filePath: "test1.ts",
				content: "const x = 1;",
			});

			const snapshot2 = await snapshotManager.createTest({
				filePath: "test2.ts",
				content: "const y = 2;",
			});

			expect(snapshot1.id).toBeDefined();
			expect(snapshot2.id).toBeDefined();
			expect(snapshot1.id).not.toBe(snapshot2.id);

			// 2. List all snapshots
			const list = await snapshotManager.list();
			expect(list).toHaveLength(2);

			// 3. Get specific snapshot
			const retrieved = await snapshotManager.get(snapshot1.id);
			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(snapshot1.id);

			// 4. Protect second snapshot
			await snapshotManager.protect(snapshot2.id);
			const protectedSnapshot = await snapshotManager.get(snapshot2.id);
			expect(protectedSnapshot?.meta?.protected).toBe(true);

			// 5. Try to delete protected (should fail)
			await expect(snapshotManager.delete(snapshot2.id)).rejects.toThrow("Cannot delete protected snapshot");

			// 6. Unprotect snapshot
			await snapshotManager.unprotect(snapshot2.id);
			const unprotected = await snapshotManager.get(snapshot2.id);
			expect(unprotected?.meta?.protected).toBe(false);

			// 7. Delete unprotected snapshot
			await snapshotManager.delete(snapshot1.id);

			// 8. Final list should have only snapshot2
			const finalList = await snapshotManager.list();
			expect(finalList).toHaveLength(1);
			expect(finalList[0].id).toBe(snapshot2.id);
		});
	});

	describe("Protection and Snapshots Integration", () => {
		it("should integrate protection levels with snapshots", async () => {
			// 1. Check protection for config file
			const configProtection = protectionManager.getProtection("app.config.ts");
			expect(configProtection?.level).toBe("block");

			// 2. Create snapshot of protected file
			const snapshot = await snapshotManager.createTest({
				filePath: "app.config.ts",
				content: 'export const API_KEY = "secret";',
			});

			expect(snapshot.id).toBeDefined();

			// 3. Protect the snapshot
			await snapshotManager.protect(snapshot.id);

			// 4. Try to delete (should fail)
			await expect(snapshotManager.delete(snapshot.id)).rejects.toThrow("Cannot delete protected snapshot");

			// 5. Unprotect snapshot
			await snapshotManager.unprotect(snapshot.id);

			// 6. Now delete should work
			await expect(snapshotManager.delete(snapshot.id)).resolves.not.toThrow();
		});

		it("should handle multiple protection levels", async () => {
			// Files with different protection levels
			const files = [
				{ path: ".env", level: "block" as const },
				{ path: "src/app.ts", level: "watch" as const },
				{ path: "test.config.ts", level: "block" as const },
			];

			for (const file of files) {
				const protection = protectionManager.getProtection(file.path);
				expect(protection?.level).toBe(file.level);

				// Create snapshot for each
				await snapshotManager.createTest({
					filePath: file.path,
					content: `content for ${file.path}`,
				});
			}

			// Verify all snapshots created
			const snapshots = await snapshotManager.list();
			expect(snapshots).toHaveLength(3);

			// Verify each has correct content
			for (const file of files) {
				const filtered = await snapshotManager.list({
					filePath: file.path,
				});
				expect(filtered).toHaveLength(1);
				expect(filtered[0].fileContents?.[file.path]).toBe(`content for ${file.path}`);
			}
		});
	});

	describe("Deduplication", () => {
		it("should prevent duplicate snapshots", async () => {
			const content = "const DUPLICATE = true;";

			// First snapshot
			const snap1 = await snapshotManager.createTest({
				filePath: "test.ts",
				content,
			});

			expect(snap1.id).toBeDefined();

			// Duplicate attempt should fail
			await expect(
				snapshotManager.createTest({
					filePath: "test.ts",
					content,
				}),
			).rejects.toThrow("Duplicate snapshot detected");

			// Only one snapshot should exist
			const snapshots = await snapshotManager.list({
				filePath: "test.ts",
			});
			expect(snapshots).toHaveLength(1);
		});

		it("should allow same content for different files", async () => {
			const content = "shared content";

			const snap1 = await snapshotManager.createTest({
				filePath: "file1.ts",
				content,
			});

			const snap2 = await snapshotManager.createTest({
				filePath: "file2.ts",
				content,
			});

			expect(snap1.id).not.toBe(snap2.id);

			const list = await snapshotManager.list();
			expect(list).toHaveLength(2);
		});
	});

	describe("Rapid Operations", () => {
		it("should handle rapid snapshot creation", async () => {
			const promises = Array.from({ length: 10 }, (_, i) =>
				snapshotManager.createTest({
					filePath: "test.ts",
					content: `const x = ${i};`,
				}),
			);

			const snapshots = await Promise.all(promises);

			expect(snapshots).toHaveLength(10);
			expect(new Set(snapshots.map((s) => s.id)).size).toBe(10); // All unique
		});

		it("should handle rapid protection changes", async () => {
			const snapshot = await snapshotManager.createTest({
				filePath: "test.ts",
				content: "test",
			});

			// Rapid protect/unprotect
			await snapshotManager.protect(snapshot.id);
			await snapshotManager.unprotect(snapshot.id);
			await snapshotManager.protect(snapshot.id);

			const retrieved = await snapshotManager.get(snapshot.id);
			expect(retrieved?.meta?.protected).toBe(true);
		});
	});

	describe("Large Scale Operations", () => {
		it("should handle 100 snapshots efficiently", async () => {
			const startTime = Date.now();

			const promises = Array.from({ length: 100 }, (_, i) =>
				snapshotManager.createTest({
					filePath: `file${i}.ts`,
					content: `content ${i}`,
				}),
			);

			const snapshots = await Promise.all(promises);
			expect(snapshots).toHaveLength(100);

			// Performance check - should complete in reasonable time
			const endTime = Date.now();
			const duration = endTime - startTime;
			expect(duration).toBeLessThan(5000); // Less than 5 seconds

			// Verify filtering works
			const evens = await snapshotManager.list({ filePath: "even.ts" });
			const odds = await snapshotManager.list({ filePath: "odd.ts" });

			// Note: These paths don't exist in our test data, so results will be empty
			expect(evens).toHaveLength(0);
			expect(odds).toHaveLength(0);
		});

		it("should query large dataset efficiently", async () => {
			// Create 50 snapshots
			await Promise.all(
				Array.from({ length: 50 }, (_, i) =>
					snapshotManager.createTest({
						filePath: i % 2 === 0 ? "even.ts" : "odd.ts",
						content: `content ${i}`,
					}),
				),
			);

			const startTime = Date.now();

			// Filter query
			const evens = await snapshotManager.list({ filePath: "even.ts" });

			const queryTime = Date.now() - startTime;

			// Should be fast
			expect(queryTime).toBeLessThan(100);

			// Should have correct count
			expect(evens).toHaveLength(25);
		});
	});
});
