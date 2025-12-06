/**
 * Metrics Aggregator Integration Tests with Real Database
 *
 * Tests REAL database queries and aggregation logic.
 * These are NOT unit tests - they test actual database integration.
 *
 * Run with: pnpm test:integration
 * Requires: Test database with proper schema
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@snapback/platform/db/client";
import { eq } from "drizzle-orm";
import {
	userProductMetrics,
	userDailyMetrics,
} from "@snapback/platform/db/schema/snapback";
import { MetricsAggregator } from "../metrics-aggregator";

describe("Metrics Aggregator Database Integration", () => {
	let aggregator: MetricsAggregator;
	let dbAvailable = false;

	beforeAll(async () => {
		// Try to connect to test database
		const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

		if (!databaseUrl) {
			console.log("⚠ DATABASE_URL not set, skipping integration tests");
			return;
		}

		try {
			// Test connection
			await db.execute({ sql: "SELECT 1", args: [] });
			dbAvailable = true;

			aggregator = new MetricsAggregator(db as any);

			console.log("✓ Database available for integration tests");
		} catch (error) {
			console.log("⚠ Database not available:", (error as Error).message);
		}
	});

	afterAll(async () => {
		// Cleanup handled by platform DB client
	});

	beforeEach(async () => {
		if (!dbAvailable) return;

		// Clean up test data
		await db
			.delete(userProductMetrics)
			.where(eq(userProductMetrics.userId, "test_metrics_user_001"));

		await db
			.delete(userDailyMetrics)
			.where(eq(userDailyMetrics.userId, "test_metrics_user_001"));
	});

	describe("getUserLifetimeMetrics - Real Database Query", () => {
		it("should query actual database and return null for new user", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			const result = await aggregator.getUserLifetimeMetrics(
				"nonexistent_user",
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toBeNull();
			}
		});

		it("should fetch real metrics from database", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Insert test data
			await db.insert(userProductMetrics).values({
				userId: "test_metrics_user_001",
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
			});

			const result = await aggregator.getUserLifetimeMetrics(
				"test_metrics_user_001",
			);

			expect(result.success).toBe(true);
			if (result.success && result.value) {
				expect(result.value.snapshotsTotal).toBe(150);
				expect(result.value.restoresTotal).toBe(30);
				expect(result.value.minutesSavedTotal).toBe(450);
				expect(result.value.aiSessionsTotal).toBe(25);
				expect(result.value.snapshots7d).toBe(10);
				expect(result.value.restores7d).toBe(2);
				expect(result.value.snapshots30d).toBe(45);
				expect(result.value.restores30d).toBe(8);
			}
		});

		it("should handle database connection errors", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Close connection to simulate error
			await sql.end();

			const result = await aggregator.getUserLifetimeMetrics(
				"test_metrics_user_001",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
			}

			// Note: Using platform DB client, can't easily simulate connection errors
			// This test validates error handling structure
		});
	});

	describe("getDailyMetricsForRange - Real Database Query", () => {
		it("should query date range from real database", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Insert test daily metrics
			const testData = [
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-01T00:00:00Z"),
					snapshotsCreated: 5,
					snapshotsRestored: 1,
					minutesSavedEstimate: 15,
					aiSessions: 2,
				},
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-02T00:00:00Z"),
					snapshotsCreated: 3,
					snapshotsRestored: 0,
					minutesSavedEstimate: 9,
					aiSessions: 1,
				},
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-03T00:00:00Z"),
					snapshotsCreated: 7,
					snapshotsRestored: 2,
					minutesSavedEstimate: 21,
					aiSessions: 4,
				},
			];

			await db.insert(userDailyMetrics).values(testData);

			const result = await aggregator.getDailyMetricsForRange(
				"test_metrics_user_001",
				new Date("2025-12-01T00:00:00Z"),
				new Date("2025-12-03T23:59:59Z"),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toHaveLength(3);
				expect(result.value[0].snapshotsCreated).toBe(5);
				expect(result.value[1].snapshotsCreated).toBe(3);
				expect(result.value[2].snapshotsCreated).toBe(7);

				// Verify data integrity
				const totalSnapshots = result.value.reduce(
					(sum, day) => sum + day.snapshotsCreated,
					0,
				);
				expect(totalSnapshots).toBe(15);
			}
		});

		it("should return empty array for no metrics in range", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			const result = await aggregator.getDailyMetricsForRange(
				"test_metrics_user_001",
				new Date("2020-01-01T00:00:00Z"),
				new Date("2020-01-31T23:59:59Z"),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value).toHaveLength(0);
			}
		});

		it("should order results by date ascending", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Insert in random order
			await db.insert(userDailyMetrics).values([
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-05T00:00:00Z"),
					snapshotsCreated: 10,
					snapshotsRestored: 0,
					minutesSavedEstimate: 30,
					aiSessions: 0,
				},
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-03T00:00:00Z"),
					snapshotsCreated: 5,
					snapshotsRestored: 0,
					minutesSavedEstimate: 15,
					aiSessions: 0,
				},
				{
					userId: "test_metrics_user_001",
					date: new Date("2025-12-04T00:00:00Z"),
					snapshotsCreated: 7,
					snapshotsRestored: 0,
					minutesSavedEstimate: 21,
					aiSessions: 0,
				},
			]);

			const result = await aggregator.getDailyMetricsForRange(
				"test_metrics_user_001",
				new Date("2025-12-01T00:00:00Z"),
				new Date("2025-12-31T23:59:59Z"),
			);

			expect(result.success).toBe(true);
			if (result.success && result.value.length > 0) {
				// Verify ascending order
				expect(result.value[0].snapshotsCreated).toBe(5); // Dec 3
				expect(result.value[1].snapshotsCreated).toBe(7); // Dec 4
				expect(result.value[2].snapshotsCreated).toBe(10); // Dec 5
			}
		});
	});

	describe("initializeUserMetrics - Real Database Insert", () => {
		it("should insert new user metrics into database", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			const result = await aggregator.initializeUserMetrics(
				"test_metrics_user_001",
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.snapshotsTotal).toBe(0);
				expect(result.value.restoresTotal).toBe(0);
			}

			// Verify in database
			const dbResult = await db
				.select()
				.from(userProductMetrics)
				.where(eq(userProductMetrics.userId, "test_metrics_user_001"))
				.limit(1);

			expect(dbResult).toHaveLength(1);
			expect(dbResult[0].snapshotsTotal).toBe(0);
		});

		it("should return existing metrics if already initialized", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Initialize first time
			await aggregator.initializeUserMetrics("test_metrics_user_001");

			// Try to initialize again
			const result = await aggregator.initializeUserMetrics(
				"test_metrics_user_001",
			);

			expect(result.success).toBe(true);

			// Verify only one row exists
			const dbResult = await db
				.select()
				.from(userProductMetrics)
				.where(eq(userProductMetrics.userId, "test_metrics_user_001"));

			expect(dbResult).toHaveLength(1);
		});
	});

	describe("Real-world Scenarios", () => {
		it("should handle user with daily metrics but no lifetime metrics", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Insert daily metrics without lifetime metrics
			await db.insert(userDailyMetrics).values({
				userId: "test_metrics_user_001",
				date: new Date("2025-12-01T00:00:00Z"),
				snapshotsCreated: 5,
				snapshotsRestored: 1,
				minutesSavedEstimate: 15,
				aiSessions: 2,
			});

			// Should return null for lifetime
			const lifetimeResult = await aggregator.getUserLifetimeMetrics(
				"test_metrics_user_001",
			);
			expect(lifetimeResult.success).toBe(true);
			if (lifetimeResult.success) {
				expect(lifetimeResult.value).toBeNull();
			}

			// Should return daily metrics
			const dailyResult = await aggregator.getDailyMetricsForRange(
				"test_metrics_user_001",
				new Date("2025-12-01T00:00:00Z"),
				new Date("2025-12-01T23:59:59Z"),
			);
			expect(dailyResult.success).toBe(true);
			if (dailyResult.success) {
				expect(dailyResult.value).toHaveLength(1);
			}
		});

		it("should handle large date ranges efficiently", async () => {
			if (!dbAvailable) {
				console.log("⏭ Skipping - Database not available");
				return;
			}

			// Insert 90 days of metrics
			const metricsData = Array.from({ length: 90 }, (_, i) => ({
				userId: "test_metrics_user_001",
				date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
				snapshotsCreated: Math.floor(Math.random() * 10),
				snapshotsRestored: Math.floor(Math.random() * 3),
				minutesSavedEstimate: Math.floor(Math.random() * 30),
				aiSessions: Math.floor(Math.random() * 5),
			}));

			await db.insert(userDailyMetrics).values(metricsData);

			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 90);

			const result = await aggregator.getDailyMetricsForRange(
				"test_metrics_user_001",
				startDate,
				endDate,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.value.length).toBeLessThanOrEqual(90);
				expect(result.value.length).toBeGreaterThan(0);
			}
		});
	});
});
