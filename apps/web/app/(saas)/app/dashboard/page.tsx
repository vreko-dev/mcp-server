import { getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";
import { redirect } from "next/navigation";
import { fetchAIDetectionStats, fetchRecentActivity, fetchUserMetrics } from "@/lib/dashboard/api";
import { DashboardClient } from "./components/DashboardClient";

export default async function DashboardPage() {
	// Server-side authentication check
	const session = await getSession();

	if (!(session as any)?.user) {
		redirect("/auth/login");
	}

	const user = (session as any).user;

	// Server-side data fetching - runs in parallel
	try {
		const [metrics, aiStats, activity, sessionMetrics] = await Promise.all([
			fetchUserMetrics(),
			fetchAIDetectionStats(),
			fetchRecentActivity(),
			orpcClient.dashboard.getSessionMetrics().catch(() => undefined),
		]);

		// Pass data to client component as props
		return (
			<DashboardClient
				userName={user.name}
				userEmail={user.email}
				metrics={metrics}
				aiStats={aiStats}
				activity={activity}
				sessionMetrics={sessionMetrics}
			/>
		);
	} catch (error) {
		console.error("Dashboard data fetch failed", {
			userId: user.id,
			error: error instanceof Error ? error.message : String(error),
		});

		// Return error state
		return (
			<div className="p-8">
				<h1 className="text-3xl font-bold mb-4">Dashboard</h1>
				<div className="text-destructive">Failed to load dashboard data. Please try refreshing the page.</div>
			</div>
		);
	}
}
