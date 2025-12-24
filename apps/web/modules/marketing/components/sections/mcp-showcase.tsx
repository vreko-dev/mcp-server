"use client";

import { MessageSquare, Shield, Zap } from "lucide-react";
import { motion } from "motion/react";

const features = [
	{
		title: "Risk Assessment",
		description: "AI asks SnapBack to evaluate changes before making them",
	},
	{
		title: "Auto-Snapshot",
		description: "Automatically creates restore points for risky operations",
	},
	{
		title: "Pattern Learning",
		description: "Learns which patterns break your specific codebase",
	},
];

export function MCPShowcase() {
	return (
		<section className="py-20 bg-gradient-to-b from-[#0A0A0A] to-[#111111]">
			<div className="container mx-auto px-4 max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34D399]/10 text-[#34D399] text-sm mb-4">
						<Zap className="h-4 w-4" />
						Pro Feature
					</div>
					<h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
						Your AI assistant knows when to be careful
					</h2>
					<p className="text-[#A0A0A0] max-w-2xl mx-auto">
						SnapBack integrates with Claude Code and Cursor via MCP. Before making risky changes, your AI
						can check with SnapBack first.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6 md:p-8"
				>
					{/* Mock conversation */}
					<div className="space-y-4 font-mono text-sm">
						<div className="flex gap-3">
							<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
								<MessageSquare className="h-4 w-4 text-blue-400" />
							</div>
							<div className="bg-[#252525] rounded-lg p-3 flex-1">
								<p className="text-white/80">"Refactor the auth module to use the new API"</p>
							</div>
						</div>

						<div className="flex gap-3">
							<div className="w-8 h-8 rounded-full bg-[#34D399]/20 flex items-center justify-center flex-shrink-0">
								<Shield className="h-4 w-4 text-[#34D399]" />
							</div>
							<div className="bg-[#1e2a1e] border border-[#34D399]/20 rounded-lg p-3 flex-1">
								<p className="text-[#34D399]/80 text-xs mb-1">SnapBack MCP Response</p>
								<p className="text-white/80">
									High-risk operation detected. This will modify 12 files including auth.ts, which has
									been flagged as break-prone in your codebase.
									<span className="text-[#34D399]"> Snapshot created automatically.</span>
								</p>
							</div>
						</div>

						<div className="flex gap-3">
							<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
								<MessageSquare className="h-4 w-4 text-blue-400" />
							</div>
							<div className="bg-[#252525] rounded-lg p-3 flex-1">
								<p className="text-white/80">
									Claude proceeds with confidence, knowing you can restore if needed.
								</p>
							</div>
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.4 }}
					className="mt-8 grid md:grid-cols-3 gap-4"
				>
					{features.map((item) => (
						<div key={item.title} className="bg-[#151515] rounded-lg p-4 border border-white/5">
							<h3 className="text-white font-medium mb-1">{item.title}</h3>
							<p className="text-[#888888] text-sm">{item.description}</p>
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
