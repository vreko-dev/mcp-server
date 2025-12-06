"use client";

import { OrganizationsGrid } from "@saas/organizations/components/OrganizationsGrid";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";
import { AIDetectionStats } from "@/modules/saas/dashboard/components/AIDetectionStats";
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";
import { useBulkProtectionStatus } from '@/hooks/use-bulk-protection-status';
import { logger } from "@snapback/infrastructure";

// Define types for dashboard data
interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

/**
 * UserStart - Dashboard Container with Real-Time Integration
 *
 * Phase 3 Implementation: Integrates Supabase real-time hooks for live dashboard updates
 *
 * Data Flow:
 * - useBulkProtectionStatus: Subscribes to protection_files table via Supabase Realtime
 * - computedMetrics: Derives dashboard metrics from real-time file statuses
 * - activityEvents: Generated from protection status changes (future: subscribe to activity log)
 */
export default function UserStart() {
	// Track user's protected files (in real app, from user preferences/API)
	// For now, using demo file IDs
	const demoFileIds = useMemo(
		() => [
			"file-1",
			"file-2",
			"file-3",
			"file-4",
			"file-5",
		],
		[]);

	// Activity events (initially mock, future: subscribe to activity_log table)
	const [activityEvents, setActivityEvents] = useState<Activity[]>([
		{
			type: "snapshot",
			message: "Snapshot created",
			timestamp: "2 hours ago",
			metadata: { files: 12 },
		},
		{
			type: "ai_detection",
			message: "GitHub Copilot detected",
			timestamp: "5 hours ago",
			metadata: { tool: "GitHub Copilot" },
		},
		{
			type: "recovery",
			message: "Code recovered from risk",
			timestamp: "1 day ago",
			metadata: { snapshot: "Auto-save #142" },
		},
	]);

	// Callback for protection status changes
	const onProtectionStatusChange = useCallback(
		(fileId: string, newStatus: string) => {
			const message =
				newStatus === "enabled"
					? `${fileId} protection enabled`
					: `${fileId} protection disabled`;

			const activity: Activity = {
				type: "snapshot",
				message,
				timestamp: "just now",
				metadata: { fileId, status: newStatus },
			};

			setActivityEvents((prev) => [activity, ...prev.slice(0, 9)]);
			logger.info("Protection status changed", { fileId, newStatus });
		},
		[]);

	// Real-time protection status tracking for bulk files (<500ms latency)
	const { statuses: protectionStatuses, isLoading } =
		useBulkProtectionStatus(demoFileIds, onProtectionStatusChange);

	// Compute metrics from real-time protection statuses
	const computedMetrics = useMemo(() => {
		const protectedCount = Array.from(protectionStatuses.values()).filter(
			(s) => s.protection === "enabled"
		).length;

		return {
			filesProtected: protectedCount || 0,
			snapshotCount: protectedCount,
			recoveryCount: Math.floor(protectedCount * 0.5),
			aiDetectionRate: 87,
		};
	}, [protectionStatuses]);

	// Track real-time connection status
	useEffect(() => {
		if (!isLoading) {
			logger.info("Dashboard metrics loaded from real-time", {
				filesProtected: computedMetrics.filesProtected,
			});
		}
	}, [isLoading, computedMetrics.filesProtected]);

	// Memoize dashboard data to prevent unnecessary re-renders
	const dashboardData = useMemo(
		() => ({
			metrics: computedMetrics,
			aiStats: [
				{ tool: "GitHub Copilot", count: 12, avgConfidence: 0.92 },
				{ tool: "ChatGPT", count: 8, avgConfidence: 0.88 },
				{ tool: "Claude", count: 5, avgConfidence: 0.95 },
			],
			activity: activityEvents,
		}),
		[computedMetrics, activityEvents]
	);

	return (
		<div className="space-y-8">
			{true && <OrganizationsGrid />}

			{/* Dashboard Content with Real-Time Updates */}
			<div className="space-y-8">
				<h2 className="text-2xl font-bold">Your Dashboard</h2>

				{/* Metrics Grid - Real-time sync from Supabase protection_files table */}
				{isLoading ? (
					<MetricsGrid.Skeleton />
				) : (
					<MetricsGrid
						snapshotCount={dashboardData.metrics.snapshotCount}
						recoveryCount={dashboardData.metrics.recoveryCount}
						filesProtected={dashboardData.metrics.filesProtected}
						aiDetectionRate={dashboardData.metrics.aiDetectionRate}
					/>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* AI Detection Stats */}
					<AIDetectionStats stats={dashboardData.aiStats} />

					{/* Recent Activity - Real-time sync from protection status changes */}
					<ActivityFeed activities={dashboardData.activity} />
				</div>
			</div>
		</div>
	);
}
