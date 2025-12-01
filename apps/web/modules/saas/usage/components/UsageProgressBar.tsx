"use client";

import { Progress } from "@ui/components/progress";

interface UsageProgressBarProps {
	used: number;
	limit: number | null; // null = unlimited
	label: string;
	unit?: string;
}

// Loading skeleton component
UsageProgressBar.Skeleton = function UsageProgressBarSkeleton() {
	return (
		<div className="space-y-2">
			<div className="flex justify-between items-center">
				<div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
				<div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
			</div>
			<div className="h-2 bg-gray-700 rounded-full animate-pulse" />
			<div className="flex justify-between items-center">
				<div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
				<div className="h-3 w-12 bg-gray-700 rounded animate-pulse" />
			</div>
		</div>
	);
};

// Empty state component
UsageProgressBar.Empty = function UsageProgressBarEmpty() {
	return (
		<div className="text-neutral-400 text-sm">No usage data available</div>
	);
};

// Error state component
UsageProgressBar.Error = function UsageProgressBarError({
	error,
}: {
	error: Error;
}) {
	return <div className="text-red-400 text-sm">Error: {error.message}</div>;
};

export function UsageProgressBar({
	used,
	limit,
	label,
	unit = "",
}: UsageProgressBarProps) {
	// Unlimited plan
	if (limit === null) {
		return (
			<div className="space-y-2">
				<div className="flex justify-between items-center">
					<span className="text-sm font-medium text-white">{label}</span>
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
						Unlimited
					</span>
				</div>
				<p className="text-sm text-neutral-400">
					{used.toLocaleString()} {unit} used this period
				</p>
			</div>
		);
	}

	const percentage = Math.min((used / limit) * 100, 100);
	const remaining = Math.max(limit - used, 0);

	// Color coding based on percentage
	let progressColor = "bg-emerald-500"; // 0-79%: Green
	let textColor = "text-emerald-400";

	if (percentage >= 95) {
		// 95-100%: Red (critical)
		progressColor = "bg-red-500";
		textColor = "text-red-400";
	} else if (percentage >= 80) {
		// 80-94%: Yellow (warning)
		progressColor = "bg-yellow-500";
		textColor = "text-yellow-400";
	}

	return (
		<div className="space-y-2">
			<div className="flex justify-between items-center">
				<span className="text-sm font-medium text-white">{label}</span>
				<span className={`text-sm font-medium ${textColor}`}>
					{used.toLocaleString()} / {limit.toLocaleString()} {unit}
				</span>
			</div>
			<Progress value={percentage} className={progressColor} />
			<div className="flex justify-between items-center">
				<span className="text-xs text-neutral-400">
					{remaining.toLocaleString()} {unit} remaining
				</span>
				<span className={`text-xs font-medium ${textColor}`}>
					{percentage.toFixed(1)}%
				</span>
			</div>
		</div>
	);
}
