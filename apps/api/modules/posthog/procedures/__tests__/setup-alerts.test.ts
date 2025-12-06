/**
 * Tests for PostHog Setup Alerts procedure
 */

import { describe, expect, it, vi } from "vitest";
import { setupAlerts } from "../setup-alerts";

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock the alerts module
vi.mock("@snapback/infrastructure/src/posthog/alerts", async () => {
	const actual = await vi.importActual("@snapback/infrastructure/src/posthog/alerts");
	return {
		...actual,
		createAlert: vi.fn().mockResolvedValue("alert_mock_id"),
	};
});

describe("Setup Alerts Procedure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should setup alerts in dry run mode", async () => {
		const result = await setupAlerts.handler({
			input: { dryRun: true },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Dry run completed");
		expect(result.results).toHaveLength(5);
	});

	it("should setup alerts in actual mode", async () => {
		const result = await setupAlerts.handler({
			input: { dryRun: false },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Alerts created successfully");
		expect(result.results).toHaveLength(5);
	});

	it("should handle errors during alert creation", async () => {
		// Mock createAlert to throw an error for one of the alerts
		const { createAlert } = await import("@snapback/infrastructure/src/posthog/alerts");
		vi.mocked(createAlert)
			.mockResolvedValueOnce("alert_mock_id")
			.mockRejectedValueOnce(new Error("Failed to create alert"))
			.mockResolvedValueOnce("alert_mock_id")
			.mockResolvedValueOnce("alert_mock_id")
			.mockResolvedValueOnce("alert_mock_id");

		const result = await setupAlerts.handler({
			input: { dryRun: false },
		});

		expect(result.success).toBe(true);
		expect(result.results).toHaveLength(5);

		// Check that we have one error in the results
		const errorResult = result.results.find((r) => r.error);
		expect(errorResult).toBeDefined();
		expect(errorResult?.error).toBe("Failed to create alert");
	});
});
