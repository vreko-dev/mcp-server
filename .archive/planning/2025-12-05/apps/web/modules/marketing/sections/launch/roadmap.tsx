"use client";

import { ChevronRight } from "lucide-react";
import { motion as m } from "motion/react";
import Link from "next/link";

interface RoadmapPhase {
	quarter: string;
	title: string;
	items: Array<{
		icon: string;
		label: string;
	}>;
}

const phases: RoadmapPhase[] = [
	{
		quarter: "Q4 2025 — Alpha (Current)",
		title: "Alpha",
		items: [
			{ icon: "✅", label: "Local snapshot engine" },
			{ icon: "✅", label: "VS Code extension (basic)" },
			{ icon: "✅", label: "Session timeline view" },
			{ icon: "✅", label: "Manual restore" },
			{ icon: "🚧", label: "Multi-file atomic restore" },
		],
	},
	{
		quarter: "Q1 2026 — Beta Launch",
		title: "Beta Launch",
		items: [
			{ icon: "📋", label: "Cloud backup & sync" },
			{ icon: "📋", label: "Guardian AI detection" },
			{ icon: "📋", label: "Cursor integration" },
			{ icon: "📋", label: "CLI tool" },
			{ icon: "📋", label: "Team sharing (basic)" },
		],
	},
	{
		quarter: "Q2 2026 — Version 1.0",
		title: "Version 1.0",
		items: [
			{ icon: "📋", label: "MCP integration" },
			{ icon: "📋", label: "SSO for teams" },
			{ icon: "📋", label: "Usage analytics" },
			{ icon: "📋", label: "Windsurf integration" },
			{ icon: "📋", label: "JetBrains plugin" },
		],
	},
];

export function Roadmap() {
	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-20 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-medium uppercase tracking-wider">
						The Roadmap
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">
						What We're Building—And When
					</h2>
					<p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">
						We develop in the open. Here's our timeline. Track our progress or
						request features on GitHub.
					</p>
				</div>

				{/* Timeline */}
				<div className="max-w-5xl mx-auto space-y-12">
					{phases.map((phase, index) => (
						<m.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="space-y-4"
						>
							{/* Phase Header */}
							<div className="flex items-center gap-4 pb-4 border-b border-[#262626]">
								<h3 className="text-lg font-bold text-white">
									{phase.quarter}
								</h3>
							</div>

							{/* Items */}
							<div className="space-y-3 ml-4">
								{phase.items.map((item, itemIndex) => (
									<div
										key={itemIndex}
										className="flex items-center gap-3 text-[#A0A0A0]"
									>
										<span className="text-base">{item.icon}</span>
										<span>{item.label}</span>
									</div>
								))}
							</div>
						</m.div>
					))}
				</div>

				{/* Legend */}
				<m.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					viewport={{ once: true }}
					className="flex flex-wrap justify-center gap-8 mt-16 pt-12 border-t border-[#262626]"
				>
					<div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
						<span className="text-base">✅</span>
						<span>Complete</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
						<span className="text-base">🚧</span>
						<span>In Progress</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
						<span className="text-base">📋</span>
						<span>Planned</span>
					</div>
				</m.div>

				{/* CTAs */}
				<m.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
					className="flex flex-col sm:flex-row justify-center gap-4 mt-16"
				>
					<Link
						href="https://github.com/snapback/roadmap"
						className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white hover:text-[#10B981] transition-colors font-medium"
					>
						View Full Roadmap on GitHub
						<ChevronRight className="w-4 h-4" />
					</Link>
					<Link
						href="https://github.com/snapback/roadmap/issues"
						className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white hover:text-[#10B981] transition-colors font-medium"
					>
						Request a Feature
						<ChevronRight className="w-4 h-4" />
					</Link>
				</m.div>
			</div>
		</section>
	);
}
