"use client";

import { AnalyticsEvents } from "@analytics";
import { useScrollDepth } from "@analytics/hooks/use-scroll-depth";
import { ShimmerButton } from "@marketing/components/ui/shimmer-button";
import { siteSpec } from "@marketing/config/site-config";
import Link from "next/link";
import posthog from "posthog-js";

export default function ProductPage() {
	useScrollDepth("product");
	const { product } = siteSpec.pages;
	const {
		overview,
		triggers,
		sessions_timeline,
		restore_flows,
		architecture,
		roadmap,
	} = product.sections;

	return (
		<main className="min-h-screen bg-background pt-24 pb-24">
			<div className="container mx-auto px-4">
				{/* Overview */}
				<section className="text-center mb-32 space-y-6 max-w-4xl mx-auto">
					<h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
						{overview.content.headline}
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						{overview.content.body}
					</p>
				</section>

				{/* Triggers */}
				<section className="mb-32">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="space-y-8">
							<h2 className="text-3xl font-bold text-foreground">
								{triggers.content.headline}
							</h2>
							<p className="text-lg text-muted-foreground">
								{triggers.content.body}
							</p>
							<div className="space-y-6">
								{triggers.content.triggers.map((trigger, triggerIndex) => (
									<div key={`trigger-${trigger.title}`} className="flex gap-4">
										<div className="w-12 h-12 rounded-xl bg-card-dark border border-border-subtle flex items-center justify-center text-2xl flex-shrink-0">
											{triggerIndex === 0
												? "💾"
												: triggerIndex === 1
													? "🧪"
													: triggerIndex === 2
														? "🌿"
														: "🤖"}
										</div>
										<div>
											<h3 className="text-lg font-semibold text-foreground">
												{trigger.title}
											</h3>
											<p className="text-muted-foreground">
												{trigger.description}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="relative h-[500px] bg-card-dark rounded-3xl border border-border-subtle overflow-hidden">
							{/* Placeholder for visual representation of triggers */}
							<div className="absolute inset-0 flex items-center justify-center text-border-subtle font-mono text-sm">
								[Triggers Visualization]
							</div>
						</div>
					</div>
				</section>

				{/* Sessions Timeline */}
				<section className="mb-32 text-center max-w-5xl mx-auto">
					<h2 className="text-3xl font-bold text-foreground mb-6">
						{sessions_timeline.content.headline}
					</h2>
					<p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
						{sessions_timeline.content.body}
					</p>
					<div className="grid md:grid-cols-3 gap-8 text-left">
						{sessions_timeline.content.highlights.map((highlight) => (
							<div
								key={`highlight-${highlight}`}
								className="p-6 rounded-2xl bg-card-dark border border-border-subtle"
							>
								<div className="text-accent mb-4 text-xl">✓</div>
								<p className="text-foreground">{highlight}</p>
							</div>
						))}
					</div>
				</section>

				{/* Restore Flows */}
				<section className="mb-32">
					<h2 className="text-3xl font-bold text-foreground text-center mb-16">
						{restore_flows.content.headline}
					</h2>
					<div className="grid md:grid-cols-3 gap-8">
						{restore_flows.content.tabs.map((tab) => (
							<div
								key={`flow-${tab.label}`}
								className="p-8 rounded-3xl bg-card-dark border border-border-subtle hover:border-accent/30 transition-colors"
							>
								<div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
									{tab.label}
								</div>
								<h3 className="text-xl font-bold text-foreground mb-4">
									{tab.title}
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									{tab.body}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* Architecture */}
				<section className="mb-32 bg-card-dark rounded-3xl border border-border-subtle p-8 lg:p-16">
					<div className="max-w-3xl mx-auto text-center space-y-8">
						<h2 className="text-3xl font-bold text-foreground">
							{architecture.content.headline}
						</h2>
						<p className="text-lg text-muted-foreground">
							{architecture.content.body}
						</p>
						<div className="grid md:grid-cols-3 gap-8 pt-8 text-left">
							{architecture.content.bullets.map((bullet) => {
								const [title, desc] = bullet.split(" – ");
								return (
									<div key={`architecture-${title}`} className="space-y-2">
										<h3 className="font-semibold text-foreground">{title}</h3>
										<p className="text-sm text-muted-foreground">{desc}</p>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				{/* Roadmap */}
				<section className="text-center max-w-2xl mx-auto space-y-12">
					<h2 className="text-3xl font-bold text-foreground">
						{roadmap.content.headline}
					</h2>
					<div className="space-y-4 text-left inline-block">
						{roadmap.content.items.map((item) => (
							<div
								key={`roadmap-item-${item}`}
								className="flex items-center gap-3"
							>
								<div className="w-2 h-2 rounded-full bg-accent" />
								<span className="text-foreground">{item}</span>
							</div>
						))}
					</div>
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						{roadmap.content.ctas.map((cta, ctaIndex) => (
							<Link
								key={`cta-${cta.label}`}
								href={cta.href}
								onClick={() =>
									cta.href.includes("alpha") &&
									posthog.capture(AnalyticsEvents.ALPHA_SIGNUP_STARTED, {
										source_section: "product_roadmap",
									})
								}
							>
								{ctaIndex === 1 ? (
									<ShimmerButton className="bg-white text-black hover:bg-white/90 font-semibold">
										{cta.label}
									</ShimmerButton>
								) : (
									<button
										type="button"
										className="px-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
									>
										{cta.label}
									</button>
								)}
							</Link>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
