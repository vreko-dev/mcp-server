"use client";

import { OAuthCallbackHandler } from "@saas/auth/components/OAuthCallbackHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type {
	Activity,
	AIDetectionStat,
	DashboardMetrics,
	SessionMetrics,
} from "@/lib/dashboard/metrics";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";
import { AIDetectionStats } from "@/modules/saas/dashboard/components/AIDetectionStats";
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";
import { WaitlistPositionTile } from "@/modules/saas/dashboard/components/WaitlistPositionTile";

interface DashboardClientProps {
	userName: string | null | undefined;
	userEmail: string | null | undefined;
	metrics: DashboardMetrics;
	aiStats: AIDetectionStat[];
	activity: Activity[];
	sessionMetrics?: SessionMetrics;
}

export function DashboardClient({
	userName,
	userEmail,
	metrics,
	aiStats,
	activity,
	sessionMetrics,
}: DashboardClientProps) {
	return (
		<div className="p-8 space-y-8">
			{/* OAuth Callback Validation - handles errors and session validation after OAuth redirect */}
			<OAuthCallbackHandler />

			<div className="mb-8">
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground mt-2">
					Welcome back, {userName || userEmail}
				</p>
			</div>

			{/* Waitlist Position (if user is on waitlist) */}
			<ErrorBoundary>
				<WaitlistPositionTile />
			</ErrorBoundary>

			{/* Metrics Grid */}
			<MetricsGrid
				snapshotCount={metrics.snapshotCount}
				recoveryCount={metrics.recoveryCount}
				filesProtected={metrics.filesProtected}
				aiDetectionRate={metrics.aiDetectionRate}
				{...(sessionMetrics || {})}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* AI Detection Stats */}
				<ErrorBoundary>
					<AIDetectionStats stats={aiStats} />
				</ErrorBoundary>

				{/* Recent Activity */}
				<ErrorBoundary>
					<ActivityFeed activities={activity} />
				</ErrorBoundary>
			</div>
		</div>
	);
}
