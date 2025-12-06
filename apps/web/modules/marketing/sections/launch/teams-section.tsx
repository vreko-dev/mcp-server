"use client";

import { siteSpec } from "@marketing/config/site-config";
import NumberTicker from "@ui/components/magic/number-ticker";
import { useReducedMotion } from "@ui/hooks/use-reduced-motion";
import { m } from "motion/react";

export function TeamsSection() {
	const { for_teams } = siteSpec.pages.home.sections;
	const prefersReducedMotion = useReducedMotion();

	return (
		<section className="py-32 bg-background relative overflow-hidden" aria-labelledby="teams-heading">
			<div
				className="absolute inset-0 bg-gradient-to-b from-transparent via-card to-transparent opacity-50"
				aria-hidden="true"
			/>

			<div className="container mx-auto px-4 relative z-10">
				<div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
					<h2 id="teams-heading" className="text-heading-1 font-bold text-foreground">
						{for_teams.content.headline}
					</h2>
					<p className="text-body-lg text-muted-foreground leading-relaxed">{for_teams.content.body}</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8" role="list">
					{for_teams.content.metric_cards.map((card, index) => (
						<m.div
							key={card.title}
							initial={{ opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={prefersReducedMotion ? { duration: 0 } : { delay: index * 0.1, duration: 0.5 }}
							className="relative group"
							role="listitem"
						>
							<div
								className="absolute inset-0 bg-gradient-to-b from-border to-card rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 motion-reduce:transition-none"
								aria-hidden="true"
							/>
							<div className="relative p-8 rounded-2xl border border-border bg-background/50 backdrop-blur-sm group-hover:border-border/60 transition-colors motion-reduce:transition-none h-full">
								<div
									className="text-4xl font-bold text-foreground mb-4"
									aria-label={`Metric: ${card.title}`}
								>
									{index === 0 && (
										<>
											<NumberTicker value={10} className="text-foreground" />x
										</>
									)}
									{index === 1 && (
										<>
											<NumberTicker value={100} className="text-foreground" />%
										</>
									)}
									{index === 2 && <span className="text-foreground">100%</span>}
								</div>
								<h3 className="text-heading-3 font-semibold text-foreground mb-2">{card.title}</h3>
								<p className="text-muted-foreground text-body-sm leading-relaxed">{card.description}</p>
							</div>
						</m.div>
					))}
				</div>
			</div>
		</section>
	);
}
