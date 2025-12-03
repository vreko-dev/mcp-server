import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS, type FeatureFlag } from "../src/features.js";

describe("Feature Flags", () => {
	it("should define all required feature flags", () => {
		// Core protection features
		expect(FEATURE_FLAGS).toHaveProperty("protection.enabled");
		expect(FEATURE_FLAGS).toHaveProperty("protection.auto_checkpoint");
		expect(FEATURE_FLAGS).toHaveProperty("protection.pre_save_hook");

		// Risk analysis
		expect(FEATURE_FLAGS).toHaveProperty("risk.guardian_v2");
		expect(FEATURE_FLAGS).toHaveProperty("risk.dependency_analysis");
		expect(FEATURE_FLAGS).toHaveProperty("risk.deep_analysis");
		expect(FEATURE_FLAGS).toHaveProperty("risk.ai_detection");

		// Storage
		expect(FEATURE_FLAGS).toHaveProperty("storage.compression");
		expect(FEATURE_FLAGS).toHaveProperty("storage.deduplication");
		expect(FEATURE_FLAGS).toHaveProperty("storage.encryption");

		// UI/UX
		expect(FEATURE_FLAGS).toHaveProperty("ui.chat_participant");
		expect(FEATURE_FLAGS).toHaveProperty("ui.status_bar");
		expect(FEATURE_FLAGS).toHaveProperty("ui.timeline_view");

		// Telemetry
		expect(FEATURE_FLAGS).toHaveProperty("telemetry.detailed_events");
		expect(FEATURE_FLAGS).toHaveProperty("telemetry.performance_metrics");
		expect(FEATURE_FLAGS).toHaveProperty("telemetry.sampling_rate");

		// Experimental
		expect(FEATURE_FLAGS).toHaveProperty("experimental.mcp_tools");
		expect(FEATURE_FLAGS).toHaveProperty("experimental.recovery_mode");
	});

	it("should have correct default values", () => {
		// Enabled by default
		expect(FEATURE_FLAGS["protection.enabled"]).toBe(true);
		expect(FEATURE_FLAGS["protection.auto_checkpoint"]).toBe(true);
		expect(FEATURE_FLAGS["protection.pre_save_hook"]).toBe(true);
		expect(FEATURE_FLAGS["risk.dependency_analysis"]).toBe(true);
		expect(FEATURE_FLAGS["storage.compression"]).toBe(true);
		expect(FEATURE_FLAGS["ui.chat_participant"]).toBe(true);
		expect(FEATURE_FLAGS["ui.status_bar"]).toBe(true);
		expect(FEATURE_FLAGS["ui.timeline_view"]).toBe(true);
		expect(FEATURE_FLAGS["telemetry.performance_metrics"]).toBe(true);

		// Disabled by default
		expect(FEATURE_FLAGS["risk.guardian_v2"]).toBe(false);
		expect(FEATURE_FLAGS["risk.deep_analysis"]).toBe(false);
		expect(FEATURE_FLAGS["risk.ai_detection"]).toBe(true); // This should be true based on requirements
		expect(FEATURE_FLAGS["storage.deduplication"]).toBe(false);
		expect(FEATURE_FLAGS["storage.encryption"]).toBe(false);
		expect(FEATURE_FLAGS["telemetry.detailed_events"]).toBe(false);
		expect(FEATURE_FLAGS["experimental.mcp_tools"]).toBe(false);
		expect(FEATURE_FLAGS["experimental.recovery_mode"]).toBe(false);
	});

	it("should have correct sampling rate default", () => {
		expect(FEATURE_FLAGS["telemetry.sampling_rate"]).toBe(1.0);
	});

	it("should derive FeatureFlag type correctly", () => {
		// This test ensures the type is correctly derived
		const flag: FeatureFlag = "protection.enabled";
		expect(flag).toBe("protection.enabled");
	});
});
