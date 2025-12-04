"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";

interface DashboardHeroCardProps {
	threatsPreventedCount: number;
	protectionLevelPercent: number;
	confidenceLevel: "excellent" | "good" | "warning";
	period: "week" | "month";
	onViewDetails?: () => void;
	onViewWins?: () => void;
}

export function DashboardHeroCard({
	threatsPreventedCount,
	protectionLevelPercent,
	confidenceLevel,
	period,
	onViewDetails,
	onViewWins,
}: DashboardHeroCardProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const confidenceColor = {
		excellent: "text-green-400",
		good: "text-blue-400",
		warning: "text-amber-400",
	}[confidenceLevel];

	const confidenceEmoji = {
		excellent: "✨",
		good: "⭐",
		warning: "⚠️",
	}[confidenceLevel];

	const confidenceText = {
		excellent: "Excellent",
		good: "Good",
		warning: "Warning",
	}[confidenceLevel];

	// Don't render on server to avoid hydration mismatch
	if (!isMounted) {
		return (
			<div className="relative w-full overflow-hidden rounded-2xl border border-snapback-green/30 bg-gradient-to-br from-snapback-green/10 via-slate-900 to-slate-950 p-8 md:p-12">
				<div className="space-y-8">
					<div className="mb-8">
						<div className="text-3xl font-bold text-white mb-1">
							You're Protected
						</div>
						<p className="text-snapback-green/80 text-sm uppercase tracking-wider">
							This {period}
						</p>
					</div>

					<div>
						<div className="text-6xl font-bold text-snapback-green mb-3">
							{threatsPreventedCount}
						</div>
						<p className="text-lg text-slate-300">Security Risks Prevented</p>
						<p className="text-sm text-slate-500">
							That could have cost you hours of debugging
						</p>
					</div>

					<div className="space-y-4 border-t border-snapback-green/20 pt-6">
						<div className="flex items-center justify-between">
							<span className="text-slate-400">Protection Level</span>
							<span className="text-snapback-green font-bold">
								{protectionLevelPercent}%
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-slate-400">Your Confidence</span>
							<span className={`text-lg font-bold flex items-center gap-2 ${confidenceColor}`}>
								{confidenceEmoji}
								{confidenceText}
							</span>
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						<button className="px-6 py-2 rounded-lg bg-snapback-green/20 text-snapback-green hover:bg-snapback-green/30 transition-colors font-medium">
							View Details
						</button>
						<button className="px-6 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors font-medium">
							Recent Wins
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<m.div
			initial={{ opacity: 1, y: 0 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-100px" }}
			className="relative w-full overflow-hidden rounded-2xl border border-snapback-green/30 bg-gradient-to-br from-snapback-green/10 via-slate-900 to-slate-950 p-8 md:p-12"
		>
			{/* Content */}
			<div className="relative z-10">
				{/* Header */}
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mb-8"
				>
					<div className="flex items-center gap-3 mb-4">
						<m.div
							animate={{ rotate: 360 }}
							transition={{
								duration: 3,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
							className="text-4xl"
						>
							🛡️
						</m.div>
						<h1 className="text-3xl font-bold text-white">You're Protected</h1>
					</div>
					<p className="text-snapback-green/80 text-sm uppercase tracking-wider">
						This {period}
					</p>
				</m.div>

				{/* Main Metric */}
				<m.div
					initial={{ opacity: 1, scale: 1 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.1 }}
					className="mb-8"
				>
					<div className="space-y-3">
						<div className="text-6xl font-bold text-snapback-green">
							{threatsPreventedCount}
						</div>
						<p className="text-lg text-slate-300">Security Risks Prevented</p>
						<p className="text-sm text-slate-500">
							That could have cost you hours of debugging
						</p>
					</div>
				</m.div>

				{/* Status Lines */}
				<m.div
					initial={{ opacity: 1 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="space-y-4 mb-8 border-t border-snapback-green/20 pt-6"
				>
					{/* Protection Level */}
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Protection Level</span>
						<div className="flex items-center gap-3">
							<div className="w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
								<m.div
									initial={{ width: 0 }}
									whileInView={{ width: `${protectionLevelPercent}%` }}
									viewport={{ once: true }}
									transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
									className="h-full bg-gradient-to-r from-snapback-green to-emerald-300"
								/>
							</div>
							<span className="text-snapback-green font-bold">
								{protectionLevelPercent}%
							</span>
						</div>
					</div>

					{/* Confidence */}
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Your Confidence</span>
						<span
							className={`text-lg font-bold flex items-center gap-2 ${confidenceColor}`}
						>
							{confidenceEmoji}
							{confidenceText}
						</span>
					</div>
				</m.div>

				{/* CTA Buttons */}
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="flex flex-wrap gap-3"
				>
					<button
						onClick={onViewDetails}
						className="px-6 py-2 rounded-lg bg-snapback-green/20 text-snapback-green hover:bg-snapback-green/30 transition-colors font-medium"
					>
						View Details
					</button>
					<button
						onClick={onViewWins}
						className="px-6 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
					>
						Recent Wins
					</button>
				</m.div>
			</div>
		</m.div>
	);
}
