"use client";

import { AnalyticsEvents } from "@analytics";
import { ShimmerButton } from "@marketing/components/ui/shimmer-button";
import { siteSpec } from "@marketing/config/site-config";
import Link from "next/link";
import posthog from "posthog-js";

export default function GettingStartedPage() {
	const { getting_started } = siteSpec.pages;
	const { intro, install, first_restore, best_practices, alpha } = getting_started.sections;

	return (
		<main className="min-h-screen bg-background pt-24 pb-24">
			<div className="container mx-auto px-4 max-w-4xl">
				{/* Intro */}
				<section className="text-center mb-20 space-y-6">
					<h1 className="text-4xl lg:text-6xl font-bold text-foreground">{intro.content.headline}</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">{intro.content.body}</p>
				</section>

				{/* Install */}
				<section className="mb-20 space-y-8">
					<div className="flex items-center gap-4 mb-8">
						<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-xl">
							1
						</div>
						<h2 className="text-3xl font-bold text-foreground">{install.content.headline}</h2>
					</div>
					<div className="grid gap-6">
						{install.content.steps.map((step) => (
							<div
								key={`install-step-${step.title}`}
								className="p-6 rounded-2xl bg-card-dark border border-border-subtle flex flex-col md:flex-row gap-6 items-start md:items-center"
							>
								<div className="flex-1 space-y-2">
									<h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
									<p className="text-muted-foreground">{step.body}</p>
								</div>
								{step.cta && (
									<Link
										href={step.cta.href}
										onClick={() =>
											posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
												source_section: "getting_started",
											})
										}
									>
										<ShimmerButton className="bg-blue-500 text-white hover:bg-blue-600 font-semibold whitespace-nowrap">
											{step.cta.label}
										</ShimmerButton>
									</Link>
								)}
							</div>
						))}
					</div>
				</section>

				{/* First Restore */}
				<section className="mb-20 space-y-8">
					<div className="flex items-center gap-4 mb-8">
						<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-xl">
							2
						</div>
						<h2 className="text-3xl font-bold text-foreground">{first_restore.content.headline}</h2>
					</div>
					<div className="relative border-l-2 border-border-subtle ml-5 pl-10 space-y-12 py-4">
						{first_restore.content.steps.map((step) => (
							<div key={`restore-step-${step.title}`} className="relative">
								<div className="absolute -left-[49px] top-1 w-4 h-4 rounded-full bg-border-subtle border-2 border-background" />
								<h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
								<p className="text-muted-foreground">{step.body}</p>
							</div>
						))}
					</div>
					<p className="text-center text-lg text-foreground font-medium pt-8">
						{first_restore.content.closing}
					</p>
				</section>

				{/* Best Practices */}
				<section className="mb-20 space-y-8">
					<h2 className="text-3xl font-bold text-foreground text-center mb-12">
						{best_practices.content.headline}
					</h2>
					<div className="grid md:grid-cols-3 gap-6">
						{best_practices.content.tips.map((tip) => (
							<div
								key={`tip-${tip.title}`}
								className="p-6 rounded-2xl bg-card-dark border border-border-subtle hover:border-accent/30 transition-colors"
							>
								<div className="text-2xl mb-4">💡</div>
								<h3 className="text-lg font-semibold text-foreground mb-2">{tip.title}</h3>
								<p className="text-muted-foreground text-sm">{tip.body}</p>
							</div>
						))}
					</div>
				</section>

				{/* Alpha CTA */}
				<section className="text-center p-12 rounded-3xl bg-gradient-to-b from-card-dark to-background border border-border-subtle">
					<h2 className="text-3xl font-bold text-foreground mb-4">{alpha.content.headline}</h2>
					<p className="text-muted-foreground mb-8 max-w-xl mx-auto">{alpha.content.body}</p>
					<Link
						href={alpha.content.primary_cta.href}
						onClick={() =>
							posthog.capture(AnalyticsEvents.ALPHA_SIGNUP_STARTED, {
								source_section: "getting_started_footer",
							})
						}
					>
						<ShimmerButton className="bg-white text-black hover:bg-white/90 font-semibold mx-auto">
							{alpha.content.primary_cta.label}
						</ShimmerButton>
					</Link>
				</section>
			</div>
		</main>
	);
}
