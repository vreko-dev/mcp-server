import type { MCPSettings } from "@snapback/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Context7Service } from "../../../src/context7/Context7Service";

describe("Context7Service.updateConfig()", () => {
	let service: Context7Service;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new Context7Service();
	});

	// ===== HAPPY PATH =====
	it("should update apiUrl to the provided value", () => {
		const newSettings: MCPSettings["context7"] = {
			apiUrl: "https://new-context7.com/api",
			apiKey: "test-key",
			cacheTtlSearch: 7200,
			cacheTtlDocs: 172800,
		};

		service.updateConfig(newSettings);
		const config = service.getConfig();

		expect(config?.apiUrl).toEqual("https://new-context7.com/api");
	});

	// ===== EDGE CASE =====
	it("should preserve all settings when updateConfig is called with complete settings", () => {
		const firstSettings: MCPSettings["context7"] = {
			apiUrl: "https://first.com/api",
			apiKey: "key1",
			cacheTtlSearch: 3600,
			cacheTtlDocs: 86400,
		};

		service.updateConfig(firstSettings);

		const secondSettings: MCPSettings["context7"] = {
			apiUrl: "https://second.com/api",
			apiKey: "key2",
			cacheTtlSearch: 7200,
			cacheTtlDocs: 172800,
		};

		service.updateConfig(secondSettings);
		const config = service.getConfig();

		// All new settings should be applied
		expect(config?.apiUrl).toEqual("https://second.com/api");
		expect(config?.apiKey).toEqual("key2");
		expect(config?.cacheTtlSearch).toEqual(7200);
		expect(config?.cacheTtlDocs).toEqual(172800);
	});

	// ===== ERROR CASE =====
	it("should not update config if URL is invalid - should keep previous config", () => {
		const validSettings: MCPSettings["context7"] = {
			apiUrl: "https://valid.com/api",
			apiKey: "key",
			cacheTtlSearch: 3600,
			cacheTtlDocs: 86400,
		};

		service.updateConfig(validSettings);
		const firstConfig = service.getConfig();
		expect(firstConfig?.apiUrl).toEqual("https://valid.com/api");

		// Try to update with invalid URL
		const invalidSettings: MCPSettings["context7"] = {
			apiUrl: "not-a-valid-url",
			apiKey: "key",
			cacheTtlSearch: 3600,
			cacheTtlDocs: 86400,
		};

		service.updateConfig(invalidSettings);
		const finalConfig = service.getConfig();

		// Should remain unchanged
		expect(finalConfig?.apiUrl).toEqual("https://valid.com/api");
	});

	// ===== SAD PATH =====
	it("should handle null settings gracefully without crashing", () => {
		const validSettings: MCPSettings["context7"] = {
			apiUrl: "https://initial.com/api",
			apiKey: "key",
			cacheTtlSearch: 3600,
			cacheTtlDocs: 86400,
		};

		service.updateConfig(validSettings);
		const beforeNull = service.getConfig();
		expect(beforeNull?.apiUrl).toEqual("https://initial.com/api");

		// Should not crash
		service.updateConfig(null as any);

		const afterNull = service.getConfig();
		// Should remain unchanged
		expect(afterNull?.apiUrl).toEqual("https://initial.com/api");
	});
});
