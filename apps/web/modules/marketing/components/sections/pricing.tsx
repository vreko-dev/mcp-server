"use client";
import { Check, Star } from "lucide-react";
import { m } from "motion/react";
import { useState } from "react";

const Pricing = () => {
	const [isAnnual, setIsAnnual] = useState(false);

	const plans = [
		{
			name: "Free",
			description: "Free forever. Snapshots + pattern detection locally.",
			price: { monthly: 0, annual: 0 },
			badge: "Free",
			features: [
				"Unlimited local snapshots",
				"VS Code extension",
				"CLI tool",
				"7-day history",
				"Detects secrets & risky patterns",
			],
			cta: "Start Free",
			popular: false,
		},
		{
			name: "Pro",
			description: "Pattern memory that learns YOUR codebase",
			price: { monthly: 12, annual: 120 },
			badge: null,
			features: [
				"Everything in Developer",
				"Cloud backup & sync",
				"30-day cloud history",
				"Learns from your patterns",
				"94% accurate, improves over time",
				"GitHub integration",
				"Priority support",
			],
			cta: "Start Free Trial",
			popular: true,
		},
		{
			name: "Team",
			description: "Learn together, protect faster",
			price: { monthly: 29, annual: 290 },
			badge: null,
			features: [
				"Everything in Pro",
				"Team dashboard",
				"Shared pattern memory",
				"Learn from team's recoveries",
				"1-year history",
				"Per-repo risk scoring",
				"Merge policies & audit trail",
				"Role-based access",
			],
			cta: "Start Team Trial",
			popular: false,
		},
		{
			name: "Enterprise",
			description: "Full control for large organizations",
			price: { monthly: null, annual: null },
			badge: null,
			features: [
				"Everything in Team",
				"Custom pricing",
				"Unlimited storage & retention",
				"Custom integrations",
				"SOC2 compliance",
				"Dedicated support",
				"Custom SLA",
				"On-premise deployment",
			],
			cta: "Contact Sales",
			popular: false,
		},
	];

	const handlePlanAction = (planName: string, action: string) => {
		// Plan action logic would go here (signup, trial, contact)
		console.log(`${action} clicked for ${planName} plan`);
	};

	return (
		<section
			id="pricing"
			className="py-20 bg-background"
			aria-labelledby="pricing-heading"
		>
			<div className="container">
				<div className="text-center mb-16">
					<h2 id="pricing-heading" className="text-display mb-6">
						SnapBack Learns.{" "}
						<span className="text-primary">You Choose the Price.</span>
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
						Start free. Scale as your team learns. Pattern memory improves over
						time—so your protection gets smarter without you doing anything.
					</p>
				</div>

				{/* Billing Toggle */}
				<m.div className="flex items-center justify-center mb-12">
					<fieldset className="flex items-center space-x-4 bg-muted/20 border border-border p-1 rounded-lg">
						<legend className="sr-only">Choose billing frequency</legend>
						<label className="flex items-center">
							<input
								type="radio"
								name="billing"
								value="monthly"
								checked={!isAnnual}
								onChange={() => setIsAnnual(false)}
								className="sr-only"
							/>
							<button
								type="button"
								onClick={() => setIsAnnual(false)}
								className={`px-4 py-2 rounded-md transition-all font-mono text-sm focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
									!isAnnual
										? "bg-primary text-background border border-primary/50"
										: "text-muted-foreground hover:text-foreground"
								}`}
								aria-pressed={!isAnnual}
								aria-describedby="monthly-desc"
							>
								Monthly
							</button>
							<span id="monthly-desc" className="sr-only">
								Pay monthly with flexible billing
							</span>
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="billing"
								value="annual"
								checked={isAnnual}
								onChange={() => setIsAnnual(true)}
								className="sr-only"
							/>
							<button
								type="button"
								onClick={() => setIsAnnual(true)}
								className={`px-4 py-2 rounded-md transition-all font-mono text-sm focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
									isAnnual
										? "bg-primary text-background border border-primary/50"
										: "text-muted-foreground hover:text-foreground"
								}`}
								aria-pressed={isAnnual}
								aria-describedby="annual-desc"
							>
								Annual <span className="text-xs text-accent">-20%</span>
							</button>
							<span id="annual-desc" className="sr-only">
								Pay annually and save 20%
							</span>
						</label>
					</fieldset>
				</m.div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
					{plans.map((plan, index) => (
						<article
							key={plan.name}
							className={`relative bg-card/50 backdrop-blur-sm border rounded-lg p-6 ${
								plan.popular
									? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
									: "border-border hover:border-primary/30"
							}`}
							aria-labelledby={`plan-${index}-name`}
							aria-describedby={`plan-${index}-desc`}
						>
							{plan.popular && (
								<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
									<div className="bg-gradient-neon text-background px-4 py-1 rounded-full text-sm font-medium border border-primary/50">
										<Star className="w-4 h-4 inline mr-1" aria-hidden="true" />
										Most Popular
									</div>
								</div>
							)}

							{plan.badge && (
								<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
									<div className="bg-accent text-background px-4 py-1 rounded-full text-sm font-medium border border-accent/50">
										{plan.badge}
									</div>
								</div>
							)}

							<div className="p-2">
								<h3
									id={`plan-${index}-name`}
									className="text-2xl font-bold mb-2"
								>
									{plan.name}
								</h3>
								<p
									id={`plan-${index}-desc`}
									className="text-muted-foreground mb-6"
								>
									{plan.description}
								</p>

								<div className="mb-8">
									<div className="flex items-baseline">
										<span
											id={`plan-${index}-pricing`}
											className="text-4xl font-black"
										>
											{plan.price.monthly === null
												? "Custom"
												: `$${isAnnual ? plan.price.annual : plan.price.monthly}`}
										</span>
										{plan.price.monthly !== null && plan.price.monthly > 0 && (
											<span className="text-muted-foreground ml-2">
												/{isAnnual ? "year" : "month"}
											</span>
										)}
									</div>
									{isAnnual &&
										plan.price.monthly !== null &&
										plan.price.monthly > 0 && (
											<div className="text-sm text-muted-foreground">
												${Math.round(plan.price.annual / 12)}
												/month billed annually
											</div>
										)}
								</div>

								<button
									className={`w-full py-3 px-4 rounded-lg font-medium transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
										plan.popular ? "btn-neon" : "btn-ghost"
									}`}
									onClick={() => handlePlanAction(plan.name, plan.cta)}
									type="button"
									aria-describedby={`plan-${index}-action-desc`}
								>
									{plan.cta}
									<span id={`plan-${index}-action-desc`} className="sr-only">
										{plan.cta} for {plan.name} plan
									</span>
								</button>

								<ul
									className="space-y-4 mt-8"
									aria-label={`${plan.name} plan features`}
								>
									{plan.features.map((feature) => (
										<li
											key={`${plan.name}-${feature}`}
											className="flex items-start space-x-3"
										>
											<Check
												className="h-5 w-5 text-primary flex-shrink-0 mt-0.5"
												aria-hidden="true"
											/>
											<span className="text-sm text-muted-foreground">
												{feature}
											</span>
										</li>
									))}
								</ul>
							</div>
						</article>
					))}
				</div>

				{/* Bracket Divider */}
				<div
					className="flex justify-center mt-16"
					aria-hidden="true"
					role="presentation"
				>
					<div className="flex items-center space-x-4 text-2xl font-mono text-primary/60">
						<span aria-hidden="true">&#123;</span>
						<div className="w-16 h-px bg-gradient-neon" />
						<span aria-hidden="true">&#125;</span>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Pricing;
