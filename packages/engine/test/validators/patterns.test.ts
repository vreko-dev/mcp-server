/**
 * Patterns Validator Script - Direct Import Tests
 *
 * Tests parseArgs logic via direct function imports
 * for V8 coverage tracking.
 *
 * Note: runBiomeCheck requires actual Biome execution so we only test
 * the pure functions here.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseArgs } from "../../src/validators/patterns.js";

describe("Patterns Validator - Direct Import Tests", () => {
	const originalArgv = process.argv;
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset argv and env before each test
		process.argv = [...originalArgv];
		delete process.env.SNAPBACK_FILES;
	});

	afterEach(() => {
		process.argv = originalArgv;
		process.env = originalEnv;
	});

	// ==========================================================================
	// PARSE ARGS
	// ==========================================================================
	describe("parseArgs", () => {
		it("should parse --files argument", () => {
			process.argv = ["node", "script.js", "--files=a.ts,b.ts,c.ts"];
			const result = parseArgs();
			expect(result).toEqual(["a.ts", "b.ts", "c.ts"]);
		});

		it("should parse SNAPBACK_FILES environment variable", () => {
			process.argv = ["node", "script.js"];
			process.env.SNAPBACK_FILES = "x.ts,y.ts";
			const result = parseArgs();
			expect(result).toEqual(["x.ts", "y.ts"]);
		});

		it("should prefer --files over environment variable", () => {
			process.argv = ["node", "script.js", "--files=a.ts"];
			process.env.SNAPBACK_FILES = "b.ts";
			const result = parseArgs();
			expect(result).toEqual(["a.ts"]);
		});

		it("should throw error when no files provided", () => {
			process.argv = ["node", "script.js"];
			expect(() => parseArgs()).toThrow("No files provided");
		});

		it("should handle single file", () => {
			process.argv = ["node", "script.js", "--files=single.ts"];
			const result = parseArgs();
			expect(result).toEqual(["single.ts"]);
		});
	});

	// ==========================================================================
	// EDGE CASES
	// ==========================================================================
	describe("Edge Cases", () => {
		it("should handle files with special characters in paths", () => {
			process.argv = ["node", "script.js", "--files=src/my-file.test.ts,lib/another_file.ts"];
			const result = parseArgs();
			expect(result).toEqual(["src/my-file.test.ts", "lib/another_file.ts"]);
		});

		it("should handle empty file list in --files", () => {
			process.argv = ["node", "script.js", "--files="];
			const result = parseArgs();
			expect(result).toEqual([""]);
		});

		it("should handle whitespace in environment variable", () => {
			process.argv = ["node", "script.js"];
			process.env.SNAPBACK_FILES = "a.ts, b.ts"; // Note space after comma
			const result = parseArgs();
			expect(result).toEqual(["a.ts", " b.ts"]);
		});
	});
});
