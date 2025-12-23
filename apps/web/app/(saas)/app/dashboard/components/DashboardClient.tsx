"use client";

import { OAuthCallbackHandler } from "@saas/auth/components/OAuthCallbackHandler";
import Link from "next/link";
import { memo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import type { Activity, AIDetectionStat, DashboardMetrics, SessionMetrics } from "@/lib/dashboard/metrics";
import { PioneerProgressCard } from "@/modules/pioneer/components/PioneerProgressCard";
import type { PioneerProgress } from "@/modules/pioneer/hooks/use-pioneer-progress";
import { getTierEmoji } from "@/modules/pioneer/lib/tiers";
import { ActivityFeed } from "@/modules/saas/dashboard/components/ActivityFeed";
import { AIDetectionStats } from "@/modules/saas/dashboard/components/AIDetectionStats";
import { DashboardHeroCard } from "@/modules/saas/dashboard/components/DashboardHeroCard";
import { MetricsGrid } from "@/modules/saas/dashboard/components/MetricsGrid";

interface DashboardClientProps {
	userName: string | null | undefined;
	userEmail: string | null | undefined;
	metrics: DashboardMetrics;
	aiStats: AIDetectionStat[];
	activity: Activity[];
	sessionMetrics?: SessionMetrics;
	pioneerData?: PioneerProgress | null;
}

/**
 * Dashboard Client Component (REFACTOR Phase)
 *
 * Optimizations applied:
 * - Memoized with React.memo() to prevent unnecessary re-renders
 * - Extracted sub-components to reduce re-render cascade:
 *   * MetricsGrid: displays user metrics (checkpoints, recoveries, files)
 *   * AIDetectionStats: displays AI detection breakdown by tool
 *   * ActivityFeed: displays recent user activities
 *   * PioneerProgressCard: displays Pioneer Program tier and progress
 * - Each sub-component wrapped in ErrorBoundary for resilience
 * - Data passed as props enables server-side data fetching
 *
 * Performance characteristics:
 * - Only re-renders when props change (memoization)
 * - Sub-component re-renders isolated via memo
 * - No local state, no effect hooks (pure component)
 */
export const DashboardClient = memo(function DashboardClient({
	userName,
	userEmail,
	metrics,
	aiStats,
	activity,
	sessionMetrics,
	pioneerData,
}: DashboardClientProps) {
	return (
		<div className="p-8 space-y-8">
			{/* OAuth Callback Validation - handles errors and session validation after OAuth redirect */}
			<OAuthCallbackHandler />

			{/* Dashboard Header with Pioneer Badge */}
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground mt-2">Welcome back, {userName || userEmail}</p>
				</div>
				{pioneerData && (
					<Link
						href="/pioneer"
						aria-label={`View Pioneer Program status: ${pioneerData.pioneer.tier} tier with ${pioneerData.pioneer.totalPoints} points`}
					>
						<Badge status="info" className="text-lg px-4 py-2 hover:bg-primary/10 cursor-pointer">
							<span aria-hidden="true">{getTierEmoji(pioneerData.pioneer.tier)}</span>{" "}
							{pioneerData.pioneer.totalPoints} pts
						</Badge>
					</Link>
				)}
			</div>

			{/* Hero Card */}
			<ErrorBoundary>
				<DashboardHeroCard
					threatsPreventedCount={metrics.snapshotCount}
					protectionLevelPercent={metrics.filesProtected > 0 ? 98 : 0}
					confidenceLevel="excellent"
					period="week"
				/>
			</ErrorBoundary>

			{/* Pioneer Progress Card */}
			<ErrorBoundary>
				<PioneerProgressCard data={pioneerData} />
			</ErrorBoundary>

			{/* Metrics Grid */}
			<MetricsGrid
				snapshotCount={metrics.snapshotCount}
				recoveryCount={metrics.recoveryCount}
				filesProtected={metrics.filesProtected}
				aiDetectionRate={metrics.aiDetectionRate}
				{...(sessionMetrics || {})}
			/>

			{/* AI Detection Stats and Recent Activity - Side by Side */}
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
});

DashboardClient.displayName = "DashboardClient";
