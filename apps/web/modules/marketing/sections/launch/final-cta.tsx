"use client";

import { AnalyticsEvents } from "@analytics";
import { ShimmerButton } from "@marketing/components/ui/shimmer-button";
import { siteSpec } from "@marketing/config/site-config";
import Link from "next/link";
import posthog from "posthog-js";

export function FinalCTA() {
	const { final_cta } = siteSpec.pages.home.sections;

	return (
		<section className="relative py-32 bg-[#0A0A0A] overflow-hidden">
			{/* Subtle grain texture - disabled until asset added */}
			{/* <div className="absolute inset-0 bg-[url('/grain.png')] opacity-[0.015] pointer-events-none" /> */}

			<div className="container mx-auto px-4 relative z-10">
				<div className="text-center max-w-2xl mx-auto">
					<h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">{final_cta.content.headline}</h2>

					<p className="text-lg text-[#A0A0A0] mb-12">{final_cta.content.body}</p>

					{/* Primary CTA */}
					<div className="mb-4">
						<Link
							href={final_cta.content.primary_cta.href}
							onClick={() =>
								posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
									source_section: "final_cta",
								})
							}
						>
							<ShimmerButton
								className="bg-[#00FF41] text-black hover:bg-[#00FF41]/90 font-semibold text-lg px-10 py-5"
								shimmerColor="#00FF41"
							>
								{final_cta.content.primary_cta.label} →
							</ShimmerButton>
						</Link>
					</div>

					{/* Trust Signals */}
					<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#888888]">
						<span>✓ Works offline</span>
						<span>•</span>
						<span>✓ No account required</span>
						<span>•</span>
						<span>✓ Local storage only</span>
					</div>
				</div>
			</div>
		</section>
	);
}
