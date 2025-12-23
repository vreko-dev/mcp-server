"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { PioneerProgress } from "../hooks/use-pioneer-progress";
import { getTierEmoji } from "../lib/tiers";
import { TierProgression } from "./tier-progression";

interface PioneerProgressCardProps {
	/** Pioneer progress data from server. If null/undefined, card won't render */
	data?: PioneerProgress | null;
	/** Loading state - shows skeleton when true */
	isLoading?: boolean;
}

export function PioneerProgressCard({ data, isLoading = false }: PioneerProgressCardProps) {
	if (isLoading) {
		return (
			<Card aria-busy="true" aria-label="Loading pioneer progress">
				<CardHeader>
					<Skeleton className="h-6 w-32" aria-hidden="true" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-24 w-full" aria-hidden="true" />
				</CardContent>
			</Card>
		);
	}

	// User not enrolled in Pioneer Program - don't render
	if (!data) {
		return null;
	}

	const { pioneer, progress } = data;

	return (
		<Card
			className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
			role="region"
			aria-label={`Pioneer status: ${pioneer.tier} tier with ${pioneer.totalPoints} points`}
		>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<span className="text-2xl" aria-hidden="true">
						{getTierEmoji(pioneer.tier)}
					</span>
					<span>Pioneer Status</span>
				</CardTitle>
				<Badge status="info" className="capitalize">
					{pioneer.tier}
				</Badge>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Points</span>
						<span className="font-mono font-bold">{pioneer.totalPoints}</span>
					</div>

					<TierProgression
						currentTier={pioneer.tier}
						currentPoints={pioneer.totalPoints}
						nextTier={progress.nextTier}
						pointsToNext={progress.pointsToNext}
						className="mt-0 max-w-full"
					/>

					{progress.nextTier && (
						<p className="text-xs text-muted-foreground" aria-live="polite">
							{progress.pointsToNext} points to {progress.nextTier}
						</p>
					)}

					<Link
						href="/pioneer"
						className="flex items-center gap-1 text-sm text-primary hover:underline"
						aria-label="View all pioneer actions and earn more points"
					>
						View all actions <ArrowRight className="h-3 w-3" aria-hidden="true" />
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
