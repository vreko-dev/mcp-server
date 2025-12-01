"use client";

import { OrganizationsGrid } from "@saas/organizations/components/OrganizationsGrid";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";
import { AIDetectionStats } from "@/modules/saas/dashboard/components/AIDetectionStats";
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";

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

export default function UserStart() {
	const [dashboardData, setDashboardData] = useState({
		metrics: {
			snapshotCount: 0,
			recoveryCount: 0,
			filesProtected: 0,
			aiDetectionRate: 0,
		},
		aiStats: [] as AIDetectionStat[],
		activity: [] as Activity[],
	});

	useEffect(() => {
		// Use mock data to demonstrate the UI
		setDashboardData({
			metrics: {
				snapshotCount: 24,
				recoveryCount: 3,
				filesProtected: 142,
				aiDetectionRate: 87,
			},
			aiStats: [
				{ tool: "GitHub Copilot", count: 12, avgConfidence: 0.92 },
				{ tool: "ChatGPT", count: 8, avgConfidence: 0.88 },
				{ tool: "Claude", count: 5, avgConfidence: 0.95 },
			],
			activity: [
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
					metadata: { confidence: 0.92 },
				},
				{
					type: "recovery",
					message: "Code recovered from risk",
					timestamp: "1 day ago",
					metadata: { snapshot: "Auto-save #142" },
				},
			],
		});
	}, []);

	return (
		<div className="space-y-8">
			{true && <OrganizationsGrid />}

			{/* Dashboard Content */}
			<div className="space-y-8">
				<h2 className="text-2xl font-bold">Your Dashboard</h2>

				{/* Metrics Grid */}
				<MetricsGrid
					snapshotCount={dashboardData.metrics.snapshotCount}
					recoveryCount={dashboardData.metrics.recoveryCount}
					filesProtected={dashboardData.metrics.filesProtected}
					aiDetectionRate={dashboardData.metrics.aiDetectionRate}
				/>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* AI Detection Stats */}
					<AIDetectionStats stats={dashboardData.aiStats} />

					{/* Recent Activity */}
					<ActivityFeed activities={dashboardData.activity} />
				</div>
			</div>
		</div>
	);
}
