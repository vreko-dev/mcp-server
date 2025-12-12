/**
 * Feature Flag Integration Tests
 *
 * TDD_CORE.md Requirement (Line 63):
 * "Feature flag rollout mandatory"
 *
 * These tests verify that the feature flag correctly controls
 * which ConfigStore version is loaded.
 *
 * RED PHASE: These tests will FAIL until implementation is complete.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigStore } from "../store";

describe("Feature Flag Integration - RED PHASE", () => {
	beforeEach(() => {
		// Reset singleton before each test
		ConfigStore.reset();
		// Clear environment variables
		delete process.env.FEATURE_CONFIG_V2;
		delete process.env.SNAPBACK_USER_ID;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Environment Variable Flag", () => {
		it("✅ should use v2 when FEATURE_CONFIG_V2=true", async () => {
			process.env.FEATURE_CONFIG_V2 = "true";

			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			// V2 config has version 2
			expect(config.version).toBe(2);
		});

		it("✅ should use v2 when FEATURE_CONFIG_V2=1", async () => {
			process.env.FEATURE_CONFIG_V2 = "1";

			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			expect(config.version).toBe(2);
		});

		it("❌ should use v2 by default (v2 is now default)", async () => {
			// No environment variable set
			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			// V2 is the default
			expect(config.version).toBe(2);
		});

		it("❌ should handle FEATURE_CONFIG_V2=false gracefully", async () => {
			process.env.FEATURE_CONFIG_V2 = "false";

			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			// Should still work, just use v2 (v1 is deprecated)
			expect(config.version).toBe(2);
		});
	});

	describe("Feature Flag Metadata", () => {
		it("✅ should expose feature flag status", async () => {
			process.env.FEATURE_CONFIG_V2 = "true";

			const store = ConfigStore.getInstance();
			await store.initialize();

			// Store should expose which version is active
			const metadata = store.getMetadata();
			expect(metadata).toBeDefined();
			expect(metadata.version).toBe(2);
			expect(metadata.featureFlagEnabled).toBe(true);
		});

		it("✅ should track flag source (env vs posthog)", async () => {
			process.env.FEATURE_CONFIG_V2 = "true";

			const store = ConfigStore.getInstance();
			await store.initialize();

			const metadata = store.getMetadata();
			expect(metadata.featureFlagSource).toBe("environment");
		});
	});

	describe("Error Handling", () => {
		it("❌ should handle PostHog unavailable gracefully", async () => {
			// PostHog might not be available in test environment
			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			// Should still load v2 successfully
			expect(config).toBeDefined();
			expect(config.version).toBe(2);
		});

		it("❌ should log feature flag evaluation", async () => {
			const logSpy = vi.spyOn(console, "log");
			process.env.FEATURE_CONFIG_V2 = "true";

			const store = ConfigStore.getInstance();
			await store.initialize();

			// Should log feature flag status for debugging
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Feature flag"));

			logSpy.mockRestore();
		});
	});

	describe("Backward Compatibility", () => {
		it("✅ should maintain existing API surface", async () => {
			const store = ConfigStore.getInstance();
			await store.initialize();

			// All existing methods should still work
			expect(store.getConfig).toBeDefined();
			expect(store.get).toBeDefined();
			expect(store.saveSnapbackrc).toBeDefined();
			expect(store.onChange).toBeDefined();
			expect(store.watchForChanges).toBeDefined();
		});

		it("✅ should not break existing consumers", async () => {
			// Simulate existing consumer code
			const store = ConfigStore.getInstance();
			const config = await store.initialize();

			const maxDepth = store.get<number>("engine.maxDepth");
			expect(typeof maxDepth).toBe("number");

			const protections = config.protections;
			expect(Array.isArray(protections)).toBe(true);
		});
	});
});
