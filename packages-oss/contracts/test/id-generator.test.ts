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
		it("should generate snapshot ID in correct format", () => {
			const id = generateSnapshotId();
			// Format: snapshot-<timestamp>-<random>
			expect(id).toMatch(/^snapshot-\d+-[A-Za-z0-9_-]{9}$/);
		});

		it("should generate unique snapshot IDs", () => {
			const id1 = generateSnapshotId();
			const id2 = generateSnapshotId();
			expect(id1).not.toBe(id2);
		});
	});
});
