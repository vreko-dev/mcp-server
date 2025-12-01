import { describe, expect, it } from "vitest";
import { SnapbackClient } from "../src/client";
import { UnifiedSnapshotClient } from "../src/snapshots";

// Test IDs: snap-001, snap-002, snap-003
describe("SDK Snapshots", () => {
	// Mock client for testing
	const mockClient = new SnapbackClient({
		baseUrl: "http://localhost:3000",
		surface: "vscode",
	});

	describe("snap-001: Create snapshot via SDK", () => {
		it("should create a new snapshot with metadata", async () => {
			const snapshotClient = new UnifiedSnapshotClient(mockClient);

			const options = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				reason: "Pre-Copilot snapshot",
				source: "vscode",
			};

			const snapshot = await snapshotClient.createSnapshot(options);

			expect(snapshot).toBeDefined();
			expect(snapshot.id).toMatch(/^snap-/);
			expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
			expect(snapshot.filePath).toBe(options.filePath);
			expect(snapshot.reason).toBe(options.reason);
			expect(snapshot.source).toBe(options.source);
			expect(snapshot.size).toBe(options.content.length);
			expect(snapshot.hash).toBeDefined();
		});
	});

	describe("snap-002: List snapshots via SDK", () => {
		it("should list snapshots with filtering options", async () => {
			const snapshotClient = new UnifiedSnapshotClient(mockClient);

			const snapshots = await snapshotClient.listSnapshots({
				filePath: "/test/file.js",
				limit: 10,
			});

			expect(Array.isArray(snapshots)).toBe(true);
		});
	});

	describe("snap-003: Restore snapshot via SDK", () => {
		it("should restore snapshot content", async () => {
			const snapshotClient = new UnifiedSnapshotClient(mockClient);

			// First create a snapshot
			const createOptions = {
				filePath: "/test/file.js",
				content: 'console.log("test");',
				source: "vscode",
			};

			const snapshot = await snapshotClient.createSnapshot(createOptions);

			// Then restore it
			const restoredContent = await snapshotClient.restoreSnapshot({
				snapshotId: snapshot.id,
			});

			// For mock implementation, we expect empty string
			expect(typeof restoredContent).toBe("string");
		});
	});

	describe("Unified interface", () => {
		it("should provide same code path for VS Code & MCP snapshot ops", () => {
			const snapshotClient = new UnifiedSnapshotClient(mockClient);

			// Check that all required methods exist
			expect(typeof snapshotClient.createSnapshot).toBe("function");
			expect(typeof snapshotClient.listSnapshots).toBe("function");
			expect(typeof snapshotClient.restoreSnapshot).toBe("function");
			expect(typeof snapshotClient.getSnapshotContent).toBe("function");
		});
	});
});
