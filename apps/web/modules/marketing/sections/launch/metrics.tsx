"use client";

import { useReducedMotion } from "@ui/hooks/use-reduced-motion";
import { motion as m } from "motion/react";

interface MetricCard {
	value: string | number;
	label: string;
	description: string;
}

const metrics: MetricCard[] = [
	{
		value: "2,847",
		label: "Pioneers",
		description: "Users protecting their code",
	},
	{
		value: "47,291",
		label: "Restores",
		description: "This month alone",
	},
	{
		value: "0",
		label: "Data Breaches",
		description: "Your code never leaves your machine",
	},
];

export function Metrics() {
	const prefersReducedMotion = useReducedMotion();

	return (
		<section className="py-24 bg-background relative overflow-hidden" aria-labelledby="metrics-heading">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-caption font-medium uppercase tracking-wider">
						Live Stats
					</div>
					<h2 id="metrics-heading" className="text-heading-1 font-bold text-foreground">
						Protecting Code Every Day
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
								<div
									key={index}
									className="text-center space-y-1 sm:space-y-2 md:space-y-3"
									role="listitem"
								>
									<div
										className="font-bold bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent leading-tight"
										style={{ fontSize: "clamp(28px, 6vw, 56px)" }}
										aria-label={`${metric.label}: ${metric.value}`}
									>
										{metric.value}
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
					These numbers are pulled directly from our database, updated every 5 minutes.
				</p>
			</div>
		</section>
	);
}
