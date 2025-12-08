/**
 * Unified ID Generation Tests
 *
 * Tests for centralized ID generation utilities.
 * Ensures consistent ID format across SDK and all consumers.
 *
 * Test IDs: id-001 to id-012
 */

import { describe, expect, it } from "vitest";
import {
	generateAuditId,
	generateCheckpointId,
	generateSessionId,
	generateSnapshotId,
	ID_PREFIX,
	isValidId,
	parseIdPrefix,
	parseIdTimestamp,
	randomId,
} from "../../src/utils/id-generation";

describe("Unified ID Generation", () => {
	describe("ID Format Compliance", () => {
		// id-001: Session ID format
		it("should generate session ID with sess- prefix and correct format", () => {
			const id = generateSessionId();
			expect(id).toMatch(/^sess-\d+-[a-z0-9]{6}$/);
		});

		// id-002: Snapshot ID format
		it("should generate snapshot ID with snap- prefix and correct format", () => {
			const id = generateSnapshotId();
			expect(id).toMatch(/^snap-\d+-[a-z0-9]{6}$/);
		});

		// id-003: Audit ID format
		it("should generate audit ID with audit- prefix and correct format", () => {
			const id = generateAuditId();
			expect(id).toMatch(/^audit-\d+-[a-z0-9]{6}$/);
		});

		// id-004: Checkpoint ID format
		it("should generate checkpoint ID with cp- prefix and correct format", () => {
			const id = generateCheckpointId();
			expect(id).toMatch(/^cp-\d+-[a-z0-9]{6}$/);
		});

		// id-005: All ID types use consistent format
		it("should use consistent format across all ID types", () => {
			const sessionId = generateSessionId();
			const snapshotId = generateSnapshotId();
			const auditId = generateAuditId();
			const checkpointId = generateCheckpointId();

			// All follow pattern: prefix-timestamp-random
			const pattern = /^[a-z]+-\d+-[a-z0-9]{6}$/;
			expect(sessionId).toMatch(pattern);
			expect(snapshotId).toMatch(pattern);
			expect(auditId).toMatch(pattern);
			expect(checkpointId).toMatch(pattern);
		});
	});

	describe("Uniqueness", () => {
		// id-006: IDs are unique
		it("should generate unique IDs", () => {
			const ids = new Set<string>();
			for (let i = 0; i < 1000; i++) {
				ids.add(generateSessionId());
				ids.add(generateSnapshotId());
				ids.add(generateAuditId());
				ids.add(generateCheckpointId());
			}
			expect(ids.size).toBe(4000); // All unique
		});

		// id-007: Random suffix is unique
		it("should generate unique random suffixes", () => {
			const suffixes = new Set<string>();
			for (let i = 0; i < 100; i++) {
				suffixes.add(randomId(8));
			}
			expect(suffixes.size).toBe(100); // All unique
		});
	});

	describe("Timestamp Parsing", () => {
		// id-008: Parse timestamp from session ID
		it("should parse timestamp from session ID", () => {
			const before = Date.now();
			const id = generateSessionId();
			const after = Date.now();

			const timestamp = parseIdTimestamp(id);
			expect(timestamp).toBeDefined();
			expect(timestamp).not.toBeNull();

			if (timestamp !== null && timestamp !== undefined) {
				expect(timestamp).toBeGreaterThanOrEqual(before);
				expect(timestamp).toBeLessThanOrEqual(after);
			}
		});

		// id-009: Parse timestamp from all ID types
		it("should parse timestamp from all ID types", () => {
			const sessionId = generateSessionId();
			const snapshotId = generateSnapshotId();
			const auditId = generateAuditId();
			const checkpointId = generateCheckpointId();

			expect(parseIdTimestamp(sessionId)).toBeGreaterThan(0);
			expect(parseIdTimestamp(snapshotId)).toBeGreaterThan(0);
			expect(parseIdTimestamp(auditId)).toBeGreaterThan(0);
			expect(parseIdTimestamp(checkpointId)).toBeGreaterThan(0);
		});

		// id-010: Return null for invalid IDs
		it("should return null for invalid ID format", () => {
			expect(parseIdTimestamp("invalid-id")).toBeNull();
			expect(parseIdTimestamp("session-abc-xyz")).toBeNull();
			expect(parseIdTimestamp("random-string")).toBeNull();
			expect(parseIdTimestamp("")).toBeNull();
		});
	});

	describe("Prefix Parsing", () => {
		it("should parse prefix from IDs", () => {
			expect(parseIdPrefix(generateSessionId())).toBe("sess");
			expect(parseIdPrefix(generateSnapshotId())).toBe("snap");
			expect(parseIdPrefix(generateAuditId())).toBe("audit");
			expect(parseIdPrefix(generateCheckpointId())).toBe("cp");
		});

		it("should return null for invalid prefix", () => {
			expect(parseIdPrefix("invalid-123-abc")).toBeNull();
			expect(parseIdPrefix("unknown-1234567890-abcdef")).toBeNull();
		});
	});

	describe("Validation", () => {
		// id-011: Validate correct IDs
		it("should validate correct ID formats", () => {
			expect(isValidId(generateSessionId())).toBe(true);
			expect(isValidId(generateSnapshotId())).toBe(true);
			expect(isValidId(generateAuditId())).toBe(true);
			expect(isValidId(generateCheckpointId())).toBe(true);
		});

		// id-012: Reject invalid IDs
		it("should reject invalid ID formats", () => {
			expect(isValidId("invalid")).toBe(false);
			expect(isValidId("sess-abc-def")).toBe(false);
			expect(isValidId("session-1234567890-abcdef")).toBe(false); // Old format
			expect(isValidId("")).toBe(false);
		});

		it("should validate with expected prefix", () => {
			const sessionId = generateSessionId();
			const snapshotId = generateSnapshotId();

			expect(isValidId(sessionId, "sess")).toBe(true);
			expect(isValidId(sessionId, "snap")).toBe(false);
			expect(isValidId(snapshotId, "snap")).toBe(true);
			expect(isValidId(snapshotId, "sess")).toBe(false);
		});
	});

	describe("ID Prefix Constants", () => {
		it("should export correct ID prefixes", () => {
			expect(ID_PREFIX.SESSION).toBe("sess");
			expect(ID_PREFIX.SNAPSHOT).toBe("snap");
			expect(ID_PREFIX.AUDIT).toBe("audit");
			expect(ID_PREFIX.CHECKPOINT).toBe("cp");
		});

		it("should have readonly prefixes (const assertion)", () => {
			// TypeScript ensures these are readonly through 'as const'
			const prefixes = [ID_PREFIX.SESSION, ID_PREFIX.SNAPSHOT, ID_PREFIX.AUDIT, ID_PREFIX.CHECKPOINT];
			expect(prefixes).toHaveLength(4);
		});
	});

	describe("Filesystem Safety", () => {
		it("should generate filesystem-safe IDs (no special characters)", () => {
			const ids = [generateSessionId(), generateSnapshotId(), generateAuditId(), generateCheckpointId()];

			for (const id of ids) {
				// No special characters that could cause filesystem issues
				expect(id).not.toMatch(/[<>:"/\\|?*]/); // Filesystem unsafe chars
				// Only lowercase alphanumeric and hyphens
				expect(id).toMatch(/^[a-z0-9-]+$/);
			}
		});
	});

	describe("Timestamp Ordering", () => {
		it("should generate IDs that sort chronologically", async () => {
			const ids: string[] = [];
			for (let i = 0; i < 5; i++) {
				ids.push(generateSnapshotId());
				await new Promise((resolve) => setTimeout(resolve, 1));
			}

			// Parse timestamps and verify ordering
			const timestamps = ids.map((id) => parseIdTimestamp(id)).filter((ts) => ts !== null) as number[];
			for (let i = 1; i < timestamps.length; i++) {
				expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
			}
		});
	});

	describe("SDK and Consumer Consistency", () => {
		it("should use unified format (sess- not session-)", () => {
			const id = generateSessionId();
			expect(id.startsWith("sess-")).toBe(true);
			expect(id.startsWith("session-")).toBe(false);
		});

		it("should use unified format (snap- not snapshot-)", () => {
			const id = generateSnapshotId();
			expect(id.startsWith("snap-")).toBe(true);
			expect(id.startsWith("snapshot-")).toBe(false);
		});
	});
});
