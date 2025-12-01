"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { AppError } from "@/lib/error-handler";

interface UsageWarningBannerProps {
	percentage: number;
	resourceType: string; // "checkpoints", "storage", etc.
	upgradeUrl?: string;
}

// Loading skeleton component
UsageWarningBanner.Skeleton = function UsageWarningBannerSkeleton() {
	return <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />;
};

// Empty state component
UsageWarningBanner.Empty = function UsageWarningBannerEmpty() {
	return null;
};

// Error state component
UsageWarningBanner.Error = function UsageWarningBannerError({
	error,
}: {
	error: AppError;
}) {
	return (
		<Alert
			className="bg-red-500/10 border-red-500/30 text-red-400"
			role="alert"
			aria-live="assertive"
		>
			<AlertCircle className="h-4 w-4" />
			<AlertTitle className="text-red-400 font-semibold">
				Error loading usage warning
			</AlertTitle>
			<AlertDescription className="text-red-300">
				{error.message}
			</AlertDescription>
		</Alert>
	);
};

export function UsageWarningBanner({
	percentage,
	resourceType,
	upgradeUrl = "/choose-plan",
}: UsageWarningBannerProps) {
	// No warning if below 80%
	if (percentage < 80) {
		return null;
	}

	// Critical warning at 95%+
	if (percentage >= 95) {
		return (
			<Alert
				className="bg-red-500/10 border-red-500/30 text-red-400"
				role="alert"
				aria-live="assertive"
			>
				<AlertCircle className="h-4 w-4" />
				<AlertTitle className="text-red-400 font-semibold">
					Critical: Approaching {resourceType} limit
				</AlertTitle>
				<AlertDescription className="text-red-300">
					You've used {percentage.toFixed(1)}% of your {resourceType} quota.
					Upgrade now to avoid service interruption.
					{upgradeUrl && (
						<Link
							href={upgradeUrl}
							className="ml-2 underline font-medium hover:text-red-200"
						>
							Upgrade plan →
						</Link>
					)}
				</AlertDescription>
			</Alert>
		);
	}

	// Warning at 80-94%
	return (
		<Alert
			className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
			role="alert"
			aria-live="polite"
		>
			<AlertTriangle className="h-4 w-4" />
			<AlertTitle className="text-yellow-400 font-semibold">
				Warning: {resourceType} limit approaching
			</AlertTitle>
			<AlertDescription className="text-yellow-300">
				You've used {percentage.toFixed(1)}% of your {resourceType} quota.
				Consider upgrading your plan for unlimited access.
				{upgradeUrl && (
					<Link
						href={upgradeUrl}
						className="ml-2 underline font-medium hover:text-yellow-200"
					>
						View plans →
					</Link>
				)}
			</AlertDescription>
		</Alert>
	);
}
