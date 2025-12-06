/**
 * Tests for PostHog Setup Verification Script
 */

import { describe, expect, it, vi } from "vitest";

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock the alerts module
vi.mock("@snapback/infrastructure/src/posthog/alerts", () => ({
	getAlerts: vi.fn().mockResolvedValue([]),
}));

describe("PostHog Setup Verification Script", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should verify activation funnel events", async () => {
		// Import the verification functions
		const verifyModule = await import("../../src/verify-posthog-setup");

		// Call the verification function
		await verifyModule.verifyActivationFunnel();

		// Verify that the logger was called with the expected messages
		const logger = await import("@snapback/infrastructure");
		expect(logger.logger.info).toHaveBeenCalledWith("Verifying activation funnel events...");
	});

	it("should verify retention cohorts", async () => {
		// Import the verification functions
		const verifyModule = await import("../../src/verify-posthog-setup");

		// Call the verification function
		await verifyModule.verifyRetentionCohorts();

		// Verify that the logger was called with the expected messages
		const logger = await import("@snapback/infrastructure");
		expect(logger.logger.info).toHaveBeenCalledWith("Verifying retention cohorts configuration...");
	});

	it("should verify alerts", async () => {
		// Import the verification functions
		const verifyModule = await import("../../src/verify-posthog-setup");

		// Call the verification function
		await verifyModule.verifyAlerts();

		// Verify that the logger was called with the expected messages
		const logger = await import("@snapback/infrastructure");
		expect(logger.logger.info).toHaveBeenCalledWith("Verifying alerts configuration...");
	});
});
