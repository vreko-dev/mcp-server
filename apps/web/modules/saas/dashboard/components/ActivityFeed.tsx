"use client";

import { cn } from "@marketing/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Activity as ActivityIcon, Bot, Camera, RotateCcw } from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import type { AppError } from "@/lib/error-handler";
import { AnalyticsEvents } from "../../../analytics";

interface Activity {
	type: "snapshot" | "ai_detection" | "recovery";
	message: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
	activities: Activity[];
}

const activityIcons = {
	snapshot: Camera,
	ai_detection: Bot,
	recovery: RotateCcw,
};

const activityColors = {
	snapshot: "text-[var(--snapback-green)] bg-[var(--snapback-green)]/10",
	ai_detection: "text-orange-500 bg-orange-500/10",
	recovery: "text-blue-500 bg-blue-500/10",
};

// Loading skeleton component
ActivityFeed.Skeleton = function ActivityFeedSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<div className="h-5 w-5 bg-gray-700 rounded animate-pulse" />
					<div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
				</CardTitle>
			</CardHeader>
			<CardContent>
				<section className="space-y-4" aria-label="Recent Activity">
					{[...Array(5)].map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="flex items-start gap-4 p-3 rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] opacity-50"
						>
							<div className="p-2 rounded-full bg-gray-700 animate-pulse h-8 w-8" />
							<div className="flex-1 min-w-0">
								<div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse mb-2" />
								<div className="h-3 w-1/2 bg-gray-700 rounded animate-pulse" />
							</div>
						</div>
					))}
				</section>
			</CardContent>
		</Card>
	);
};

// Empty state component
ActivityFeed.Empty = function ActivityFeedEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ActivityIcon className="h-5 w-5 text-[var(--snapback-green)]" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-center py-8 text-neutral-400">
					<ActivityIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
					<p>No recent activity</p>
					<p className="text-sm mt-2">Your activity will appear here</p>
				</div>
			</CardContent>
		</Card>
	);
};

// Error state component
ActivityFeed.Error = function ActivityFeedError({
	error,
}: {
	error: AppError;
}) {
	const queryClient = useQueryClient();
	const errorRef = useRef<HTMLDivElement>(null);

	// Focus error message for accessibility
	useEffect(() => {
		errorRef.current?.focus();
	}, []);

	const handleRetry = () => {
		// Invalidate all queries to trigger a refetch
		queryClient.invalidateQueries();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ActivityIcon className="h-5 w-5 text-[var(--snapback-green)]" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div
					ref={errorRef}
					tabIndex={-1}
					className="text-center py-8 border border-red-500/50 rounded-lg bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
					role="alert"
					aria-live="polite"
				>
					<div className="text-lg text-red-400">
						Error loading activity feed
					</div>
					<div className="text-sm text-red-500 mt-2">{error.message}</div>
					<button
						type="button"
						onClick={handleRetry}
						className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors focus:ring-2 focus:ring-red-500/50"
					>
						Retry
					</button>
				</div>
			</CardContent>
		</Card>
	);
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
	// Track when activity feed is viewed (SSR-safe)
	useEffect(() => {
		if (typeof window !== "undefined" && posthog.__loaded) {
			posthog.capture(AnalyticsEvents.DASHBOARD_VIEWED, {
				page: "overview",
			});
		}
	}, []); // Run only once on mount

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ActivityIcon className="h-5 w-5 text-[var(--snapback-green)]" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				<section className="space-y-4" aria-label="Recent Activity">
					{activities.length === 0 ? (
						<div className="text-center py-8 text-neutral-400">
							<ActivityIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
							<p>No recent activity</p>
						</div>
					) : (
						activities.map((activity, index) => {
							const Icon = activityIcons[activity.type];
							const colorClass = activityColors[activity.type];

							return (
								<div
									key={`item-${index}`}
									className="flex items-start gap-4 p-3 rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] hover:border-[var(--snapback-green)]/30 transition-colors"
								>
									<div className={cn("p-2 rounded-full", colorClass)}>
										<Icon className="h-4 w-4" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-white">
											{activity.message}
										</div>
										<div className="text-sm text-neutral-400 mt-1">
											{activity.timestamp}
										</div>
										{activity.metadata && (
											<div className="text-xs text-neutral-500 mt-1">
												{activity.type === "snapshot" &&
													`${activity.metadata.files} files`}
												{activity.type === "ai_detection" &&
													`${Math.round(
														(Number(activity.metadata.confidence) || 0) * 100,
													)}% confidence`}
												{activity.type === "recovery" &&
													`From ${activity.metadata.snapshot}`}
											</div>
										)}
									</div>
								</div>
							);
						})
					)}
				</section>
			</CardContent>
		</Card>
	);
}
