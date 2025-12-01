"use client";

import { AnalyticsEvents } from "@analytics";
import { siteSpec } from "@marketing/config/site-config";
import { cn } from "@marketing/lib/utils";
import { BentoGrid, BentoGridItem } from "@ui/components/aceternity/bento-grid";
import { Save, Zap, RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

export function HowItWorks() {
	const { how_it_works } = siteSpec.pages.home.sections;

	return (
		<section className="py-24 bg-[#0A0A0A]">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--snapback-green)]/10 border border-[var(--snapback-green)]/20 text-[var(--snapback-green)] text-xs font-medium uppercase tracking-wider">
						{how_it_works.content.label}
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white max-w-2xl mx-auto">
						{how_it_works.content.headline}
					</h2>
				</div>

				<BentoGrid className="max-w-5xl mx-auto">
					{how_it_works.content.steps.map((step, i) => (
						<BentoGridItem
							key={i}
							title={step.title}
							description={step.body}
							header={
								step.screenshot && !step.screenshot.includes("[TODO") ? (
									<div className="relative w-full h-full rounded-xl overflow-hidden">
										<Image
											src={step.screenshot}
											alt={step.title}
											fill
											className="object-cover group-hover:scale-105 transition-transform duration-300"
										/>
									</div>
								) : (
									<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-[#111] to-[#050505] border border-[#222] flex-col items-center justify-center p-4 group-hover:border-[var(--snapback-green)]/50 transition-colors">
										{/* Icon based on step number */}
										<div className="text-5xl mb-2 text-[var(--snapback-green)] group-hover:scale-110 transition-transform">
											{step.step_number === 1 && <Save className="w-12 h-12" />}
											{step.step_number === 2 && <Zap className="w-12 h-12" />}
											{step.step_number === 3 && <RotateCcw className="w-12 h-12" />}
										</div>
										{step.tag && (
											<div className="text-xs text-[#666] bg-[#111] px-2 py-1 rounded border border-[#222]">
												{step.tag}
											</div>
										)}
									</div>
								)
							}
							className={cn(i === 0 || i === 3 ? "md:col-span-2" : "")}
						/>
					))}
				</BentoGrid>

				<div className="text-center mt-12">
					<Link
						href={how_it_works.content.inline_cta.href}
						className="text-[var(--snapback-green)] hover:underline underline-offset-4 font-medium"
						onClick={() =>
							posthog.capture(AnalyticsEvents.HERO_CTA_CLICKED_SECONDARY, {
								location: "how_it_works",
							})
						}
					>
						{how_it_works.content.inline_cta.label}
					</Link>
				</div>
			</div>
		</section>
	);
}
