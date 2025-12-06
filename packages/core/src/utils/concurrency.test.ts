import { describe, expect, it, vi } from "vitest";
import { callTool } from "./concurrency";

describe("Concurrency Control", () => {
	it("should execute tool with concurrency control", async () => {
		const fn = vi.fn().mockResolvedValue("success");
		const tool = callTool("test-tool-success", fn);

		const result = await tool("input");
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledWith("input");
	});

	it("should handle tool rejection with retry", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("first failure"))
			.mockRejectedValueOnce(new Error("second failure"))
			.mockResolvedValue("success");

		const tool = callTool("test-tool-retry", fn);

		const result = await tool("input");
		expect(result).toBe("success");
		// The function should be called 3 times (2 failures + 1 success)
		expect(fn).toHaveBeenCalledTimes(3);
	});
});
