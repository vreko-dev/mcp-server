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
		<main className="min-h-screen bg-[#0A0A0A] pt-24 pb-24">
			<div className="container mx-auto px-4">
				{/* Overview */}
				<section className="text-center mb-32 space-y-6 max-w-4xl mx-auto">
					<h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
						{overview.content.headline}
					</h1>
					<p className="text-xl text-[#A0A0A0] leading-relaxed">
						{overview.content.body}
					</p>
				</section>

				{/* Triggers */}
				<section className="mb-32">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="space-y-8">
							<h2 className="text-3xl font-bold text-white">
								{triggers.content.headline}
							</h2>
							<p className="text-lg text-[#A0A0A0]">{triggers.content.body}</p>
							<div className="space-y-6">
								{triggers.content.triggers.map((trigger, index) => (
									<div key={index} className="flex gap-4">
										<div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-2xl flex-shrink-0">
											{index === 0
												? "💾"
												: index === 1
													? "🧪"
													: index === 2
														? "🌿"
														: "🤖"}
										</div>
										<div>
											<h3 className="text-lg font-semibold text-white">
												{trigger.title}
											</h3>
											<p className="text-[#888]">{trigger.description}</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="relative h-[500px] bg-[#111] rounded-3xl border border-[#222] overflow-hidden">
							{/* Placeholder for visual representation of triggers */}
							<div className="absolute inset-0 flex items-center justify-center text-[#333] font-mono text-sm">
								[Triggers Visualization]
							</div>
						</div>
					</div>
				</section>

				{/* Sessions Timeline */}
				<section className="mb-32 text-center max-w-5xl mx-auto">
					<h2 className="text-3xl font-bold text-white mb-6">
						{sessions_timeline.content.headline}
					</h2>
					<p className="text-lg text-[#A0A0A0] mb-12 max-w-3xl mx-auto">
						{sessions_timeline.content.body}
					</p>
					<div className="grid md:grid-cols-3 gap-8 text-left">
						{sessions_timeline.content.highlights.map((highlight, index) => (
							<div
								key={index}
								className="p-6 rounded-2xl bg-[#111] border border-[#222]"
							>
								<div className="text-[var(--snapback-green)] mb-4 text-xl">
									✓
								</div>
								<p className="text-white">{highlight}</p>
							</div>
						))}
					</div>
				</section>

				{/* Restore Flows */}
				<section className="mb-32">
					<h2 className="text-3xl font-bold text-white text-center mb-16">
						{restore_flows.content.headline}
					</h2>
					<div className="grid md:grid-cols-3 gap-8">
						{restore_flows.content.tabs.map((tab, index) => (
							<div
								key={index}
								className="p-8 rounded-3xl bg-[#111] border border-[#222] hover:border-[var(--snapback-green)]/30 transition-colors"
							>
								<div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-4">
									{tab.label}
								</div>
								<h3 className="text-xl font-bold text-white mb-4">
									{tab.title}
								</h3>
								<p className="text-[#A0A0A0] leading-relaxed">{tab.body}</p>
							</div>
						))}
					</div>
				</section>

				{/* Architecture */}
				<section className="mb-32 bg-[#050505] rounded-3xl border border-[#111] p-8 lg:p-16">
					<div className="max-w-3xl mx-auto text-center space-y-8">
						<h2 className="text-3xl font-bold text-white">
							{architecture.content.headline}
						</h2>
						<p className="text-lg text-[#A0A0A0]">
							{architecture.content.body}
						</p>
						<div className="grid md:grid-cols-3 gap-8 pt-8 text-left">
							{architecture.content.bullets.map((bullet, index) => {
								const [title, desc] = bullet.split(" – ");
								return (
									<div key={index} className="space-y-2">
										<h3 className="font-semibold text-white">{title}</h3>
										<p className="text-sm text-[#666]">{desc}</p>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				{/* Roadmap */}
				<section className="text-center max-w-2xl mx-auto space-y-12">
					<h2 className="text-3xl font-bold text-white">
						{roadmap.content.headline}
					</h2>
					<div className="space-y-4 text-left inline-block">
						{roadmap.content.items.map((item, index) => (
							<div key={index} className="flex items-center gap-3">
								<div className="w-2 h-2 rounded-full bg-[var(--snapback-green)]" />
								<span className="text-white">{item}</span>
							</div>
						))}
					</div>
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						{roadmap.content.ctas.map((cta, index) => (
							<Link
								key={index}
								href={cta.href}
								onClick={() =>
									cta.href.includes("alpha") &&
									posthog.capture(AnalyticsEvents.ALPHA_SIGNUP_STARTED, {
										source_section: "product_roadmap",
									})
								}
							>
								{index === 1 ? (
									<ShimmerButton className="bg-white text-black hover:bg-white/90 font-semibold">
										{cta.label}
									</ShimmerButton>
								) : (
									<button
										type="button"
										className="px-6 py-3 text-[#A0A0A0] hover:text-white transition-colors"
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
