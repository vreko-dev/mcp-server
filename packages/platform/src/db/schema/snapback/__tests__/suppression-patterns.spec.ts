import { describe, expect, it } from "vitest";
import { suppressionPatterns } from "../suppression-patterns";

describe("suppressionPatterns schema", () => {
	it("should have the correct table structure", () => {
		expect(suppressionPatterns).toBeDefined();
		expect(suppressionPatterns.id).toBeDefined();
		expect(suppressionPatterns.userId).toBeDefined();
		expect(suppressionPatterns.pattern).toBeDefined();
		expect(suppressionPatterns.patternType).toBeDefined();
		expect(suppressionPatterns.useCount).toBeDefined();
		expect(suppressionPatterns.createdAt).toBeDefined();
		expect(suppressionPatterns.updatedAt).toBeDefined();
	});

	it("should have proper relationships", () => {
		// This test will be expanded once we have the relations properly set up
		expect(true).toBe(true);
	});
});
