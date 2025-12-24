"use client";

import { AnalyticsEvents } from "@analytics";
import { useTimeOnPage } from "@analytics/hooks/use-time-on-page";

import { PricingCard, type PricingCardData } from "@marketing/components/ui/pricing-card";
import { ChevronDown } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import posthog from "posthog-js";
import React from "react";

const pricingTiers: PricingCardData[] = [
	{
		id: "free",
		name: "Free",

		price: 0,
		description: "Catches your mistakes", // Updated tagline
		persona: "Getting started",
		headline: "Perfect for trying SnapBack", // Revert or unused
		features: {
			mustShow: [
				{
					text: "VS Code extension",
					category: "protection",
				},
				{
					text: "CLI tool", // Removed Coming Soon badge
					category: "protection",
				},
				{
					text: "Unlimited local snapshots",
					category: "protection",
				},
				{
					text: "Community support",
					category: "collaboration",
				},
			],
			viewMore: [
				{
					text: "Watch, Warn, Block protection levels",
					category: "protection",
				},
				{
					text: "Local MCP scan", // Removed Coming Soon badge
					category: "intelligence",
				},
				{
					text: "Local SQLite storage",
					category: "protection",
				},
				{
					text: "Manual snapshot creation",
					category: "protection",
				},
			],
		},
		limitations: ["No cloud backup", "No team sharing", "No Guardian AI detection"],
		cta: {
			text: "Install Extension",
			href: "https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode",
			variant: "outline",
		},
	},
	{
		id: "pro",
		name: "Pro",
		price: 12,
		annualPrice: 24,
		description: "Learns your codebase", // Updated tagline
		persona: "Individual power users",
		headline: "Most popular for individuals",
		popular: true,
		features: {
			mustShow: [
				{
					text: "Everything in Free, plus:",
					category: "protection",
				},
				{
					text: "Cloud backup & sync",
					category: "protection",
				},
				{
					text: "Guardian AI detection (learns your patterns over time)",
					category: "intelligence",
				},
				{
					text: "Session time-travel (multi-file restore)",
					category: "protection",
				},
			],
			viewMore: [
				{
					text: "5GB cloud backup storage",
					category: "protection",
				},
				{
					text: "30-day cloud retention",
					category: "protection",
				},
				{
					text: "Backend MCP server", // Removed Coming Soon badge
					category: "intelligence",
				},
				{
					text: "Automatic session snapshots (idle, blur, commit)",
					category: "protection",
				},
				{
					text: "Secret & mock detection plugins",
					category: "intelligence",
				},
				{
					text: "Phantom dependency detection",
					category: "intelligence",
				},
				{
					text: "Priority email support (48h SLA)",
					category: "collaboration",
				},
			],
		},
		cta: {
			text: "Become a Pioneer",
			href: "/pioneer",
			variant: "primary",
		},
	},
	{
		id: "team",
		name: "Team",
		price: 29,
		annualPrice: 24,
		description: "Shared protection", // Updated tagline
		persona: "Teams shipping with AI",
		headline: "Best for teams of 3+",
		features: {
			mustShow: [
				{
					text: "Everything in Free, plus:",
					category: "protection",
				},
				{
					text: "Shared team snapshots",
					category: "collaboration",
				},
				{
					text: "Team-wide .snapbackrc policies",
					category: "compliance",
				},
				{
					text: "Team usage analytics dashboard",
					category: "intelligence",
				},
			],
			viewMore: [
				{
					text: "50GB shared cloud storage",
					category: "protection",
				},
				{
					text: "90-day cloud retention",
					category: "protection",
				},
				{
					text: "10 team seats included",
					category: "collaboration",
				},
				{
					text: "Centralized session management",
					category: "collaboration",
				},
				{
					text: "Role-based access control",
					category: "compliance",
				},
				{
					text: "Slack/Teams notifications",
					category: "collaboration",
				},
				{
					text: "GitHub/GitLab webhooks",
					category: "compliance",
				},
				{
					text: "SSO support (SAML/OAuth)",
					category: "compliance",
				},
				{
					text: "Priority email support (24h SLA)",
					category: "collaboration",
				},
			],
		},
		cta: {
			text: "Request Demo",
			href: "/pioneer?plan=team",
			variant: "primary",
		},
	},
];

const faqs = [
	{
		question: "How does SnapBack catch mistakes?",
		answer: "SnapBack watches your file system for changes. When it detects a high-risk pattern or entropy change (like an AI hallucination or accidental deletion), it flags it immediately. It captures a snapshot before the change is applied, giving you an instant undo button.",
	},
	{
		question: "Can I use it with Cursor, Copilot, or Claude?",
		answer: "Yes. SnapBack works at the file system level, so it protects you regardless of which AI tool you use. It sits between your editor and the disk, ensuring that no AI agent can break your code without a safety net.",
	},
	{
		question: "Is my code sent to the cloud?",
		answer: "On the Free plan, no. Everything stays 100% local on your machine in an SQLite database. On Pro and Team plans, encrypted snapshots are synced to our secure cloud for backup and cross-device syncing, but we never train on your code.",
	},
	{
		question: "How is this different from Git?",
		answer: "Git is for commits. SnapBack is for everything in between. It captures the messy, rapid-fire changes that AI agents make before you're ready to commit. It's granular, automatic, and designed specifically for the AI workflow loop.",
	},
	{
		question: "Does it slow down my editor?",
		answer: "No. SnapBack is written in Rust and optimized for performance. Snapshots take <200ms and risk checks happen in <10ms. You won't notice it running until it saves you from a disaster.",
	},
	{
		question: "What happens if I cancel?",
		answer: "You keep all your local data forever. Cloud access stops at the end of the billing cycle, but you can always export your cloud snapshots before then.",
	},
];

export default function PricingClient() {
	const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annual">("monthly");
	const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null);

	useTimeOnPage("pricing");

	return (
		<main className="min-h-screen bg-[#0A0A0A]">
			{/* Hero Section */}
			<section className="container max-w-6xl mx-auto pt-24 pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-12"
				>
					<h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
						Simple,{" "}
						<span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
							Transparent
						</span>{" "}
						Pricing
					</h1>
					<p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
						Start free, upgrade when you need cloud backup and team features.
						<br />
						30-day money-back guarantee on all paid plans.
					</p>

					{/* Integration Logos */}
					<div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm text-[#666]">
						<span>Works with:</span>
						<span className="text-white font-medium">Cursor</span>
						<span className="text-white/30">•</span>
						<span className="text-white font-medium">Copilot</span>
						<span className="text-white/30">•</span>
						<span className="text-white font-medium">Claude Code</span>
						<span className="text-white/30">•</span>
						<span className="text-white font-medium">Windsurf</span>
					</div>

					{/* Billing Toggle */}
					<div className="flex items-center justify-center gap-4 mb-8">
						<span
							className={`text-sm ${billingCycle === "monthly" ? "text-white font-medium" : "text-gray-400"}`}
						>
							Monthly
						</span>
						<button
							type="button"
							onClick={() => {
								const newValue = billingCycle === "monthly" ? "annual" : "monthly";
								setBillingCycle(newValue);
								posthog.capture(AnalyticsEvents.PRICING_TOGGLE_CHANGED, {
									value_before: billingCycle,
									value_after: newValue,
								});
							}}
							className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
							aria-label="Toggle billing cycle"
						>
							<span
								className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
									billingCycle === "annual" ? "translate-x-7" : "translate-x-1"
								}`}
							/>
						</button>
						<span
							className={`text-sm ${billingCycle === "annual" ? "text-white font-medium" : "text-gray-400"}`}
						>
							Annual <span className="text-emerald-400 text-xs font-semibold">(Save 17%)</span>
						</span>
					</div>
				</m.div>
			</section>

			{/* Pricing Cards */}
			<section className="container max-w-7xl mx-auto pb-24 px-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{pricingTiers.map((tier, index) => (
						<PricingCard key={tier.id} tier={tier} billingCycle={billingCycle} index={index} />
					))}
				</div>

				{/* Trust Signals */}
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="mt-16 text-center"
				>
					<div className="flex flex-wrap justify-center gap-8 text-gray-300">
						<div className="flex items-center gap-2">
							<span className="text-emerald-400 text-xl">✓</span>
							<span>30-day money-back guarantee</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-emerald-400 text-xl">✓</span>
							<span>Cancel anytime</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-emerald-400 text-xl">✓</span>
							<span>No credit card for Free plan</span>
						</div>
					</div>

					{/* Differentiator */}
					<p className="mt-8 text-[#666] text-sm">
						Git doesn't know when AI touched your code.{" "}
						<span className="text-white font-medium">SnapBack does.</span>
					</p>
				</m.div>
			</section>

			{/* FAQ Section */}
			<section className="container max-w-4xl mx-auto pb-24 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="text-center mb-12"
				>
					<h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
					<p className="text-lg text-gray-300">
						Got questions? Check our{" "}
						<Link
							href="https://new-docs.snapback.dev/faq"
							className="text-emerald-400 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
						>
							full FAQ
						</Link>{" "}
						or{" "}
						<Link
							href="https://new-docs.snapback.dev"
							className="text-emerald-400 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
						>
							documentation
						</Link>
						.
					</p>
				</m.div>

				<div className="space-y-4">
					{faqs.map((faq, index) => {
						const isOpen = openFaqIndex === index;
						return (
							<m.div
								key={faq.question}
								initial={{ opacity: 1, y: 0 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-100px" }}
								transition={{ duration: 0.5, delay: index * 0.05 }}
								className="bg-[#0E0E0E] backdrop-blur-sm border border-[#222] rounded-xl hover:border-emerald-400/30 transition-all"
							>
								<button
									type="button"
									onClick={() => setOpenFaqIndex(isOpen ? null : index)}
									className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-xl"
									aria-expanded={isOpen}
									aria-controls={`faq-answer-${index}`}
								>
									<span className="text-lg font-semibold text-white">{faq.question}</span>
									<m.div
										animate={{ rotate: isOpen ? 180 : 0 }}
										transition={{ duration: 0.2 }}
										className="flex-shrink-0 mt-1"
									>
										<ChevronDown className="w-5 h-5 text-gray-400" />
									</m.div>
								</button>

								<div
									className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
									id={`faq-answer-${index}`}
									role="region"
									aria-labelledby={`faq-question-${index}`}
								>
									<div className="overflow-hidden">
										<div className="px-6 pb-5 text-gray-300 leading-relaxed">{faq.answer}</div>
									</div>
								</div>
							</m.div>
						);
					})}
				</div>

				{/* Additional Support CTA */}
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="mt-12 text-center"
				>
					<p className="text-gray-300 mb-4">Still have questions? Our team is here to help.</p>
					<Link
						href="https://new-docs.snapback.dev/faq"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
					>
						View All FAQs →
					</Link>
				</m.div>
			</section>

			{/* Final CTA */}
			<section className="container max-w-4xl mx-auto pb-24 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 border border-emerald-400/30 rounded-2xl p-12 text-center"
				>
					<h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to protect your code?</h2>
					<p className="text-xl text-gray-300 mb-8">
						Start with the free plan. Upgrade anytime for cloud backup and team features.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<a
							href="https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode"
							target="_blank"
							rel="noopener noreferrer"
							className="px-8 py-4 bg-emerald-400 hover:bg-emerald-400/90 text-black font-bold rounded-xl transition-all text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
						>
							Install Free Extension
						</a>
						<Link
							href="/pioneer"
							className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all text-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900"
						>
							Become a Pioneer
						</Link>
					</div>
				</m.div>
			</section>
		</main>
	);
}
