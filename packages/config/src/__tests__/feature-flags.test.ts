/**
 * Feature Flags Tests
 */

import { describe, expect, it } from "vitest";
import {
	ENABLE_API_KEYS,
	ENABLE_EXTENSION_AUTH,
	ENABLE_GITHUB_INTEGRATION,
	ENABLE_INTELLIGENCE_LAYER,
	ENABLE_PATTERN_LIBRARY,
	ENABLE_PREDICTION_ENGINE,
	ENABLE_RATE_LIMITING,
	ENABLE_TRUST_CALIBRATION,
	type FeatureFlags,
	featureFlags,
} from "../feature-flags";

describe("Feature Flags - Configuration Object", () => {
	it("should export featureFlags object with all flags", () => {
		expect(featureFlags).toBeDefined();
		expect(featureFlags).toHaveProperty("extensionAuth");
		expect(featureFlags).toHaveProperty("apiKeys");
		expect(featureFlags).toHaveProperty("rateLimiting");
	});

	it("should include intelligence layer flags", () => {
		expect(featureFlags).toHaveProperty("intelligenceLayer");
		expect(featureFlags).toHaveProperty("trustCalibration");
		expect(featureFlags).toHaveProperty("patternLibrary");
		expect(featureFlags).toHaveProperty("predictionEngine");
		expect(featureFlags).toHaveProperty("githubIntegration");
	});

	it("should have correct number of total flags", () => {
		const flagKeys = Object.keys(featureFlags);
		expect(flagKeys).toHaveLength(8); // 3 existing + 5 intelligence layer
	});

	it("should export type-safe FeatureFlags type", () => {
		const checkType: FeatureFlags = featureFlags;
		expect(checkType).toBeDefined();
	});

	it("should have consistent flag values", () => {
		expect(featureFlags.extensionAuth).toBe(ENABLE_EXTENSION_AUTH);
		expect(featureFlags.apiKeys).toBe(ENABLE_API_KEYS);
		expect(featureFlags.rateLimiting).toBe(ENABLE_RATE_LIMITING);
		expect(featureFlags.intelligenceLayer).toBe(ENABLE_INTELLIGENCE_LAYER);
		expect(featureFlags.trustCalibration).toBe(ENABLE_TRUST_CALIBRATION);
		expect(featureFlags.patternLibrary).toBe(ENABLE_PATTERN_LIBRARY);
		expect(featureFlags.predictionEngine).toBe(ENABLE_PREDICTION_ENGINE);
		expect(featureFlags.githubIntegration).toBe(ENABLE_GITHUB_INTEGRATION);
	});
});
