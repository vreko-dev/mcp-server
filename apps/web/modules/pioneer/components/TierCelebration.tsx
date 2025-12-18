"use client";

/**
 * TierCelebration - Modal/Toast for tier progression celebrations
 *
 * Displays an animated celebration when a user reaches a new tier.
 * Triggered by the usePioneerSocket hook on tier_changed events.
 */

import { useCallback, useState } from "react";
import { type TierChangedPayload, usePioneerSocket } from "../hooks/use-pioneer-socket";
import type { Tier } from "../lib/tiers";

interface TierInfo {
	name: string;
	emoji: string;
	color: string;
	description: string;
}

const TIER_INFO: Record<Tier, TierInfo> = {
	seedling: {
		name: "Seedling",
		emoji: "🌱",
		color: "from-emerald-400 to-emerald-600",
		description: "You've planted the seed of something great!",
	},
	grower: {
		name: "Grower",
		emoji: "🌿",
		color: "from-green-400 to-green-600",
		description: "Growing strong! Your contributions are making a difference.",
	},
	cultivator: {
		name: "Cultivator",
		emoji: "🌳",
		color: "from-teal-400 to-teal-600",
		description: "You're cultivating the future of SnapBack!",
	},
	guardian: {
		name: "Guardian",
		emoji: "🌲",
		color: "from-cyan-400 to-cyan-600",
		description: "A true guardian of the codebase. Thank you for your dedication!",
	},
};

interface CelebrationState {
	isVisible: boolean;
	tierData: TierChangedPayload | null;
}

export function TierCelebration() {
	const [celebration, setCelebration] = useState<CelebrationState>({
		isVisible: false,
		tierData: null,
	});

	const handleTierChanged = useCallback((data: TierChangedPayload) => {
		setCelebration({ isVisible: true, tierData: data });

		// Auto-hide after 10 seconds
		setTimeout(() => {
			setCelebration((prev) => ({ ...prev, isVisible: false }));
		}, 10000);
	}, []);

	usePioneerSocket({
		onTierChanged: handleTierChanged,
	});

	const dismiss = useCallback(() => {
		setCelebration((prev) => ({ ...prev, isVisible: false }));
	}, []);

	if (!celebration.isVisible || !celebration.tierData) {
		return null;
	}

	const tierInfo = TIER_INFO[celebration.tierData.to as Tier];
	if (!tierInfo) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
			<div className="relative mx-4 max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-500 dark:bg-zinc-900">
				{/* Gradient header */}
				<div className={`bg-gradient-to-r ${tierInfo.color} p-8 text-center text-white`}>
					<div className="mb-4 text-7xl animate-bounce">{tierInfo.emoji}</div>
					<h2 className="text-3xl font-bold">Level Up!</h2>
					<p className="mt-2 text-lg opacity-90">You&apos;ve reached</p>
					<p className="text-4xl font-black">{tierInfo.name}</p>
				</div>

				{/* Content */}
				<div className="p-6 text-center">
					<p className="mb-4 text-lg text-zinc-600 dark:text-zinc-300">{tierInfo.description}</p>

					<div className="mb-6 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
						<p className="text-sm text-zinc-500 dark:text-zinc-400">Total Points</p>
						<p className="text-3xl font-bold text-zinc-900 dark:text-white">
							{celebration.tierData.points.toLocaleString()}
						</p>
					</div>

					{/* Benefits */}
					{celebration.tierData.benefits && celebration.tierData.benefits.length > 0 && (
						<div className="mb-6 text-left">
							<p className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
								New Benefits Unlocked:
							</p>
							<ul className="space-y-1">
								{celebration.tierData.benefits.map((benefit) => (
									<li
										key={benefit}
										className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
									>
										<span className="text-green-500">✓</span>
										{benefit}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-3">
						<button
							onClick={dismiss}
							className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
						>
							Continue
						</button>
						<button
							onClick={() => {
								dismiss();
								window.location.href = "/pioneer";
							}}
							className={`flex-1 rounded-lg bg-gradient-to-r ${tierInfo.color} px-4 py-2 font-medium text-white transition-opacity hover:opacity-90`}
						>
							View Dashboard
						</button>
					</div>
				</div>

				{/* Confetti-like decorations */}
				<div className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden">
					{[...Array(20)].map((_, i) => (
						<div
							key={i}
							className="absolute h-2 w-2 rounded-full opacity-50"
							style={{
								left: `${Math.random() * 100}%`,
								top: `${Math.random() * 100}%`,
								backgroundColor: ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981"][i % 5],
								animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
								animationDelay: `${Math.random() * 2}s`,
							}}
						/>
					))}
				</div>
			</div>

			{/* CSS animation defined inline */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
				@keyframes float {
					0%, 100% { transform: translateY(0) rotate(0deg); }
					50% { transform: translateY(-20px) rotate(180deg); }
				}
			`,
				}}
			/>
		</div>
	);
}

/**
 * TierCelebrationProvider - Wraps the app to provide celebration context
 *
 * Add this component near the root of your Pioneer-enabled pages.
 */
export function TierCelebrationProvider({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<TierCelebration />
		</>
	);
}
