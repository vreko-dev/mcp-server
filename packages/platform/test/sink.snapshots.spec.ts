import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SnapshotStoreDb } from "../src/db/adapters/SnapshotStoreDb";
import * as schema from "../src/db/schema/snapback/index";

const isDatabaseAvailable = !!process.env.DATABASE_URL;

describe.skipIf(!isDatabaseAvailable)("AD2: SnapshotStoreDb implementation", () => {
	const testId1 = "snk-001";
	const testId2 = "snk-002";
	const testId3 = "snk-003";

	let client: ReturnType<typeof postgres>;
	let db: any;
	let snapshotStore: SnapshotStoreDb;

	beforeAll(() => {
		// biome-ignore lint/style/noNonNullAssertion: Safe because skipIf ensures DATABASE_URL exists
		client = postgres(process.env.DATABASE_URL!);
		db = drizzle(client, { schema });
		snapshotStore = new SnapshotStoreDb(db);
	});

	beforeEach(async () => {
		// Clear test data before each test for isolation
		try {
			await db.execute(
				`DELETE FROM snapshot_files WHERE snapshot_id IN (SELECT id FROM snapshots WHERE user_id IN ('user-001', 'user-002', 'user-003'))`,
			);
			await db.execute(`DELETE FROM snapshots WHERE user_id IN ('user-001', 'user-002', 'user-003')`);
		} catch {
			// Table might not exist yet in test environment
		}
	});

	afterAll(async () => {
		if (client) {
			await client.end();
		}
	});

	it(`${testId1}: should create and fetch snapshot`, async () => {
		const snapshot = {
			userId: "user-001",
			apiKeyId: "key-001",
			workspaceId: "ws-001",
			name: "Test Snapshot",
			description: "Test snapshot for unit test",
			triggerType: "manual",
			fileCount: 5,
			totalSizeBytes: 10240,
			riskScore: 75,
		};

		// Create snapshot
		const snapshotId = await snapshotStore.createSnapshot(snapshot);

		// Fetch snapshot
		const fetchedSnapshot = await snapshotStore.fetchSnapshot(snapshotId);

		expect(fetchedSnapshot).not.toBeNull();
		expect(fetchedSnapshot?.id).toBe(snapshotId);
		expect(fetchedSnapshot?.userId).toBe(snapshot.userId);
		expect(fetchedSnapshot?.apiKeyId).toBe(snapshot.apiKeyId);
		expect(fetchedSnapshot?.workspaceId).toBe(snapshot.workspaceId);
		expect(fetchedSnapshot?.name).toBe(snapshot.name);
		expect(fetchedSnapshot?.description).toBe(snapshot.description);
		expect(fetchedSnapshot?.triggerType).toBe(snapshot.triggerType);
		expect(fetchedSnapshot?.fileCount).toBe(snapshot.fileCount);
		expect(fetchedSnapshot?.totalSizeBytes).toBe(snapshot.totalSizeBytes);
		expect(fetchedSnapshot?.riskScore).toBe(snapshot.riskScore);
		expect(fetchedSnapshot?.createdAt).toBeDefined();
	});

	it(`${testId2}: should add and fetch snapshot files`, async () => {
		// Create a snapshot first
		const snapshotId = await snapshotStore.createSnapshot({
			userId: "user-001",
			apiKeyId: "key-001",
			triggerType: "manual",
			fileCount: 2,
			totalSizeBytes: 2048,
		});

		const files = [
			{
				filePath: "/path/to/file1.js",
				fileHash: "hash1",
				fileSizeBytes: 1024,
				changeType: "modified",
				linesChanged: 10,
			},
			{
				filePath: "/path/to/file2.ts",
				fileHash: "hash2",
				fileSizeBytes: 1024,
				changeType: "added",
				linesChanged: 5,
			},
		];

		// Add files to snapshot
		await snapshotStore.addFilesToSnapshot(snapshotId, files);

		// Fetch files
		const fetchedFiles = await snapshotStore.fetchSnapshotFiles(snapshotId);

		expect(fetchedFiles).toHaveLength(2);
		expect(fetchedFiles[0].snapshotId).toBe(snapshotId);
		expect(fetchedFiles[0].filePath).toBe(files[0].filePath);
		expect(fetchedFiles[0].fileHash).toBe(files[0].fileHash);
		expect(fetchedFiles[0].fileSizeBytes).toBe(files[0].fileSizeBytes);
		expect(fetchedFiles[0].changeType).toBe(files[0].changeType);
		expect(fetchedFiles[0].linesChanged).toBe(files[0].linesChanged);

		expect(fetchedFiles[1].snapshotId).toBe(snapshotId);
		expect(fetchedFiles[1].filePath).toBe(files[1].filePath);
		expect(fetchedFiles[1].fileHash).toBe(files[1].fileHash);
		expect(fetchedFiles[1].fileSizeBytes).toBe(files[1].fileSizeBytes);
		expect(fetchedFiles[1].changeType).toBe(files[1].changeType);
		expect(fetchedFiles[1].linesChanged).toBe(files[1].linesChanged);
	});

	it(`${testId3}: should list snapshots for user with data isolation`, async () => {
		// Create multiple snapshots for the same user (user-002 is seeded in database)
		await snapshotStore.createSnapshot({
			userId: "user-002",
			apiKeyId: "key-002",
			name: "Snapshot 1",
			triggerType: "manual",
			fileCount: 1,
			totalSizeBytes: 100,
		});

		await snapshotStore.createSnapshot({
			userId: "user-002",
			apiKeyId: "key-002",
			name: "Snapshot 2",
			triggerType: "auto",
			fileCount: 2,
			totalSizeBytes: 200,
		});

		// Create a snapshot for a different user (should not appear in list)
		await snapshotStore.createSnapshot({
			userId: "user-003",
			apiKeyId: "key-003",
			name: "Other User Snapshot",
			triggerType: "manual",
			fileCount: 1,
			totalSizeBytes: 100,
		});

		// List snapshots for user-002
		const snapshots = await snapshotStore.listSnapshots("user-002");

		// Should have at least the 2 we just created (may have more from previous runs, but should filter by user)
		const user002Snapshots = snapshots.filter((s) => s.userId === "user-002");
		expect(user002Snapshots.length).toBeGreaterThanOrEqual(2);

		// Verify data isolation: all returned snapshots should be for user-002 only
		for (const snapshot of snapshots) {
			expect(snapshot.userId).toBe("user-002");
		}

		// Verify that user-003's snapshot is NOT in the list
		const user003Snapshots = snapshots.filter((s) => s.userId === "user-003");
		expect(user003Snapshots).toHaveLength(0);
	});
});
