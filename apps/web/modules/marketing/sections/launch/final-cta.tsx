"use client";

import { AnalyticsEvents } from "@analytics";
import { siteSpec } from "@marketing/config/site-config";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

export function FinalCTA() {
	const { final_cta } = siteSpec.pages.home.sections;
	const [isMobile, setIsMobile] = useState(false);

	// Handle hydration safely
	useEffect(() => {
		setIsMobile(window.innerWidth < 768);
	}, []);

	return (
		<section className="relative py-32 bg-[#0A0A0A] overflow-hidden">
			{/* Subtle grain texture - disabled until asset added */}
			{/* <div className="absolute inset-0 bg-[url('/grain.png')] opacity-[0.015] pointer-events-none" /> */}

			<div className="container mx-auto px-4 relative z-10">
				<div className="text-center max-w-2xl mx-auto">
					<h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Stop losing code to AI mistakes.</h2>

					<p className="text-lg text-[#A0A0A0] mb-12">
						{isMobile ? (
							<>
								Join 2,847 Pioneers protecting their work.
								<br />
								<span className="text-sm text-[#888888] mt-2 inline-block">
									Install on desktop or join the program for early access.
								</span>
							</>
						) : (
							<>
								Join 2,847 Pioneers protecting their work.
								<br />
								<span className="text-sm text-[#888888] mt-2 inline-block">
									Program ends at launch—benefits lock in forever.
								</span>
							</>
						)}
					</p>

					{/* Mobile CTA: Pioneer first, Install second */}
					{isMobile ? (
						<div className="flex flex-col gap-3 mb-8">
							{/* Primary on mobile: Pioneer signup (works on phone) */}
							<Link
								href="/pioneer"
								className="inline-flex items-center justify-center px-8 py-4 bg-[#34D399] text-black hover:bg-[#34D399]/90 font-semibold text-lg rounded-lg transition-all active:scale-95"
								onClick={() =>
									posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
										source_section: "final_cta_mobile_pioneer",
									})
								}
							>
								Become a Pioneer
							</Link>

							{/* Secondary on mobile: Go to desktop install page */}
							<Link
								href={final_cta.content.primary_cta.href}
								className="inline-flex items-center justify-center px-8 py-4 border border-[#34D399] text-[#34D399] hover:bg-[#34D399]/5 font-semibold rounded-lg transition-all active:bg-[#34D399]/10"
								onClick={() =>
									posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
										source_section: "final_cta_mobile_install",
									})
								}
							>
								View for Desktop →
							</Link>
						</div>
					) : (
						/* Desktop CTA: Install first, Pioneer second */
						<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
							<Link
								href={final_cta.content.primary_cta.href}
								className="inline-flex items-center justify-center px-8 py-4 bg-[#34D399] text-black hover:bg-[#34D399]/90 font-semibold text-lg rounded-lg transition-all hover:scale-105 hover:-translate-y-1"
								onClick={() =>
									posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
										source_section: "final_cta_desktop_install",
									})
								}
							>
								Install Extension →
							</Link>
							<Link
								href="/pioneer"
								className="inline-flex items-center justify-center px-8 py-4 border border-[#34D399] text-[#34D399] hover:bg-[#34D399]/10 font-semibold text-lg rounded-lg transition-all"
								onClick={() =>
									posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
										source_section: "final_cta_desktop_pioneer",
									})
								}
							>
								Become a Pioneer
							</Link>
						</div>
					)}

					{/* Trust Signals */}
					<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#888888]">
						<span>✓ Free forever</span>
						<span>•</span>
						<span>✓ 2 minutes to set up</span>
						<span>•</span>
						<span>✓ Works offline</span>
					</div>
				</div>
			</div>
		</section>
	);
}
