"use client";

import { AnalyticsEvents } from "@analytics";
import { siteSpec } from "@marketing/config/site-config";
import { RotateCcw, Save, Zap } from "lucide-react";
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

				{/* Simple 3-column grid instead of bento */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
					{how_it_works.content.steps.map((step, i) => (
						<div
							key={i}
							className="bg-[#111] border border-[#222] rounded-xl p-6 hover:border-[var(--snapback-green)]/50 transition-colors"
						>
							{step.screenshot && !step.screenshot.includes("[TODO") ? (
								<div className="relative w-full h-48 rounded-xl overflow-hidden mb-4">
									<Image src={step.screenshot} alt={step.title} fill className="object-cover" />
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 mb-4">
									<div className="text-[var(--snapback-green)] mb-3">
										{step.step_number === 1 && <Save className="w-12 h-12" />}
										{step.step_number === 2 && <Zap className="w-12 h-12" />}
										{step.step_number === 3 && <RotateCcw className="w-12 h-12" />}
									</div>
									{step.tag && (
										<div className="text-xs text-[#666] bg-[#0A0A0A] px-2 py-1 rounded border border-[#222]">
											{step.tag}
										</div>
									)}
								</div>
							)}
							<h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
							<p className="text-sm text-[#999]">{step.body}</p>
						</div>
					))}
				</div>

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
