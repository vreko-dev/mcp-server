import { describe, expect, it } from "vitest";
import { SnapBackAPIClient } from "../../src/client/snapback-api";

describe("SnapBackAPIClient Integration", () => {
	it("should create an instance with proper configuration", () => {
		const client = new SnapBackAPIClient({
			baseUrl: "https://api.snapback.dev",
			apiKey: "test-api-key",
		});

		expect(client).toBeDefined();
		expect(typeof client.analyzeFast).toBe("function");
		expect(typeof client.getIterationStats).toBe("function");
		expect(typeof client.createSnapshot).toBe("function");
		expect(typeof client.getCurrentSession).toBe("function");
		expect(typeof client.getSafetyGuidelines).toBe("function");
	});
});
