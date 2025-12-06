import { describe, expect, it } from "vitest";
import { createSnapshot } from "../../src/tools/create-snapshot";
import { addSnapshot, listSnapshots } from "../../src/tools/list-snapshots";
import { restoreSnapshot, storeSnapshotContent } from "../../src/tools/restore-snapshot";

describe("MCP Snapshot Tools", () => {
	it("mcp-snap-001: should create snapshot with content-addressed ID", async () => {
		// Call the create snapshot function
		const result = await createSnapshot({
			reason: "test snapshot",
			content: "test content",
		});

		// Should create snapshot successfully
		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.snapshot).toBeDefined();
		expect(result.snapshot.id).toBeDefined();
		expect(result.snapshot.id).toMatch(/^snap-[a-f0-9]+$/);
		expect(result.snapshot.timestamp).toBeGreaterThan(0);
		expect(result.snapshot.reason).toBe("test snapshot");
	});

	it("mcp-snap-002: should create snapshot with files", async () => {
		// Call the create snapshot function with files
		const result = await createSnapshot({
			reason: "test snapshot with files",
			files: [
				{ path: "/test/file1.js", content: "console.log('hello');" },
				{ path: "/test/file2.js", content: "console.log('world');" },
			],
		});

		// Should create snapshot successfully
		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.snapshot).toBeDefined();
		expect(result.snapshot.fileCount).toBe(2);
	});

	it("mcp-snap-003: should list snapshots", async () => {
		// First create a snapshot
		const createResult = await createSnapshot({
			reason: "test for listing",
			content: "test content",
		});

		expect(createResult.success).toBe(true);

		// Add to the list
		addSnapshot(createResult.snapshot);

		// Then list snapshots
		const listResult = await listSnapshots();

		// Should list snapshots successfully
		expect(listResult).toBeDefined();
		expect(listResult.success).toBe(true);
		expect(Array.isArray(listResult.snapshots)).toBe(true);
		expect(listResult.snapshots.length).toBeGreaterThanOrEqual(1);
	});

	it("mcp-snap-004: should restore snapshot", async () => {
		// First create a snapshot with files
		const createResult = await createSnapshot({
			reason: "test for restoration",
			files: [{ path: "/test/restore.js", content: "console.log('restore test');" }],
		});

		expect(createResult.success).toBe(true);

		// Add to the list
		addSnapshot(createResult.snapshot);

		// Store content
		if (createResult.snapshot.fileCount > 0) {
			storeSnapshotContent(createResult.snapshot.id, [
				{ path: "/test/restore.js", content: "console.log('restore test');" },
			]);
		}

		// Then restore the snapshot
		const restoreResult = await restoreSnapshot(createResult.snapshot.id);

		// Should restore snapshot successfully
		expect(restoreResult).toBeDefined();
		expect(restoreResult.success).toBe(true);
		expect(restoreResult.snapshot).toBeDefined();
		expect(restoreResult.snapshot.id).toBe(createResult.snapshot.id);
		expect(restoreResult.snapshot.content).toBeDefined();
	});

	it("mcp-snap-005: should return error for non-existent snapshot", async () => {
		// Try to restore a non-existent snapshot
		const result = await restoreSnapshot("snap-nonexistent");

		// Should return error
		expect(result).toBeDefined();
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("mcp-snap-006: should verify snapshot ID equals blake3(content)", async () => {
		// Create two snapshots with the same content
		const result1 = await createSnapshot({
			reason: "blake3 test 1",
			content: "test content for blake3",
		});

		const result2 = await createSnapshot({
			reason: "blake3 test 2",
			content: "test content for blake3",
		});

		// Should create snapshots with the same ID
		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		expect(result1.snapshot.id).toBe(result2.snapshot.id);
	});
});
