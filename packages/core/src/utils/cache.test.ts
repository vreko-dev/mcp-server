import { describe, expect, it, vi } from "vitest";
import { getLibraryDocsCached } from "./cache";

describe("Cache", () => {
	it("should cache results", async () => {
		const fetcher = vi.fn().mockResolvedValue("cached value");

		// First call should use fetcher
		const result1 = await getLibraryDocsCached("key1", fetcher);
		expect(result1).toBe("cached value");
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Second call should use cache
		const result2 = await getLibraryDocsCached("key1", fetcher);
		expect(result2).toBe("cached value");
		expect(fetcher).toHaveBeenCalledTimes(1); // Still only called once

		// Different key should use fetcher again
		const result3 = await getLibraryDocsCached("key2", fetcher);
		expect(result3).toBe("cached value");
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("should handle fetcher rejection", async () => {
		const fetcher = vi.fn().mockRejectedValue(new Error("fetch failed"));

		await expect(getLibraryDocsCached("key", fetcher)).rejects.toThrow("fetch failed");
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
