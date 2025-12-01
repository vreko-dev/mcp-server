"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BentoGrid, BentoGridItem } from "@ui/components/aceternity/bento-grid";
import NumberTicker from "@ui/components/magic/number-ticker";
import {
	Activity,
	Camera,
	FileCheck,
	HelpCircle,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { memo, useEffect, useRef } from "react";
import type { AppError } from "@/lib/error-handler";
import { AnalyticsEvents } from "../../../analytics";

interface MetricsGridProps {
	snapshotCount: number;
	recoveryCount: number;
	filesProtected: number;
	aiDetectionRate: number;
	// Session metrics
	sessionCount?: number;
	aiSessionCount?: number;
	totalBytesSaved?: number;
	highSeveritySessionCount?: number;
}

// Loading skeleton component
const _MetricsGridSkeleton = memo(function MetricsGridSkeleton() {
	return (
		<BentoGrid className="grid-cols-1 md:grid-cols-4 auto-rows-auto">
			{[...Array(5)].map((_, i) => (
				<BentoGridItem
					key={`skeleton-${i}`}
					title={
						<div className="flex items-center gap-2 text-lg h-6 bg-gray-700 rounded animate-pulse" />
					}
					description={
						<div className="space-y-2">
							<div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
							<div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
						</div>
					}
					header={
						<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gray-800 animate-pulse" />
					}
					className="opacity-50"
				/>
			))}
		</BentoGrid>
	);
});

// Empty state component
const _MetricsGridEmpty = memo(function MetricsGridEmpty() {
	return (
		<div className="text-center py-12">
			<div className="text-lg text-gray-400">No metrics data available yet</div>
			<div className="text-sm text-gray-500 mt-2">
				Create your first snapshot to see metrics
			</div>
		</div>
	);
});

// Error state component
const _MetricsGridError = memo(function MetricsGridError({
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
		<div
			ref={errorRef}
			tabIndex={-1}
			className="text-center py-12 border border-red-500/50 rounded-lg bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
			role="alert"
			aria-live="polite"
		>
			<div className="text-lg text-red-400">Error loading metrics</div>
			<div className="text-sm text-red-500 mt-2">{error.message}</div>
			<button
				type="button"
				onClick={handleRetry}
				className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors focus:ring-2 focus:ring-red-500/50"
			>
				Retry
			</button>
		</div>
	);
});

const MetricsGridComponent = memo(function MetricsGrid({
	snapshotCount,
	recoveryCount,
	filesProtected,
	aiDetectionRate,
	sessionCount,
	aiSessionCount,
	totalBytesSaved,
}: MetricsGridProps) {
	// Track when metrics grid is viewed - only once (SSR-safe)
	useEffect(() => {
		if (typeof window !== "undefined" && posthog.__loaded) {
			posthog.capture(AnalyticsEvents.DASHBOARD_VIEWED, {
				page: "overview",
			});
		}
	}, []); // Run only once on mount

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Metrics Overview</h2>
				<Link
					href="/docs/analytics"
					className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
					aria-label="Learn about metrics and analytics"
				>
					<HelpCircle className="h-4 w-4" />
					<span>Learn more</span>
				</Link>
			</div>
			<BentoGrid
				className="grid-cols-1 md:grid-cols-4 auto-rows-auto"
				data-testid="metrics-grid"
			>
				<BentoGridItem
					title={
						<div className="flex items-center gap-2 text-lg">
							<Camera className="h-5 w-5 text-[var(--snapback-green)]" />
							<span>Snapshots</span>
						</div>
					}
					description={
						<div className="space-y-1">
							<div className="text-xs text-neutral-400">
								<NumberTicker
									value={snapshotCount}
									className="text-3xl font-bold text-white"
								/>{" "}
								snapshots created
							</div>
						</div>
					}
					header={
						<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-[var(--snapback-green)]/20 to-transparent" />
					}
					className="hover:border-[var(--snapback-green)]/50"
				/>

				<BentoGridItem
					title={
						<div className="flex items-center gap-2 text-lg">
							<Activity className="h-5 w-5 text-blue-500" />
							<span>Recoveries</span>
						</div>
					}
					description={
						<div className="space-y-1">
							<div className="text-xs text-neutral-400">
								<NumberTicker
									value={recoveryCount}
									className="text-3xl font-bold text-white"
								/>{" "}
								recoveries performed
							</div>
							<div className="text-xs text-neutral-500">
								{recoveryCount} this month
							</div>
						</div>
					}
					header={
						<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent" />
					}
					className="hover:border-blue-500/50"
				/>

				<BentoGridItem
					title={
						<div className="flex items-center gap-2 text-lg">
							<FileCheck className="h-5 w-5 text-purple-500" />
							<span>Files Protected</span>
						</div>
					}
					description={
						<div className="space-y-1">
							<div className="text-xs text-neutral-400">
								<NumberTicker
									value={filesProtected}
									className="text-3xl font-bold text-white"
								/>{" "}
								files
							</div>
							<div className="text-xs text-neutral-500">
								Across all projects
							</div>
						</div>
					}
					header={
						<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-purple-500/20 to-transparent" />
					}
					className="hover:border-purple-500/50"
				/>

				<BentoGridItem
					title={
						<div className="flex items-center gap-2 text-lg">
							<Sparkles className="h-5 w-5 text-orange-500" />
							<span>AI Detection</span>
						</div>
					}
					description={
						<div className="space-y-1">
							<div className="text-xs text-neutral-400">
								<NumberTicker
									value={aiDetectionRate}
									className="text-3xl font-bold text-white"
								/>
								% detection rate
							</div>
							<div className="text-xs text-[var(--snapback-green)]">
								{snapshotCount} detections
							</div>
						</div>
					}
					header={
						<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-orange-500/20 to-transparent" />
					}
					className="hover:border-orange-500/50"
				/>

				{totalBytesSaved !== undefined && (
					<BentoGridItem
						title={
							<div className="flex items-center gap-2 text-lg">
								<Activity className="h-5 w-5 text-green-500" />
								<span>Bytes Saved</span>
							</div>
						}
						description={
							<div className="space-y-1">
								<div className="text-xs text-neutral-400">
									<NumberTicker
										value={totalBytesSaved}
										className="text-3xl font-bold text-white"
									/>
									bytes saved
								</div>
								{sessionCount !== undefined && aiSessionCount !== undefined && (
									<div className="text-xs text-neutral-500">
										{sessionCount} sessions ({aiSessionCount} AI)
									</div>
								)}
							</div>
						}
						header={
							<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-green-500/20 to-transparent" />
						}
						className="hover:border-green-500/50"
					/>
				)}
			</BentoGrid>
		</div>
	);
});

// Export sub-components for compound pattern
const MetricsGridSkeleton = _MetricsGridSkeleton;
const MetricsGridEmpty = _MetricsGridEmpty;
const MetricsGridError = _MetricsGridError;

// Create compound component with proper typing
export const MetricsGrid = Object.assign(MetricsGridComponent, {
	Skeleton: MetricsGridSkeleton,
	Empty: MetricsGridEmpty,
	Error: MetricsGridError,
});
