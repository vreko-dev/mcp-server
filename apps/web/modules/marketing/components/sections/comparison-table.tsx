"use client";

import { Check, Minus, X } from "lucide-react";
import { motion } from "motion/react";

const features = [
	{
		name: "Knows when AI touched your code",
		git: false,
		timeline: false,
		snapback: true,
	},
	{
		name: "Auto-protects before AI changes",
		git: false,
		timeline: false,
		snapback: true,
	},
	{
		name: "Detects Cursor, Copilot, Claude, Windsurf",
		git: false,
		timeline: false,
		snapback: true,
	},
	{
		name: "Groups related AI changes (sessions)",
		git: false,
		timeline: false,
		snapback: true,
	},
	{
		name: "One-click multi-file restore",
		git: "partial",
		timeline: false,
		snapback: true,
	},
	{
		name: "Works offline",
		git: true,
		timeline: true,
		snapback: true,
	},
	{
		name: "Learns from your patterns",
		git: false,
		timeline: false,
		snapback: true,
	},
	{
		name: "Free",
		git: true,
		timeline: true,
		snapback: true,
	},
] as const;

function FeatureIcon({ value }: { value: boolean | "partial" }) {
	if (value === true) {
		return <Check className="h-5 w-5 text-[#34D399]" aria-label="Yes" />;
	}
	if (value === "partial") {
		return <Minus className="h-5 w-5 text-yellow-500" aria-label="Partial" />;
	}
	return <X className="h-5 w-5 text-[#666666]" aria-label="No" />;
}

export function ComparisonTable() {
	return (
		<section className="py-20 bg-[#0A0A0A]">
			<div className="container mx-auto px-4 max-w-4xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why not just use Git?</h2>
					<p className="text-[#A0A0A0] max-w-2xl mx-auto">
						Git is for commits. SnapBack is for "oh no, what did AI just do?"
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="overflow-x-auto"
				>
					<table className="w-full">
						<thead>
							<tr className="border-b border-white/10">
								<th className="text-left py-4 px-4 text-[#888888] font-medium">Feature</th>
								<th className="text-center py-4 px-4 text-[#888888] font-medium w-24">Git</th>
								<th className="text-center py-4 px-4 text-[#888888] font-medium w-24">Timeline</th>
								<th className="text-center py-4 px-4 text-[#34D399] font-bold w-24">SnapBack</th>
							</tr>
						</thead>
						<tbody>
							{features.map((feature, index) => (
								<tr
									key={feature.name}
									className={`border-b border-white/5 ${index % 2 === 0 ? "bg-white/[0.02]" : ""}`}
								>
									<td className="py-4 px-4 text-white text-sm">{feature.name}</td>
									<td className="py-4 px-4 text-center">
										<div className="flex justify-center">
											<FeatureIcon value={feature.git} />
										</div>
									</td>
									<td className="py-4 px-4 text-center">
										<div className="flex justify-center">
											<FeatureIcon value={feature.timeline} />
										</div>
									</td>
									<td className="py-4 px-4 text-center">
										<div className="flex justify-center">
											<FeatureIcon value={feature.snapback} />
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</motion.div>

				<motion.p
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.4 }}
					className="text-center text-sm text-[#666666] mt-6"
				>
					Timeline = VS Code's built-in Local History feature
				</motion.p>
			</div>
		</section>
	);
}
