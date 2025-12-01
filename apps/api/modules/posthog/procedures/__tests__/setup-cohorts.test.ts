/**
 * Tests for PostHog Setup Cohorts procedure
 */

import { describe, expect, it, vi } from "vitest";
import { setupCohorts } from "../setup-cohorts.js";

// Mock the logger
vi.mock("@snapback/infrastructure", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock the cohorts module
vi.mock("@snapback/infrastructure/src/posthog/cohorts", async () => {
	const actual = await vi.importActual("@snapback/infrastructure/src/posthog/cohorts");
	return {
		...actual,
		createCohort: vi.fn().mockResolvedValue({ id: 123, name: "Test Cohort" }),
		getCohorts: vi.fn().mockResolvedValue([]),
		RETENTION_COHORTS: [
			{ name: "D7 Retention", description: "7-day retention cohort" },
			{ name: "D30 Retention", description: "30-day retention cohort" },
		],
		CORRELATION_COHORTS: [
			{
				name: "Feature Power Users",
				description: "Users with high feature adoption",
			},
		],
	};
});

describe("Setup Cohorts Procedure", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should setup retention cohorts in dry run mode", async () => {
		const result = await setupCohorts.handler({
			input: { dryRun: true, correlation: false },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Dry run completed");
		expect(result.results).toHaveLength(2);
	});

	it("should setup retention cohorts in actual mode", async () => {
		const result = await setupCohorts.handler({
			input: { dryRun: false, correlation: false },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Retention cohorts created successfully");
		expect(result.results).toHaveLength(2);
	});

	it("should setup correlation cohorts when requested", async () => {
		const result = await setupCohorts.handler({
			input: { dryRun: false, correlation: true },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Correlation cohorts created successfully");
		expect(result.results).toHaveLength(3); // 2 retention + 1 correlation
	});

	it("should handle errors during cohort creation", async () => {
		// Mock createCohort to throw an error for one of the cohorts
		const { createCohort } = await import("@snapback/infrastructure/src/posthog/cohorts");
		vi.mocked(createCohort)
			.mockResolvedValueOnce({ id: 123, name: "D7 Retention" })
			.mockRejectedValueOnce(new Error("Failed to create cohort"))
			.mockResolvedValueOnce({ id: 125, name: "High Engagement Users" });

		const result = await setupCohorts.handler({
			input: { dryRun: false, correlation: false },
		});

		expect(result.success).toBe(true);
		expect(result.results).toHaveLength(2);

		// Check that we have one error in the results
		const errorResult = result.results.find((r) => r.error);
		expect(errorResult).toBeDefined();
		expect(errorResult?.error).toBe("Failed to create cohort");
	});

	it("should handle dry run with correlation cohorts", async () => {
		const result = await setupCohorts.handler({
			input: { dryRun: true, correlation: true },
		});

		expect(result.success).toBe(true);
		expect(result.message).toContain("Dry run completed");
		expect(result.results).toHaveLength(3); // 2 retention + 1 correlation
	});
});
