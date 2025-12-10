"use client";

import type { LearningStage } from "@marketing/constants/learning-stages";
import { cn } from "@ui/lib";
import { m } from "motion/react";
import { AnimatedNumber } from "./animated-number";
import { AnimatedProgressBar } from "./animated-progress-bar";

export interface LearningStageCardProps {
	stage: LearningStage;
	index: number;
	variant?: "dark" | "light";
}

export function LearningStageCard({ stage, index, variant = "dark" }: LearningStageCardProps) {
	const isDark = variant === "dark";

	return (
		<m.div
			key={stage.period}
			initial={{ opacity: 1, y: 0 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-100px" }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			className={cn(
				"relative p-6 rounded-xl border transition-all duration-300",
				isDark ? "bg-[#111] hover:bg-[#111]/80" : "bg-card hover:bg-card/80",
				stage.highlighted
					? isDark
						? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
						: "border-primary/50 shadow-lg shadow-primary/10"
					: isDark
						? "border-[#222] hover:border-emerald-500/30"
						: "border-border hover:border-primary/30",
			)}
		>
			{/* Subtle glow effect for highlighted card */}
			{stage.highlighted && (
				<div
					className={cn(
						"absolute inset-0 -z-10 blur-xl rounded-xl",
						isDark ? "bg-emerald-500/5" : "bg-primary/5",
					)}
				/>
			)}

			{/* Period Badge */}
			<div className="flex items-center justify-between mb-6">
				<span className={cn("text-sm font-medium", isDark ? "text-[#999]" : "text-muted-foreground")}>
					{stage.period}
				</span>
				<span
					className={cn(
						"text-xs px-2 py-1 rounded-full font-medium",
						stage.tier === "free"
							? isDark
								? "bg-[#222] text-[#999]"
								: "bg-muted text-muted-foreground"
							: isDark
								? "bg-emerald-500/10 text-emerald-500"
								: "bg-primary/10 text-primary",
					)}
				>
					{stage.tier === "free" ? "Free" : "Pro"}
				</span>
			</div>

			{/* Accuracy */}
			<div className="mb-4">
				<div className="flex items-baseline gap-1">
					<span className={cn("text-4xl font-bold", isDark ? "text-white" : "text-foreground")}>
						<AnimatedNumber value={stage.accuracy} />
					</span>
					<span className={cn("text-2xl font-bold", isDark ? "text-white" : "text-foreground")}>
						%{stage.accuracy === 99 && "+"}
					</span>
				</div>
				<span className={cn("text-sm", isDark ? "text-[#666]" : "text-muted-foreground")}>accurate</span>
			</div>

			{/* Progress Bar */}
			<AnimatedProgressBar
				value={stage.accuracy}
				delay={index * 0.1 + 0.3}
				highlighted={stage.highlighted}
				variant={variant}
				className="mb-6"
			/>

			{/* Label */}
			<h3 className={cn("text-lg font-semibold mb-3", isDark ? "text-white" : "text-foreground")}>
				{stage.label}
			</h3>

			{/* Features */}
			<ul className="space-y-2">
				{stage.features.map((feature) => (
					<li
						key={feature}
						className={cn(
							"text-sm flex items-start gap-2",
							isDark ? "text-[#A0A0A0]" : "text-muted-foreground",
						)}
					>
						<span className={cn("mt-1", isDark ? "text-emerald-500" : "text-primary")}>•</span>
						{feature}
					</li>
				))}
			</ul>
		</m.div>
	);
}
