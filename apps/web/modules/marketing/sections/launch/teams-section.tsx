"use client";

import { siteSpec } from "@marketing/config/site-config";
import NumberTicker from "@ui/components/magic/number-ticker";
import { m } from "motion/react";

export function TeamsSection() {
	const { for_teams } = siteSpec.pages.home.sections;

	return (
		<section className="py-32 bg-[#0A0A0A] relative overflow-hidden">
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111] to-transparent opacity-50" />

			<div className="container mx-auto px-4 relative z-10">
				<div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
					<h2 className="text-3xl lg:text-5xl font-bold text-white">
						{for_teams.content.headline}
					</h2>
					<p className="text-lg text-[#A0A0A0] leading-relaxed">
						{for_teams.content.body}
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{for_teams.content.metric_cards.map((card, index) => (
						<m.div
							key={card.title}
							initial={{ opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.1 }}
							className="relative group"
						>
							<div className="absolute inset-0 bg-gradient-to-b from-[#222] to-[#111] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
							<div className="relative p-8 rounded-2xl border border-[#222] bg-[#0A0A0A]/50 backdrop-blur-sm group-hover:border-[#333] transition-colors h-full">
								<div className="text-4xl font-bold text-white mb-4">
									{index === 0 && (
										<>
											<NumberTicker value={10} className="text-white" />x
										</>
									)}
									{index === 1 && (
										<>
											<NumberTicker value={100} className="text-white" />%
										</>
									)}
									{index === 2 && (
										<>
											<NumberTicker value={0} className="text-white" />
										</>
									)}
								</div>
								<h3 className="text-xl font-semibold text-white mb-2">
									{card.title}
								</h3>
								<p className="text-[#A0A0A0] text-sm leading-relaxed">
									{card.description}
								</p>
							</div>
						</m.div>
					))}
				</div>
			</div>
		</section>
	);
}
