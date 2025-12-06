/**
 * Tests for PostHog Cohorts functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORRELATION_COHORTS, createCohort, getCohorts, RETENTION_COHORTS } from "../cohorts";

// Mock the PostHog client
vi.mock("posthog-node", () => {
	return {
		PostHog: vi.fn().mockImplementation(() => ({
			apiKey: "test-key",
			host: "https://app.posthog.com",
		})),
	};
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PostHog Cohorts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Cohort Configuration", () => {
		it("should define retention cohorts", () => {
			expect(RETENTION_COHORTS).toHaveLength(4);

			const cohortNames = RETENTION_COHORTS.map((cohort) => cohort.name);
			expect(cohortNames).toContain("D7 Retention");
			expect(cohortNames).toContain("D30 Retention");
			expect(cohortNames).toContain("Onboarding Completion Cohort");
			expect(cohortNames).toContain("High Engagement Users");
		});

		it("should have correct retention cohort configurations", () => {
			const d7Cohort = RETENTION_COHORTS.find((cohort) => cohort.name === "D7 Retention");
			expect(d7Cohort).toBeDefined();
			expect(d7Cohort?.description).toContain("7 days");

			const d30Cohort = RETENTION_COHORTS.find((cohort) => cohort.name === "D30 Retention");
			expect(d30Cohort).toBeDefined();
			expect(d30Cohort?.description).toContain("30 days");
		});

		it("should define correlation cohorts", () => {
			expect(CORRELATION_COHORTS).toHaveLength(3);

			const cohortNames = CORRELATION_COHORTS.map((cohort) => cohort.name);
			expect(cohortNames).toContain("Feature Power Users");
			expect(cohortNames).toContain("At-Risk Churn");
			expect(cohortNames).toContain("Free to Paid Converters");
		});
	});

	describe("Cohort Operations", () => {
		it("should create a cohort", async () => {
			const mockResponse = {
				id: 123,
				name: "Test Cohort",
				description: "Test Description",
				created_at: "2023-01-01T00:00:00Z",
				created_by: {
					id: 1,
					uuid: "user-uuid",
					distinct_ids: ["user-id"],
					first_name: "Test",
					email: "test@example.com",
				},
				deleted: false,
				filters: {},
				is_calculating: false,
				last_calculation: "2023-01-01T00:00:00Z",
				errors_calculating: 0,
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
				statusText: "OK",
			});

			const config = {
				name: "Test Cohort",
				description: "Test Description",
				filters: {
					properties: [],
				},
			};

			const result = await createCohort(config);

			expect(result).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.posthog.com/api/projects/@current/cohorts/",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer test-key",
						"Content-Type": "application/json",
					},
					body: JSON.stringify(config),
				}),
			);
		});

		it("should handle cohort creation errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				statusText: "Bad Request",
			});

			const config = {
				name: "Test Cohort",
				description: "Test Description",
				filters: {
					properties: [],
				},
			};

			await expect(createCohort(config)).rejects.toThrow("Failed to create PostHog cohort");
		});

		it("should get all cohorts", async () => {
			const mockResponse = {
				results: [
					{
						id: 123,
						name: "Test Cohort",
						description: "Test Description",
						created_at: "2023-01-01T00:00:00Z",
						created_by: {
							id: 1,
							uuid: "user-uuid",
							distinct_ids: ["user-id"],
							first_name: "Test",
							email: "test@example.com",
						},
						deleted: false,
						filters: {},
						is_calculating: false,
						last_calculation: "2023-01-01T00:00:00Z",
						errors_calculating: 0,
					},
				],
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
				statusText: "OK",
			});

			const result = await getCohorts();

			expect(result).toEqual(mockResponse.results);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.posthog.com/api/projects/@current/cohorts/",
				expect.objectContaining({
					method: "GET",
					headers: {
						Authorization: "Bearer test-key",
						"Content-Type": "application/json",
					},
				}),
			);
		});

		it("should handle get cohorts errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				statusText: "Bad Request",
			});

			await expect(getCohorts()).rejects.toThrow("Failed to fetch PostHog cohorts");
		});
	});
});
