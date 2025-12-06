import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSnapshot } from "../../../src/tools/create-snapshot";
import type { SnapshotManager } from "@snapback/sdk";

/**
 * createCheckpoint Tool Tests (Pro Tier)
 *
 * Test ID Prefix: MCP-CHECKPOINT-CREATE-001-XXX
 *
 * Tests the checkpoint creation tool (Pro tier feature):
 * - Creates snapshot with content-addressable ID
 * - Stores file metadata correctly
 * - Rejects unauthenticated requests (handled by middleware)
 * - Rejects free tier users (handled by authorization)
 * - Respects storage limits
 * - Returns snapshot manifest
 *
 * Following test_coverage.md specification.
 */

// Mock the SDK adapter
vi.mock("../../../src/tools/sdk-adapter.js", () => ({
  getSnapshotManager: vi.fn(),
  toFileInputs: vi.fn((files) => files),
}));

describe("createCheckpoint Tool (Pro Tier)", () => {
  let mockSnapshotManager: Partial<SnapshotManager>;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock snapshot manager
    mockCreate = vi.fn();
    mockSnapshotManager = {
      create: mockCreate,
    };

    // Setup the mock implementation
    const { getSnapshotManager } = await import("../../../src/tools/sdk-adapter.js");
    vi.mocked(getSnapshotManager).mockReturnValue(mockSnapshotManager as SnapshotManager);
  });

  describe("Snapshot Creation with Content-Addressable ID", () => {
    // Test ID: MCP-CHECKPOINT-CREATE-001-001
    it("should create snapshot with content-addressable ID", async () => {
      // GIVEN: Valid file input
      const input = {
        files: [
          { path: "src/index.ts", content: "export const hello = 'world';" },
        ],
        reason: "Test snapshot",
      };

      const mockSnapshot = {
        id: "sha256_abc123def456",
        timestamp: Date.now(),
        files: [{ path: "src/index.ts", hash: "abc123" }],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should create snapshot with content-addressable ID
      expect(result.success).toBe(true);
      expect(result.snapshot?.id).toBe("sha256_abc123def456");
      expect(result.snapshot?.id).toMatch(/^sha256_/);
    });

    // Test ID: MCP-CHECKPOINT-CREATE-001-002
    it("should handle single file with content parameter", async () => {
      // GIVEN: Single file via content param
      const input = {
        filePath: "config.json",
        content: '{"debug": true}',
        reason: "Config backup",
      };

      const mockSnapshot = {
        id: "sha256_config123",
        timestamp: Date.now(),
        files: [{ path: "config.json", hash: "config123" }],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should create snapshot for single file
      expect(result.success).toBe(true);
      expect(result.snapshot?.filePath).toBe("config.json");
      expect(mockCreate).toHaveBeenCalledWith(
        [{ path: "config.json", content: '{"debug": true}' }],
        expect.objectContaining({
          description: "Config backup",
        })
      );
    });

    // Test ID: MCP-CHECKPOINT-CREATE-001-003
    it("should handle multiple files", async () => {
      // GIVEN: Multiple files
      const input = {
        files: [
          { path: "src/a.ts", content: "export const a = 1;" },
          { path: "src/b.ts", content: "export const b = 2;" },
          { path: "package.json", content: '{"name": "test"}' },
        ],
        reason: "Multi-file backup",
      };

      const mockSnapshot = {
        id: "sha256_multifile789",
        timestamp: Date.now(),
        files: [
          { path: "src/a.ts", hash: "a123" },
          { path: "src/b.ts", hash: "b456" },
          { path: "package.json", hash: "pkg789" },
        ],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should create snapshot with all files
      expect(result.success).toBe(true);
      expect(result.snapshot?.fileCount).toBe(3);
      expect(mockCreate).toHaveBeenCalledWith(
        input.files,
        expect.any(Object)
      );
    });
  });

  describe("File Metadata Storage", () => {
    // Test ID: MCP-CHECKPOINT-CREATE-001-004
    it("should store file metadata correctly", async () => {
      // GIVEN: File with metadata
      const input = {
        files: [
          { path: "src/main.ts", content: "const x = 42;" },
        ],
        reason: "Version checkpoint",
      };

      const mockSnapshot = {
        id: "sha256_meta123",
        timestamp: 1701234567000,
        files: [{ path: "src/main.ts", hash: "meta123" }],
        meta: {
          name: "Version checkpoint",
        },
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should include metadata in response
      expect(result.success).toBe(true);
      expect(result.snapshot).toMatchObject({
        id: "sha256_meta123",
        timestamp: 1701234567000,
        reason: "Version checkpoint",
        fileCount: 1,
      });
    });

    // Test ID: MCP-CHECKPOINT-CREATE-001-005
    it("should use default reason when not provided", async () => {
      // GIVEN: Input without reason
      const input = {
        content: "test content",
      };

      const mockSnapshot = {
        id: "sha256_default456",
        timestamp: Date.now(),
        files: [{ path: "content.txt", hash: "default456" }],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should use default reason
      expect(result.success).toBe(true);
      expect(result.snapshot?.reason).toBe("MCP snapshot");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          description: "MCP snapshot",
        })
      );
    });
  });

  describe("Storage Limits and Edge Cases", () => {
    // Test ID: MCP-CHECKPOINT-CREATE-001-006
    it("should handle storage limit errors gracefully", async () => {
      // GIVEN: Storage limit exceeded
      const input = {
        files: [
          { path: "large-file.bin", content: "x".repeat(1000000) },
        ],
      };

      mockCreate.mockRejectedValue(new Error("Storage quota exceeded"));

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should return error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage quota exceeded");
    });

    // Test ID: MCP-CHECKPOINT-CREATE-001-007
    it("should handle empty files array", async () => {
      // GIVEN: Empty files array
      const input = {
        files: [],
      };

      const mockSnapshot = {
        id: "sha256_empty123",
        timestamp: Date.now(),
        files: [],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.snapshot?.fileCount).toBe(0);
    });

    // Test ID: MCP-CHECKPOINT-CREATE-001-008
    it("should handle snapshot manager errors", async () => {
      // GIVEN: Manager throws error
      const input = {
        content: "test",
      };

      mockCreate.mockRejectedValue(new Error("Database connection failed"));

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });
  });

  describe("Snapshot Manifest Response", () => {
    // Test ID: MCP-CHECKPOINT-CREATE-001-009
    it("should return complete snapshot manifest", async () => {
      // GIVEN: Valid snapshot creation
      const input = {
        files: [
          { path: "app.ts", content: "console.log('test');" },
        ],
        reason: "Pre-deployment backup",
      };

      const mockSnapshot = {
        id: "sha256_manifest999",
        timestamp: 1701234567890,
        files: [{ path: "app.ts", hash: "manifest999" }],
      };

      mockCreate.mockResolvedValue(mockSnapshot);

      // WHEN: Creating snapshot
      const result = await createSnapshot(input);

      // THEN: Should return manifest with all required fields
      expect(result).toMatchObject({
        success: true,
        snapshot: {
          id: "sha256_manifest999",
          timestamp: 1701234567890,
          reason: "Pre-deployment backup",
          filePath: undefined,
          fileCount: 1,
        },
      });
    });
  });
});
