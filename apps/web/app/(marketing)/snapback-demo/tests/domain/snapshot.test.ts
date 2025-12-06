import { describe, expect, it } from "vitest";
import {
	createSnapshot,
	generateSnapshotName,
	getSnapshotsForFile,
	restoreSnapshot,
} from "../../domain/snapshot";
import type { Snapshot } from "../../domain/types";

describe("Snapshot Domain Functions", () => {
	describe("createSnapshot", () => {
		it("should create a new snapshot when content changes", () => {
			const fileId = "file1";
			const content = "new content";
			const currentSnapshots: Snapshot[] = [];
			const protectionLevel = "watch";

			const snapshot = createSnapshot(
				fileId,
				content,
				currentSnapshots,
				protectionLevel,
			);

			expect(snapshot).not.toBeNull();
			expect(snapshot?.fileId).toBe(fileId);
			expect(snapshot?.content).toBe(content);
			expect(snapshot?.protectionLevel).toBe(protectionLevel);
			expect(snapshot?.id).toBeDefined();
			expect(snapshot?.timestamp).toBeInstanceOf(Date);
		});

		it("should return null for deduplication when content is unchanged", () => {
			const fileId = "file1";
			const content = "same content";
			const currentSnapshots: Snapshot[] = [
				{
					id: "snap1",
					fileId,
					content,
					timestamp: new Date(),
					name: "snapshot1",
					protectionLevel: "watch",
				},
			];
			const protectionLevel = "watch";

			const snapshot = createSnapshot(
				fileId,
				content,
				currentSnapshots,
				protectionLevel,
			);

			expect(snapshot).toBeNull();
		});

		it("should create a new snapshot when content differs from latest", () => {
			const fileId = "file1";
			const content = "new content";
			const currentSnapshots: Snapshot[] = [
				{
					id: "snap1",
					fileId,
					content: "old content",
					timestamp: new Date(Date.now() - 1000),
					name: "snapshot1",
					protectionLevel: "watch",
				},
			];
			const protectionLevel = "warn";

			const snapshot = createSnapshot(
				fileId,
				content,
				currentSnapshots,
				protectionLevel,
			);

			expect(snapshot).not.toBeNull();
			expect(snapshot?.content).toBe(content);
			expect(snapshot?.protectionLevel).toBe(protectionLevel);
		});
	});

	describe("generateSnapshotName", () => {
		it("should generate timestamp-based name when no git context", () => {
			const name = generateSnapshotName();
			expect(name).toMatch(/^snapshot-\d+$/);
		});

		it("should generate git-based name when git context provided", () => {
			const gitContext = {
				branch: "main",
				commit: "abc123def456",
				author: "testuser",
			};

			const name = generateSnapshotName(gitContext);
			expect(name).toMatch(/^main-abc123-\d+$/);
		});
	});

	describe("restoreSnapshot", () => {
		it("should return the content of a snapshot", () => {
			const snapshot: Snapshot = {
				id: "snap1",
				fileId: "file1",
				content: "restored content",
				timestamp: new Date(),
				name: "snapshot1",
				protectionLevel: "watch",
			};

			const content = restoreSnapshot(snapshot);
			expect(content).toBe("restored content");
		});
	});

	describe("getSnapshotsForFile", () => {
		it("should return snapshots for a file sorted newest first", () => {
			const snapshots: Snapshot[] = [
				{
					id: "snap1",
					fileId: "file1",
					content: "content1",
					timestamp: new Date(Date.now() - 2000),
					name: "snapshot1",
					protectionLevel: "watch",
				},
				{
					id: "snap2",
					fileId: "file1",
					content: "content2",
					timestamp: new Date(Date.now() - 1000),
					name: "snapshot2",
					protectionLevel: "warn",
				},
				{
					id: "snap3",
					fileId: "file2",
					content: "content3",
					timestamp: new Date(),
					name: "snapshot3",
					protectionLevel: "block",
				},
			];

			const result = getSnapshotsForFile(snapshots, "file1");

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("snap2"); // Newest first
			expect(result[1].id).toBe("snap1");
		});
	});
});
