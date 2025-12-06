import { describe, expect, it } from "vitest";
import { processToolResponse } from "../src/mcp-response-processor";

describe("MCPResponseProcessor Integration", () => {
	describe("processToolResponse", () => {
		it("should handle new format with content array", () => {
			const response = {
				content: [{ type: "text", text: "Hello, World!" }],
				isError: false,
			};

			const result = processToolResponse(response);
			expect(result.content).toBe("Hello, World!");
			expect(result.isError).toBe(false);
		});

		it("should handle old format with string content", () => {
			const response = {
				content: "Hello, World!",
				success: true,
			};

			const result = processToolResponse(response);
			expect(result.content).toBe("Hello, World!");
			expect(result.isError).toBe(false);
		});

		it("should handle error responses in new format", () => {
			const response = {
				content: [],
				isError: true,
				error: { message: "Tool execution failed" },
			};

			const result = processToolResponse(response);
			expect(result.content).toBe("Tool execution failed");
			expect(result.isError).toBe(true);
		});

		it("should handle error responses in old format", () => {
			const response = {
				content: "Error occurred",
				success: false,
				error: { message: "Tool execution failed" },
			};

			const result = processToolResponse(response);
			expect(result.content).toBe("Error occurred");
			expect(result.isError).toBe(true);
		});

		it("should handle invalid response formats", () => {
			const response = "Invalid response format";

			const result = processToolResponse(response);
			expect(result.content).toBe("Invalid response format");
			expect(result.isError).toBe(false);
		});

		it("should handle mixed content types", () => {
			const response = {
				content: [
					{ type: "text", text: "Hello," },
					{ type: "text", text: "World!" },
				],
				isError: false,
			};

			const result = processToolResponse(response);
			expect(result.content).toBe("Hello,\nWorld!");
			expect(result.isError).toBe(false);
		});
	});
});
