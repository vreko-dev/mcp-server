import { describe, expect, it } from "vitest";
import { type CreateSnapshotOptions, UnifiedSnapshotClient } from "../src/snapshots";

describe("SDK Snapshots", () => {
	describe("UnifiedSnapshotClient", () => {
		it("should create a new snapshot with metadata", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const options: CreateSnapshotOptions = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				reason: "Pre-Copilot snapshot",
				source: "vscode",
			};

			const snapshot = await snapshotClient.createSnapshot(options);

			expect(snapshot).toBeDefined();
			expect(snapshot.id).toMatch(/^snap-/);
			expect(snapshot.createdAt).toBeDefined();
			expect(snapshot.filePath).toBe(options.filePath);
			expect(snapshot.reason).toBe(options.reason);
			expect(snapshot.source).toBe(options.source);
		});

		it("should create snapshot with optional metadata", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const options: CreateSnapshotOptions = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				source: "cli",
				metadata: { aiTool: "copilot" },
			};

			const snapshot = await snapshotClient.createSnapshot(options);

			expect(snapshot.metadata).toEqual({ aiTool: "copilot" });
		});

		it("should list snapshots and return empty array when no snapshots exist", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const snapshots = await snapshotClient.listSnapshots({
				filePath: "/test/file.js",
				limit: 10,
			});

			expect(Array.isArray(snapshots)).toBe(true);
			expect(snapshots.length).toBe(0);
		});

		it("should restore snapshot and return empty string (mock implementation)", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const restoredContent = await snapshotClient.restoreSnapshot({
				snapshotId: "snap-123",
			});

			expect(typeof restoredContent).toBe("string");
		});

		it("should get snapshot content and return empty string (mock implementation)", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const content = await snapshotClient.getSnapshotContent("snap-123");

			expect(typeof content).toBe("string");
		});

		it("should expose all required interface methods", () => {
			const snapshotClient = new UnifiedSnapshotClient();

			expect(typeof snapshotClient.createSnapshot).toBe("function");
			expect(typeof snapshotClient.listSnapshots).toBe("function");
			expect(typeof snapshotClient.restoreSnapshot).toBe("function");
			expect(typeof snapshotClient.getSnapshotContent).toBe("function");
		});

		it("should generate unique IDs for each snapshot", async () => {
			const snapshotClient = new UnifiedSnapshotClient();

			const options: CreateSnapshotOptions = {
				filePath: "/test/file.js",
				content: "test",
				source: "vscode",
			};

			const snapshot1 = await snapshotClient.createSnapshot(options);
			const snapshot2 = await snapshotClient.createSnapshot(options);

			expect(snapshot1.id).not.toBe(snapshot2.id);
		});
	});
});
