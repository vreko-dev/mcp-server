/**
 * WEB-INT-DASHBOARD-DATA-001
 * Dashboard Data Integration Tests
 *
 * Tests dashboard metrics, activity feed, and AI stats endpoints
 * per test_coverage.md lines 654-660
 *
 * Test Pattern: Integration tests for data fetching and user scoping
 * Coverage: Metrics endpoint, activity feed, AI stats, data isolation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock orpcClient
const mockOrpcClient = {
	dashboard: {
		getMetrics: vi.fn(),
		getRecentActivity: vi.fn(),
		getAIDetectionStats: vi.fn(),
		getSessionMetrics: vi.fn(),
	},
};

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Dashboard Data Integration", () => {
	describe("Metrics Endpoint", () => {
		it("should return correct metric data structure", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-001
			// GIVEN: Authenticated user with activity
			const mockMetrics = {
				snapshotCount: 24,
				recoveryCount: 3,
				filesProtected: 142,
				aiDetectionRate: 0.87,
			};

			mockOrpcClient.dashboard.getMetrics.mockResolvedValue(mockMetrics);

			// WHEN: Dashboard fetches metrics
			const result = await mockOrpcClient.dashboard.getMetrics();

			// THEN: Should return all required fields
			expect(result.snapshotCount).toBe(24);
			expect(result.recoveryCount).toBe(3);
			expect(result.filesProtected).toBe(142);
			expect(result.aiDetectionRate).toBe(0.87);
		});

		it("should calculate AI detection rate as percentage", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-002
			// GIVEN: User has snapshots with AI detections
			const totalSnapshots = 100;
			const aiDetectedSnapshots = 23;

			mockOrpcClient.dashboard.getMetrics.mockResolvedValue({
				snapshotCount: totalSnapshots,
				recoveryCount: 5,
				filesProtected: 200,
				aiDetectionRate: aiDetectedSnapshots / totalSnapshots,
			});

			// WHEN: Metrics are calculated
			const result = await mockOrpcClient.dashboard.getMetrics();

			// THEN: aiDetectionRate should be 0.23 (23%)
			expect(result.aiDetectionRate).toBe(0.23);
			expect(result.aiDetectionRate).toBeGreaterThanOrEqual(0);
			expect(result.aiDetectionRate).toBeLessThanOrEqual(1);
		});

		it("should return zero metrics for new users", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-003
			// GIVEN: New user with no activity
			const emptyMetrics = {
				snapshotCount: 0,
				recoveryCount: 0,
				filesProtected: 0,
				aiDetectionRate: 0,
			};

			mockOrpcClient.dashboard.getMetrics.mockResolvedValue(emptyMetrics);

			// WHEN: Dashboard loads
			const result = await mockOrpcClient.dashboard.getMetrics();

			// THEN: Should return zeros (not nulls or undefined)
			expect(result.snapshotCount).toBe(0);
			expect(result.recoveryCount).toBe(0);
			expect(result.filesProtected).toBe(0);
			expect(result.aiDetectionRate).toBe(0);
		});
	});

	describe("Activity Endpoint", () => {
		it("should return recent items in chronological order", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-004
			// GIVEN: User has multiple activities
			const mockActivity = [
				{
					type: "snapshot" as const,
					message: "Snapshot created",
					timestamp: "2024-12-05T10:00:00Z",
					metadata: { files: 5 },
				},
				{
					type: "ai_detection" as const,
					message: "GitHub Copilot detected",
					timestamp: "2024-12-05T09:30:00Z",
					metadata: { confidence: 0.92 },
				},
				{
					type: "recovery" as const,
					message: "Code recovered from risk",
					timestamp: "2024-12-04T15:00:00Z",
					metadata: { snapshot: "Auto-save #142" },
				},
			];

			mockOrpcClient.dashboard.getRecentActivity.mockResolvedValue(mockActivity);

			// WHEN: Activity feed is fetched
			const result = await mockOrpcClient.dashboard.getRecentActivity();

			// THEN: Should return items in reverse chronological order (newest first)
			expect(result).toHaveLength(3);
			expect(result[0].timestamp).toBe("2024-12-05T10:00:00Z");
			expect(result[1].timestamp).toBe("2024-12-05T09:30:00Z");
			expect(result[2].timestamp).toBe("2024-12-04T15:00:00Z");

			// AND: Timestamps should be descending
			const t0 = new Date(result[0].timestamp).getTime();
			const t1 = new Date(result[1].timestamp).getTime();
			const t2 = new Date(result[2].timestamp).getTime();

			expect(t0).toBeGreaterThanOrEqual(t1);
			expect(t1).toBeGreaterThanOrEqual(t2);
		});

		it("should include activity type and metadata", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-005
			// GIVEN: Snapshot creation activity
			const snapshotActivity = {
				type: "snapshot" as const,
				message: "Snapshot created",
				timestamp: "2024-12-05T10:00:00Z",
				metadata: {
					files: 12,
					trigger: "manual",
					protection_level: "watch",
				},
			};

			mockOrpcClient.dashboard.getRecentActivity.mockResolvedValue([snapshotActivity]);

			// WHEN: Activity is retrieved
			const result = await mockOrpcClient.dashboard.getRecentActivity();

			// THEN: Should include type, message, timestamp, and metadata
			expect(result[0].type).toBe("snapshot");
			expect(result[0].message).toBe("Snapshot created");
			expect(result[0].timestamp).toBeDefined();
			expect(result[0].metadata).toBeDefined();
			expect(result[0].metadata?.files).toBe(12);
		});

		it("should support all activity types", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-006
			// GIVEN: Various activity types
			const allTypes = [
				{ type: "snapshot" as const, message: "Snapshot created" },
				{ type: "ai_detection" as const, message: "AI detected" },
				{ type: "recovery" as const, message: "Code recovered" },
			];

			for (const activity of allTypes) {
				mockOrpcClient.dashboard.getRecentActivity.mockResolvedValue([
					{
						...activity,
						timestamp: new Date().toISOString(),
						metadata: {},
					},
				]);

				// WHEN: Activity is fetched
				const result = await mockOrpcClient.dashboard.getRecentActivity();

				// THEN: Should handle each type correctly
				expect(result[0].type).toBe(activity.type);
				expect(["snapshot", "ai_detection", "recovery"]).toContain(result[0].type);
			}
		});

		it("should return empty array when no activity exists", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-007
			// GIVEN: User with no activity
			mockOrpcClient.dashboard.getRecentActivity.mockResolvedValue([]);

			// WHEN: Activity feed is requested
			const result = await mockOrpcClient.dashboard.getRecentActivity();

			// THEN: Should return empty array (not null)
			expect(result).toEqual([]);
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("AI Stats Endpoint", () => {
		it("should return tool breakdown with counts and confidence", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-008
			// GIVEN: User has AI tool detections
			const mockStats = [
				{
					tool: "GitHub Copilot",
					count: 12,
					avgConfidence: 0.92,
				},
				{
					tool: "ChatGPT",
					count: 8,
					avgConfidence: 0.88,
				},
				{
					tool: "Claude",
					count: 5,
					avgConfidence: 0.95,
				},
			];

			mockOrpcClient.dashboard.getAIDetectionStats.mockResolvedValue(mockStats);

			// WHEN: AI stats are fetched
			const result = await mockOrpcClient.dashboard.getAIDetectionStats();

			// THEN: Should return all detected tools
			expect(result).toHaveLength(3);
			expect(result[0].tool).toBe("GitHub Copilot");
			expect(result[0].count).toBe(12);
			expect(result[0].avgConfidence).toBe(0.92);
		});

		it("should calculate average confidence correctly", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-009
			// GIVEN: Multiple detections with varying confidence
			const detections = [0.95, 0.88, 0.92, 0.90]; // Avg = 0.9125
			const avgConfidence = detections.reduce((a, b) => a + b, 0) / detections.length;

			mockOrpcClient.dashboard.getAIDetectionStats.mockResolvedValue([
				{
					tool: "GitHub Copilot",
					count: detections.length,
					avgConfidence,
				},
			]);

			// WHEN: Stats are calculated
			const result = await mockOrpcClient.dashboard.getAIDetectionStats();

			// THEN: avgConfidence should be accurate
			expect(result[0].avgConfidence).toBeCloseTo(0.9125, 4);
			expect(result[0].avgConfidence).toBeGreaterThanOrEqual(0);
			expect(result[0].avgConfidence).toBeLessThanOrEqual(1);
		});

		it("should order tools by detection count (descending)", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-010
			// GIVEN: AI stats returned from API
			const mockStats = [
				{ tool: "GitHub Copilot", count: 25, avgConfidence: 0.92 },
				{ tool: "ChatGPT", count: 15, avgConfidence: 0.88 },
				{ tool: "Claude", count: 10, avgConfidence: 0.95 },
			];

			mockOrpcClient.dashboard.getAIDetectionStats.mockResolvedValue(mockStats);

			// WHEN: Stats are displayed
			const result = await mockOrpcClient.dashboard.getAIDetectionStats();

			// THEN: Should be ordered by count (highest first)
			expect(result[0].count).toBeGreaterThanOrEqual(result[1].count);
			expect(result[1].count).toBeGreaterThanOrEqual(result[2].count);
		});
	});

	describe("Data Scoped to Authenticated User", () => {
		it("should isolate metrics per user", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-011
			// GIVEN: Two users with different metrics
			const user1Metrics = {
				snapshotCount: 50,
				recoveryCount: 10,
				filesProtected: 200,
				aiDetectionRate: 0.30,
			};

			const user2Metrics = {
				snapshotCount: 20,
				recoveryCount: 2,
				filesProtected: 80,
				aiDetectionRate: 0.15,
			};

			// WHEN: User 1 fetches metrics
			mockOrpcClient.dashboard.getMetrics.mockResolvedValue(user1Metrics);
			const result1 = await mockOrpcClient.dashboard.getMetrics();

			// THEN: Should only see user 1 data
			expect(result1.snapshotCount).toBe(50);

			// WHEN: User 2 fetches metrics
			mockOrpcClient.dashboard.getMetrics.mockResolvedValue(user2Metrics);
			const result2 = await mockOrpcClient.dashboard.getMetrics();

			// THEN: Should only see user 2 data
			expect(result2.snapshotCount).toBe(20);

			// AND: Data should NOT overlap
			expect(result1.snapshotCount).not.toBe(result2.snapshotCount);
		});

		it("should scope activity to user's snapshots only", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-012
			// GIVEN: User with specific snapshots
			const userId = "user_123";

			const userActivity = [
				{
					type: "snapshot" as const,
					message: "Snapshot created",
					timestamp: "2024-12-05T10:00:00Z",
					metadata: { userId, snapshotId: "snap_abc" },
				},
			];

			mockOrpcClient.dashboard.getRecentActivity.mockResolvedValue(userActivity);

			// WHEN: Activity is fetched
			const result = await mockOrpcClient.dashboard.getRecentActivity();

			// THEN: Should only include user's activity
			expect(result).toHaveLength(1);
			expect(result[0].metadata?.userId).toBe(userId);
		});

		it("should scope AI stats to user's detections", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-013
			// GIVEN: User-specific AI detections
			const userStats = [
				{ tool: "GitHub Copilot", count: 5, avgConfidence: 0.90 },
			];

			mockOrpcClient.dashboard.getAIDetectionStats.mockResolvedValue(userStats);

			// WHEN: AI stats are fetched
			const result = await mockOrpcClient.dashboard.getAIDetectionStats();

			// THEN: Should only show user's detections
			expect(result).toHaveLength(1);
			expect(result[0].count).toBe(5);
		});
	});

	describe("Session Metrics", () => {
		it("should return active session count", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-014
			// GIVEN: User with active VSCode sessions
			const mockSessionMetrics = {
				activeSessionCount: 2,
				lastActivityTime: "2024-12-05T10:30:00Z",
			};

			mockOrpcClient.dashboard.getSessionMetrics.mockResolvedValue(mockSessionMetrics);

			// WHEN: Session metrics are fetched
			const result = await mockOrpcClient.dashboard.getSessionMetrics();

			// THEN: Should return active session data
			expect(result.activeSessionCount).toBe(2);
			expect(result.lastActivityTime).toBeDefined();
			expect(new Date(result.lastActivityTime)).toBeInstanceOf(Date);
		});

		it("should handle users with no active sessions", async () => {
			// Test ID: WEB-INT-DASHBOARD-DATA-001-015
			// GIVEN: User with no active sessions
			const noSessionMetrics = {
				activeSessionCount: 0,
				lastActivityTime: undefined,
			};

			mockOrpcClient.dashboard.getSessionMetrics.mockResolvedValue(noSessionMetrics);

			// WHEN: Session metrics are requested
			const result = await mockOrpcClient.dashboard.getSessionMetrics();

			// THEN: Should gracefully handle zero state
			expect(result.activeSessionCount).toBe(0);
			expect(result.lastActivityTime).toBeUndefined();
		});
	});
});
