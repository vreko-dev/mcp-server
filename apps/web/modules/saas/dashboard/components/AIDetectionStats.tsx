"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Bot, HelpCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import type { AppError } from "@/lib/error-handler";
import { AnalyticsEvents } from "../../../analytics";

interface AIDetectionStat {
	tool: string;
	count: number;
	avgConfidence: number;
}

interface AIDetectionStatsProps {
	stats: AIDetectionStat[];
}

// Loading skeleton component
AIDetectionStats.Skeleton = function AIDetectionStatsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<div className="h-5 w-5 bg-gray-700 rounded animate-pulse" />
					<div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4">
					{Array.from({ length: 3 }, (_, i) => (
						<div
							key={`skeleton-${i}`}
							className="group relative overflow-hidden rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] p-4 transition-all opacity-50"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 animate-pulse" />
									<div>
										<div className="h-4 w-20 bg-gray-700 rounded animate-pulse mb-2" />
										<div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
									</div>
								</div>
								<div className="text-right">
									<div className="h-5 w-16 bg-gray-700 rounded animate-pulse mb-1" />
									<div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
};

// Empty state component
AIDetectionStats.Empty = function AIDetectionStatsEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Bot className="h-5 w-5 text-[var(--snapback-green)]" />
					AI Tools Detected
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-center py-8">
					<div className="text-lg text-gray-400">No AI detections yet</div>
					<div className="text-sm text-gray-500 mt-2">
						Start using AI tools to see detection statistics
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

// Error state component
AIDetectionStats.Error = function AIDetectionStatsError({
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
					<Bot className="h-5 w-5 text-[var(--snapback-green)]" />
					AI Tools Detected
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
						Error loading AI detection stats
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

export function AIDetectionStats({ stats }: AIDetectionStatsProps) {
	// Track when AI detection stats are viewed (SSR-safe)
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
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Bot className="h-5 w-5 text-[var(--snapback-green)]" />
						AI Tools Detected
					</CardTitle>
					<Link
						href="/docs/analytics"
						className="text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Learn about AI detection analytics"
					>
						<HelpCircle className="h-4 w-4" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4">
					{stats.map((stat, index) => (
						<div
							key={`item-${index}`}
							className="group relative overflow-hidden rounded-lg border border-[var(--snapback-border)] bg-[var(--snapback-surface)] p-4 transition-all hover:border-[var(--snapback-green)]/50 hover:shadow-lg hover:shadow-[var(--snapback-green)]/10"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--snapback-green)]/10">
										<Bot className="h-5 w-5 text-[var(--snapback-green)]" />
									</div>
									<div>
										<div className="font-medium text-white">{stat.tool}</div>
										<div className="text-sm text-neutral-400">
											{stat.count} detections
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="text-lg font-bold text-[var(--snapback-green)]">
										{Math.round(stat.avgConfidence * 100)}% confidence
									</div>
									<div className="flex items-center gap-1 text-xs text-neutral-400">
										<TrendingUp className="h-3 w-3" />
										High accuracy
									</div>
								</div>
							</div>
							{/* Hover effect gradient */}
							<div className="absolute inset-0 bg-gradient-to-r from-[var(--snapback-green)]/0 via-[var(--snapback-green)]/5 to-[var(--snapback-green)]/0 opacity-0 transition-opacity group-hover:opacity-100" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
