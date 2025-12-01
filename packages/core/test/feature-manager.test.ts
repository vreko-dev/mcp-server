import { FeatureManager } from "@snapback/contracts";
import { beforeEach, describe, expect, it } from "vitest";

describe("FeatureManager", () => {
	let featureManager: FeatureManager;

	beforeEach(() => {
		// Reset singleton instance for each test
		(FeatureManager as unknown as { instance: FeatureManager | null }).instance = null;
		featureManager = FeatureManager.getInstance();
	});

	it("should be a singleton", () => {
		const instance1 = FeatureManager.getInstance();
		const instance2 = FeatureManager.getInstance();
		expect(instance1).toBe(instance2);
	});

	it("should return default value for feature flag", () => {
		expect(featureManager.isEnabled("protection.enabled")).toBe(true);
		expect(featureManager.isEnabled("risk.guardian_v2")).toBe(false);
	});

	it("should allow setting feature flags", () => {
		featureManager.setFlag("risk.guardian_v2", true);
		expect(featureManager.isEnabled("risk.guardian_v2")).toBe(true);
	});

	it("should handle sampling rate flags correctly", () => {
		// This test would need to mock Math.random to be fully deterministic
		const samplingRate = featureManager.getValue<number>("telemetry.sampling_rate");
		expect(samplingRate).toBe(1.0);
	});

	it("should reset to default values", () => {
		featureManager.setFlag("risk.guardian_v2", true);
		expect(featureManager.isEnabled("risk.guardian_v2")).toBe(true);

		featureManager.reset();
		expect(featureManager.isEnabled("risk.guardian_v2")).toBe(false);
	});

	it("should handle environment variable overrides", () => {
		// Save original env
		const originalEnv = process.env.SNAPBACK_RISK_GUARDIAN_V2;

		// Set environment variable
		process.env.SNAPBACK_RISK_GUARDIAN_V2 = "true";

		// Reset feature manager to reload environment variables
		(FeatureManager as unknown as { instance: FeatureManager | null }).instance = null;
		const newFeatureManager = FeatureManager.getInstance();

		expect(newFeatureManager.isEnabled("risk.guardian_v2")).toBe(true);

		// Restore original env
		if (originalEnv !== undefined) {
			process.env.SNAPBACK_RISK_GUARDIAN_V2 = originalEnv;
		} else {
			process.env.SNAPBACK_RISK_GUARDIAN_V2 = undefined;
		}
	});

	it("should handle numeric environment variable overrides", () => {
		// Save original env
		const originalEnv = process.env.SNAPBACK_TELEMETRY_SAMPLING_RATE;

		// Set environment variable
		process.env.SNAPBACK_TELEMETRY_SAMPLING_RATE = "0.5";

		// Reset feature manager to reload environment variables
		(FeatureManager as unknown as { instance: FeatureManager | null }).instance = null;
		const newFeatureManager = FeatureManager.getInstance();

		const samplingRate = newFeatureManager.getValue<number>("telemetry.sampling_rate");
		expect(samplingRate).toBe(0.5);

		// Restore original env
		if (originalEnv !== undefined) {
			process.env.SNAPBACK_TELEMETRY_SAMPLING_RATE = originalEnv;
		} else {
			process.env.SNAPBACK_TELEMETRY_SAMPLING_RATE = undefined;
		}
	});
});
