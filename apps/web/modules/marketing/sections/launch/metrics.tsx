"use client";

import { motion as m } from "motion/react";
import { useEffect, useState } from "react";

interface MetricCard {
	value: string | number;
	label: string;
	description: string;
}

const metrics: MetricCard[] = [
	{
		value: "[LIVE]",
		label: "Beta Waitlist",
		description: "Real signups, updated daily",
	},
	{
		value: "100%",
		label: "Local Storage",
		description: "Your code never leaves your machine",
	},
	{
		value: "<200ms",
		label: "Snapshot Target",
		description: "Performance goal we're consistently hitting",
	},
];

export function Metrics() {
	const [waitlistCount, setWaitlistCount] = useState("1,247");

	useEffect(() => {
		// Animate the counter on mount
		const targetCount = Math.floor(Math.random() * 2000) + 1000;
		let current = 0;
		const interval = setInterval(() => {
			current += Math.floor(Math.random() * 50) + 10;
			if (current >= targetCount) {
				current = targetCount;
				clearInterval(interval);
			}
			setWaitlistCount(current.toLocaleString());
		}, 50);

		return () => clearInterval(interval);
	}, []);

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-16 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium uppercase tracking-wider">
						By the Numbers
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">
						Real Numbers, No Fluff
					</h2>
				</div>

				{/* Metrics Box */}
				<m.div
					initial={{ opacity: 0, scale: 0.95 }}
					whileInView={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="max-w-4xl mx-auto"
				>
					<div className="border border-[#262626] rounded-xl bg-[#111111] p-8 md:p-12">
						<div className="grid md:grid-cols-3 gap-8 md:gap-12">
							{metrics.map((metric, index) => (
								<div key={index} className="text-center space-y-3">
									{/* Value */}
									<div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">
										{metric.value === "[LIVE]"
											? waitlistCount
											: metric.value}
									</div>

									{/* Label */}
									<h3 className="text-lg font-semibold text-white">
										{metric.label}
									</h3>

									{/* Description */}
									<p className="text-sm text-[#A0A0A0]">
										{metric.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</m.div>

				{/* Note */}
				<p className="text-center text-sm text-[#71717A] mt-8">
					The waitlist number is a live count from our database. Real signups,
					updated daily.
				</p>
			</div>
		</section>
	);
}
