"use client";

import { AnalyticsEvents } from "@analytics";
import { useTimeOnPage } from "@analytics/hooks/use-time-on-page";
import { ComingSoonBadge } from "@marketing/components/ui/coming-soon-badge";
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
		description: "Open Source Core",
		persona: "Getting started",
		headline: "Perfect for trying SnapBack",
		features: {
			mustShow: [
				{
					text: "VS Code extension",
					category: "protection",
				},
				{
					text: (
						<span className="flex items-center gap-2">
							CLI tool <ComingSoonBadge variant="inline" text="Coming Soon" />
						</span>
					),
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
					text: (
						<span className="flex items-center gap-2">
							Local MCP scan <ComingSoonBadge variant="inline" text="Coming Soon" />
						</span>
					),
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
		description: "Enhanced Protection",
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
					text: "Guardian AI detection (94% Day 1 accuracy, improves over time)",
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
					text: (
						<span className="flex items-center gap-2">
							Backend MCP server <ComingSoonBadge variant="inline" text="Coming Soon" />
						</span>
					),
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
			text: "Start Free Trial",
			href: "/waitlist",
			variant: "primary",
		},
	},
	{
		id: "team",
		name: "Team",
		price: 29,
		annualPrice: 24,
		description: "Collaborative Safety",
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
			href: "/waitlist?plan=team",
			variant: "primary",
		},
	},
];

const faqs = [
	{
		question: "Do I need a credit card to start?",
		answer: "No! The Free plan is completely free forever with no credit card required. Pro and Team plans offer a 14-day free trial, also with no credit card needed upfront.",
	},
	{
		question: "What's included in the Free plan?",
		answer: "The Free plan includes the full VS Code extension and CLI with unlimited local snapshots. You get basic AI detection, manual snapshot creation, and community support. It's perfect for trying SnapBack or solo developers who don't need cloud backup.",
	},
	{
		question: "How does Guardian AI detection work?",
		answer: "Guardian uses multiple detection plugins (secrets, mocks, phantom dependencies) with 94% accuracy on Day 1. Accuracy improves as it learns your codebase. It analyzes code changes in real-time using regex patterns, Shannon entropy analysis, and import/package.json validation. Available in Pro and Team plans.",
	},
	{
		question: "Can I switch plans later?",
		answer: "Yes! You can upgrade or downgrade anytime. Upgrades take effect immediately, and downgrades apply at the end of your current billing cycle. All your snapshots and data are preserved during plan changes.",
	},
	{
		question: "What's the difference between Pro and Team?",
		answer: "Pro is for individual power users and includes cloud backup, Guardian detection, and session time-travel. Team adds shared snapshots, team policies via .snapbackrc, analytics dashboard, SSO, and collaboration features for teams of 3+.",
	},
	{
		question: "Do you offer refunds?",
		answer: "Yes! We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied for any reason within the first 30 days, contact support for a full refund—no questions asked.",
	},
	{
		question: "How does MCP integration work?",
		answer: "The MCP server (coming soon, planned for Pro+) will expose Guardian detection, dependency checks, and snapshot creation to AI assistants like Claude and Cursor. Your AI will be able to analyze risks before making changes and create checkpoints automatically.",
	},
	{
		question: "What happens to my data if I downgrade to Free?",
		answer: "Your local snapshots remain intact. Cloud backups are retained for 30 days after downgrade in case you want to re-upgrade. After 30 days, cloud data is permanently deleted but your local snapshots are never affected.",
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

								<m.div
									initial={false}
									animate={{
										height: isOpen ? "auto" : 0,
										opacity: isOpen ? 1 : 0,
									}}
									transition={{
										duration: 0.3,
										ease: "easeInOut",
									}}
									className="overflow-hidden"
									id={`faq-answer-${index}`}
									role="region"
									aria-labelledby={`faq-question-${index}`}
								>
									<div className="px-6 pb-5 text-gray-300 leading-relaxed">{faq.answer}</div>
								</m.div>
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
							href="/waitlist"
							className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all text-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900"
						>
							Request Access (Solo/Team)
						</Link>
					</div>
				</m.div>
			</section>
		</main>
	);
}
