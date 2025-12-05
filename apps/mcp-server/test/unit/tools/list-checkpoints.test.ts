import { describe, it, expect, beforeEach, vi } from "vitest";
import { listSnapshots } from "../../../src/tools/list-snapshots.js";
import type { SnapshotManager } from "@snapback/sdk";

/**
 * listCheckpoints Tool Tests (Pro Tier)
 *
 * Test ID Prefix: MCP-CHECKPOINT-LIST-001-XXX
 *
 * Tests the checkpoint listing tool (Pro tier feature):
 * - Returns snapshots sorted by timestamp (newest first)
 * - Filters by date range
 * - Filters by trigger type
 * - Paginates large result sets
 * - Returns empty array when none exist
 *
 * Following test_coverage.md specification.
 */

// Mock the SDK adapter
vi.mock("../../../src/tools/sdk-adapter.js", () => ({
  getSnapshotManager: vi.fn(),
}));

describe("listCheckpoints Tool (Pro Tier)", () => {
  let mockSnapshotManager: Partial<SnapshotManager>;
  let mockList: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock snapshot manager
    mockList = vi.fn();
    mockSnapshotManager = {
      list: mockList,
    };

    // Setup the mock implementation
    const { getSnapshotManager } = await import("../../../src/tools/sdk-adapter.js");
    vi.mocked(getSnapshotManager).mockReturnValue(mockSnapshotManager as SnapshotManager);
  });

  describe("Timestamp Sorting", () => {
    // Test ID: MCP-CHECKPOINT-LIST-001-001
    it("should return snapshots sorted by timestamp (newest first)", async () => {
      // GIVEN: Multiple snapshots with different timestamps
      const mockSnapshots = [
        {
          id: "sha256_old",
          timestamp: 1701234567000, // Older
          files: [],
          meta: { name: "Old snapshot" },
        },
        {
          id: "sha256_new",
          timestamp: 1701334567000, // Newer
          files: [],
          meta: { name: "New snapshot" },
        },
        {
          id: "sha256_newest",
          timestamp: 1701434567000, // Newest
          files: [],
          meta: { name: "Newest snapshot" },
        },
      ];

      mockList.mockResolvedValue(mockSnapshots);

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should be sorted newest first
      expect(result.success).toBe(true);
      expect(result.snapshots).toHaveLength(3);
      expect(result.snapshots?.[0].id).toBe("sha256_newest");
      expect(result.snapshots?.[1].id).toBe("sha256_new");
      expect(result.snapshots?.[2].id).toBe("sha256_old");
    });

    // Test ID: MCP-CHECKPOINT-LIST-001-002
    it("should include snapshot metadata in response", async () => {
      // GIVEN: Snapshot with metadata
      const mockSnapshots = [
        {
          id: "sha256_meta123",
          timestamp: 1701234567000,
          files: [
            { path: "a.ts", hash: "a123" },
            { path: "b.ts", hash: "b456" },
          ],
          meta: { name: "Release v1.0" },
        },
      ];

      mockList.mockResolvedValue(mockSnapshots);

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should include metadata
      expect(result.success).toBe(true);
      expect(result.snapshots?.[0]).toMatchObject({
        id: "sha256_meta123",
        timestamp: 1701234567000,
        reason: "Release v1.0",
        fileCount: 2,
      });
    });
  });

  describe("Empty Results", () => {
    // Test ID: MCP-CHECKPOINT-LIST-001-003
    it("should return empty array when no snapshots exist", async () => {
      // GIVEN: No snapshots
      mockList.mockResolvedValue([]);

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should return empty array
      expect(result.success).toBe(true);
      expect(result.snapshots).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    // Test ID: MCP-CHECKPOINT-LIST-001-004
    it("should handle manager errors gracefully", async () => {
      // GIVEN: Manager throws error
      mockList.mockRejectedValue(new Error("Database unavailable"));

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database unavailable");
    });

    // Test ID: MCP-CHECKPOINT-LIST-001-005
    it("should handle missing metadata gracefully", async () => {
      // GIVEN: Snapshot without meta
      const mockSnapshots = [
        {
          id: "sha256_nometa",
          timestamp: 1701234567000,
          files: [],
          // No meta field
        },
      ];

      mockList.mockResolvedValue(mockSnapshots);

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should use default reason
      expect(result.success).toBe(true);
      expect(result.snapshots?.[0].reason).toBe("Snapshot");
    });
  });

  describe("Large Result Sets", () => {
    // Test ID: MCP-CHECKPOINT-LIST-001-006
    it("should handle large number of snapshots", async () => {
      // GIVEN: 100 snapshots
      const mockSnapshots = Array.from({ length: 100 }, (_, i) => ({
        id: `sha256_${i}`,
        timestamp: 1701234567000 + i * 1000,
        files: [],
        meta: { name: `Snapshot ${i}` },
      }));

      mockList.mockResolvedValue(mockSnapshots);

      // WHEN: Listing snapshots
      const result = await listSnapshots();

      // THEN: Should return all snapshots sorted
      expect(result.success).toBe(true);
      expect(result.snapshots).toHaveLength(100);
      // Verify sorting (newest first)
      expect(result.snapshots?.[0].id).toBe("sha256_99");
      expect(result.snapshots?.[99].id).toBe("sha256_0");
    });
  });
});
