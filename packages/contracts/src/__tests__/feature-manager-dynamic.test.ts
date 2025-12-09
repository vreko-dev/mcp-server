/**
 * Task 4.5: Dynamic Feature Flags with PostHog Integration
 *
 * These tests verify that FeatureManager correctly:
 * 1. Calls PostHog for dynamic feature flag evaluation
 * 2. Falls back to static config when PostHog unavailable
 * 3. Handles errors gracefully
 * 4. Supports user context and targeting
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureManager } from "../feature-manager";

/**
 * Mock PostHog client for testing
 */
const createMockPostHog = () => ({
	isFeatureEnabled: vi.fn(),
	getFeatureFlag: vi.fn(),
	shutdown: vi.fn(),
});

describe("FeatureManager - Dynamic PostHog Integration", () => {
	let featureManager: FeatureManager;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get fresh instance for each test
		featureManager = FeatureManager.getInstance();
	});

	afterEach(() => {
		featureManager.reset();
	});

	describe("PostHog Integration", () => {
		/**
		 * Happy Path: PostHog is initialized and returns true
		 */
		it("should call PostHog.isFeatureEnabled when flag is checked with userId", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(true);

			// Initialize with mock
			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-123");

			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith(
				"intelligenceLayer",
				"user-123",
				expect.objectContaining({
					subscriptionTier: expect.any(String),
				}),
			);
			expect(result).toBe(true);
		});

		/**
		 * Happy Path: PostHog returns false
		 */
		it("should return false when PostHog explicitly disables flag", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(false);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("trustCalibration", "user-456");

			expect(result).toBe(false);
		});

		/**
		 * Sad Path: PostHog unavailable, should fallback to static config
		 */
		it("should fallback to static config when PostHog throws error", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockRejectedValue(new Error("PostHog API unavailable"));

			featureManager.setPostHogClient(mockPostHog);

			// intelligenceLayer is disabled by default in ENABLE_INTELLIGENCE_LAYER
			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-789");

			// Should use static config (false by default)
			expect(result).toBe(false);
		});

		/**
		 * Edge Path: PostHog returns null, should fallback
		 */
		it("should fallback when PostHog returns null", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(null);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("trustCalibration", "user-null");

			// Should use static config
			const staticValue = featureManager.isEnabled("trustCalibration" as any);
			expect(result).toBe(staticValue);
		});

		/**
		 * Error Path: No userId provided, should use static config
		 */
		it("should use static config when no userId provided", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(true);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer");

			// Should NOT call PostHog without userId
			expect(mockPostHog.isFeatureEnabled).not.toHaveBeenCalled();
			expect(result).toBe(false); // Static value
		});
	});

	describe("User Context & Targeting", () => {
		/**
		 * Happy Path: Context passed to PostHog for targeting rules
		 */
		it("should pass user context to PostHog for segmentation", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(true);

			featureManager.setPostHogClient(mockPostHog);

			const context = {
				subscriptionTier: "pro",
				organization: "acme-corp",
				region: "us-east-1",
			};

			await featureManager.isEnabledAsync("patternLibrary", "user-context", context);

			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledWith(
				"patternLibrary",
				"user-context",
				expect.objectContaining({
					subscriptionTier: "pro",
					organization: "acme-corp",
					region: "us-east-1",
				}),
			);
		});

		/**
		 * Edge Path: Empty context provided
		 */
		it("should handle empty context gracefully", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(false);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("predictionEngine", "user-empty-context", {});

			expect(result).toBe(false);
			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalled();
		});
	});

	describe("Graceful Degradation", () => {
		/**
		 * Error Path: Network timeout
		 */
		it("should handle network timeout and fallback", async () => {
			const mockPostHog = createMockPostHog();
			const timeoutError = new Error("ETIMEDOUT");
			mockPostHog.isFeatureEnabled.mockRejectedValue(timeoutError);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-timeout");

			// Should not throw, should fallback to static
			expect(result).toBe(false);
		});

		/**
		 * Error Path: Invalid response format
		 */
		it("should handle malformed PostHog response", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(undefined);

			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("trustCalibration", "user-malformed");

			// Should fallback gracefully
			expect(result).toBeDefined();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Backward Compatibility", () => {
		/**
		 * Verify sync method still works
		 */
		it("should still support synchronous isEnabled for backward compat", () => {
			const result = featureManager.isEnabled("trustCalibration" as any);
			expect(typeof result).toBe("boolean");
		});

		/**
		 * Verify static config works when PostHog not initialized
		 */
		it("should use static config when PostHog not set", async () => {
			// Don't set PostHog client
			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-no-posthog");

			const expected = featureManager.isEnabled("intelligenceLayer" as any);
			expect(result).toBe(expected);
		});
	});

	describe("Multiple Sequential Calls", () => {
		/**
		 * Verify multiple calls work correctly (no state corruption)
		 */
		it("should handle multiple sequential feature checks", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled
				.mockResolvedValueOnce(true)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true);

			featureManager.setPostHogClient(mockPostHog);

			const result1 = await featureManager.isEnabledAsync("intelligenceLayer", "user-seq");
			const result2 = await featureManager.isEnabledAsync("trustCalibration", "user-seq");
			const result3 = await featureManager.isEnabledAsync("patternLibrary", "user-seq");

			expect(result1).toBe(true);
			expect(result2).toBe(false);
			expect(result3).toBe(true);
			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalledTimes(3);
		});
	});

	describe("Four-Path Coverage", () => {
		/**
		 * Path 1: Happy Path - PostHog enabled, returns true
		 */
		it("[Happy] PostHog enabled returns true", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(true);
			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-happy");

			expect(result).toBe(true);
			expect(mockPostHog.isFeatureEnabled).toHaveBeenCalled();
		});

		/**
		 * Path 2: Sad Path - PostHog error, fallback used
		 */
		it("[Sad] PostHog error falls back to static", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockRejectedValue(new Error("API failed"));
			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-sad");

			expect(result).toBe(false);
			expect(typeof result).toBe("boolean");
		});

		/**
		 * Path 3: Edge Path - PostHog returns null
		 */
		it("[Edge] PostHog returns null", async () => {
			const mockPostHog = createMockPostHog();
			mockPostHog.isFeatureEnabled.mockResolvedValue(null);
			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer", "user-edge");

			expect(typeof result).toBe("boolean");
		});

		/**
		 * Path 4: Error Path - No userId
		 */
		it("[Error] No userId provided uses static config", async () => {
			const mockPostHog = createMockPostHog();
			featureManager.setPostHogClient(mockPostHog);

			const result = await featureManager.isEnabledAsync("intelligenceLayer");

			expect(mockPostHog.isFeatureEnabled).not.toHaveBeenCalled();
			expect(result).toBe(false);
		});
	});
});
