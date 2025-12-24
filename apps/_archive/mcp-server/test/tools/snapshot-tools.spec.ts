/**
 * TDD Test Suite for MCP Snapshot Tools
 * RED PHASE: Define expected behavior for MCP tools integration
 */

import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CreateSnapshotSchema, createSnapshot } from "../../src/tools/create-snapshot";
import { listSnapshots } from "../../src/tools/list-snapshots";
import { restoreSnapshot } from "../../src/tools/restore-snapshot";
import { clearRegistry, resetStorage } from "../../src/tools/storage-adapter";

describe("MCP Snapshot Tools - Integration with SnapshotStorage", () => {
	let testDir: string;
	let workspaceDir: string;

	beforeEach(async () => {
		// Reset storage and registry before each test
		resetStorage();
		clearRegistry();

		testDir = path.join(process.cwd(), `.test-mcp-${Date.now()}`);
		workspaceDir = path.join(testDir, "workspace");
		await fs.mkdir(workspaceDir, { recursive: true });

		// Set environment for tools to use test directory
		process.env.SNAPBACK_WORKSPACE = workspaceDir;
	});

	afterEach(async () => {
		if (existsSync(testDir)) {
			await fs.rm(testDir, { recursive: true, force: true });
		}
		delete process.env.SNAPBACK_WORKSPACE;

		// Clean up after tests
		resetStorage();
		clearRegistry();
	});

	describe("create_snapshot Tool", () => {
		it("should validate input schema", () => {
			const validInput = {
				reason: "Manual snapshot",
				files: [{ path: "test.ts", content: 'console.log("test");' }],
			};

			const result = CreateSnapshotSchema.safeParse(validInput);
			expect(result.success).toBe(true);
		});

		it("should create snapshot from files array", async () => {
			const result = await createSnapshot({
				reason: "Test snapshot",
				files: [
					{ path: "src/index.ts", content: 'export const version = "1.0.0";' },
					{ path: "README.md", content: "# Test Project" },
				],
			});

			expect(result.success).toBe(true);
			expect(result.snapshot).toBeDefined();
			expect(result.snapshot?.id).toMatch(/^snap-/);
			expect(result.snapshot?.fileCount).toBe(2);
			expect(result.snapshot?.reason).toBe("Test snapshot");
		});

		it("should create snapshot from single content", async () => {
			const result = await createSnapshot({
				reason: "Quick save",
				content: "const x = 42;",
				filePath: "script.js",
			});

			expect(result.success).toBe(true);
			expect(result.snapshot?.id).toMatch(/^snap-/);
			expect(result.snapshot?.fileCount).toBe(1);
		});

		it("should generate unique IDs for different content", async () => {
			const result1 = await createSnapshot({
				files: [{ path: "file1.txt", content: "content 1" }],
			});

			const result2 = await createSnapshot({
				files: [{ path: "file2.txt", content: "content 2" }],
			});

			expect(result1.snapshot?.id).not.toBe(result2.snapshot?.id);
		});

		it("should generate deterministic IDs for same content", async () => {
			const input = {
				files: [{ path: "test.txt", content: "same content" }],
			};

			const result1 = await createSnapshot(input);
			const result2 = await createSnapshot(input);

			// Same content should generate same hash-based ID
			expect(result1.snapshot?.id).toBe(result2.snapshot?.id);
		});

		it("should handle empty files array", async () => {
			const result = await createSnapshot({
				reason: "Empty snapshot",
				files: [],
			});

			expect(result.success).toBe(true);
			expect(result.snapshot?.fileCount).toBe(0);
		});

		it("should include timestamp in snapshot metadata", async () => {
			const before = Date.now();

			const result = await createSnapshot({
				files: [{ path: "test.txt", content: "test" }],
			});

			const after = Date.now();

			expect(result.snapshot?.timestamp).toBeGreaterThanOrEqual(before);
			expect(result.snapshot?.timestamp).toBeLessThanOrEqual(after);
		});

		it("should handle errors gracefully", async () => {
			// Test with invalid input that might cause internal error
			const result = await createSnapshot({
				files: undefined as any,
			});

			if (!result.success) {
				expect(result.error).toBeDefined();
			}
			// Should still return a result structure
			expect(result).toHaveProperty("success");
		});
	});

	describe("list_snapshots Tool", () => {
		it("should list all snapshots", async () => {
			// Create multiple snapshots
			await createSnapshot({
				files: [{ path: "file1.txt", content: "content 1" }],
				reason: "Snapshot 1",
			});

			await createSnapshot({
				files: [{ path: "file2.txt", content: "content 2" }],
				reason: "Snapshot 2",
			});

			const result = await listSnapshots();

			expect(result.success).toBe(true);
			expect(result.snapshots).toBeDefined();
			expect(result.snapshots?.length).toBeGreaterThanOrEqual(2);
		});

		it("should return snapshots in reverse chronological order", async () => {
			const _snap1 = await createSnapshot({
				files: [{ path: "old.txt", content: "old" }],
			});

			// Wait to ensure different timestamp
			await new Promise((resolve) => setTimeout(resolve, 10));

			const _snap2 = await createSnapshot({
				files: [{ path: "new.txt", content: "new" }],
			});

			const result = await listSnapshots();

			if (result.success && result.snapshots && result.snapshots.length >= 2) {
				// Most recent should be first
				expect(result.snapshots[0].timestamp).toBeGreaterThan(
					result.snapshots[result.snapshots.length - 1].timestamp,
				);
			}
		});

		it("should include snapshot metadata", async () => {
			await createSnapshot({
				files: [{ path: "test.txt", content: "test" }],
				reason: "Test reason",
			});

			const result = await listSnapshots();

			expect(result.success).toBe(true);
			expect(result.snapshots?.length).toBeGreaterThan(0);

			const snapshot = result.snapshots?.[0];
			expect(snapshot).toHaveProperty("id");
			expect(snapshot).toHaveProperty("timestamp");
			expect(snapshot).toHaveProperty("reason");
			expect(snapshot).toHaveProperty("fileCount");
		});

		it("should handle empty snapshot list", async () => {
			const result = await listSnapshots();

			expect(result.success).toBe(true);
			expect(result.snapshots).toBeDefined();
			expect(Array.isArray(result.snapshots)).toBe(true);
		});
	});

	describe("restore_snapshot Tool", () => {
		it("should restore snapshot by ID", async () => {
			const created = await createSnapshot({
				files: [{ path: "restored.txt", content: "restored content" }],
				reason: "For restore test",
			});

			expect(created.success).toBe(true);
			const snapshotId = created.snapshot?.id;

			const result = await restoreSnapshot(snapshotId);

			expect(result.success).toBe(true);
			expect(result.snapshot).toBeDefined();
			expect(result.snapshot?.id).toBe(snapshotId);
			expect(result.snapshot?.content).toBeDefined();
		});

		it("should return snapshot files content", async () => {
			const created = await createSnapshot({
				files: [
					{ path: "file1.txt", content: "content 1" },
					{ path: "file2.txt", content: "content 2" },
				],
			});

			const result = await restoreSnapshot(created.snapshot?.id);

			expect(result.success).toBe(true);
			expect(result.snapshot?.content).toHaveLength(2);
			expect(result.snapshot?.content).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ path: "file1.txt", content: "content 1" }),
					expect.objectContaining({ path: "file2.txt", content: "content 2" }),
				]),
			);
		});

		it("should fail gracefully for non-existent snapshot", async () => {
			const result = await restoreSnapshot("snap-nonexistent");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toMatch(/not found/i);
		});

		it("should preserve original file content exactly", async () => {
			const originalContent = 'function test() {\n  return "exact content";\n}';

			const created = await createSnapshot({
				files: [{ path: "exact.ts", content: originalContent }],
			});

			const result = await restoreSnapshot(created.snapshot?.id);

			expect(result.success).toBe(true);
			const restoredFile = result.snapshot?.content?.find((f) => f.path === "exact.ts");
			expect(restoredFile?.content).toBe(originalContent);
		});
	});

	describe("MCP Tool Integration Flow", () => {
		it("should support complete create -> list -> restore workflow", async () => {
			// 1. Create snapshot
			const created = await createSnapshot({
				files: [{ path: "workflow.txt", content: "workflow test" }],
				reason: "Workflow test",
			});

			expect(created.success).toBe(true);
			const snapshotId = created.snapshot?.id;

			// 2. List snapshots
			const listed = await listSnapshots();
			expect(listed.success).toBe(true);
			const found = listed.snapshots?.find((s) => s.id === snapshotId);
			expect(found).toBeDefined();
			expect(found?.reason).toBe("Workflow test");

			// 3. Restore snapshot
			const restored = await restoreSnapshot(snapshotId);
			expect(restored.success).toBe(true);
			expect(restored.snapshot?.content).toEqual([{ path: "workflow.txt", content: "workflow test" }]);
		});

		it("should handle multiple snapshots independently", async () => {
			// Create multiple snapshots
			const snap1 = await createSnapshot({
				files: [{ path: "version1.txt", content: "v1" }],
				reason: "Version 1",
			});

			const snap2 = await createSnapshot({
				files: [{ path: "version2.txt", content: "v2" }],
				reason: "Version 2",
			});

			// List should show both
			const listed = await listSnapshots();
			expect(listed.snapshots?.length).toBeGreaterThanOrEqual(2);

			// Restore each independently
			const restored1 = await restoreSnapshot(snap1.snapshot?.id);
			const restored2 = await restoreSnapshot(snap2.snapshot?.id);

			expect(restored1.snapshot?.content?.[0].content).toBe("v1");
			expect(restored2.snapshot?.content?.[0].content).toBe("v2");
		});
	});
});
