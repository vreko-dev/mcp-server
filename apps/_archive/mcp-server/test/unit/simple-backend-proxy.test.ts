import { describe, expect, it, vi } from "vitest";

// Mock the SnapBackAPIClient
const mockAnalyzeFast = vi.fn();

// Create a mock API client instance
const mockApiClient = {
	analyzeFast: mockAnalyzeFast,
};

// Mock implementation of SnapBackAPIClient
vi.mock("../../src/client/snapback-api.js", () => {
	return {
		SnapBackAPIClient: vi.fn().mockImplementation(() => mockApiClient),
	};
});

describe("Backend Proxy", () => {
	it("should create SnapBackAPIClient with correct configuration", async () => {
		// This test is just to verify that our mock is working correctly
		const { SnapBackAPIClient } = await import("../../src/client/snapback-api.js");

		const client = new SnapBackAPIClient({
			baseUrl: "https://api.snapback.dev",
			apiKey: "test-key",
		});

		expect(client).toBeDefined();
		expect(typeof client.analyzeFast).toBe("function");
	});
});
