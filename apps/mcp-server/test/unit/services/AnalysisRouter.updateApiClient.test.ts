import type { MCPSettings } from "@snapback/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisRouter } from "../../../src/services/AnalysisRouter";

describe("AnalysisRouter.updateApiClient()", () => {
	let router: AnalysisRouter;

	beforeEach(() => {
		vi.clearAllMocks();
		router = new AnalysisRouter(undefined);
	});

	// ===== HAPPY PATH =====
	it("should create new API client when both apiKey and baseUrl provided", () => {
		const settings: MCPSettings["api"] = {
			apiKey: "test-key-12345",
			baseUrl: "https://api-new.snapback.dev",
		};

		router.updateApiClient(settings);
		const client = router.getClient();

		expect(client).toBeDefined();
		expect(client?.apiKey).toEqual("test-key-12345");
		expect(client?.baseUrl).toEqual("https://api-new.snapback.dev");
		expect(client?.isActive).toBe(true);
	});

	// ===== EDGE CASE =====
	it("should NOT update client if baseUrl is missing - keeps existing client", () => {
		const initialSettings: MCPSettings["api"] = {
			apiKey: "initial-key",
			baseUrl: "https://initial.api.com",
		};

		router.updateApiClient(initialSettings);
		const initialClient = router.getClient();
		expect(initialClient?.apiKey).toEqual("initial-key");

		// Try to update with missing baseUrl
		const incompleteSettings: Partial<MCPSettings["api"]> = {
			apiKey: "new-key",
		};

		router.updateApiClient(incompleteSettings as any);
		const finalClient = router.getClient();

		// Should keep original
		expect(finalClient?.apiKey).toEqual("initial-key");
	});

	// ===== SAD PATH =====
	it("should disable API client when apiKey is removed", () => {
		const initialSettings: MCPSettings["api"] = {
			apiKey: "test-key",
			baseUrl: "https://api.snapback.dev",
		};

		router.updateApiClient(initialSettings);
		const initialClient = router.getClient();
		expect(initialClient).toBeDefined();

		// Remove apiKey
		const disableSettings: MCPSettings["api"] = {
			apiKey: undefined,
			baseUrl: "https://api.snapback.dev",
		};

		router.updateApiClient(disableSettings);
		const disabledClient = router.getClient();

		expect(disabledClient).toBeNull();
	});

	// ===== ERROR CASE =====
	it("should preserve in-flight requests even during client switch", async () => {
		const initialSettings: MCPSettings["api"] = {
			apiKey: "initial-key",
			baseUrl: "https://initial.api.com",
		};

		router.updateApiClient(initialSettings);

		// Start a request
		const mockRequest = Promise.resolve({ status: 200 });
		const trackedRequest = router.trackRequest(mockRequest);

		// Switch to new client
		const newSettings: MCPSettings["api"] = {
			apiKey: "new-key",
			baseUrl: "https://new-api.com",
		};

		router.updateApiClient(newSettings);

		const finalClient = router.getClient();
		expect(finalClient?.apiKey).toEqual("new-key");

		// In-flight request should still complete
		const result = await trackedRequest;
		expect(result.status).toEqual(200);
	});
});
