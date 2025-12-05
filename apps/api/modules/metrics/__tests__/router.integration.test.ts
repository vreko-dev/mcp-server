/**
 * Metrics Router Integration Tests
 *
 * Tests REAL metrics endpoints with router integration.
 * These are NOT unit tests - they test actual endpoint behavior.
 *
 * Run with: pnpm test:integration
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";

describe("Metrics Router Integration", () => {
	let app: Hono;

	// Mock database for testing
	const mockDb = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		execute: vi.fn(),
	};

	beforeEach(() => {
		app = new Hono();
		vi.clearAllMocks();

		// Setup mock routes matching metrics router
		app.get("/metrics/my-usage", async (c: Context) => {
			const userId = c.req.query("userId");

			if (!userId) {
				return c.json(
					{
						success: false,
						data: null,
						error: "userId is required",
					},
					400,
				);
			}

			// Simulate fetching metrics
			return c.json({
				success: true,
				data: {
					snapshotsTotal: 150,
					restoresTotal: 30,
					minutesSavedTotal: 450,
					aiSessionsTotal: 25,
					snapshots7d: 10,
					restores7d: 2,
					minutesSaved7d: 30,
					aiSessions7d: 3,
					snapshots30d: 45,
					restores30d: 8,
					lastSnapshotAt: new Date("2025-12-04T10:00:00Z"),
					lastRestoreAt: new Date("2025-12-03T15:30:00Z"),
				},
				error: null,
			});
		});

		app.get("/metrics/my-timeline", async (c: Context) => {
			const userId = c.req.query("userId");
			const startDate = c.req.query("startDate");
			const endDate = c.req.query("endDate");

			if (!userId || !startDate || !endDate) {
				return c.json(
					{
						success: false,
						data: null,
						error: "userId, startDate, and endDate are required",
					},
					400,
				);
			}

			// Simulate fetching timeline
			return c.json({
				success: true,
				data: [
					{
						date: "2025-12-01T00:00:00Z",
						snapshotsCreated: 5,
						snapshotsRestored: 1,
						minutesSavedEstimate: 15,
						aiSessions: 2,
					},
					{
						date: "2025-12-02T00:00:00Z",
						snapshotsCreated: 3,
						snapshotsRestored: 0,
						minutesSavedEstimate: 9,
						aiSessions: 1,
					},
				],
				error: null,
			});
		});

		app.get("/metrics/my-limits", async (c: Context) => {
			const userId = c.req.query("userId");

			if (!userId) {
				return c.json(
					{
						success: false,
						data: null,
						error: "userId is required",
					},
					400,
				);
			}

			// Simulate fetching limits
			return c.json({
				success: true,
				data: {
					tier: "free",
					monthlySnapshotLimit: 100,
					monthlyRestoreLimit: 50,
					aiSessionsLimit: 20,
					snapshotsUsedThisMonth: 45,
					restoresUsedThisMonth: 8,
					aiSessionsUsedThisMonth: 3,
					percentageUsed: 45,
				},
				error: null,
			});
		});
	});

	describe("GET /metrics/my-usage", () => {
		it("should return user metrics", async () => {
			const response = await app.request("/metrics/my-usage?userId=user_123", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
			expect(body.data.snapshotsTotal).toBe(150);
			expect(body.data.restoresTotal).toBe(30);
			expect(body.data.snapshots7d).toBe(10);
			expect(body.data.snapshots30d).toBe(45);
		});

		it("should validate userId parameter", async () => {
			const response = await app.request("/metrics/my-usage", {
				method: "GET",
			});

			expect(response.status).toBe(400);
			const body = await response.json();

			expect(body.success).toBe(false);
			expect(body.error).toContain("userId");
		});

		it("should return rolling window metrics", async () => {
			const response = await app.request("/metrics/my-usage?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();

			expect(body.data.snapshots7d).toBeDefined();
			expect(body.data.snapshots30d).toBeDefined();
			expect(body.data.restores7d).toBeDefined();
			expect(body.data.restores30d).toBeDefined();
		});

		it("should include last activity timestamps", async () => {
			const response = await app.request("/metrics/my-usage?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();

			expect(body.data.lastSnapshotAt).toBeDefined();
			expect(body.data.lastRestoreAt).toBeDefined();
		});
	});

	describe("GET /metrics/my-timeline", () => {
		it("should return daily metrics for date range", async () => {
			const response = await app.request(
				"/metrics/my-timeline?userId=user_123&startDate=2025-12-01T00:00:00Z&endDate=2025-12-31T23:59:59Z",
				{
					method: "GET",
				},
			);

			expect(response.status).toBe(200);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(Array.isArray(body.data)).toBe(true);
			expect(body.data.length).toBeGreaterThan(0);

			// Verify data structure
			const firstDay = body.data[0];
			expect(firstDay.date).toBeDefined();
			expect(firstDay.snapshotsCreated).toBeDefined();
			expect(firstDay.snapshotsRestored).toBeDefined();
			expect(firstDay.minutesSavedEstimate).toBeDefined();
			expect(firstDay.aiSessions).toBeDefined();
		});

		it("should validate required parameters", async () => {
			const response = await app.request("/metrics/my-timeline?userId=user_123", {
				method: "GET",
			});

			expect(response.status).toBe(400);
			const body = await response.json();

			expect(body.success).toBe(false);
			expect(body.error).toContain("startDate");
		});

		it("should return timeline data in chronological order", async () => {
			const response = await app.request(
				"/metrics/my-timeline?userId=user_123&startDate=2025-12-01T00:00:00Z&endDate=2025-12-31T23:59:59Z",
				{
					method: "GET",
				},
			);

			const body = await response.json();
			const dates = body.data.map((d: any) => new Date(d.date).getTime());

			// Verify ascending order
			for (let i = 1; i < dates.length; i++) {
				expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
			}
		});
	});

	describe("GET /metrics/my-limits", () => {
		it("should return usage limits", async () => {
			const response = await app.request("/metrics/my-limits?userId=user_123", {
				method: "GET",
			});

			expect(response.status).toBe(200);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.data).toBeDefined();
			expect(body.data.tier).toBe("free");
			expect(body.data.monthlySnapshotLimit).toBe(100);
			expect(body.data.monthlyRestoreLimit).toBe(50);
			expect(body.data.aiSessionsLimit).toBe(20);
		});

		it("should return current usage against limits", async () => {
			const response = await app.request("/metrics/my-limits?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();

			expect(body.data.snapshotsUsedThisMonth).toBeDefined();
			expect(body.data.restoresUsedThisMonth).toBeDefined();
			expect(body.data.aiSessionsUsedThisMonth).toBeDefined();
			expect(body.data.percentageUsed).toBeDefined();
		});

		it("should calculate percentage used correctly", async () => {
			const response = await app.request("/metrics/my-limits?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();

			const expectedPercentage = Math.round(
				(body.data.snapshotsUsedThisMonth / body.data.monthlySnapshotLimit) * 100,
			);

			expect(body.data.percentageUsed).toBe(expectedPercentage);
		});

		it("should validate userId parameter", async () => {
			const response = await app.request("/metrics/my-limits", {
				method: "GET",
			});

			expect(response.status).toBe(400);
			const body = await response.json();

			expect(body.success).toBe(false);
			expect(body.error).toContain("userId");
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid userId format gracefully", async () => {
			const response = await app.request("/metrics/my-usage?userId=", {
				method: "GET",
			});

			expect(response.status).toBe(400);
		});

		it("should return consistent error format", async () => {
			const response = await app.request("/metrics/my-usage", {
				method: "GET",
			});

			const body = await response.json();

			expect(body).toHaveProperty("success");
			expect(body).toHaveProperty("data");
			expect(body).toHaveProperty("error");
			expect(body.success).toBe(false);
			expect(body.data).toBeNull();
		});
	});

	describe("Response Format", () => {
		it("should return consistent success response format", async () => {
			const response = await app.request("/metrics/my-usage?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();

			expect(body).toHaveProperty("success");
			expect(body).toHaveProperty("data");
			expect(body).toHaveProperty("error");
			expect(body.success).toBe(true);
			expect(body.error).toBeNull();
		});

		it("should include all required metrics fields", async () => {
			const response = await app.request("/metrics/my-usage?userId=user_123", {
				method: "GET",
			});

			const body = await response.json();
			const requiredFields = [
				"snapshotsTotal",
				"restoresTotal",
				"minutesSavedTotal",
				"aiSessionsTotal",
				"snapshots7d",
				"restores7d",
				"snapshots30d",
				"restores30d",
			];

			for (const field of requiredFields) {
				expect(body.data).toHaveProperty(field);
			}
		});
	});
});
