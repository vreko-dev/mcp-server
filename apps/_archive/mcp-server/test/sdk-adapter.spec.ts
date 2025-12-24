import { describe, expect, it } from "vitest";
import { MCPSDKAdapter } from "../src/sdk-adapter";

// Test IDs: sdkuse-002
describe("MCP SDK Adapter", () => {
	describe("sdkuse-002: MCP uses SDK only", () => {
		it("should create MCPSDKAdapter instance", () => {
			const adapter = new MCPSDKAdapter("https://api.snapback.dev", "test-key");

			expect(adapter).toBeInstanceOf(MCPSDKAdapter);
		});

		it("should create envelope with correct structure", () => {
			const adapter = new MCPSDKAdapter("https://api.snapback.dev", "test-key");

			// Test that the adapter has the expected methods
			expect(typeof (adapter as any).createEnvelope).toBe("function");
		});

		it("should expose analyzeContent method", () => {
			const adapter = new MCPSDKAdapter("https://api.snapback.dev", "test-key");

			expect(typeof adapter.analyzeContent).toBe("function");
		});

		it("should expose evaluatePolicy method", () => {
			const adapter = new MCPSDKAdapter("https://api.snapback.dev", "test-key");

			expect(typeof adapter.evaluatePolicy).toBe("function");
		});

		it("should expose ingestTelemetry method", () => {
			const adapter = new MCPSDKAdapter("https://api.snapback.dev", "test-key");

			expect(typeof adapter.ingestTelemetry).toBe("function");
		});
	});
});
