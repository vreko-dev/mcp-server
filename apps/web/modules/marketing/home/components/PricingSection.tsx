"use client";

import { Card3D } from "@marketing/components/ui/3d-card";
import { Button } from "@ui/components/button";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	RocketIcon,
	ShieldCheckIcon,
	UsersIcon,
	ZapIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export function PricingSection() {
	const [isMounted, setIsMounted] = useState(false);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
		"annual",
	);
	const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const togglePlanExpansion = (planName: string) => {
		setExpandedPlan(expandedPlan === planName ? null : planName);
	};

	const plans = [
		{
			name: "Starter",
			description: "Perfect for individual developers",
			price: {
				monthly: "$0",
				annual: "$0",
			},
			period: "forever",
			features: [
				"Up to 5 projects",
				"Basic AI detection",
				"Manual checkpoints",
				"VS Code extension",
				"Community support",
			],
			expandedFeatures: [
				"Local checkpoint storage",
				"Basic recovery options",
				"Email support (48h response)",
				"Community forum access",
				"Documentation & guides",
			],
			cta: "Get Started Free",
			popular: false,
		},
		{
			name: "Pro",
			description: "For professional developers and teams",
			price: {
				monthly: "$12",
				annual: "$10",
			},
			period:
				billingCycle === "annual" ? "per month, billed annually" : "per month",
			features: [
				"Unlimited projects",
				"Advanced AI detection",
				"Automatic checkpoints",
				"All integrations",
				"Priority support",
				"Recovery analytics",
				"Team workspaces",
			],
			expandedFeatures: [
				"Cloud backup storage (10GB)",
				"Advanced recovery algorithms",
				"Priority email & chat support",
				"Custom checkpoint scheduling",
				"Team collaboration tools",
				"API access for custom integrations",
				"Advanced analytics dashboard",
				"Weekly security reports",
			],
			cta: "Start Free Trial",
			popular: true,
		},
		{
			name: "Enterprise",
			description: "For organizations with advanced needs",
			price: {
				monthly: "Custom",
				annual: "Custom",
			},
			period: "",
			features: [
				"Everything in Pro",
				"SSO/SAML authentication",
				"Custom AI models",
				"Dedicated infrastructure",
				"SLA guarantees",
				"Security audits",
				"Custom integrations",
			],
			expandedFeatures: [
				"Unlimited cloud storage",
				"Dedicated account manager",
				"24/7 premium support",
				"Custom AI model training",
				"On-premise deployment options",
				"Advanced security & compliance",
				"Custom reporting & analytics",
				"Training & onboarding sessions",
				"SLA with 99.99% uptime guarantee",
			],
			cta: "Contact Sales",
			popular: false,
		},
	];

	const stats = [
		{
			value: "10k+",
			label: "Developers Protected",
			icon: UsersIcon,
		},
		{
			value: "99.9%",
			label: "Uptime",
			icon: ZapIcon,
		},
		{
			value: "500k+",
			label: "Checkpoints Created",
			icon: RocketIcon,
		},
		{
			value: "24/7",
			label: "Support",
			icon: ShieldCheckIcon,
		},
	];

	return (
		<section id="pricing" className="scroll-my-20 py-16 lg:py-24">
			<div className="container max-w-5xl">
				<motion.div
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center"
				>
					<h2 className="font-bold text-3xl md:text-4xl lg:text-5xl">
						Simple, Transparent <span className="text-primary">Pricing</span>
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-balance text-lg">
						Choose the plan that works best for you and your team
					</p>

					<div className="mt-8 inline-flex rounded-full border bg-card p-1">
						<button
							type="button"
							onClick={() => setBillingCycle("monthly")}
							className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
								billingCycle === "monthly"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							Monthly
						</button>
						<button
							type="button"
							onClick={() => setBillingCycle("annual")}
							className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
								billingCycle === "annual"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							Annual <span className="text-xs">(Save 20%)</span>
						</button>
					</div>
				</motion.div>

				<div className="mt-12 grid gap-6 md:grid-cols-3">
					{plans.map((plan, index) => (
						<motion.div
							key={plan.name}
							initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
						>
							<Card3D
								className={`rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl ${
									plan.popular ? "ring-2 ring-primary" : ""
								}`}
							>
								{plan.popular && (
									<div className="mb-4 -m-6 mb-6 rounded-t-2xl bg-primary px-4 py-2 text-center text-primary-foreground">
										<span className="text-sm font-medium">Most Popular</span>
									</div>
								)}

								<div>
									<h3 className="font-bold text-2xl">{plan.name}</h3>
									<p className="mt-1">{plan.description}</p>

									<div className="mt-4">
										<span className="font-bold text-4xl">
											{plan.price[billingCycle]}
										</span>
										{plan.period && (
											<span className="text-sm">/{plan.period}</span>
										)}
									</div>

									<ul className="mt-6 space-y-3">
										{plan.features.map((feature, index) => (
											<li key={index} className="flex items-start gap-2">
												<CheckIcon className="text-primary mt-0.5 size-4 flex-shrink-0" />
												<span className="text-sm">{feature}</span>
											</li>
										))}
									</ul>

									<AnimatePresence>
										{expandedPlan === plan.name && (
											<motion.ul
												initial={{
													opacity: 0,
													height: 0,
												}}
												animate={{
													opacity: 1,
													height: "auto",
												}}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.3 }}
												className="mt-4 space-y-3 overflow-hidden border-t border-foreground/10 pt-4"
											>
												{plan.expandedFeatures.map((feature, index) => (
													<li key={index} className="flex items-start gap-2">
														<CheckIcon className="text-primary mt-0.5 size-4 flex-shrink-0" />
														<span className="text-sm">{feature}</span>
													</li>
												))}
											</motion.ul>
										)}
									</AnimatePresence>

									<div className="mt-6 flex flex-col gap-3">
										<Button
											className="w-full"
											variant={plan.popular ? "primary" : "outline"}
											onClick={() => togglePlanExpansion(plan.name)}
										>
											{expandedPlan === plan.name ? (
												<>
													Show Less
													<ChevronUpIcon className="ml-2 size-4" />
												</>
											) : (
												<>
													Show More Features
													<ChevronDownIcon className="ml-2 size-4" />
												</>
											)}
										</Button>

										<Button
											className="w-full"
											variant={plan.popular ? "primary" : "outline"}
										>
											{plan.cta}
										</Button>
									</div>
								</div>
							</Card3D>
						</motion.div>
					))}
				</div>

				<motion.div
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.3 }}
					className="mt-16 rounded-3xl border bg-card p-8"
				>
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
						{stats.map((stat, index) => {
							const Icon = stat.icon;
							return (
								<div key={index} className="text-center">
									<div className="mx-auto mb-3 rounded-full bg-primary/10 p-3 w-fit">
										<Icon className="text-primary size-6" />
									</div>
									<div className="font-bold text-2xl">{stat.value}</div>
									<div className="text-sm">{stat.label}</div>
								</div>
							);
						})}
					</div>
				</motion.div>

				<motion.div
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.4 }}
					className="mt-12 text-center"
				>
					<h3 className="font-bold text-xl">Frequently Asked Questions</h3>
					<div className="mt-6 grid gap-4 md:grid-cols-2">
						<div className="rounded-xl border bg-card p-4 text-left">
							<h4 className="font-semibold">
								Can I upgrade or downgrade my plan?
							</h4>
							<p className="mt-2 text-sm">
								Yes, you can change your plan at any time. Your billing will be
								prorated accordingly.
							</p>
						</div>
						<div className="rounded-xl border bg-card p-4 text-left">
							<h4 className="font-semibold">Is there a free trial?</h4>
							<p className="mt-2 text-sm">
								The Pro plan includes a 14-day free trial with full access to
								all features.
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
