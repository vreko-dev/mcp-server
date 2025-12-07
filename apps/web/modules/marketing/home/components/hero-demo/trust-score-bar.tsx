"use client";

import { RefreshCw, ShieldCheck, TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import type { DemoState } from "./types";

interface TrustScoreBarProps {
	state: DemoState;
}

export function TrustScoreBar({ state }: TrustScoreBarProps) {
	// Determine visual props based on state
	const getScoreProps = () => {
		switch (state) {
			case "safe":
				return {
					score: 76,
					color: "bg-green-500",
					text: "Cursor: 76% reliable on configs",
					icon: null,
					trend: "stable",
				};
			case "ai_edit":
				return {
					score: 76,
					color: "bg-green-500",
					text: "Cursor: 76% reliable on configs",
					icon: null,
					trend: "stable",
				};
			case "break":
				return {
					score: 73,
					color: "bg-red-500",
					text: "Cursor: 73% reliable on configs",
					icon: <TrendingDown className="w-4 h-4 ml-2" />,
					trend: "down",
				};
			case "restored":
				return {
					score: 73,
					color: "bg-green-500",
					text: "73% · Learning from this",
					icon: <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />,
					trend: "learning",
				};
			default:
				return { score: 76, color: "bg-green-500", text: "Cursor: 76% reliable", icon: null, trend: "stable" };
		}
	};

	const { score, color, text, icon, trend } = getScoreProps();
	const barWidth = `${score}%`;

	return (
		<div className="w-full mt-4 bg-[#18181B] rounded-md border border-[#27272A] p-3 flex flex-col gap-2 font-mono text-xs">
			{/* Bar Visual */}
			<div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden relative">
				<motion.div
					className={`h-full absolute left-0 top-0 rounded-full ${color}`}
					initial={{ width: "76%" }}
					animate={{ width: barWidth }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>
			</div>

			{/* Text & Meta */}
			<div className="flex items-center justify-between text-gray-400">
				<div className="flex items-center">
					{trend === "learning" && icon}
					<span className={trend === "down" ? "text-red-400 font-bold shake" : "text-gray-400"}>{text}</span>
					{trend === "down" && icon}
				</div>

				{state === "restored" && (
					<motion.span
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-green-500 flex items-center gap-1"
					>
						<ShieldCheck className="w-3 h-3" />
						Protected
					</motion.span>
				)}
			</div>
		</div>
	);
}
