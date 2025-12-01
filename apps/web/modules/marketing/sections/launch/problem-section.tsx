"use client";

import { siteSpec } from "@marketing/config/site-config";
import { m } from "motion/react";

export function ProblemSection() {
	const { problem } = siteSpec.pages.home.sections;

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					{/* Left: Copy */}
					<div className="space-y-8">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium uppercase tracking-wider">
							{problem.content.label}
						</div>
						<h2 className="text-3xl lg:text-5xl font-bold text-white leading-tight">
							{problem.content.headline}
						</h2>
						<p className="text-lg text-[#A0A0A0] leading-relaxed">
							{problem.content.body}
						</p>
						<p className="text-lg font-medium text-white">
							{problem.content.closing}
						</p>
					</div>

					{/* Right: Timeline Visual */}
					<div className="relative">
						<div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#333] to-transparent" />
						<div className="space-y-12 relative z-10">
								{problem.content.timeline_items.map((item, index) => (
									<m.div
										key={item.title}
										initial={{ opacity: 1, x: 0 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: index * 0.2 }}
										className="flex gap-6 group"
									>
										<div className="relative mt-1">
											<div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center group-hover:border-red-500/50 transition-colors duration-500">
												<span className="text-2xl">
													{index === 0 ? "↩️" : index === 1 ? "🤖" : "💥"}
												</span>
											</div>
											{/* Connector dot */}
											<div className="absolute top-1/2 -left-[33px] w-3 h-3 rounded-full bg-[#333] border-2 border-[#0A0A0A] group-hover:bg-red-500 transition-colors duration-500" />
										</div>
										<div className="space-y-2 pt-2">
											<h3 className="text-xl font-semibold text-white group-hover:text-red-400 transition-colors">
												{item.title}
											</h3>
											<p className="text-[#A0A0A0]">{item.description}</p>
										</div>
									</m.div>
								))}
							</div>
						</div>
				</div>
			</div>
		</section>
	);
}
