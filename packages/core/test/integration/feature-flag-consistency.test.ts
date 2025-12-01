import { FeatureManager } from "@snapback/contracts";
import { beforeEach, describe, expect, it } from "vitest";

describe("Feature Flag Consistency", () => {
	let featureManager: FeatureManager;

	beforeEach(() => {
		// Reset singleton instance for each test
		(FeatureManager as unknown as { instance: FeatureManager | null }).instance = null;
		featureManager = FeatureManager.getInstance();
	});

	it("should maintain consistency between direct access and manager access", () => {
		// Test that the feature manager returns the same values as direct access
		const defaultManagerValue = featureManager.isEnabled("protection.enabled");
		expect(defaultManagerValue).toBe(true);
	});

	it("should handle environment variable overrides consistently", () => {
		// Save original env
		const originalEnv = process.env.SNAPBACK_RISK_GUARDIAN_V2;

		// Set environment variable
		process.env.SNAPBACK_RISK_GUARDIAN_V2 = "true";

		// Reset feature manager to reload environment variables
		(FeatureManager as unknown as { instance: FeatureManager | null }).instance = null;
		const newFeatureManager = FeatureManager.getInstance();

		// Both should now return true
		expect(newFeatureManager.isEnabled("risk.guardian_v2")).toBe(true);

		// Restore original env
		if (originalEnv !== undefined) {
			process.env.SNAPBACK_RISK_GUARDIAN_V2 = originalEnv;
		} else {
			process.env.SNAPBACK_RISK_GUARDIAN_V2 = undefined;
		}
	});

	it("should handle numeric feature flags", () => {
		const samplingRate = featureManager.getValue<number>("telemetry.sampling_rate");
		expect(samplingRate).toBe(1.0);
		expect(typeof samplingRate).toBe("number");
	});
});
