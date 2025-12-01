import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../persistence/db.js";
import { NotificationRepo } from "../../persistence/NotificationRepo.js";
import { ProtectionRepo } from "../../persistence/ProtectionRepo.js";
import { SnapshotRepo } from "../../persistence/SnapshotRepo.js";

describe("Persistence Revive Tests", () => {
	let snapshotRepo: SnapshotRepo;
	let protectionRepo: ProtectionRepo;
	let _notificationRepo: NotificationRepo;

	beforeEach(async () => {
		snapshotRepo = new SnapshotRepo();
		protectionRepo = new ProtectionRepo();
		_notificationRepo = new NotificationRepo();

		// Clear the database before each test
		await db.snapshots.clear();
		await db.protectedFiles.clear();
		await db.notifications.clear();
	});

	describe("Date revival", () => {
		it("should correctly serialize and deserialize dates", async () => {
			const testDate = new Date("2023-01-01T12:00:00Z");

			// Create a snapshot with a specific date
			const snapshotData = {
				fileId: "test-file",
				content: "test content",
				timestamp: testDate,
				name: "test-snapshot",
				protectionLevel: "watch" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);

			// Retrieve the snapshot and check that the date is preserved
			const retrievedSnapshot = await snapshotRepo.getById(createdSnapshot.id);

			expect(retrievedSnapshot).toBeDefined();
			expect(retrievedSnapshot?.timestamp.getTime()).toBe(testDate.getTime());
		});

		it("should handle timezone conversions correctly", async () => {
			// Test with a date that might have timezone issues
			const testDate = new Date("2023-06-15T14:30:00.123Z");

			const snapshotData = {
				fileId: "timezone-test",
				content: "timezone content",
				timestamp: testDate,
				name: "timezone-snapshot",
				protectionLevel: "warn" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);
			const retrievedSnapshot = await snapshotRepo.getById(createdSnapshot.id);

			expect(retrievedSnapshot?.timestamp.getTime()).toBe(testDate.getTime());
		});
	});

	describe("Enum revival", () => {
		it("should correctly serialize and deserialize protection levels", async () => {
			const protectionLevels = [
				"unprotected",
				"watch",
				"warn",
				"block",
			] as const;

			for (const level of protectionLevels) {
				// Create a protected file with each protection level
				const _protectedFile = await protectionRepo.save({
					path: `test-${level}.js`,
					protectionLevel: level,
				});

				// Retrieve and verify the protection level
				const retrievedFile = await protectionRepo.getByPath(
					`test-${level}.js`,
				);

				expect(retrievedFile).toBeDefined();
				expect(retrievedFile?.protectionLevel).toBe(level);
			}
		});
	});

	describe("Snapshot rehydration", () => {
		it("should correctly rehydrate complex snapshot data", async () => {
			const complexContent = `
// This is a complex file with multiple lines
function testFunction() {
  console.log('This is a test');
  return {
    nested: {
      property: 'value',
      array: [1, 2, 3]
    }
  };
}
`;

			const snapshotData = {
				fileId: "complex-file.ts",
				content: complexContent,
				timestamp: new Date(),
				name: "complex-snapshot-with-long-name",
				protectionLevel: "block" as const,
			};

			const createdSnapshot = await snapshotRepo.create(snapshotData);
			const retrievedSnapshot = await snapshotRepo.getById(createdSnapshot.id);

			expect(retrievedSnapshot).toBeDefined();
			expect(retrievedSnapshot?.content).toBe(complexContent);
			expect(retrievedSnapshot?.name).toBe("complex-snapshot-with-long-name");
			expect(retrievedSnapshot?.protectionLevel).toBe("block");
		});
	});
});
