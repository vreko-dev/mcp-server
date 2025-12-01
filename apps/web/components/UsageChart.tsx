import { useEffect, useState } from "react";
import type { UsageMetrics } from "../lib/types";

interface UsageChartProps {
	metrics: UsageMetrics;
	className?: string;
}

export function UsageChart({ metrics, className = "" }: UsageChartProps) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// SSR-safe rendering - only render chart on client
	if (!isClient) {
		return (
			<div className={`bg-gray-100 rounded p-4 ${className}`}>
				<div className="h-48 flex items-center justify-center text-gray-500">
					Loading usage data...
				</div>
			</div>
		);
	}

	const usagePercentage = metrics.snapshotsLimit
		? Math.round((metrics.snapshotsUsed / metrics.snapshotsLimit) * 100)
		: 0;

	const isApproachingLimit = usagePercentage >= 80;
	const isCritical = usagePercentage >= 95;

	return (
		<div className={`bg-white rounded-lg border p-6 ${className}`}>
			<h2 className="text-xl font-bold mb-4">Usage</h2>

			<div className="space-y-4">
				<div>
					<div className="flex justify-between mb-1">
						<span className="text-sm font-medium">Snapshots</span>
						<span className="text-sm text-gray-500">
							{metrics.snapshotsUsed}{" "}
							{metrics.snapshotsLimit
								? `/ ${metrics.snapshotsLimit}`
								: "unlimited"}
						</span>
					</div>
					{metrics.snapshotsLimit ? (
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div
								className={`h-2.5 rounded-full ${
									isCritical
										? "bg-red-600"
										: isApproachingLimit
											? "bg-yellow-500"
											: "bg-snapback-green"
								}`}
								style={{
									width: `${Math.min(usagePercentage, 100)}%`,
								}}
							/>
						</div>
					) : (
						<div className="px-3 py-1 bg-snapback-green text-white text-xs font-medium rounded-full inline-block">
							Unlimited
						</div>
					)}
				</div>

				{metrics.cloudStorageLimitMb !== null && (
					<div>
						<div className="flex justify-between mb-1">
							<span className="text-sm font-medium">Cloud Storage</span>
							<span className="text-sm text-gray-500">
								{metrics.cloudStorageUsedMb} MB{" "}
								{metrics.cloudStorageLimitMb
									? `/ ${metrics.cloudStorageLimitMb} MB`
									: ""}
							</span>
						</div>
						{metrics.cloudStorageLimitMb ? (
							<div className="w-full bg-gray-200 rounded-full h-2.5">
								<div
									className="h-2.5 rounded-full bg-blue-600"
									style={{
										width: `${Math.min(
											Math.round(
												(metrics.cloudStorageUsedMb /
													metrics.cloudStorageLimitMb) *
													100,
											),
											100,
										)}%`,
									}}
								/>
							</div>
						) : (
							<div className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full inline-block">
								Unlimited
							</div>
						)}
					</div>
				)}

				{isApproachingLimit && metrics.snapshotsLimit && (
					<div
						className={`p-3 rounded text-sm ${
							isCritical
								? "bg-red-50 text-red-700 border border-red-200"
								: "bg-yellow-50 text-yellow-700 border border-yellow-200"
						}`}
					>
						{isCritical ? (
							<p className="font-medium">
								⚠️ Critical: Only{" "}
								{metrics.snapshotsLimit - metrics.snapshotsUsed} snapshots
								remaining. Please upgrade your plan to continue creating
								snapshots.
							</p>
						) : (
							<p>
								⚠️ You're approaching your snapshot limit ({usagePercentage}%
								used). Consider upgrading your plan for unlimited snapshots.
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
