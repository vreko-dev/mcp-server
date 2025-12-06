/**
 * Tests for errorHelpers
 *
 * This test suite validates platform-agnostic error conversion utilities,
 * ensuring consistent error handling across all SnapBack applications.
 */

import { describe, expect, it } from "vitest";
import { toError } from "../../src/utils/errorHelpers";

describe("errorHelpers", () => {
	describe("toError", () => {
		it("should pass through Error objects unchanged", () => {
			const error = new Error("Test error");
			const result = toError(error);

			expect(result).toBe(error);
			expect(result.message).toBe("Test error");
		});

		it("should convert string to Error", () => {
			const result = toError("Something went wrong");

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("Something went wrong");
		});

		it("should convert TypeError to Error", () => {
			const typeError = new TypeError("Type error occurred");
			const result = toError(typeError);

			expect(result).toBe(typeError);
			expect(result).toBeInstanceOf(TypeError);
			expect(result).toBeInstanceOf(Error);
		});

		it("should convert RangeError to Error", () => {
			const rangeError = new RangeError("Out of range");
			const result = toError(rangeError);

			expect(result).toBe(rangeError);
			expect(result).toBeInstanceOf(RangeError);
		});

		it("should convert object with message property to Error", () => {
			const obj = { message: "Custom error message" };
			const result = toError(obj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("Custom error message");
		});

		it("should convert object with non-string message to Error with stringified message", () => {
			const obj = { message: 123 };
			const result = toError(obj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(JSON.stringify(obj));
		});

		it("should stringify object without message property", () => {
			const obj = { code: 404, status: "Not Found" };
			const result = toError(obj);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(JSON.stringify(obj));
		});

		it("should convert number to Error", () => {
			const result = toError(42);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("42");
		});

		it("should convert boolean to Error", () => {
			const result = toError(true);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("true");
		});

		it("should convert null to Error", () => {
			const result = toError(null);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("null");
		});

		it("should convert undefined to Error", () => {
			const result = toError(undefined);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("undefined");
		});

		it("should convert empty string to Error", () => {
			const result = toError("");

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("");
		});

		it("should convert symbol to Error", () => {
			const sym = Symbol("test");
			const result = toError(sym);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe("Symbol(test)");
		});

		it("should convert array to Error", () => {
			const arr = [1, 2, 3];
			const result = toError(arr);

			expect(result).toBeInstanceOf(Error);
			expect(result.message).toBe(JSON.stringify(arr));
		});

		it("should handle circular references in objects", () => {
			const obj: { self?: unknown } = {};
			obj.self = obj;

			const result = toError(obj);

			expect(result).toBeInstanceOf(Error);
			// JSON.stringify will throw on circular refs, so String() fallback applies
			expect(result.message).toContain("[object Object]");
		});

		it("should preserve Error stack trace", () => {
			const error = new Error("Test with stack");
			const result = toError(error);

			expect(result.stack).toBe(error.stack);
			expect(result.stack).toBeDefined();
		});

		it("should handle Error subclasses", () => {
			class CustomError extends Error {
				code: number;
				constructor(message: string, code: number) {
					super(message);
					this.name = "CustomError";
					this.code = code;
				}
			}

			const customError = new CustomError("Custom error", 500);
			const result = toError(customError);

			expect(result).toBe(customError);
			expect(result.message).toBe("Custom error");
			expect((result as CustomError).code).toBe(500);
		});
	});
});
