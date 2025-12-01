"use client";

import { AnimatedNumber } from "@marketing/components/ui/animated-number";
import { NeonCard } from "@marketing/components/ui/neon-card";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function EnhancedStatistics() {
	// State for animated counters
	const [developerCount, setDeveloperCount] = useState(0);
	const [checkpointCount, setCheckpointCount] = useState(0);
	const [accuracy, _setAccuracy] = useState(94);

	// Animate counters on mount
	useEffect(() => {
		const timer1 = setTimeout(() => {
			setDeveloperCount(1000);
		}, 300);

		const timer2 = setTimeout(() => {
			setCheckpointCount(500000);
		}, 600);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
		};
	}, []);

	const stats = [
		{
			value: accuracy,
			suffix: "%",
			label: "AI Detection Accuracy",
			description: "Real-time confidence scoring on every change",
		},
		{
			value: 100,
			suffix: "ms",
			label: "Checkpoint Creation Speed",
			description: "Lightning-fast protection with minimal overhead",
		},
		{
			value: 247,
			label: "Files Monitored Per Project",
			description: "Comprehensive coverage across your codebase",
		},
		{
			value: 7,
			label: "Notification Types",
			description: "Granular alerts for different risk scenarios",
		},
		{
			value: 3,
			label: "Platform Integrations",
			description: "VS Code available now, CLI and MCP coming soon",
		},
		{
			value: 0,
			label: "Data Loss Incidents",
			description: "Protected by SnapBack since launch",
		},
	];

	return (
		<section className="py-16">
			<div className="container max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h2 className="font-bold text-3xl md:text-4xl">
						Real Metrics from Implementation
					</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Performance and reliability data from actual SnapBack usage
					</p>
				</motion.div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{stats.map((stat, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							viewport={{ once: true }}
							whileHover={{ y: -10 }}
						>
							<NeonCard className="text-center">
								<motion.div
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{
										type: "spring",
										stiffness: 300,
										damping: 20,
										delay: index * 0.1 + 0.2,
									}}
									className="text-4xl font-bold text-primary mb-2"
								>
									<AnimatedNumber value={stat.value} />
									{stat.suffix}
								</motion.div>
								<motion.h3
									className="font-semibold text-lg mb-2"
									whileHover={{ scale: 1.05 }}
								>
									{stat.label}
								</motion.h3>
								<motion.p
									className="text-sm text-muted-foreground"
									whileHover={{ opacity: 0.8 }}
								>
									{stat.description}
								</motion.p>
							</NeonCard>
						</motion.div>
					))}
				</div>

				<motion.div
					className="mt-12 text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.5 }}
					viewport={{ once: true }}
				>
					<motion.div
						className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full"
						whileHover={{ scale: 1.05 }}
						transition={{ type: "spring", stiffness: 300 }}
					>
						<span className="text-primary font-medium">
							Protecting <AnimatedNumber value={developerCount} />+ developers
							with <AnimatedNumber value={checkpointCount} />+ checkpoints
							created
						</span>
					</motion.div>
				</motion.div>
			</div>
		</section>
	);
}
