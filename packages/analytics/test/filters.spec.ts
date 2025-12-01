import { describe, expect, it } from "vitest";
import { FilterBuilder } from "../src/query/filters.js";

describe("FILT: Dynamic filter builder for analytics", () => {
	const testId1 = "filt-001";
	const testId2 = "filt-002";
	const testId3 = "filt-003";
	const testId4 = "filt-004";
	const testId5 = "filt-005";

	it(`${testId1}: should create empty filter with no conditions`, () => {
		const builder = new FilterBuilder();
		const result = builder.build();

		expect(result.sql).toBe("");
		expect(result.params).toEqual([]);
	});

	it(`${testId2}: should add userId equality filter`, () => {
		const builder = new FilterBuilder();
		builder.whereEquals("userId", "user-123");
		const result = builder.build();

		expect(result.sql).toContain("userId = $1");
		expect(result.params).toEqual(["user-123"]);
	});

	it(`${testId3}: should add date range filter`, () => {
		const builder = new FilterBuilder();
		const startDate = new Date("2025-01-01");
		const endDate = new Date("2025-01-31");

		builder.whereBetween("createdAt", startDate, endDate);
		const result = builder.build();

		expect(result.sql).toContain("createdAt >= $1");
		expect(result.sql).toContain("createdAt <= $2");
		expect(result.params).toEqual([startDate, endDate]);
	});

	it(`${testId4}: should combine multiple filters with AND`, () => {
		const builder = new FilterBuilder();
		builder.whereEquals("userId", "user-123");
		builder.whereEquals("eventType", "suggestion");

		const result = builder.build();

		expect(result.sql).toContain("userId = $1");
		expect(result.sql).toContain("AND");
		expect(result.sql).toContain("eventType = $2");
		expect(result.params).toEqual(["user-123", "suggestion"]);
	});

	it(`${testId5}: should support IN operator for multiple values`, () => {
		const builder = new FilterBuilder();
		builder.whereIn("eventType", ["suggestion", "feedback", "loop"]);

		const result = builder.build();

		expect(result.sql).toContain("eventType IN ($1, $2, $3)");
		expect(result.params).toEqual(["suggestion", "feedback", "loop"]);
	});

	it("filt-006: should add greater than filter", () => {
		const builder = new FilterBuilder();
		builder.whereGreaterThan("iterationCount", 5);

		const result = builder.build();

		expect(result.sql).toContain("iterationCount > $1");
		expect(result.params).toEqual([5]);
	});

	it("filt-007: should add less than filter", () => {
		const builder = new FilterBuilder();
		builder.whereLessThan("durationMs", 1000);

		const result = builder.build();

		expect(result.sql).toContain("durationMs < $1");
		expect(result.params).toEqual([1000]);
	});

	it("filt-008: should support LIKE operator for text search", () => {
		const builder = new FilterBuilder();
		builder.whereLike("suggestionText", "%refactor%");

		const result = builder.build();

		expect(result.sql).toContain("suggestionText LIKE $1");
		expect(result.params).toEqual(["%refactor%"]);
	});

	it("filt-009: should support IS NULL check", () => {
		const builder = new FilterBuilder();
		builder.whereNull("errorMessage");

		const result = builder.build();

		expect(result.sql).toContain("errorMessage IS NULL");
		expect(result.params).toEqual([]);
	});

	it("filt-010: should support IS NOT NULL check", () => {
		const builder = new FilterBuilder();
		builder.whereNotNull("userFeedback");

		const result = builder.build();

		expect(result.sql).toContain("userFeedback IS NOT NULL");
		expect(result.params).toEqual([]);
	});

	it("filt-011: should build complex query with mixed filters", () => {
		const builder = new FilterBuilder();
		const startDate = new Date("2025-01-01");

		builder.whereEquals("userId", "user-123");
		builder.whereIn("eventType", ["suggestion", "feedback"]);
		builder.whereGreaterThan("createdAt", startDate);
		builder.whereNotNull("sessionId");

		const result = builder.build();

		// Should contain all filter parts
		expect(result.sql).toContain("userId = $1");
		expect(result.sql).toContain("eventType IN ($2, $3)");
		expect(result.sql).toContain("createdAt > $4");
		expect(result.sql).toContain("sessionId IS NOT NULL");

		// Should have correct parameter ordering
		expect(result.params).toEqual(["user-123", "suggestion", "feedback", startDate]);

		// Should connect with AND
		expect((result.sql.match(/AND/g) || []).length).toBe(3);
	});

	it("filt-012: should allow resetting filters", () => {
		const builder = new FilterBuilder();
		builder.whereEquals("userId", "user-123");
		builder.whereEquals("eventType", "suggestion");

		builder.reset();
		const result = builder.build();

		expect(result.sql).toBe("");
		expect(result.params).toEqual([]);
	});
});
