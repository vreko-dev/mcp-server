"use client";

import { motion as m } from "motion/react";

interface PrincipleCard {
	icon: string;
	title: string;
	status: string;
	statusColor: string;
	description: string;
	details: string;
}

const principles: PrincipleCard[] = [
	{
		icon: "💾",
		title: "Auto-Snapshots on Save",
		status: "✅ Working in Beta",
		statusColor: "#22C55E",
		description:
			"Every save triggers a lightweight snapshot. No commands to remember. No habits to build. Protection happens in the background.",
		details: "Technical detail: <50ms overhead per save",
	},
	{
		icon: "🔒",
		title: "100% Local-First",
		status: "✅ Core Architecture",
		statusColor: "#22C55E",
		description:
			"Your code never leaves your machine unless you explicitly enable cloud backup. We can't see your code. We don't want to.",
		details: "Technical detail: SQLite + filesystem storage",
	},
	{
		icon: "⚡",
		title: "One-Click Restore",
		status: "🚧 In Development",
		statusColor: "#EAB308",
		description:
			"Click any point in your timeline to restore. Atomic multi-file recovery—all or nothing, no corrupted half-states.",
		details: "Technical detail: Target <200ms restore time",
	},
];

export function CorePrinciples() {
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.2,
				delayChildren: 0,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.6 },
		},
	};

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-20 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium uppercase tracking-wider">
						Core Principles
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">Simple. Automatic. Local.</h2>
					<p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">
						Three principles we won't compromise on—ever.
					</p>
				</div>

				{/* Principles Grid */}
				<m.div
					className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
					variants={containerVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true, margin: "-100px" }}
				>
					{principles.map((principle, index) => (
						<m.div key={index} variants={itemVariants} className="group relative">
							{/* Card */}
							<div className="p-8 rounded-xl border border-[#262626] bg-[#111111] hover:bg-[#171717] transition-colors h-full flex flex-col gap-6">
								{/* Icon & Status */}
								<div className="space-y-3">
									<div className="text-4xl">{principle.icon}</div>
									<div className="flex items-center justify-between gap-4">
										<h3 className="text-xl font-bold text-white">{principle.title}</h3>
									</div>
									<div className="flex items-center gap-2">
										<div
											className="w-2 h-2 rounded-full"
											style={{ backgroundColor: principle.statusColor }}
										/>
										<span className="text-xs font-medium" style={{ color: principle.statusColor }}>
											{principle.status}
										</span>
									</div>
								</div>

								{/* Description */}
								<p className="text-[#A0A0A0] text-base leading-relaxed flex-grow">
									{principle.description}
								</p>

								{/* Technical Detail */}
								<div className="text-xs text-[#71717A]">{principle.details}</div>
							</div>
						</m.div>
					))}
				</m.div>
			</div>
		</section>
	);
}
