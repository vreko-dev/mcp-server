"use client";

import { cn } from "@ui/lib";
import { CheckCircle, Zap } from "lucide-react";
import { AnimatedNumber } from "./animated-number";

interface SocialProofMetricsProps {
	className?: string;
	variant?: "default" | "compact";
}

export function SocialProofMetrics({ className, variant = "default" }: SocialProofMetricsProps) {
	const metrics = [
		{
			icon: (
				<span className="relative flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF41] opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF41]" />
				</span>
			),
			value: 55,
			suffix: "+",
			label: "developers building the future of AI safety",
			showNumber: true,
		},
		{
			icon: <CheckCircle className="h-4 w-4 text-[#00FF41]" />,
			value: 12,
			prefix: "$",
			suffix: "k",
			label: "in losses prevented",
			showNumber: true,
		},
		{
			icon: <Zap className="h-4 w-4 text-[#FF9500]" />,
			value: 200,
			suffix: "ms",
			label: "average recovery",
			showNumber: true,
		},
	];

	if (variant === "compact") {
		return (
			<div className={cn("flex flex-wrap items-center justify-center gap-6 text-sm", className)}>
				{metrics.map((metric, index) => (
					<div key={index} className="flex items-center gap-2">
						{metric.icon}
						{metric.showNumber && (
							<>
								{metric.prefix}
								<AnimatedNumber value={metric.value} className="font-semibold text-white" />
								{metric.suffix}
							</>
						)}
						<span className="text-[#A0A0A0]">{metric.label}</span>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-sm", className)}>
			{metrics.map((metric, index) => (
				<div
					key={index}
					className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111111] border border-[#333333]"
				>
					{metric.icon}
					<span className="text-white font-medium">
						{metric.prefix}
						{metric.showNumber && <AnimatedNumber value={metric.value} className="font-semibold" />}
						{metric.suffix} <span className="text-[#A0A0A0] font-normal">{metric.label}</span>
					</span>
				</div>
			))}
		</div>
	);
}
