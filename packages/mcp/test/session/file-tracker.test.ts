/**
 * SessionFileTracker Tests
 *
 * Tests for session-scoped file tracking functionality.
 *
 * 4-Path Coverage (per ROUTER.md AP-003):
 * - Happy: Records file access and retrieves correctly
 * - Sad: Returns empty for non-existent sessions
 * - Edge: Multiple sessions, merged operations, AI attribution
 * - Error: Handles edge cases gracefully
 */

import { beforeEach, describe, expect, it } from "vitest";
import { SessionFileTracker } from "../../src/session/file-tracker.js";

describe("SessionFileTracker", () => {
	let tracker: SessionFileTracker;

	beforeEach(() => {
		tracker = new SessionFileTracker();
	});

	// ============================================================================
	// HAPPY PATH
	// ============================================================================

	describe("Happy Path", () => {
		it("should record file access with operation type", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");

			const files = tracker.getSessionFiles("session-1");

			expect(files).toHaveLength(1);
			expect(files[0].filepath).toBe("/path/to/file.ts");
			expect(files[0].operations).toContain("read");
		});

		it("should track multiple operations on same file", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "write");

			const files = tracker.getSessionFiles("session-1");

			expect(files).toHaveLength(1);
			expect(files[0].operations).toContain("read");
			expect(files[0].operations).toContain("write");
		});

		it("should track multiple files in session", () => {
			tracker.recordFileAccess("session-1", "/path/to/file1.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/file2.ts", "write");
			tracker.recordFileAccess("session-1", "/path/to/file3.ts", "create");

			const files = tracker.getSessionFiles("session-1");

			expect(files).toHaveLength(3);
		});

		it("should return written files only", () => {
			tracker.recordFileAccess("session-1", "/path/to/read.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/write.ts", "write");
			tracker.recordFileAccess("session-1", "/path/to/create.ts", "create");

			const written = tracker.getWrittenFiles("session-1");

			expect(written).toHaveLength(2);
			expect(written).toContain("/path/to/write.ts");
			expect(written).toContain("/path/to/create.ts");
			expect(written).not.toContain("/path/to/read.ts");
		});

		it("should return read-only files", () => {
			tracker.recordFileAccess("session-1", "/path/to/read.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/write.ts", "write");
			tracker.recordFileAccess("session-1", "/path/to/both.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/both.ts", "write");

			const readOnly = tracker.getReadOnlyFiles("session-1");

			expect(readOnly).toHaveLength(1);
			expect(readOnly).toContain("/path/to/read.ts");
		});

		it("should track AI-attributed files", () => {
			tracker.recordFileAccess("session-1", "/path/to/human.ts", "write", false);
			tracker.recordFileAccess("session-1", "/path/to/ai.ts", "write", true);

			const aiFiles = tracker.getAIAttributedFiles("session-1");

			expect(aiFiles).toHaveLength(1);
			expect(aiFiles).toContain("/path/to/ai.ts");
		});

		it("should return correct file count", () => {
			tracker.recordFileAccess("session-1", "/path/to/file1.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/file2.ts", "write");

			expect(tracker.getFileCount("session-1")).toBe(2);
		});
	});

	// ============================================================================
	// SAD PATH
	// ============================================================================

	describe("Sad Path", () => {
		it("should return empty array for non-existent session", () => {
			const files = tracker.getSessionFiles("non-existent");

			expect(files).toEqual([]);
		});

		it("should return empty written files for non-existent session", () => {
			const written = tracker.getWrittenFiles("non-existent");

			expect(written).toEqual([]);
		});

		it("should return 0 file count for non-existent session", () => {
			expect(tracker.getFileCount("non-existent")).toBe(0);
		});

		it("should return false for wasFileAccessed on non-existent session", () => {
			expect(tracker.wasFileAccessed("non-existent", "/path/to/file.ts")).toBe(false);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe("Edge Cases", () => {
		it("should maintain separate sessions", () => {
			tracker.recordFileAccess("session-1", "/path/to/file1.ts", "read");
			tracker.recordFileAccess("session-2", "/path/to/file2.ts", "write");

			expect(tracker.getSessionFiles("session-1")).toHaveLength(1);
			expect(tracker.getSessionFiles("session-1")[0].filepath).toBe("/path/to/file1.ts");

			expect(tracker.getSessionFiles("session-2")).toHaveLength(1);
			expect(tracker.getSessionFiles("session-2")[0].filepath).toBe("/path/to/file2.ts");
		});

		it("should update lastTouched on subsequent access", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");
			const firstAccess = tracker.getSessionFiles("session-1")[0].lastTouched;

			// Small delay to ensure different timestamp
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "write");
			const secondAccess = tracker.getSessionFiles("session-1")[0].lastTouched;

			expect(secondAccess.getTime()).toBeGreaterThanOrEqual(firstAccess.getTime());
		});

		it("should mark AI-attributed once set", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read", false);
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "write", true);
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "write", false);

			const files = tracker.getSessionFiles("session-1");
			expect(files[0].aiAttributed).toBe(true);
		});

		it("should not duplicate operation types", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");

			const files = tracker.getSessionFiles("session-1");
			expect(files[0].operations.filter((o) => o === "read")).toHaveLength(1);
		});

		it("should clear session correctly", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");
			expect(tracker.getFileCount("session-1")).toBe(1);

			tracker.clearSession("session-1");
			expect(tracker.getFileCount("session-1")).toBe(0);
		});

		it("should merge sessions correctly", () => {
			tracker.recordFileAccess("session-1", "/path/to/file1.ts", "read");
			tracker.recordFileAccess("session-2", "/path/to/file2.ts", "write", true);

			tracker.mergeSessions("session-1", "session-2");

			const files = tracker.getSessionFiles("session-1");
			expect(files).toHaveLength(2);
			expect(tracker.getAIAttributedFiles("session-1")).toContain("/path/to/file2.ts");
		});
	});

	// ============================================================================
	// SESSION SUMMARY
	// ============================================================================

	describe("Session Summary", () => {
		it("should return correct summary statistics", () => {
			tracker.recordFileAccess("session-1", "/path/to/read.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/write.ts", "write");
			tracker.recordFileAccess("session-1", "/path/to/create.ts", "create");
			tracker.recordFileAccess("session-1", "/path/to/delete.ts", "delete");
			tracker.recordFileAccess("session-1", "/path/to/ai.ts", "write", true);

			const summary = tracker.getSessionSummary("session-1");

			expect(summary.totalFiles).toBe(5);
			expect(summary.filesRead).toBe(1);
			expect(summary.filesWritten).toBe(2);
			expect(summary.filesCreated).toBe(1);
			expect(summary.filesDeleted).toBe(1);
			expect(summary.aiAttributedFiles).toBe(1);
		});

		it("should return zero stats for empty session", () => {
			const summary = tracker.getSessionSummary("non-existent");

			expect(summary.totalFiles).toBe(0);
			expect(summary.filesRead).toBe(0);
			expect(summary.filesWritten).toBe(0);
			expect(summary.filesCreated).toBe(0);
			expect(summary.filesDeleted).toBe(0);
			expect(summary.aiAttributedFiles).toBe(0);
		});
	});

	// ============================================================================
	// FILE ACCESS CHECK
	// ============================================================================

	describe("File Access Check", () => {
		it("should correctly identify accessed files", () => {
			tracker.recordFileAccess("session-1", "/path/to/file.ts", "read");

			expect(tracker.wasFileAccessed("session-1", "/path/to/file.ts")).toBe(true);
			expect(tracker.wasFileAccessed("session-1", "/path/to/other.ts")).toBe(false);
		});
	});

	// ============================================================================
	// SORTING
	// ============================================================================

	describe("Sorting", () => {
		it("should return files sorted by first touch time", () => {
			// Record in reverse order
			tracker.recordFileAccess("session-1", "/path/to/third.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/second.ts", "read");
			tracker.recordFileAccess("session-1", "/path/to/first.ts", "read");

			const files = tracker.getSessionFiles("session-1");

			// First accessed should be first in array
			expect(files[0].filepath).toBe("/path/to/third.ts");
		});
	});
});
