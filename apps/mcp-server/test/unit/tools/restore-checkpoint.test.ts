import { describe, it, expect, beforeEach, vi } from "vitest";
import { restoreSnapshot } from "../../../src/tools/restore-snapshot";
import type { SnapshotManager } from "@snapback/sdk";

/**
 * restoreCheckpoint Tool Tests (Pro Tier)
 *
 * Test ID Prefix: MCP-CHECKPOINT-RESTORE-001-XXX
 *
 * Tests the checkpoint restoration tool (Pro tier feature):
 * - Retrieves correct snapshot content
 * - Returns all files in snapshot
 * - Handles missing snapshot gracefully
 * - Validates user owns snapshot (handled by auth middleware)
 * - Records restore in audit log
 *
 * Following test_coverage.md specification.
 */

// Mock the SDK adapter
vi.mock("../../../src/tools/sdk-adapter.js", () => ({
  getSnapshotManager: vi.fn(),
}));

describe("restoreCheckpoint Tool (Pro Tier)", () => {
  let mockSnapshotManager: Partial<SnapshotManager>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockRestore: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock snapshot manager
    mockGet = vi.fn();
    mockRestore = vi.fn();
    mockSnapshotManager = {
      get: mockGet,
      restore: mockRestore,
    };

    // Setup the mock implementation
    const { getSnapshotManager } = await import("../../../src/tools/sdk-adapter.js");
    vi.mocked(getSnapshotManager).mockReturnValue(mockSnapshotManager as SnapshotManager);
  });

  describe("Snapshot Content Retrieval", () => {
    // Test ID: MCP-CHECKPOINT-RESTORE-001-001
    it("should retrieve correct snapshot content", async () => {
      // GIVEN: Valid snapshot ID
      const snapshotId = "sha256_restore123";

      const mockSnapshot = {
        id: snapshotId,
        timestamp: 1701234567000,
        files: [
          { path: "src/app.ts", hash: "app123" },
        ],
        meta: { name: "Backup snapshot" },
        fileContents: {
          "src/app.ts": "export const app = 'test';",
        },
      };

      mockGet.mockResolvedValue(mockSnapshot);
      mockRestore.mockResolvedValue({
        success: true,
        restoredFiles: ["src/app.ts"],
      });

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should retrieve snapshot content
      expect(result.success).toBe(true);
      expect(result.snapshot?.id).toBe(snapshotId);
      expect(result.snapshot?.fileContents).toEqual({
        "src/app.ts": "export const app = 'test';",
      });
    });

    // Test ID: MCP-CHECKPOINT-RESTORE-001-002
    it("should return all files in snapshot", async () => {
      // GIVEN: Snapshot with multiple files
      const snapshotId = "sha256_multifile";

      const mockSnapshot = {
        id: snapshotId,
        timestamp: 1701234567000,
        files: [
          { path: "a.ts", hash: "a123" },
          { path: "b.ts", hash: "b456" },
          { path: "c.json", hash: "c789" },
        ],
        meta: { name: "Multi-file backup" },
        fileContents: {
          "a.ts": "const a = 1;",
          "b.ts": "const b = 2;",
          "c.json": '{"config": true}',
        },
      };

      mockGet.mockResolvedValue(mockSnapshot);
      mockRestore.mockResolvedValue({
        success: true,
        restoredFiles: ["a.ts", "b.ts", "c.json"],
      });

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should return all files
      expect(result.success).toBe(true);
      expect(result.snapshot?.fileCount).toBe(3);
      expect(result.snapshot?.restoredFiles).toHaveLength(3);
      expect(result.snapshot?.fileContents).toHaveProperty("a.ts");
      expect(result.snapshot?.fileContents).toHaveProperty("b.ts");
      expect(result.snapshot?.fileContents).toHaveProperty("c.json");
    });
  });

  describe("Missing Snapshot Handling", () => {
    // Test ID: MCP-CHECKPOINT-RESTORE-001-003
    it("should handle missing snapshot gracefully", async () => {
      // GIVEN: Non-existent snapshot ID
      const snapshotId = "sha256_notfound";

      mockGet.mockResolvedValue(null);

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.error).toContain(snapshotId);
    });

    // Test ID: MCP-CHECKPOINT-RESTORE-001-004
    it("should handle restore failures gracefully", async () => {
      // GIVEN: Snapshot exists but restore fails
      const snapshotId = "sha256_restorefail";

      const mockSnapshot = {
        id: snapshotId,
        timestamp: 1701234567000,
        files: [{ path: "test.ts", hash: "test123" }],
        meta: { name: "Test" },
      };

      mockGet.mockResolvedValue(mockSnapshot);
      mockRestore.mockResolvedValue({
        success: false,
        errors: ["Permission denied", "File locked"],
      });

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should return error with details
      expect(result.success).toBe(false);
      expect(result.error).toContain("Permission denied");
      expect(result.error).toContain("File locked");
    });
  });

  describe("Error Handling", () => {
    // Test ID: MCP-CHECKPOINT-RESTORE-001-005
    it("should handle manager errors", async () => {
      // GIVEN: Manager throws error
      const snapshotId = "sha256_error";

      mockGet.mockRejectedValue(new Error("Database connection failed"));

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });

    // Test ID: MCP-CHECKPOINT-RESTORE-001-006
    it("should include snapshot metadata in successful restore", async () => {
      // GIVEN: Valid snapshot with metadata
      const snapshotId = "sha256_withmeta";

      const mockSnapshot = {
        id: snapshotId,
        timestamp: 1701234567890,
        files: [{ path: "app.ts", hash: "app123" }],
        meta: { name: "Production backup" },
        fileContents: {
          "app.ts": "console.log('production');",
        },
      };

      mockGet.mockResolvedValue(mockSnapshot);
      mockRestore.mockResolvedValue({
        success: true,
        restoredFiles: ["app.ts"],
      });

      // WHEN: Restoring snapshot
      const result = await restoreSnapshot(snapshotId);

      // THEN: Should include metadata
      expect(result.success).toBe(true);
      expect(result.snapshot).toMatchObject({
        id: snapshotId,
        timestamp: 1701234567890,
        reason: "Production backup",
        fileCount: 1,
        restoredFiles: ["app.ts"],
      });
    });
  });

  describe("Target Path Support", () => {
    // Test ID: MCP-CHECKPOINT-RESTORE-001-007
    it("should support optional target path for file system restore", async () => {
      // GIVEN: Snapshot and target path
      const snapshotId = "sha256_target";
      const targetPath = "/tmp/restore";

      const mockSnapshot = {
        id: snapshotId,
        timestamp: 1701234567000,
        files: [{ path: "file.ts", hash: "file123" }],
        meta: { name: "Test" },
        fileContents: {
          "file.ts": "test content",
        },
      };

      mockGet.mockResolvedValue(mockSnapshot);
      mockRestore.mockResolvedValue({
        success: true,
        restoredFiles: ["file.ts"],
      });

      // WHEN: Restoring to target path
      const result = await restoreSnapshot(snapshotId, targetPath);

      // THEN: Should call restore with target path
      expect(mockRestore).toHaveBeenCalledWith(snapshotId, targetPath);
      expect(result.success).toBe(true);
    });
  });
});
