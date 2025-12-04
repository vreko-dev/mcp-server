"use client";

import { BentoGridItem } from "@marketing/components/ui/bento-grid";
import NumberTicker from "@ui/components/magic/number-ticker";
import { m } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface BenefitMetricCardProps {
	icon: ReactNode;
	label: string;
	value: number;
	unit?: string;
	subtext: string;
	trend?: {
		direction: "up" | "down";
		amount: number;
		period: string;
	};
	color?: "green" | "blue" | "amber" | "purple";
	header?: ReactNode;
	index?: number;
}

export function BenefitMetricCard({
	icon,
	label,
	value,
	unit = "",
	subtext,
	trend,
	color = "green",
	header,
	index = 0,
}: BenefitMetricCardProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const colorClasses = {
		green: "hover:border-emerald-400/50",
		blue: "hover:border-sky-300/50",
		amber: "hover:border-amber-300/50",
		purple: "hover:border-violet-300/50",
	};

	const iconColorClasses = {
		green: "text-emerald-400",
		blue: "text-sky-300",
		amber: "text-amber-300",
		purple: "text-violet-300",
	};

	if (!isMounted) {
		return (
			<BentoGridItem
				className={`flex flex-col justify-between ${colorClasses[color]}`}
				header={
					header && (
						<div className="h-20 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg flex items-center justify-center">
							{header}
						</div>
					)
				}
				icon={
					<div className={`text-3xl ${iconColorClasses[color]}`}>
						{icon}
					</div>
				}
				title={
					<div className="space-y-1">
						<p className="text-sm uppercase tracking-wider text-slate-400">
							{label}
						</p>
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold text-slate-50">
								{value}
							</span>
							{unit && (
								<span className="text-lg text-slate-400">{unit}</span>
							)}
						</div>
					</div>
				}
				description={
					<div className="space-y-2">
						<p className="text-sm text-slate-400">{subtext}</p>
						{trend && (
							<div
								className={`text-sm font-medium flex items-center gap-1 ${
									trend.direction === "up"
										? "text-emerald-400"
										: "text-rose-400"
								}`}
							>
								{trend.direction === "up" ? "↑" : "↓"} {trend.amount}
								{trend.amount > 1 ? "h" : "%"} {trend.period}
							</div>
						)}
					</div>
				}
			/>
		);
	}

	return (
		<m.div
			initial={{ opacity: 1, y: 0 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{
				duration: 0.5,
				delay: index * 0.1,
				ease: "easeOut",
			}}
		>
			<BentoGridItem
				className={`flex flex-col justify-between ${colorClasses[color]}`}
				header={
					header && (
						<m.div
							whileHover={{ scale: 1.05 }}
							className="h-20 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg flex items-center justify-center"
						>
							{header}
						</m.div>
					)
				}
				icon={
					<m.div
						whileHover={{ scale: 1.2, rotate: 10 }}
						className={`text-3xl ${iconColorClasses[color]}`}
					>
						{icon}
					</m.div>
				}
				title={
					<div className="space-y-1">
						<p className="text-sm uppercase tracking-wider text-slate-400">
							{label}
						</p>
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold text-slate-50">
								<NumberTicker
									value={value}
									className="text-3xl font-bold"
								/>
							</span>
							{unit && (
								<span className="text-lg text-slate-400">{unit}</span>
							)}
						</div>
					</div>
				}
				description={
					<div className="space-y-2">
						<p className="text-sm text-slate-400">{subtext}</p>
						{trend && (
							<m.div
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								transition={{ delay: 0.5 }}
								className={`text-sm font-medium flex items-center gap-1 ${
									trend.direction === "up"
										? "text-emerald-400"
										: "text-rose-400"
								}`}
							>
								{trend.direction === "up" ? "↑" : "↓"} {trend.amount}
								{trend.amount > 1 ? "h" : "%"} {trend.period}
							</m.div>
						)}
					</div>
				}
			/>
		</m.div>
	);
}
