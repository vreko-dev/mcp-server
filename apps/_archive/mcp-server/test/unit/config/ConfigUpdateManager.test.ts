import type { MCPSettings } from "@snapback/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigUpdateManager } from "../../../src/config/ConfigUpdateManager";
import type { Context7Service } from "../../../src/context7/Context7Service";
import type { AnalysisRouter } from "../../../src/services/AnalysisRouter";

describe("ConfigUpdateManager.applyConfigUpdates()", () => {
	let manager: ConfigUpdateManager;
	let mockContext7Service: Partial<Context7Service>;
	let mockRouter: Partial<AnalysisRouter>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext7Service = {
			updateConfig: vi.fn(),
		};
		mockRouter = {
			updateApiClient: vi.fn(),
		};
		manager = new ConfigUpdateManager(mockContext7Service as any, mockRouter as any);
	});

	// ===== HAPPY PATH =====
	it("should call updateConfig on Context7Service when context7 settings provided", () => {
		const config: MCPSettings = {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: {
				apiUrl: "https://new-context7.com/api",
				apiKey: "key",
				cacheTtlSearch: 7200,
				cacheTtlDocs: 172800,
			},
			api: { baseUrl: "https://api.snapback.dev" },
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		};

		manager.applyConfigUpdates(config);

		expect(mockContext7Service.updateConfig).toHaveBeenCalledWith(config.context7);
	});

	// ===== EDGE CASE =====
	it("should call updateApiClient on AnalysisRouter when api settings provided", () => {
		const config: MCPSettings = {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: {
				apiUrl: "https://context7.com/api",
				cacheTtlSearch: 3600,
				cacheTtlDocs: 86400,
			},
			api: {
				apiKey: "new-api-key",
				baseUrl: "https://new-api.snapback.dev",
			},
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		};

		manager.applyConfigUpdates(config);

		expect(mockRouter.updateApiClient).toHaveBeenCalledWith(config.api);
	});

	// ===== SAD PATH =====
	it("should continue updating router even if Context7 update fails", () => {
		const error = new Error("Context7 update failed");
		(mockContext7Service.updateConfig as any).mockImplementation(() => {
			throw error;
		});

		const config: MCPSettings = {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: {
				apiUrl: "https://context7.com/api",
				cacheTtlSearch: 3600,
				cacheTtlDocs: 86400,
			},
			api: { baseUrl: "https://api.snapback.dev", apiKey: "key" },
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		};

		manager.applyConfigUpdates(config);

		// Router should still be called even though Context7 failed
		expect(mockRouter.updateApiClient).toHaveBeenCalled();
	});

	// ===== ERROR CASE =====
	it("should handle partial config gracefully - updates available services", () => {
		const config: MCPSettings = {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: {
				apiUrl: "https://context7.com/api",
				cacheTtlSearch: 3600,
				cacheTtlDocs: 86400,
			},
			api: { baseUrl: "https://api.snapback.dev" },
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		};

		manager.applyConfigUpdates(config);

		// Should call both even with partial config
		expect(mockContext7Service.updateConfig).toHaveBeenCalled();
		expect(mockRouter.updateApiClient).toHaveBeenCalled();
	});

	// ===== VALIDATION =====
	it("should be idempotent - calling twice with same config applies updates twice", () => {
		const config: MCPSettings = {
			performanceBudgets: { analyze_risk: 200, create_snapshot: 500 },
			context7: {
				apiUrl: "https://context7.com/api",
				cacheTtlSearch: 3600,
				cacheTtlDocs: 86400,
			},
			api: { baseUrl: "https://api.snapback.dev", apiKey: "key" },
			http: { allowedOrigins: ["*"], apiUrl: "http://api:8080" },
		};

		manager.applyConfigUpdates(config);
		manager.applyConfigUpdates(config);

		// Should call both services twice
		expect(mockContext7Service.updateConfig).toHaveBeenCalledTimes(2);
		expect(mockRouter.updateApiClient).toHaveBeenCalledTimes(2);
	});
});
