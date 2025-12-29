/**
 * SnapshotService Tests
 *
 * Tests for shared snapshot operations across MCP tools.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Creates snapshots, lists, gets specific snapshot
 * - Sad: Empty files, invalid paths, no readable files
 * - Edge: Deduplication, skipDedup, dedupWindow
 * - Error: Gracefully handles storage/read failures
 *
 * @module test/services/snapshot-service
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SnapshotManifest } from "@snapback/engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSnapshotService,
	type FileHashResult,
	findMatchingSnapshot,
	getFileHashes,
	SnapshotService,
} from "../../src/services/snapshot-service.js";

// =============================================================================
// Test Setup
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-workspace-snapshot");

// Mock storage
const mockStorage = {
	createSnapshot: vi.fn(),
	listSnapshots: vi.fn(),
	getSnapshot: vi.fn(),
};

// Mock createStorage from engine
vi.mock("@snapback/engine", () => ({
	createStorage: vi.fn(() => mockStorage),
}));

function setupTestWorkspace() {
	if (!existsSync(TEST_WORKSPACE)) {
		mkdirSync(TEST_WORKSPACE, { recursive: true });
	}
	// Create src directory for test files
	const srcDir = join(TEST_WORKSPACE, "src");
	if (!existsSync(srcDir)) {
		mkdirSync(srcDir, { recursive: true });
	}
}

function cleanupTestWorkspace() {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

function createTestFile(relativePath: string, content = "// test file content") {
	const fullPath = join(TEST_WORKSPACE, relativePath);
	const dir = join(fullPath, "..");
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(fullPath, content);
	return fullPath;
}

function createMockSnapshotManifest(
	id: string,
	files: { path: string; blobId: string }[],
	createdAt = Date.now(),
): SnapshotManifest {
	return {
		id,
		createdAt,
		files: files.map((f) => ({
			path: f.path,
			blobId: f.blobId,
			originalSize: 100,
		})),
		totalSize: files.length * 100,
		description: "Test snapshot",
		trigger: "manual" as const,
	};
}

// =============================================================================
// Unit Tests - getFileHashes
// =============================================================================

describe("getFileHashes", () => {
	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanupTestWorkspace();
	});

	it("should return hashes for existing files", () => {
		createTestFile("src/index.ts", "const x = 1;");
		createTestFile("src/utils.ts", "export function add() {}");

		const results = getFileHashes(["src/index.ts", "src/utils.ts"], TEST_WORKSPACE);

		expect(results).toHaveLength(2);
		expect(results[0].path).toBe("src/index.ts");
		expect(results[0].exists).toBe(true);
		expect(results[0].hash).toHaveLength(16); // SHA-256 truncated to 16 chars
		expect(results[1].path).toBe("src/utils.ts");
		expect(results[1].exists).toBe(true);
		expect(results[1].hash).toHaveLength(16);
	});

	it("should return empty hash for non-existent files", () => {
		const results = getFileHashes(["nonexistent.ts"], TEST_WORKSPACE);

		expect(results).toHaveLength(1);
		expect(results[0].path).toBe("nonexistent.ts");
		expect(results[0].exists).toBe(false);
		expect(results[0].hash).toBe("");
	});

	it("should produce different hashes for different content", () => {
		createTestFile("src/a.ts", "content A");
		createTestFile("src/b.ts", "content B");

		const results = getFileHashes(["src/a.ts", "src/b.ts"], TEST_WORKSPACE);

		expect(results[0].hash).not.toBe(results[1].hash);
	});

	it("should produce same hash for same content", () => {
		createTestFile("src/a.ts", "same content");
		createTestFile("src/b.ts", "same content");

		const results = getFileHashes(["src/a.ts", "src/b.ts"], TEST_WORKSPACE);

		expect(results[0].hash).toBe(results[1].hash);
	});
});

// =============================================================================
// Unit Tests - findMatchingSnapshot
// =============================================================================

describe("findMatchingSnapshot", () => {
	it("should find matching snapshot when all hashes match", () => {
		const currentHashes: FileHashResult[] = [
			{ path: "src/index.ts", hash: "abc123def456ghi7", exists: true },
			{ path: "src/utils.ts", hash: "xyz789uvw012rst3", exists: true },
		];

		const snapshots = [
			createMockSnapshotManifest("snap-1", [
				{ path: "src/index.ts", blobId: "abc123def456ghi7" },
				{ path: "src/utils.ts", blobId: "xyz789uvw012rst3" },
			]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots);

		expect(result.matched).toBe(true);
		expect(result.snapshotId).toBe("snap-1");
	});

	it("should not match when file count differs", () => {
		const currentHashes: FileHashResult[] = [{ path: "src/index.ts", hash: "abc123def456ghi7", exists: true }];

		const snapshots = [
			createMockSnapshotManifest("snap-1", [
				{ path: "src/index.ts", blobId: "abc123def456ghi7" },
				{ path: "src/utils.ts", blobId: "xyz789uvw012rst3" },
			]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots);

		expect(result.matched).toBe(false);
	});

	it("should not match when hashes differ", () => {
		const currentHashes: FileHashResult[] = [{ path: "src/index.ts", hash: "different_hash", exists: true }];

		const snapshots = [
			createMockSnapshotManifest("snap-1", [{ path: "src/index.ts", blobId: "abc123def456ghi7" }]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots);

		expect(result.matched).toBe(false);
	});

	it("should not match when file doesn't exist", () => {
		const currentHashes: FileHashResult[] = [{ path: "src/index.ts", hash: "", exists: false }];

		const snapshots = [
			createMockSnapshotManifest("snap-1", [{ path: "src/index.ts", blobId: "abc123def456ghi7" }]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots);

		expect(result.matched).toBe(false);
	});

	it("should respect windowSize parameter", () => {
		const currentHashes: FileHashResult[] = [{ path: "src/index.ts", hash: "abc123def456ghi7", exists: true }];

		// Match is in the 6th snapshot (index 5), but window is 3
		const snapshots = [
			createMockSnapshotManifest("snap-1", [{ path: "src/other.ts", blobId: "xxx" }]),
			createMockSnapshotManifest("snap-2", [{ path: "src/other.ts", blobId: "yyy" }]),
			createMockSnapshotManifest("snap-3", [{ path: "src/other.ts", blobId: "zzz" }]),
			createMockSnapshotManifest("snap-4", [{ path: "src/other.ts", blobId: "aaa" }]),
			createMockSnapshotManifest("snap-5", [{ path: "src/other.ts", blobId: "bbb" }]),
			createMockSnapshotManifest("snap-match", [{ path: "src/index.ts", blobId: "abc123def456ghi7" }]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots, 3);

		expect(result.matched).toBe(false); // Match is outside window
	});

	it("should find match within windowSize", () => {
		const currentHashes: FileHashResult[] = [{ path: "src/index.ts", hash: "abc123def456ghi7", exists: true }];

		const snapshots = [
			createMockSnapshotManifest("snap-1", [{ path: "src/other.ts", blobId: "xxx" }]),
			createMockSnapshotManifest("snap-match", [{ path: "src/index.ts", blobId: "abc123def456ghi7" }]),
		];

		const result = findMatchingSnapshot(currentHashes, snapshots, 5);

		expect(result.matched).toBe(true);
		expect(result.snapshotId).toBe("snap-match");
	});
});

// =============================================================================
// Unit Tests - SnapshotService
// =============================================================================

describe("SnapshotService", () => {
	let service: SnapshotService;

	beforeEach(() => {
		setupTestWorkspace();
		service = new SnapshotService(TEST_WORKSPACE);

		// Reset mocks
		mockStorage.createSnapshot.mockReset();
		mockStorage.listSnapshots.mockReset();
		mockStorage.getSnapshot.mockReset();

		// Default mock returns
		mockStorage.listSnapshots.mockReturnValue([]);
		mockStorage.createSnapshot.mockResolvedValue({
			id: "snap-test-123",
			files: [{ path: "src/index.ts", blobId: "hash123", originalSize: 100 }],
			totalSize: 100,
			createdAt: Date.now(),
		});
	});

	afterEach(() => {
		cleanupTestWorkspace();
		vi.clearAllMocks();
	});

	// ===========================================================================
	// HAPPY PATH
	// ===========================================================================

	describe("Happy Path", () => {
		it("should create snapshot from files", async () => {
			createTestFile("src/index.ts", "const x = 1;");

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test snapshot",
				trigger: "manual",
			});

			expect(result.success).toBe(true);
			expect(result.snapshot).toBeDefined();
			expect(result.snapshot?.id).toBe("snap-test-123");
			expect(result.snapshot?.fileCount).toBe(1);
		});

		it("should pass correct options to storage", async () => {
			createTestFile("src/index.ts", "const x = 1;");

			await service.createFromFiles(["src/index.ts"], {
				description: "My description",
				trigger: "ai-detection",
			});

			expect(mockStorage.createSnapshot).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						path: "src/index.ts",
						content: "const x = 1;",
					}),
				]),
				expect.objectContaining({
					description: "My description",
					trigger: "ai-detection",
				}),
			);
		});

		it("should list snapshots with limit", () => {
			const mockSnapshots = [
				createMockSnapshotManifest("snap-1", []),
				createMockSnapshotManifest("snap-2", []),
				createMockSnapshotManifest("snap-3", []),
			];
			mockStorage.listSnapshots.mockReturnValue(mockSnapshots);

			const result = service.listSnapshots(2);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("snap-1");
			expect(result[1].id).toBe("snap-2");
		});

		it("should get specific snapshot by id", () => {
			const mockSnapshot = createMockSnapshotManifest("snap-123", []);
			mockStorage.getSnapshot.mockReturnValue(mockSnapshot);

			const result = service.getSnapshot("snap-123");

			expect(result).toBeDefined();
			expect(result?.id).toBe("snap-123");
			expect(mockStorage.getSnapshot).toHaveBeenCalledWith("snap-123");
		});

		it("should handle multiple files", async () => {
			createTestFile("src/a.ts", "file a");
			createTestFile("src/b.ts", "file b");
			createTestFile("src/c.ts", "file c");

			mockStorage.createSnapshot.mockResolvedValue({
				id: "snap-multi",
				files: [
					{ path: "src/a.ts", blobId: "hash-a", originalSize: 10 },
					{ path: "src/b.ts", blobId: "hash-b", originalSize: 10 },
					{ path: "src/c.ts", blobId: "hash-c", originalSize: 10 },
				],
				totalSize: 30,
				createdAt: Date.now(),
			});

			const result = await service.createFromFiles(["src/a.ts", "src/b.ts", "src/c.ts"], {
				description: "Multi-file",
				trigger: "manual",
			});

			expect(result.success).toBe(true);
			expect(result.snapshot?.fileCount).toBe(3);
		});
	});

	// ===========================================================================
	// SAD PATH
	// ===========================================================================

	describe("Sad Path", () => {
		it("should return error for empty file list", async () => {
			const result = await service.createFromFiles([], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No files provided");
		});

		it("should return error for null file list", async () => {
			const result = await service.createFromFiles(null as unknown as string[], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No files provided");
		});

		it("should return error when no readable files found", async () => {
			// Don't create the file - it won't exist
			const result = await service.createFromFiles(["nonexistent.ts"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("No readable files found");
		});

		it("should return null for non-existent snapshot id", () => {
			mockStorage.getSnapshot.mockReturnValue(null);

			const result = service.getSnapshot("nonexistent-id");

			expect(result).toBeNull();
		});

		it("should return empty array when no snapshots exist", () => {
			mockStorage.listSnapshots.mockReturnValue([]);

			const result = service.listSnapshots();

			expect(result).toEqual([]);
		});
	});

	// ===========================================================================
	// EDGE CASES
	// ===========================================================================

	describe("Edge Cases", () => {
		it("should reuse snapshot when files unchanged (deduplication)", async () => {
			createTestFile("src/index.ts", "unchanged content");

			// Mock existing snapshot with matching hash
			const existingSnapshot = createMockSnapshotManifest(
				"existing-snap",
				[{ path: "src/index.ts", blobId: "" }], // Will be compared by getFileHashes
				Date.now() - 60000,
			);

			// We need to make the hash match - compute the actual hash
			const { createHash } = await import("node:crypto");
			const actualHash = createHash("sha256").update("unchanged content").digest("hex").substring(0, 16);

			// Update the mock snapshot with the actual hash
			existingSnapshot.files[0].blobId = actualHash;
			mockStorage.listSnapshots.mockReturnValue([existingSnapshot]);

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(true);
			expect(result.reused).toBe(true);
			expect(result.reusedSnapshotId).toBe("existing-snap");
			expect(result.reusedReason).toContain("unchanged");
		});

		it("should skip deduplication when skipDedup is true", async () => {
			createTestFile("src/index.ts", "content");

			// Even with matching snapshot, should create new one
			const { createHash } = await import("node:crypto");
			const actualHash = createHash("sha256").update("content").digest("hex").substring(0, 16);

			const existingSnapshot = createMockSnapshotManifest("existing-snap", [
				{ path: "src/index.ts", blobId: actualHash },
			]);
			mockStorage.listSnapshots.mockReturnValue([existingSnapshot]);

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test",
				trigger: "manual",
				skipDedup: true,
			});

			expect(result.success).toBe(true);
			expect(result.reused).toBeFalsy();
			expect(mockStorage.createSnapshot).toHaveBeenCalled();
		});

		it("should respect custom dedupWindow", async () => {
			createTestFile("src/index.ts", "content");

			const { createHash } = await import("node:crypto");
			const actualHash = createHash("sha256").update("content").digest("hex").substring(0, 16);

			// Match is in 4th position but window is 2
			const snapshots = [
				createMockSnapshotManifest("snap-1", [{ path: "other.ts", blobId: "x" }]),
				createMockSnapshotManifest("snap-2", [{ path: "other.ts", blobId: "y" }]),
				createMockSnapshotManifest("snap-3", [{ path: "other.ts", blobId: "z" }]),
				createMockSnapshotManifest("match-snap", [{ path: "src/index.ts", blobId: actualHash }]),
			];
			mockStorage.listSnapshots.mockReturnValue(snapshots);

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test",
				trigger: "manual",
				dedupWindow: 2,
			});

			// Should NOT reuse because match is outside window
			expect(result.reused).toBeFalsy();
			expect(mockStorage.createSnapshot).toHaveBeenCalled();
		});

		it("should handle files with special characters in path", async () => {
			createTestFile("src/my-component.test.ts", "test content");

			const result = await service.createFromFiles(["src/my-component.test.ts"], {
				description: "Test",
				trigger: "auto",
			});

			expect(result.success).toBe(true);
		});

		it("should filter out non-existent files and continue with rest", async () => {
			createTestFile("src/exists.ts", "I exist");
			// Don't create "src/missing.ts"

			mockStorage.createSnapshot.mockResolvedValue({
				id: "partial-snap",
				files: [{ path: "src/exists.ts", blobId: "hash", originalSize: 10 }],
				totalSize: 10,
				createdAt: Date.now(),
			});

			const result = await service.createFromFiles(["src/exists.ts", "src/missing.ts"], {
				description: "Partial",
				trigger: "manual",
			});

			expect(result.success).toBe(true);
			expect(result.snapshot?.fileCount).toBe(1);
		});

		it("should support all trigger types", async () => {
			createTestFile("src/index.ts", "content");

			for (const trigger of ["manual", "auto", "ai-detection"] as const) {
				await service.createFromFiles(["src/index.ts"], {
					description: "Test",
					trigger,
					skipDedup: true,
				});

				expect(mockStorage.createSnapshot).toHaveBeenLastCalledWith(
					expect.any(Array),
					expect.objectContaining({ trigger }),
				);
			}
		});

		it("should use default limit of 20 for listSnapshots", () => {
			const manySnapshots = Array.from({ length: 30 }, (_, i) => createMockSnapshotManifest(`snap-${i}`, []));
			mockStorage.listSnapshots.mockReturnValue(manySnapshots);

			const result = service.listSnapshots();

			expect(result).toHaveLength(20);
		});
	});

	// ===========================================================================
	// ERROR HANDLING
	// ===========================================================================

	describe("Error Handling", () => {
		it("should handle storage.createSnapshot failure", async () => {
			createTestFile("src/index.ts", "content");
			mockStorage.createSnapshot.mockRejectedValue(new Error("Storage full"));

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Storage full");
		});

		it("should handle non-Error exceptions", async () => {
			createTestFile("src/index.ts", "content");
			mockStorage.createSnapshot.mockRejectedValue("String error");

			const result = await service.createFromFiles(["src/index.ts"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("String error");
		});

		it("should handle path traversal attempts", async () => {
			// The validation should catch path traversal
			const result = await service.createFromFiles(["../../../etc/passwd"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid path");
		});

		it("should handle absolute paths outside workspace", async () => {
			const result = await service.createFromFiles(["/etc/passwd"], {
				description: "Test",
				trigger: "manual",
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid path");
		});
	});

	// ===========================================================================
	// FACTORY FUNCTIONS
	// ===========================================================================

	describe("Factory Functions", () => {
		it("should create service with createSnapshotService", () => {
			const svc = createSnapshotService(TEST_WORKSPACE);

			expect(svc).toBeInstanceOf(SnapshotService);
		});

		it("should create independent instances", () => {
			const svc1 = createSnapshotService(TEST_WORKSPACE);
			const svc2 = createSnapshotService(TEST_WORKSPACE);

			// Factory creates new instances each time (not singleton like other services)
			expect(svc1).not.toBe(svc2);
		});
	});
});
