import { describe, expect, it, vi } from "vitest";
import { withBreaker } from "../../../src/utils/circuit-breaker";

describe("Circuit Breaker", () => {
	it("should execute function successfully", async () => {
		const fn = vi.fn().mockResolvedValue("success");
		const wrapped = withBreaker("test-tool-success", fn);

		const result = await wrapped("test");
		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledWith("test");
	});

	it("should handle function rejection", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("failure"));
		const wrapped = withBreaker("test-tool-failure", fn);

		await expect(wrapped("test")).rejects.toThrow("failure");
		expect(fn).toHaveBeenCalledWith("test");
	});
});
