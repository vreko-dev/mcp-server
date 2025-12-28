"use client";

/**
 * @deprecated This component is an earlier iteration with embedded logic.
 * Use the active implementation at: apps/web/app/(marketing)/pricing/client.tsx
 * Which uses the modular PricingCard component from: @marketing/components/ui/pricing-card
 *
 * This file is kept for reference and backward compatibility.
 * Key differences:
 * - Active version uses typed PricingCardData interface
 * - Active version has better accessibility (aria-labels, focus states)
 * - Active version integrates with PostHog analytics properly
 * - Active version uses modular, composable components
 */

import { ProtectiveHover, SnapButton, SnapEntrance, SnapStagger } from "@marketing/components/ui/snap-motion";
import { type PricingTier, type Stat, useContent } from "@marketing/hooks/use-content";
import { marketingAnalytics } from "@marketing/lib/track-event";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useState } from "react";

export function PricingSection() {
	const content = useContent();
	const [expandedTier, setExpandedTier] = useState<string | null>(null); // All collapsed by default
	const [billingCycle, setBillingCycle] = useState("monthly");

	const { pricing } = content;

	return (
		<section className="py-24 bg-slate-900" id="pricing">
			<div className="max-w-7xl mx-auto px-4">
				{/* Header with SnapBack animations */}
				<div className="text-center mb-12">
					<SnapEntrance direction="up" intensity="normal">
						<h2 className="text-4xl md:text-6xl font-bold text-white mb-6">{pricing.header.title}</h2>
					</SnapEntrance>
					<SnapEntrance direction="up" delay={0.1}>
						<p className="text-xl text-gray-300 max-w-3xl mx-auto">{pricing.header.description}</p>
					</SnapEntrance>
				</div>

				{/* Billing Toggle with SnapBack protection */}
				<SnapEntrance direction="scale" delay={0.2}>
					<div className="flex justify-center mb-16">
						<ProtectiveHover intensity="subtle" protectionGlow>
							<div className="bg-gray-900 p-1 rounded-full border border-gray-700">
								<SnapButton
									variant={billingCycle === "monthly" ? "primary" : "ghost"}
									size="sm"
									onClick={() => setBillingCycle("monthly")}
									className={`rounded-full transition-all duration-200 ${
										billingCycle === "monthly"
											? "bg-[#10B981] text-black font-bold shadow-lg shadow-[#10B981]/30"
											: "text-gray-400 hover:text-white bg-transparent"
									}`}
									protective={billingCycle === "monthly"}
								>
									Monthly
								</SnapButton>
								<SnapButton
									variant={billingCycle === "yearly" ? "primary" : "ghost"}
									size="sm"
									onClick={() => setBillingCycle("yearly")}
									className={`rounded-full transition-all duration-200 ${
										billingCycle === "yearly"
											? "bg-[#10B981] text-black font-semibold shadow-lg shadow-[#10B981]/30"
											: "text-gray-400 hover:text-white bg-transparent"
									}`}
									protective={billingCycle === "yearly"}
								>
									Yearly (Save 20%)
								</SnapButton>
							</div>
						</ProtectiveHover>
					</div>
				</SnapEntrance>

				{/* Pricing Cards with SnapBack stagger */}
				<SnapStagger stagger={0.08} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
					{pricing.tiers.map((tier: PricingTier) => (
						<div key={tier.id} className={`relative ${tier.popular ? "lg:-mt-8" : ""}`}>
							{/* Popular Badge */}
							{tier.popular && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
									<Badge className="bg-gradient-to-r from-[#FF6B35] to-[#EF4444] text-white px-4 py-1 rounded-full text-sm font-semibold">
										🔥 {tier.highlight}
									</Badge>
								</div>
							)}

							{/* Card */}
							<div
								className={`relative h-full bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-6 flex flex-col ${
									tier.popular
										? "border-[#FF6B35] shadow-lg shadow-[#FF6B35]/20"
										: "border-gray-700 hover:border-gray-600"
								} ${
									expandedTier === tier.id ? "ring-2 ring-[#10B981]" : ""
								} transition-all duration-300`}
							>
								{/* Header */}
								<div className="mb-6">
									<h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
									<div className="flex items-baseline mb-2">
										<span className="text-4xl font-bold text-white">
											{typeof tier.price === "string"
												? tier.price
												: `$${
														billingCycle === "yearly"
															? Math.floor(tier.price * 0.8)
															: tier.price
													}`}
										</span>
										<span className="text-gray-400 ml-1">{tier.unit}</span>
									</div>
									<p className="text-sm text-gray-400">{tier.description}</p>
									{tier.savings && (
										<div className="mt-2 text-[#10B981] text-sm font-medium">💰 {tier.savings}</div>
									)}
								</div>

								{/* Quick Features (Always Visible) */}
								<div className="mb-6">
									{(
										tier.features.basic ||
										tier.features.protection ||
										(Object.values(tier.features)[0] as string[])
									)
										?.slice(0, 3)
										?.map((feature: string) => (
											<div key={feature} className="flex items-start mb-2">
												<span className="text-[#10B981] mr-2 mt-0.5">✓</span>
												<span className="text-sm text-gray-300">{feature}</span>
											</div>
										))}

									{/* Show limitations for the free tier */}
									{tier.features.limitations && expandedTier !== tier.id && (
										<div className="text-xs text-gray-500 mt-2">
											{tier.features.limitations[0]}
											...
										</div>
									)}
								</div>

								{/* Expand/Collapse Button */}
								<button
									type="button"
									onClick={() => setExpandedTier(expandedTier === tier.id ? null : tier.id)}
									className="flex items-center text-sm text-gray-400 hover:text-white mb-6 transition-colors"
								>
									{expandedTier === tier.id ? (
										<>
											Show less <ChevronUpIcon className="ml-1 w-4 h-4" />
										</>
									) : (
										<>
											See all features <ChevronDownIcon className="ml-1 w-4 h-4" />
										</>
									)}
								</button>

								{/* Expanded Features */}
								<AnimatePresence>
									{expandedTier === tier.id && (
										<m.div
											initial={{ height: 0, opacity: 0 }}
											animate={{
												height: "auto",
												opacity: 1,
											}}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3 }}
											className="overflow-hidden mb-6"
										>
											{Object.entries(tier.features).map(
												([category, items]: [string, string[] | undefined]) => (
													<div key={category} className="mb-4">
														<h4 className="text-xs uppercase text-gray-500 mb-2 font-semibold">
															{category.replace(/_/g, " ")}
														</h4>
														{Array.isArray(items) &&
															items.map((item: string) => (
																<div
																	key={`${category}-${item}`}
																	className="text-sm mb-1 text-gray-300"
																>
																	{category === "limitations" ? (
																		<span className="text-red-400">✗ {item}</span>
																	) : (
																		<span className="text-[#10B981]">✓ </span>
																	)}
																	{item}
																</div>
															))}
													</div>
												),
											)}
										</m.div>
									)}
								</AnimatePresence>

								{/* CTA Button */}
								<div className="mt-auto">
									{(() => {
										const href =
											tier.id === "enterprise"
												? "/contact/sales?plan=enterprise"
												: `/auth/signup?plan=${tier.id}&billing=${billingCycle}`;

										return (
											<Button
												asChild
												onClick={() =>
													marketingAnalytics.planSelected(
														tier.id,
														billingCycle === "yearly" ? "yearly" : "monthly",
													)
												}
												className={`w-full py-3 font-semibold transition-all ${
													tier.ctaStyle === "primary"
														? "bg-gradient-to-r from-[#FF6B35] to-[#EF4444] text-white hover:shadow-lg hover:shadow-[#FF6B35]/30"
														: "bg-transparent border border-gray-600 text-white hover:border-gray-400 hover:bg-gray-800/50"
												}`}
											>
												<Link href={href}>{tier.cta}</Link>
											</Button>
										);
									})()}
								</div>
							</div>
						</div>
					))}
				</SnapStagger>

				{/* Trust Signals */}
				<div className="text-center">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
						{pricing.trust_signals.stats.map((stat: Stat, index: number) => (
							<SnapEntrance key={stat.label} delay={index * 0.1}>
								<div className="text-center">
									<div className="text-3xl font-bold text-[#10B981] mb-2">
										{stat.prefix}
										{stat.value.toLocaleString()}
										{stat.suffix}
									</div>
									<p className="text-sm text-gray-400">{stat.label}</p>
								</div>
							</SnapEntrance>
						))}
					</div>

					<p className="text-gray-300 text-lg">{pricing.trust_signals.incentive}</p>
				</div>
			</div>
		</section>
	);
}
