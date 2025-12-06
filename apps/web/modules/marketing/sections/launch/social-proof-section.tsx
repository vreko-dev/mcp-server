"use client";

import { AnalyticsEvents } from "@analytics";
import { ShimmerButton } from "@marketing/components/ui/shimmer-button";
import { siteSpec } from "@marketing/config/site-config";
import { m } from "motion/react";
import Link from "next/link";
import posthog from "posthog-js";

export function SocialProofSection() {
	const { social_proof } = siteSpec.pages.home.sections;

	return (
		<section className="py-32 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
					<h2 className="text-3xl lg:text-5xl font-bold text-white">{social_proof.content.headline}</h2>
					<p className="text-lg text-[#A0A0A0]">{social_proof.content.label}</p>
				</div>

				{/* Testimonials */}
				{social_proof.content.testimonials && social_proof.content.testimonials.length > 0 && (
					<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
						{social_proof.content.testimonials.map((testimonial: any, index: number) => (
							<m.div
								key={index}
								initial={{ opacity: 1, scale: 1 }}
								whileInView={{ opacity: 1, scale: 1 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1 }}
								className="p-8 rounded-2xl bg-[#111] border border-[#222] relative"
							>
								<div className="text-2xl text-[#333] absolute top-6 left-6 font-serif">"</div>
								<p className="text-lg text-white mb-6 relative z-10 pl-4">{testimonial.quote}</p>
								<div className="flex items-center gap-3 pl-4">
									<div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#333] to-[#111]" />
									<span className="text-sm text-[#888]">{testimonial.author}</span>
								</div>
							</m.div>
						))}
					</div>
				)}

				{/* CTA */}
				<div className="text-center space-y-4">
					<Link
						href={social_proof.content.cta.href}
						onClick={() =>
							posthog.capture(AnalyticsEvents.ALPHA_SIGNUP_STARTED, {
								source_section: "social_proof",
							})
						}
					>
						<ShimmerButton className="bg-white text-black hover:bg-white/90 font-semibold mx-auto">
							{social_proof.content.cta.label}
						</ShimmerButton>
					</Link>
					<p className="text-xs text-[#555]">{social_proof.content.cta.subtext}</p>
				</div>
			</div>
		</section>
	);
}
