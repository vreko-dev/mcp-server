import { describe, expect, it } from "vitest";
import { generateId, generateSnapshotId } from "../src/id-generator";

describe("ID Generator", () => {
	describe("generateId", () => {
		it("should generate unique IDs", () => {
			const id1 = generateId();
			const id2 = generateId();
			expect(id1).not.toBe(id2);
			expect(id1.length).toBeGreaterThan(0);
		});

		it("should prepend prefix when provided", () => {
			const id = generateId("test");
			expect(id).toMatch(/^test-/);
		});
	});

	describe("generateSnapshotId", () => {
		it("should generate snapshot ID in correct format without description", () => {
			const id = generateSnapshotId();
			// Format: snapshot-<timestamp>-<random>
			expect(id).toMatch(/^snapshot-\d+-[A-Za-z0-9_-]{9}$/);
		});

		it("should include slugified description in ID", () => {
			const id = generateSnapshotId("Before fixing auth flow");
			// Format: snapshot-<slug>-<timestamp>-<random>
			expect(id).toMatch(/^snapshot-before-fixing-auth-flow-\d+-[A-Za-z0-9_-]{9}$/);
		});

		it("should generate unique snapshot IDs", () => {
			const id1 = generateSnapshotId();
			const id2 = generateSnapshotId();
			expect(id1).not.toBe(id2);
		});

		it("should truncate long descriptions", () => {
			const id = generateSnapshotId("This is a very long description that should be truncated");
			// ID format: snapshot-<slug>-<timestamp>-<nanoid(9)>
			// Extract slug by removing prefix and suffix using regex
			// The timestamp is 13 digits, nanoid is 9 chars (may contain - or _)
			const match = id.match(/^snapshot-(.+)-(\d{13})-[A-Za-z0-9_-]{9}$/);
			expect(match).not.toBeNull();
			const slugPart = match![1];
			// Slug should be max 30 chars
			expect(slugPart.length).toBeLessThanOrEqual(30);
		});
	});
});
