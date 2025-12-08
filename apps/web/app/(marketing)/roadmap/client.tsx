"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { m } from "motion/react";

export default function RoadmapClient() {
	const milestones = [
		{
			quarter: "Q1 2025",
			title: "Cloud Sync & Team Features",
			status: "dev",
			items: ["Shared snapshots", "Team policies", "Analytics dashboard"],
		},
		{
			quarter: "Q2 2025",
			title: "Advanced Guardian Detection",
			status: "planned",
			items: ["ML-powered risk scoring", "Custom detection plugins", "API contract monitoring"],
		},
		{
			quarter: "Q3 2025",
			title: "JetBrains & Multi-IDE Support",
			status: "planned",
			items: ["IntelliJ, PyCharm, WebStorm extensions", "Unified snapshot sync"],
		},
		{
			quarter: "Q4 2025",
			title: "Enterprise Features",
			status: "planned",
			items: ["SSO, SAML", "Air-gapped deployment", "Compliance certifications"],
		},
	];

	return (
		<main className="min-h-screen bg-[#0A0A0A] pt-24 pb-24">
			<div className="container max-w-4xl mx-auto px-4">
				<m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
					<h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Product Roadmap</h1>
					<p className="text-xl text-gray-400">Building the safety layer for the AI age.</p>
				</m.div>

				<div className="space-y-8 relative">
					{/* Vertical Line */}
					<div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-800 md:left-1/2 md:-ml-px" />

					{milestones.map((milestone, index) => (
						<m.div
							key={milestone.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 }}
							className={`relative flex items-start gap-8 md:gap-0 ${
								index % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row"
							}`}
						>
							{/* Icon */}
							<div className="absolute left-0 md:left-1/2 md:-ml-3.5 w-14 h-14 flex items-center justify-center z-10">
								<div className="w-7 h-7 rounded-full bg-[#0A0A0A] border-4 border-emerald-500/20 flex items-center justify-center">
									{milestone.status === "completed" ? (
										<CheckCircle2 className="w-4 h-4 text-emerald-400" />
									) : milestone.status === "dev" ? (
										<div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
									) : (
										<Circle className="w-3 h-3 text-gray-600" />
									)}
								</div>
							</div>

							{/* Content Spacer for Alignment */}
							<div className="hidden md:block w-1/2" />

							{/* Card */}
							<div
								className={`flex-1 pl-12 md:pl-0 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12 md:text-left"}`}
							>
								<div className="bg-[#0E0E0E] border border-[#222] rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
									<div
										className={`flex flex-col gap-1 mb-4 ${index % 2 === 0 ? "md:items-end" : "md:items-start"}`}
									>
										<span className="text-emerald-400 font-mono text-sm">{milestone.quarter}</span>
										<h3 className="text-xl font-bold text-white">{milestone.title}</h3>
									</div>

									<ul
										className={`space-y-2 ${index % 2 === 0 ? "md:items-end" : "md:items-start"} flex flex-col`}
									>
										{milestone.items.map((item) => (
											<li key={item} className="text-gray-400 text-sm flex items-center gap-2">
												{index % 2 !== 0 && (
													<ArrowRight className="w-3 h-3 text-emerald-500/50" />
												)}
												{item}
												{index % 2 === 0 && (
													<ArrowRight className="w-3 h-3 text-emerald-500/50 rotate-180" />
												)}
											</li>
										))}
									</ul>
								</div>
							</div>
						</m.div>
					))}
				</div>
			</div>
		</main>
	);
}
