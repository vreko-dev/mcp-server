"use client";

import { motion as m } from "motion/react";
import { useReducedMotion } from "@ui/hooks/use-reduced-motion";
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
	const prefersReducedMotion = useReducedMotion();
	const [waitlistCount, setWaitlistCount] = useState("1,247");

	useEffect(() => {
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
		<section className="py-24 bg-background relative overflow-hidden" aria-labelledby="metrics-heading">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-caption font-medium uppercase tracking-wider">
						By the Numbers
					</div>
					<h2 id="metrics-heading" className="text-heading-1 font-bold text-foreground">
						Real Numbers, No Fluff
					</h2>
				</div>

				<m.div
					initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
					whileInView={{ opacity: 1, scale: 1 }}
					transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}
					viewport={{ once: true }}
					className="max-w-4xl mx-auto"
				>
					<div className="border border-border rounded-xl bg-card p-6 md:p-12">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-12" role="list">
							{metrics.map((metric, index) => (
								<div key={index} className="text-center space-y-1 sm:space-y-2 md:space-y-3" role="listitem">
										<div className="font-bold bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent leading-tight" style={{ fontSize: 'clamp(28px, 6vw, 56px)' }} aria-label={`${metric.label}: ${metric.value === "[LIVE]" ? waitlistCount : metric.value}`}>
										{metric.value === "[LIVE]" ? (
											waitlistCount
										) : metric.value === "100%" ? (
											<>
												100<span className="text-2xl sm:text-3xl md:text-4xl">%</span>
											</>
										) : (
											<>
												&lt;200<span className="text-2xl sm:text-3xl md:text-4xl">ms</span>
											</>
										)}
									</div>

									<h3 className="text-sm md:text-body-lg font-semibold text-foreground">
										{metric.label}
									</h3>

									<p className="text-xs md:text-body-sm text-muted-foreground leading-relaxed">
										{metric.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</m.div>

				<p className="text-center text-body-sm text-muted-foreground/60 mt-8">
					The waitlist number is a live count from our database. Real signups,
					updated daily.
				</p>
			</div>
		</section>
	);
}
