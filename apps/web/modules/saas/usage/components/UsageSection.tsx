"use client";

import { useState } from "react";
import type { SubscriptionInfo, UsageLimits } from "@/lib/dashboard/metrics";
import { UpgradeModal } from "./UpgradeModal";
import { UsageProgressBar } from "./UsageProgressBar";
import { UsageWarningBanner } from "./UsageWarningBanner";

interface UsageSectionProps {
	limits: UsageLimits;
	subscription: SubscriptionInfo;
}

// Loading skeleton component
UsageSection.Skeleton = function UsageSectionSkeleton() {
	return (
		<div className="space-y-6">
			{/* Warning banner skeleton */}
			<div className="h-16 bg-gray-800 rounded-lg animate-pulse" />

			{/* Usage metrics card */}
			<div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
				<div className="h-6 w-40 bg-gray-700 rounded mb-4 animate-pulse" />

				<div className="space-y-6">
					{/* Checkpoint usage skeleton */}
					<div className="space-y-2">
						<div className="flex justify-between">
							<div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
							<div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
						</div>
						<div className="h-2 bg-gray-700 rounded-full animate-pulse" />
						<div className="flex justify-between">
							<div className="h-3 w-24 bg-gray-700 rounded animate-pulse" />
							<div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
						</div>
					</div>

					{/* Storage usage skeleton */}
					<div className="space-y-2">
						<div className="flex justify-between">
							<div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
							<div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
						</div>
						<div className="h-2 bg-gray-700 rounded-full animate-pulse" />
						<div className="flex justify-between">
							<div className="h-3 w-24 bg-gray-700 rounded animate-pulse" />
							<div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
						</div>
					</div>

					{/* Plan info skeleton */}
					<div className="pt-4 border-t border-neutral-800">
						<div className="flex justify-between items-center">
							<div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
							<div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
						</div>
						<div className="flex justify-between items-center mt-2">
							<div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
							<div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

// Empty state component
UsageSection.Empty = function UsageSectionEmpty() {
	return (
		<div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6 text-center">
			<p className="text-neutral-400">No usage data available</p>
		</div>
	);
};

// Error state component
UsageSection.Error = function UsageSectionError({ error }: { error: Error }) {
	return (
		<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
			<div className="text-red-400 font-semibold mb-2">
				Error loading usage data
			</div>
			<p className="text-red-300 text-sm mb-4">{error.message}</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="px-4 py-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition-colors text-sm"
			>
				Retry
			</button>
		</div>
	);
};

export function UsageSection({ limits, subscription }: UsageSectionProps) {
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const limitsData = limits as any;
	const subData = subscription as any;

	// Calculate checkpoint usage percentage
	const checkpointPercentage = limitsData.snapshotsLimit
		? (limitsData.snapshotsUsed / limitsData.snapshotsLimit) * 100
		: 0;

	// Calculate storage usage percentage
	// const _storagePercentage = // TODO: Re-enable when storage usage visualization is implemented
	// 	limits.cloudStorageUsedMb && limits.cloudStorageLimitMb
	// 		? (limits.cloudStorageUsedMb / limits.cloudStorageLimitMb) * 100
	// 		: 0;

	// Show modal if at 100% usage
	const isAtLimit = checkpointPercentage >= 100;

	return (
		<div className="space-y-6">
			{/* Checkpoint usage warning */}
			{checkpointPercentage >= 80 && checkpointPercentage < 100 && (
				<UsageWarningBanner
					percentage={checkpointPercentage}
					resourceType="checkpoints"
				/>
			)}

			{/* At limit warning */}
			{isAtLimit && (
				<UsageWarningBanner
					percentage={100}
					resourceType="checkpoints"
					upgradeUrl="/choose-plan"
				/>
			)}

			{/* Usage metrics card */}
			<div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-white mb-4">
					Usage & Limits
				</h3>

				<div className="space-y-6">
					{/* Checkpoint usage */}
					<UsageProgressBar
						used={limitsData.snapshotsUsed}
						limit={limitsData.snapshotsLimit}
						label="Checkpoints this month"
						unit="checkpoints"
					/>

					{/* Storage usage (for paid plans with cloud backup) */}
					{limitsData.cloudStorageUsedMb !== undefined &&
						limitsData.cloudStorageLimitMb !== undefined && (
							<UsageProgressBar
								used={limitsData.cloudStorageUsedMb}
								limit={limitsData.cloudStorageLimitMb}
								label="Cloud Storage"
								unit="MB"
							/>
						)}

					{/* Plan info */}
					<div className="pt-4 border-t border-neutral-800">
						<div className="flex justify-between items-center text-sm">
							<span className="text-neutral-400">Current plan:</span>
							<span className="font-medium text-white capitalize">
								{subData.plan}
							</span>
						</div>
						{subData.currentPeriodEnd && (
							<div className="flex justify-between items-center text-sm mt-2">
								<span className="text-neutral-400">Renews on:</span>
								<span className="text-neutral-300">
									{new Date(subData.currentPeriodEnd).toLocaleDateString()}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Upgrade modal */}
			<UpgradeModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				resourceType="checkpoints"
				currentPlan={subData.plan}
			/>
		</div>
	);
}
