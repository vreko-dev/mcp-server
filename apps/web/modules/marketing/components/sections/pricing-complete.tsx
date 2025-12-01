"use client";
import { cn } from "@marketing/lib/utils";
import { m } from "motion/react";

export function PricingSection() {
	const plans = [
		{
			name: "Free",
			price: "$0",
			period: "forever",
			description: "Perfect for trying SnapBack",
			features: [
				"5 checkpoints per day",
				"7-day history",
				"VS Code support",
				"Basic AI detection",
				"Community support",
			],
			cta: "Start Free",
			ctaVariant: "ghost" as const,
			popular: false,
		},
		{
			name: "Pro",
			price: "$19",
			period: "per month",
			description: "For serious developers",
			features: [
				"Unlimited checkpoints",
				"90-day history",
				"All IDE support",
				"Priority recovery",
				"Advanced AI detection",
				"Free SnapBack cap 🧢",
				"Email support",
			],
			cta: "Get your free cap",
			ctaVariant: "neon" as const,
			popular: true,
		},
		{
			name: "Teams",
			price: "$49",
			period: "per seat/month",
			description: "Built for development teams",
			features: [
				"Everything in Pro",
				"Shared checkpoints",
				"Team policies",
				"Admin dashboard",
				"Team analytics",
				"Slack integration",
				"Priority support",
			],
			cta: "Start team trial",
			ctaVariant: "accent" as const,
			popular: false,
		},
		{
			name: "Enterprise",
			price: "Custom",
			period: "contact us",
			description: "For large organizations",
			features: [
				"Custom retention policies",
				"SSO/SAML integration",
				"Audit logs",
				"SLA guarantee",
				"On-premise deployment",
				"Dedicated support",
				"Custom integrations",
			],
			cta: "Contact sales",
			ctaVariant: "secondary" as const,
			popular: false,
		},
	];

	return (
		<section className="py-24 relative">
			<div className="container mx-auto px-4">
				<div className="text-center mb-20">
					<h2 className="text-display font-black text-white mb-6">
						Simple, transparent pricing
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Start free. Upgrade when you need more.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
					{plans.map((plan, index) => (
						<PricingCard key={index} plan={plan} index={index} />
					))}
				</div>

				<div className="text-center mt-16">
					<p className="text-muted-foreground">
						All plans include our core protection features. Need something
						custom?{" "}
						<a href="#contact" className="text-primary underline-animate">
							Let's talk
						</a>
					</p>
				</div>
			</div>
		</section>
	);
}

const PricingCard = ({ plan, index }: { plan: any; index: number }) => {
	return (
		<m.div
			className={cn(
				"relative bg-card/30 border rounded-2xl p-8 hover:bg-card/50 transition-all duration-300 h-full flex flex-col",
				plan.popular
					? "border-primary/50 shadow-lg shadow-primary/20 scale-105 bg-card/40"
					: "border-border/50",
			)}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			whileHover={{ y: -5 }}
		>
			{plan.popular && (
				<div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
					<div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
						Most Popular
					</div>
				</div>
			)}

			<div className="text-center mb-8">
				<h3 className="text-2xl font-bold text-white mb-3">{plan.name}</h3>
				<div className="mb-3">
					<span className="text-5xl font-black text-white">{plan.price}</span>
					{plan.period !== "contact us" && (
						<span className="text-muted-foreground ml-2 text-lg">
							/{plan.period}
						</span>
					)}
				</div>
				<p className="text-muted-foreground">{plan.description}</p>
			</div>

			<ul className="space-y-4 mb-8 flex-grow">
				{plan.features.map((feature: string, featureIndex: number) => (
					<li key={featureIndex} className="flex items-start space-x-3">
						<div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 flex-shrink-0">
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								className="text-primary"
							>
								<path
									d="M10 3L4.5 8.5L2 6"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="text-sm text-muted-foreground leading-relaxed">
							{feature}
						</span>
					</li>
				))}
			</ul>

			<m.button
				className={cn(
					"w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 mt-auto",
					{
						"btn-neon": plan.ctaVariant === "neon",
						"btn-ghost": plan.ctaVariant === "ghost",
						"btn-accent": plan.ctaVariant === "accent",
						"btn-secondary": plan.ctaVariant === "secondary",
					},
				)}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				{plan.cta}
			</m.button>
		</m.div>
	);
};
