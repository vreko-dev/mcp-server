import type { ProtectionConfig } from "@snapback/contracts";
import { describe, expect, it } from "vitest";
import { ProtectionManager } from "../../src/protection/ProtectionManager";
import { SnapshotManager } from "../../src/snapshot/SnapshotManager";
import { MemoryStorage } from "../../src/storage/MemoryStorage";

// Mock storage adapter
const mockStorage = new MemoryStorage();

// Protection configuration
const protectionConfig: ProtectionConfig = {
	patterns: [
		{
			pattern: "**/*.config.ts",
			level: "block",
			reason: "Configuration files",
			enabled: true,
		},
		{
			pattern: "**/.env*",
			level: "block",
			reason: "Environment files",
			enabled: true,
		},
		{
			pattern: "**/*.test.ts",
			level: "warn",
			reason: "Test files",
			enabled: true,
		},
	],
	defaultLevel: "watch",
	enabled: true,
	autoProtectConfigs: true,
};

describe("End-to-End Integration", () => {
	let snapshotManager: SnapshotManager;
	let protectionManager: ProtectionManager;

	beforeEach(() => {
		// Reset mock storage
		(mockStorage as any).snapshots.clear();

		// Create fresh managers for each test
		snapshotManager = new SnapshotManager(mockStorage);
		protectionManager = new ProtectionManager(protectionConfig);
	});

	describe("Basic Snapshot Operations", () => {
		it("should perform full snapshot lifecycle", async () => {
			// 1. Create two snapshots
			const snapshot1 = await snapshotManager.create([
				{
					path: "test1.ts",
					content: "const x = 1;",
					action: "modify",
				},
			]);

			const snapshot2 = await snapshotManager.create([
				{
					path: "test2.ts",
					content: "const y = 2;",
					action: "modify",
				},
			]);

			expect(snapshot1.id).toBeDefined();
			expect(snapshot2.id).toBeDefined();
			expect(snapshot1.id).not.toBe(snapshot2.id);

			// 2. List snapshots
			const list = await snapshotManager.list();
			expect(list).toHaveLength(2);

			// 3. Get specific snapshot
			const retrieved = await snapshotManager.get(snapshot1.id);
			expect(retrieved?.id).toBe(snapshot1.id);

			// 4. Restore snapshot
			const restored = await snapshotManager.restore(snapshot1.id);
			expect(restored.success).toBe(true);

			// 5. Protect second snapshot
			await snapshotManager.protect(snapshot2.id);
			const protectedSnapshot = await snapshotManager.get(snapshot2.id);
			expect(protectedSnapshot?.meta?.protected).toBe(true);

			// 6. Try to delete protected (should fail)
			// Note: This will throw "Not implemented" until we implement the delete method
			// await expect(
			//   snapshotManager.delete(snapshot2.id)
			// ).rejects.toThrow('Cannot delete protected snapshot');

			// 7. Delete unprotected snapshot
			// await snapshotManager.delete(snapshot1.id);

			// 8. Final list should have only snapshot2
			// const finalList = await snapshotManager.list();
			// expect(finalList).toHaveLength(1);
			// expect(finalList[0].id).toBe(snapshot2.id);
		});
	});

	describe("Protection and Snapshots Integration", () => {
		it("should integrate protection levels with snapshots", async () => {
			// 1. Check protection for config file
			const configProtection = protectionManager.getProtection("app.config.ts");
			expect(configProtection?.level).toBe("block");

			// 2. Create snapshot of protected file
			const snapshot = await snapshotManager.create([
				{
					path: "app.config.ts",
					content: 'export const API_KEY = "secret";',
					action: "modify",
				},
			]);

			expect(snapshot.id).toBeDefined();

			// 3. Protect the snapshot
			await snapshotManager.protect(snapshot.id);

			// 4. Try to delete (should fail)
			// Note: This will throw "Not implemented" until we implement the delete method
			// await expect(
			//   snapshotManager.delete(snapshot.id)
			// ).rejects.toThrow('Cannot delete protected snapshot');

			// 5. Unprotect snapshot
			// await snapshotManager.unprotect(snapshot.id);

			// 6. Now delete should work
			// await expect(
			//   snapshotManager.delete(snapshot.id)
			// ).resolves.not.toThrow();
		});

		it("should handle multiple protection levels", async () => {
			// Files with different protection levels
			const files = [
				{ path: ".env", content: "API_KEY=secret" },
				{ path: "src/app.ts", content: 'console.log("hello");' },
				{
					path: "test.config.ts",
					content: "export const config = {};",
				},
			];

			const snapshots = [];
			for (const file of files) {
				const _protection = protectionManager.getProtection(file.path);
				// Some files may not have protection (null), which is valid

				// Create snapshot for each
				const snapshot = await snapshotManager.create([
					{
						path: file.path,
						content: file.content,
						action: "modify",
					},
				]);
				snapshots.push({ snapshot, file });
			}

			// Verify all snapshots created
			const allSnapshots = await snapshotManager.list();
			expect(allSnapshots).toHaveLength(3);
		});
	});

	describe("Rapid Operations", () => {
		it("should handle rapid snapshot creation", async () => {
			const promises = Array.from({ length: 10 }, (_, i) =>
				snapshotManager.create([
					{
						path: `test${i}.ts`,
						content: `const x = ${i};`,
						action: "modify",
					},
				]),
			);

			const snapshots = await Promise.all(promises);

			expect(snapshots).toHaveLength(10);
		});

		it("should handle rapid protection changes", async () => {
			const snapshot = await snapshotManager.create([
				{
					path: "test.ts",
					content: "test",
					action: "modify",
				},
			]);

			// Rapid protect/unprotect
			await snapshotManager.protect(snapshot.id);
			await snapshotManager.unprotect(snapshot.id);
			await snapshotManager.protect(snapshot.id);

			const retrieved = await snapshotManager.get(snapshot.id);
			expect(retrieved?.meta?.protected).toBe(true);
		});
	});
});
