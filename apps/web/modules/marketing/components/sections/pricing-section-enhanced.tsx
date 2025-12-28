"use client";

/**
 * @deprecated This component is a bridge/transition implementation.
 * Use the active implementation at: apps/web/app/(marketing)/pricing/client.tsx
 * Which uses the same PricingCard component but with better data structure.
 *
 * This file uses useContent() which has incompatible data format.
 * The active version defines PricingCardData[] directly with proper typing.
 *
 * If you need content-driven pricing, update useContent() to match PricingCardData interface.
 */

import { PricingCard } from "@marketing/components/ui/pricing-card";
import { PricingToggle } from "@marketing/components/ui/pricing-toggle";
import { SnapEntrance } from "@marketing/components/ui/snap-motion";
import { useContent } from "@marketing/hooks/use-content";
import { cn } from "@ui/lib";
import { m } from "motion/react";
import { useState } from "react";

export function PricingSectionEnhanced() {
	const content = useContent();
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

	const { pricing } = content;

	// Transform content data to match PricingCard interface
	const pricingCards = pricing.tiers.map((tier) => ({
		...tier,
		price: tier.price as number | "Custom",
		persona: tier.name, // Use name as persona
		headline: tier.highlight, // Use highlight as headline
	}));

	return (
		<section className="py-24 bg-gradient-to-b from-black to-slate-900 relative overflow-hidden" id="pricing">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF6B35]/10 via-transparent to-transparent" />
			<div className="absolute inset-0 bg-grid-white/[0.02]" />

			<div className="max-w-7xl mx-auto px-4 relative z-10">
				{/* Header */}
				<div className="text-center mb-12">
					<SnapEntrance direction="up" intensity="normal">
						<h2 className="text-4xl md:text-6xl font-bold text-white mb-6">{pricing.header.title}</h2>
					</SnapEntrance>
					<SnapEntrance direction="up" delay={0.1}>
						<p className="text-xl text-gray-300 max-w-3xl mx-auto">{pricing.header.description}</p>
					</SnapEntrance>
				</div>

				{/* Billing Toggle */}
				<SnapEntrance direction="scale" delay={0.2}>
					<div className="flex justify-center mb-16">
						<PricingToggle value={billingCycle} onChange={setBillingCycle} />
					</div>
				</SnapEntrance>

				{/* Pricing Cards Grid */}
				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
					{pricingCards.map((tier, index) => (
						<PricingCard key={tier.id} tier={tier as any} billingCycle={billingCycle} index={index} />
					))}
				</div>

				{/* Trust Signals */}
				<SnapEntrance direction="up" delay={0.3}>
					<div className="text-center mb-12">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
							{pricing.trust_signals.stats.map((stat, index) => (
								<m.div
									key={stat.label}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										delay: index * 0.1 + 0.4,
										duration: 0.5,
									}}
									className="text-center"
								>
									<div className="text-3xl font-bold text-[#10B981] mb-2">
										{stat.prefix}
										{stat.value.toLocaleString()}
										{stat.suffix}
									</div>
									<p className="text-sm text-gray-400">{stat.label}</p>
								</m.div>
							))}
						</div>

						<p className="text-gray-300 text-lg mb-6">{pricing.trust_signals.incentive}</p>

						{/* Guarantees */}
						<div className="flex flex-wrap justify-center gap-6 mt-8">
							{(pricing.trust_signals as any).guarantees?.map((guarantee: any, index: number) => (
								<m.div
									key={guarantee.text}
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									viewport={{ once: true }}
									transition={{
										delay: index * 0.1 + 0.5,
										duration: 0.3,
									}}
									className="flex items-center gap-2 text-gray-400"
								>
									<span className="text-2xl">{guarantee.icon}</span>
									<span className="text-sm">{guarantee.text}</span>
								</m.div>
							))}
						</div>
					</div>
				</SnapEntrance>

				{/* FAQ Section */}
				<SnapEntrance direction="up" delay={0.4}>
					<div className="max-w-3xl mx-auto mt-20">
						<h3 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h3>

						<div className="space-y-6">
							{(pricing as any).faq?.map((item: any, index: number) => (
								<m.div
									key={item.question}
									initial={{ opacity: 0, y: 10 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										delay: index * 0.1,
										duration: 0.4,
									}}
									className={cn(
										"bg-gray-900/50 backdrop-blur-sm border border-gray-700",
										"rounded-xl p-6",
										"hover:border-gray-600 transition-colors",
									)}
								>
									<h4 className="text-lg font-semibold text-white mb-3">{item.question}</h4>
									<p className="text-gray-400 leading-relaxed">{item.answer}</p>
								</m.div>
							))}
						</div>
					</div>
				</SnapEntrance>

				{/* CTA Footer */}
				<SnapEntrance direction="up" delay={0.5}>
					<div className="text-center mt-16 py-12 border-t border-gray-800">
						<h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
						<p className="text-gray-400 mb-6">
							Our team is here to help you choose the right plan for your needs.
						</p>
						<a
							href="/contact"
							className={cn(
								"inline-flex items-center justify-center",
								"px-8 py-3 rounded-lg font-semibold",
								"bg-gradient-to-r from-[#FF6B35] to-[#EF4444]",
								"text-white shadow-lg shadow-[#FF6B35]/30",
								"hover:shadow-xl hover:shadow-[#FF6B35]/40",
								"transition-all duration-200",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]",
							)}
						>
							Contact Sales
						</a>
					</div>
				</SnapEntrance>
			</div>
		</section>
	);
}
