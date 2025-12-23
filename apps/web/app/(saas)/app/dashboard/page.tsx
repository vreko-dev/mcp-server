import { getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";
import { redirect } from "next/navigation";
import { fetchAIDetectionStats, fetchRecentActivity, fetchUserMetrics } from "@/lib/dashboard/api";
import type { PioneerProgress } from "@/modules/pioneer/hooks/use-pioneer-progress";
import type { Pioneer } from "@/modules/pioneer/lib/actions";
import { getNextTier, getTierForPoints } from "@/modules/pioneer/lib/tiers";
import type { SessionWithUser } from "@/types/session";
import { DashboardClient } from "./components/DashboardClient";

export default async function DashboardPage() {
	// Server-side authentication check
	const session = await getSession();

	if (!(session as SessionWithUser | null)?.user) {
		redirect("/auth/login");
	}

	// TypeScript knows session has user after redirect guard
	const user = (session as unknown as SessionWithUser).user;

	// Server-side data fetching - runs in parallel
	try {
		const [metrics, aiStats, activity, sessionMetrics, pioneerResponse] = await Promise.all([
			fetchUserMetrics(),
			fetchAIDetectionStats(),
			fetchRecentActivity(),
			orpcClient.dashboard.getSessionMetrics().catch(() => undefined),
			orpcClient.pioneer.me().catch(() => null),
		]);

		// Transform pioneer response to PioneerProgress if available
		let pioneerData: PioneerProgress | null = null;
		if (pioneerResponse?.success && pioneerResponse.profile) {
			const profile = pioneerResponse.profile;
			const currentTier = getTierForPoints(profile.totalPoints);
			const nextTierInfo = getNextTier(profile.totalPoints);

			const pioneer: Pioneer = {
				id: profile.id,
				userId: user.id,
				githubUsername: profile.username,
				contactEmail: profile.contactEmail || null,
				tier: currentTier,
				totalPoints: profile.totalPoints,
				referralCode: profile.referralCode,
				createdAt: profile.createdAt,
				lastActivityAt: profile.lastSyncedAt,
			};

			pioneerData = {
				pioneer,
				progress: {
					currentTier,
					nextTier: nextTierInfo.nextTier,
					pointsToNext: nextTierInfo.pointsToNext,
					percentToNext: nextTierInfo.progress,
				},
				completedActions: profile.githubStarred ? ["github_starred"] : [],
				availableActions: [],
			};
		}

		// Pass data to client component as props
		return (
			<DashboardClient
				userName={user.name}
				userEmail={user.email}
				metrics={metrics}
				aiStats={aiStats}
				activity={activity}
				sessionMetrics={sessionMetrics}
				pioneerData={pioneerData}
			/>
		);
	} catch {
		// Return error state - error details available via Next.js error boundaries if needed
		return (
			<div className="p-8" role="alert" aria-live="assertive">
				<h1 className="text-3xl font-bold mb-4">Dashboard</h1>
				<div className="text-destructive">Failed to load dashboard data. Please try refreshing the page.</div>
			</div>
		);
	}
}
