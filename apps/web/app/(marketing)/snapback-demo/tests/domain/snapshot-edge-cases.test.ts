import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnapshot } from "../../domain/snapshot";
import type { Snapshot } from "../../domain/types";

describe("Snapshot Edge Cases", () => {
	beforeEach(() => {
		// Clear the in-memory cache between tests
		vi.resetModules();
	});

	describe("debounce behavior", () => {
		it("should respect debounce window for auto snapshots", () => {
			const fileId = "file1";
			const content = "test content";
			const currentSnapshots: Snapshot[] = [];
			const protectionLevel = "watch";

			// Create first snapshot
			const snapshot1 = createSnapshot(
				fileId,
				content,
				currentSnapshots,
				protectionLevel,
				undefined,
				{ checkpointInterval: 5000 }, // 5 second interval
			);

			expect(snapshot1).not.toBeNull();

			// Try to create second snapshot immediately (should be blocked by debounce)
			const snapshot2 = createSnapshot(
				fileId,
				`${content} modified`,
				snapshot1 ? [...currentSnapshots, snapshot1] : currentSnapshots,
				protectionLevel,
				undefined,
				{ checkpointInterval: 5000 },
			);

			expect(snapshot2).toBeNull();
		});

		it("should bypass debounce for manual snapshots", () => {
			const fileId = "file1";
			const content = "test content";
			const currentSnapshots: Snapshot[] = [];
			const protectionLevel = "watch";

			// Create first snapshot
			const snapshot1 = createSnapshot(
				fileId,
				content,
				currentSnapshots,
				protectionLevel,
				undefined,
				{
					checkpointInterval: 5000,
				},
			);

			expect(snapshot1).not.toBeNull();

			// Try to create manual snapshot (should bypass debounce)
			const snapshot2 = createSnapshot(
				fileId,
				`${content} modified`,
				snapshot1 ? [...currentSnapshots, snapshot1] : currentSnapshots,
				protectionLevel,
				undefined,
				{ checkpointInterval: 5000, forceCreate: true },
			);

			expect(snapshot2).not.toBeNull();
		});
	});

	describe("deduplication", () => {
		it("should not create snapshot for identical content", () => {
			const fileId = "file1";
			const content = "identical content";
			const currentSnapshots: Snapshot[] = [
				{
					id: "snap1",
					fileId,
					content,
					timestamp: new Date(Date.now() - 10000),
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

		it("should create snapshot for different content", () => {
			const fileId = "file1";
			const content1 = "original content";
			const content2 = "modified content";
			const currentSnapshots: Snapshot[] = [
				{
					id: "snap1",
					fileId,
					content: content1,
					timestamp: new Date(Date.now() - 10000),
					name: "snapshot1",
					protectionLevel: "watch",
				},
			];
			const protectionLevel = "watch";

			const snapshot = createSnapshot(
				fileId,
				content2,
				currentSnapshots,
				protectionLevel,
			);

			expect(snapshot).not.toBeNull();
			expect(snapshot?.content).toBe(content2);
		});
	});

	describe("rapid edit scenarios", () => {
		it("should handle burst of edits with proper debouncing", () => {
			const fileId = "file1";
			const protectionLevel = "watch";
			let currentSnapshots: Snapshot[] = [];
			let snapshotCount = 0;

			// Simulate rapid edits
			for (let i = 0; i < 10; i++) {
				const content = `content edit ${i}`;
				const snapshot = createSnapshot(
					fileId,
					content,
					currentSnapshots,
					protectionLevel,
					undefined,
					{ checkpointInterval: 1000 }, // 1 second interval
				);

				if (snapshot) {
					snapshotCount++;
					currentSnapshots = [...currentSnapshots, snapshot];
				}
			}

			// Should only have created 1 snapshot due to debouncing
			expect(snapshotCount).toBe(1);
		});
	});
});
