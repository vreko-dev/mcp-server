import { describe, expect, it } from "vitest";
import { type SDKConfig, SnapbackClient } from "../src/client";

// Helper to create valid test config
const createTestConfig = (): SDKConfig => ({
	endpoint: "http://localhost:3000",
	apiKey: "test-api-key",
	privacy: {
		hashFilePaths: false,
		anonymizeWorkspace: false,
	},
	cache: {
		enabled: true,
		ttl: { analytics: 3600 },
	},
	retry: {
		maxRetries: 3,
		backoffMs: 100,
	},
});

// Test IDs: sdk-001, sdk-002
describe("SnapbackClient", () => {
	describe("sdk-001: Client construction", () => {
		it("should accept valid SDKConfig", () => {
			const config = createTestConfig();
			const client = new SnapbackClient(config);
			expect(client).toBeInstanceOf(SnapbackClient);
		});

		it("should create client with required fields", () => {
			const config = createTestConfig();
			const client = new SnapbackClient(config);
			expect(client).toBeDefined();
		});
	});

	describe("sdk-002: Method contracts", () => {
		it("should expose sendMetadata method", () => {
			const client = new SnapbackClient(createTestConfig());
			expect(typeof client.sendMetadata).toBe("function");
		});

		it("should expose getAnalytics method", () => {
			const client = new SnapbackClient(createTestConfig());
			expect(typeof client.getAnalytics).toBe("function");
		});

		it("should expose getRecommendations method", () => {
			const client = new SnapbackClient(createTestConfig());
			expect(typeof client.getRecommendations).toBe("function");
		});

		it("should expose healthCheck method", () => {
			const client = new SnapbackClient(createTestConfig());
			expect(typeof client.healthCheck).toBe("function");
		});
	});
});
