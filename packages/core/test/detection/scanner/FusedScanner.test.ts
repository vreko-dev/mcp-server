import { describe, expect, it } from "vitest";
import { FusedScanner } from "../../../src/detection/scanner/FusedScanner";

describe("FusedScanner", () => {
	let scanner: FusedScanner;

	beforeEach(() => {
		scanner = new FusedScanner();
	});

	it("should register patterns correctly", () => {
		scanner.register({
			id: "test_pattern",
			regex: /test/g,
		});

		// The patterns array should contain the registered pattern
		expect((scanner as any).patterns).toHaveLength(1);
		expect((scanner as any).patterns[0]).toEqual({
			id: "test_pattern",
			regex: /test/g,
			matchEverywhere: false,
		});
	});

	it("should scan content and find matches", () => {
		scanner.register({
			id: "email",
			regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		});

		const content = "Contact us at support@example.com or admin@test.org";
		const results = scanner.scan(content);

		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({
			id: "email",
			match: "support@example.com",
			index: 14,
		});
		expect(results[1]).toEqual({
			id: "email",
			match: "admin@test.org",
			index: 37,
		});
	});

	it("should scan content with multiple patterns", () => {
		scanner.register({
			id: "email",
			regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		});
		scanner.register({
			id: "phone",
			regex: /\b\d{3}-\d{3}-\d{4}\b/g,
		});

		const content = "Contact support@example.com or call 123-456-7890";
		const results = scanner.scan(content);

		expect(results).toHaveLength(2);
		// Results should be sorted by index
		expect(results[0]).toEqual({
			id: "email",
			match: "support@example.com",
			index: 8,
		});
		expect(results[1]).toEqual({
			id: "phone",
			match: "123-456-7890",
			index: 36,
		});
	});

	it("should handle overlapping patterns", () => {
		scanner.register({
			id: "word",
			regex: /\b\w+\b/g,
		});
		scanner.register({
			id: "three_letter_word",
			regex: /\b\w{3}\b/g,
		});

		const content = "The fox";
		const results = scanner.scan(content);

		// Should find all matches from both patterns
		expect(results).toHaveLength(4); // "The", "fox", "The", "fox"
		expect(results.some((r) => r.id === "word" && r.match === "The")).toBe(true);
		expect(results.some((r) => r.id === "word" && r.match === "fox")).toBe(true);
		expect(results.some((r) => r.id === "three_letter_word" && r.match === "The")).toBe(true);
		expect(results.some((r) => r.id === "three_letter_word" && r.match === "fox")).toBe(true);
	});

	it("should return empty array for no matches", () => {
		scanner.register({
			id: "nonexistent",
			regex: /nonexistentpattern/g,
		});

		const content = "This is a test string with no matches";
		const results = scanner.scan(content);

		expect(results).toHaveLength(0);
	});

	it("should handle empty content", () => {
		scanner.register({
			id: "test",
			regex: /test/g,
		});

		const results = scanner.scan("");

		expect(results).toHaveLength(0);
	});

	it("should handle empty patterns", () => {
		const results = scanner.scan("test content");

		expect(results).toHaveLength(0);
	});

	it("should scanGrouped content and group by pattern ID", () => {
		scanner.register({
			id: "email",
			regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		});
		scanner.register({
			id: "phone",
			regex: /\b\d{3}-\d{3}-\d{4}\b/g,
		});

		const content = "Contact support@example.com or call 123-456-7890";
		const results = scanner.scanGrouped(content);

		expect(results.size).toBe(2);
		expect(results.has("email")).toBe(true);
		expect(results.has("phone")).toBe(true);

		const emailResults = results.get("email");
		const phoneResults = results.get("phone");

		expect(emailResults).toHaveLength(1);
		expect(phoneResults).toHaveLength(1);

		expect(emailResults?.[0]).toEqual({
			match: "support@example.com",
			index: 8,
		});
		expect(phoneResults?.[0]).toEqual({
			match: "123-456-7890",
			index: 36,
		});
	});

	it("should handle scanGrouped with no matches", () => {
		scanner.register({
			id: "nonexistent",
			regex: /nonexistentpattern/g,
		});

		const content = "This is a test string with no matches";
		const results = scanner.scanGrouped(content);

		expect(results.size).toBe(1);
		expect(results.has("nonexistent")).toBe(true);
		expect(results.get("nonexistent")).toHaveLength(0);
	});

	it("should handle scanGrouped with empty content", () => {
		scanner.register({
			id: "test",
			regex: /test/g,
		});

		const results = scanner.scanGrouped("");

		expect(results.size).toBe(1);
		expect(results.has("test")).toBe(true);
		expect(results.get("test")).toHaveLength(0);
	});

	it("should handle scanGrouped with empty patterns", () => {
		const results = scanner.scanGrouped("test content");

		expect(results.size).toBe(0);
	});
});
