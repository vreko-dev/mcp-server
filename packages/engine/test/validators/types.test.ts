/**
 * Types Validator Script - Direct Import Tests
 *
 * Tests TypeScript error parsing logic via direct function imports
 * for V8 coverage tracking.
 */

import { describe, expect, it } from "vitest";
import { parseTypeScriptErrors } from "../../src/validators/types.js";

describe("Types Validator - Direct Import Tests", () => {
	// ==========================================================================
	// PARSE TYPESCRIPT ERRORS
	// ==========================================================================
	describe("parseTypeScriptErrors", () => {
		it("should parse standard TypeScript error format", () => {
			const output = `src/index.ts(42,10): error TS2322: Type 'string' is not assignable to type 'number'.`;
			const result = parseTypeScriptErrors(output);
			expect(result.length).toBe(1);
			expect(result[0].file).toBe("src/index.ts");
			expect(result[0].line).toBe(42);
			expect(result[0].column).toBe(10);
			expect(result[0].message).toBe("Type 'string' is not assignable to type 'number'.");
			expect(result[0].severity).toBe("error");
		});

		it("should parse multiple errors", () => {
			const output = `src/a.ts(10,5): error TS2339: Property 'foo' does not exist.
src/b.ts(20,15): error TS2345: Argument of type 'string' is not assignable.`;
			const result = parseTypeScriptErrors(output);
			expect(result.length).toBe(2);
			expect(result[0].file).toBe("src/a.ts");
			expect(result[1].file).toBe("src/b.ts");
		});

		it("should return empty array for clean output", () => {
			const output = "Compilation successful.";
			const result = parseTypeScriptErrors(output);
			expect(result).toEqual([]);
		});

		it("should return empty array for empty output", () => {
			const result = parseTypeScriptErrors("");
			expect(result).toEqual([]);
		});

		it("should handle various TypeScript error codes", () => {
			const output = `
file.ts(1,1): error TS1234: Some error.
file.ts(2,2): error TS9999: Another error.
`;
			const result = parseTypeScriptErrors(output);
			expect(result.length).toBe(2);
		});

		it("should ignore non-error lines", () => {
			const output = `
Starting compilation...
src/index.ts(42,10): error TS2322: Type error.
Done in 2s.
`;
			const result = parseTypeScriptErrors(output);
			expect(result.length).toBe(1);
			expect(result[0].message).toBe("Type error.");
		});
	});

	// ==========================================================================
	// EDGE CASES
	// ==========================================================================
	describe("Edge Cases", () => {
		it("should handle paths with special characters", () => {
			const output = `src/components/my-component.test.ts(100,25): error TS2551: Did you mean 'prop'?`;
			const result = parseTypeScriptErrors(output);
			expect(result[0].file).toBe("src/components/my-component.test.ts");
		});

		it("should handle large line/column numbers", () => {
			const output = "huge-file.ts(99999,500): error TS1000: Error message.";
			const result = parseTypeScriptErrors(output);
			expect(result[0].line).toBe(99999);
			expect(result[0].column).toBe(500);
		});

		it("should handle error messages with special characters", () => {
			const output = `file.ts(1,1): error TS2345: Argument of type '{ x: number; }' is not assignable.`;
			const result = parseTypeScriptErrors(output);
			expect(result[0].message).toContain("{ x: number; }");
		});
	});
});
