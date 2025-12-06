"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import { orpcClient } from "@/modules/shared/lib/orpc-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/ui/components/card";
import { Skeleton } from "@/modules/ui/components/skeleton";

export function WaitlistPositionTile() {
	const sessionContext = useSession();
	const userEmail = sessionContext.user?.email;

	const { data, isLoading, error } = useQuery({
		queryKey: ["waitlist-position", userEmail],
		queryFn: async () => {
			if (!userEmail) return null;
			return orpcClient.waitlist.getPosition({ email: userEmail });
		},
		enabled: !!userEmail,
		staleTime: 60 * 1000, // Cache for 1 minute
	});

	const { data: referralsData } = useQuery({
		queryKey: ["waitlist-referrals", userEmail],
		queryFn: async () => {
			if (!userEmail) return null;
			return orpcClient.waitlist.getReferrals({ email: userEmail });
		},
		enabled: !!userEmail,
		staleTime: 60 * 1000,
	});

	if (!userEmail || error) {
		return null;
	}

	if (isLoading) {
		return <WaitlistPositionTile.Skeleton />;
	}

	if (!data?.position) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Waitlist Position</CardTitle>
				<CardDescription>Your queue position for early access</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="flex items-baseline gap-2">
						<span className="text-4xl font-bold text-snapback-green">#{data.position}</span>
						<span className="text-sm text-muted-foreground">{data.fromCache && "(cached)"}</span>
					</div>

					{data.status && (
						<div className="text-sm">
							Status:{" "}
							<span
								className={
									data.status === "invited"
										? "text-green-500"
										: data.status === "pending"
											? "text-yellow-500"
											: "text-gray-500"
								}
							>
								{data.status.toUpperCase()}
							</span>
						</div>
					)}

					{referralsData && referralsData.count > 0 && (
						<div className="pt-4 border-t">
							<div className="text-sm text-muted-foreground">Referrals</div>
							<div className="text-2xl font-semibold">{referralsData.count}</div>
							<div className="text-xs text-muted-foreground">
								{referralsData.totalPoints} points earned
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

WaitlistPositionTile.Skeleton = function WaitlistPositionTileSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Waitlist Position</CardTitle>
				<CardDescription>Your queue position for early access</CardDescription>
			</CardHeader>
			<CardContent>
				<Skeleton className="h-12 w-24" />
			</CardContent>
		</Card>
	);
};
