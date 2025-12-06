"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { AppError } from "@/lib/error-handler";

interface UpgradeModalProps {
	isOpen: boolean;
	onClose: () => void;
	resourceType: string; // "checkpoints", "storage", etc.
	currentPlan: string;
}

// Loading skeleton component
UpgradeModal.Skeleton = function UpgradeModalSkeleton() {
	return (
		<Dialog open>
			<DialogContent className="sm:max-w-md bg-neutral-900 border border-neutral-800">
				<DialogHeader>
					<div className="flex items-center gap-2 h-6 bg-gray-700 rounded animate-pulse" />
					<div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse mt-2" />
				</DialogHeader>

				<div className="bg-neutral-800/50 rounded-lg p-4 my-4 space-y-2">
					<div className="h-5 w-1/3 bg-gray-700 rounded animate-pulse" />
					<div className="space-y-2 mt-3">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="flex items-start gap-2">
								<div className="h-4 w-4 bg-gray-700 rounded-full animate-pulse mt-0.5" />
								<div className="h-4 flex-1 bg-gray-700 rounded animate-pulse" />
							</div>
						))}
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<div className="h-10 w-20 bg-gray-700 rounded animate-pulse" />
					<div className="h-10 w-40 bg-gray-700 rounded animate-pulse" />
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// Empty state component
UpgradeModal.Empty = function UpgradeModalEmpty() {
	return null;
};

// Error state component
UpgradeModal.Error = function UpgradeModalError({
	error,
}: {
	error: AppError;
}) {
	return (
		<Dialog open>
			<DialogContent className="sm:max-w-md bg-neutral-900 border border-red-500/30">
				<DialogHeader>
					<div className="flex items-center gap-2 text-red-400">
						<AlertCircle className="h-5 w-5" />
						<DialogTitle className="text-xl font-bold text-white">
							Error Loading Upgrade Information
						</DialogTitle>
					</div>
					<DialogDescription className="text-red-300 pt-2">
						{error.message}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => window.location.reload()}
						className="text-red-400 hover:text-white"
					>
						Retry
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export function UpgradeModal({
	isOpen,
	onClose,
	resourceType,
	currentPlan,
}: UpgradeModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md bg-neutral-900 border border-neutral-800">
				<DialogHeader>
					<div className="flex items-center gap-2 text-red-400">
						<AlertCircle className="h-5 w-5" />
						<DialogTitle className="text-xl font-bold text-white">
							{resourceType} Limit Reached
						</DialogTitle>
					</div>
					<DialogDescription className="text-neutral-300 pt-2">
						You've reached your {currentPlan} plan limit for {resourceType}.
						Upgrade to Pro or Team plan for unlimited access.
					</DialogDescription>
				</DialogHeader>

				<div className="bg-neutral-800/50 rounded-lg p-4 my-4 space-y-2">
					<h4 className="font-semibold text-white">Upgrade Benefits:</h4>
					<ul className="space-y-2 text-sm text-neutral-300">
						<li className="flex items-start gap-2">
							<span className="text-emerald-400 mt-0.5">✓</span>
							<span>Unlimited {resourceType}</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-emerald-400 mt-0.5">✓</span>
							<span>Cloud backup for all checkpoints</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-emerald-400 mt-0.5">✓</span>
							<span>Advanced AI detection & risk analysis</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-emerald-400 mt-0.5">✓</span>
							<span>Custom automation rules</span>
						</li>
						{currentPlan !== "team" && (
							<li className="flex items-start gap-2">
								<span className="text-emerald-400 mt-0.5">✓</span>
								<span>Team collaboration (Team plan)</span>
							</li>
						)}
					</ul>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						className="text-neutral-400 hover:text-white"
					>
						Not now
					</Button>
					<Link href="/choose-plan">
						<Button
							className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
							onClick={onClose}
						>
							View upgrade plans
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
