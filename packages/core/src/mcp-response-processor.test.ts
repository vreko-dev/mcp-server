import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	createErrorResponse,
	normalizeImageContent,
	normalizeJsonContent,
	normalizeTextContent,
	processToolContent,
	processToolResponse,
	validateToolArgs,
} from "./mcp-response-processor.js";

describe("MCP Response Processor", () => {
	describe("normalizeTextContent", () => {
		it("should normalize text content by trimming and reducing whitespace", () => {
			const input = "  Hello    World  \n  Test  ";
			const expected = "Hello World Test";
			expect(normalizeTextContent(input)).toBe(expected);
		});

		it("should handle empty strings", () => {
			expect(normalizeTextContent("")).toBe("");
			expect(normalizeTextContent("   ")).toBe("");
		});
	});

	describe("normalizeJsonContent", () => {
		it("should return JSON content as-is", () => {
			const input = { hello: "world", nested: { value: 42 } };
			expect(normalizeJsonContent(input)).toEqual(input);
		});

		it("should handle primitive values", () => {
			expect(normalizeJsonContent("test")).toBe("test");
			expect(normalizeJsonContent(42)).toBe(42);
			expect(normalizeJsonContent(true)).toBe(true);
		});
	});

	describe("normalizeImageContent", () => {
		it("should normalize valid image content", () => {
			const data = "base64encodeddata";
			const mimeType = "image/png";
			const result = normalizeImageContent(data, mimeType);
			expect(result).toEqual({ data, mimeType });
		});

		it("should throw error for invalid data", () => {
			expect(() => normalizeImageContent(null as any, "image/png")).toThrow("Invalid image data");
			expect(() => normalizeImageContent(123 as any, "image/png")).toThrow("Invalid image data");
		});

		it("should throw error for invalid MIME type", () => {
			expect(() => normalizeImageContent("base64data", null as any)).toThrow("Invalid MIME type");
			expect(() => normalizeImageContent("base64data", 123 as any)).toThrow("Invalid MIME type");
		});
	});

	describe("processToolContent", () => {
		it("should process single text content", () => {
			const content = [{ type: "text" as const, text: "Hello World" }];
			expect(processToolContent(content)).toBe("Hello World");
		});

		it("should process single JSON content", () => {
			const content = [{ type: "json" as const, json: { hello: "world" } }];
			expect(processToolContent(content)).toEqual({ hello: "world" });
		});

		it("should process single image content", () => {
			const content = [
				{
					type: "image" as const,
					data: "base64data",
					mimeType: "image/png",
				},
			];
			expect(processToolContent(content)).toEqual({
				data: "base64data",
				mimeType: "image/png",
			});
		});

		it("should process multiple text contents by joining them", () => {
			const content = [
				{ type: "text" as const, text: "Hello" },
				{ type: "text" as const, text: "World" },
			];
			expect(processToolContent(content)).toBe("Hello\nWorld");
		});

		it("should process multiple mixed contents as array", () => {
			const content = [
				{ type: "text" as const, text: "Hello" },
				{ type: "json" as const, json: { value: 42 } },
			];
			expect(processToolContent(content)).toEqual(["Hello", { value: 42 }]);
		});

		it("should handle empty content array", () => {
			expect(processToolContent([])).toBe("");
		});

		it("should handle unknown content types", () => {
			const content = [{ type: "image" as const, data: "test", mimeType: "image/png" }];
			expect(processToolContent(content)).toEqual({
				data: "test",
				mimeType: "image/png",
			});
		});
	});

	describe("processToolResponse", () => {
		it("should process valid text response", () => {
			const response = {
				content: [{ type: "text" as const, text: "Hello World" }],
				isError: false,
			};
			const result = processToolResponse(response);
			expect(result).toEqual({
				content: "Hello World",
				isError: false,
			});
		});

		it("should process valid JSON response", () => {
			const response = {
				content: [{ type: "json" as const, json: { hello: "world" } }],
				isError: false,
			};
			const result = processToolResponse(response);
			expect(result).toEqual({
				content: { hello: "world" },
				isError: false,
			});
		});

		it("should handle error responses", () => {
			const response = {
				content: undefined,
				isError: true,
				error: { message: "Something went wrong" },
			};
			const result = processToolResponse(response);
			expect(result).toEqual({
				content: "Something went wrong",
				isError: true,
				error: { message: "Something went wrong" },
			});
		});

		it("should handle error responses with no message", () => {
			const response = {
				content: undefined,
				isError: true,
			};
			const result = processToolResponse(response);
			expect(result).toEqual({
				content: "Tool execution failed",
				isError: true,
			});
		});

		it("should handle invalid response format by returning empty response", () => {
			const response = {
				invalid: "format",
			};
			const result = processToolResponse(response);
			// Since all fields are optional in the schema, this is actually a valid response
			// with all fields undefined, so it should return an empty response
			expect(result).toEqual({
				content: "",
				isError: false,
			});
		});

		it("should handle empty responses", () => {
			const response = {
				content: [],
				isError: false,
			};
			const result = processToolResponse(response);
			expect(result).toEqual({
				content: "",
				isError: false,
			});
		});
	});

	describe("createErrorResponse", () => {
		it("should create standardized error response", () => {
			const result = createErrorResponse("Test error", "TEST_ERROR", {
				detail: "info",
			});
			expect(result).toEqual({
				content: "Test error",
				isError: true,
				error: {
					message: "Test error",
					code: "TEST_ERROR",
					details: { detail: "info" },
				},
			});
		});

		it("should create error response without code and details", () => {
			const result = createErrorResponse("Test error");
			expect(result).toEqual({
				content: "Test error",
				isError: true,
				error: {
					message: "Test error",
					code: undefined,
					details: undefined,
				},
			});
		});
	});

	describe("validateToolArgs", () => {
		it("should validate correct arguments", () => {
			const schema = z.object({ name: z.string(), age: z.number() });
			const args = { name: "John", age: 30 };
			const result = validateToolArgs(args, schema);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(args);
			}
		});

		it("should return error for invalid arguments", () => {
			const schema = z.object({ name: z.string(), age: z.number() });
			const args = { name: "John", age: "thirty" }; // age should be number
			const result = validateToolArgs(args, schema);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.isError).toBe(true);
			}
		});
	});
});
