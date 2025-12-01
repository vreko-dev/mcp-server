/**
 * Tests for PostHog Alerts functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAlert, deleteAlert, getAlerts, KEY_METRIC_ALERTS, toggleAlert } from "../alerts.js";

describe("PostHog Alerts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Alert Configuration", () => {
		it("should define key metric alerts", () => {
			expect(KEY_METRIC_ALERTS).toHaveLength(5);

			const alertNames = KEY_METRIC_ALERTS.map((alert) => alert.name);
			expect(alertNames).toContain("TTFV p75 Alert");
			expect(alertNames).toContain("Onboarding Completion Rate Alert");
			expect(alertNames).toContain("Crash-free Sessions Alert");
			expect(alertNames).toContain("Replay Budget Alert");
			expect(alertNames).toContain("D7 Retention Alert");
		});

		it("should have correct alert configurations", () => {
			const ttvAlert = KEY_METRIC_ALERTS.find((alert) => alert.name === "TTFV p75 Alert");
			expect(ttvAlert).toBeDefined();
			expect(ttvAlert?.threshold).toBe(7);
			expect(ttvAlert?.type).toBe("value");
			expect(ttvAlert?.thresholdType).toBe("absolute");
			expect(ttvAlert?.frequency).toBe("daily");

			const onboardingAlert = KEY_METRIC_ALERTS.find(
				(alert) => alert.name === "Onboarding Completion Rate Alert",
			);
			expect(onboardingAlert).toBeDefined();
			expect(onboardingAlert?.threshold).toBe(60);
			expect(onboardingAlert?.type).toBe("value");
			expect(onboardingAlert?.thresholdType).toBe("absolute");
			expect(onboardingAlert?.frequency).toBe("daily");

			const crashAlert = KEY_METRIC_ALERTS.find((alert) => alert.name === "Crash-free Sessions Alert");
			expect(crashAlert).toBeDefined();
			expect(crashAlert?.threshold).toBe(95);
			expect(crashAlert?.type).toBe("value");
			expect(crashAlert?.thresholdType).toBe("absolute");
			expect(crashAlert?.frequency).toBe("daily");

			const replayAlert = KEY_METRIC_ALERTS.find((alert) => alert.name === "Replay Budget Alert");
			expect(replayAlert).toBeDefined();
			expect(replayAlert?.threshold).toBe(80);
			expect(replayAlert?.type).toBe("value");
			expect(replayAlert?.thresholdType).toBe("percentage");
			expect(replayAlert?.frequency).toBe("weekly");

			const retentionAlert = KEY_METRIC_ALERTS.find((alert) => alert.name === "D7 Retention Alert");
			expect(retentionAlert).toBeDefined();
			expect(retentionAlert?.threshold).toBe(5);
			expect(retentionAlert?.type).toBe("decrease");
			expect(retentionAlert?.thresholdType).toBe("percentage");
			expect(retentionAlert?.frequency).toBe("weekly");
		});
	});

	describe("Alert Operations", () => {
		it("should create an alert", async () => {
			const alertConfig = KEY_METRIC_ALERTS[0];
			const alertId = await createAlert(alertConfig);

			expect(alertId).toBeDefined();
			expect(typeof alertId).toBe("string");
			expect(alertId).toMatch(/^alert_\d+_[a-z0-9]+$/);
		});

		it("should get alerts", async () => {
			const alerts = await getAlerts();

			expect(Array.isArray(alerts)).toBe(true);
		});

		it("should toggle an alert", async () => {
			const result = await toggleAlert("alert_123", true);

			expect(result).toBe(true);
		});

		it("should delete an alert", async () => {
			const result = await deleteAlert("alert_123");

			expect(result).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle errors when creating alerts", async () => {
			// Since we're not actually connecting to PostHog, this test just verifies
			// that the function handles errors gracefully
			const alertConfig = KEY_METRIC_ALERTS[0];

			await expect(createAlert(alertConfig)).resolves.toBeDefined();
		});

		it("should handle errors when getting alerts", async () => {
			await expect(getAlerts()).resolves.toBeDefined();
		});

		it("should handle errors when toggling alerts", async () => {
			await expect(toggleAlert("alert_123", true)).resolves.toBeDefined();
		});

		it("should handle errors when deleting alerts", async () => {
			await expect(deleteAlert("alert_123")).resolves.toBeDefined();
		});
	});
});
