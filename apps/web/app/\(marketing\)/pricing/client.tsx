export default function PricingClient() {
	const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annual">(
		"monthly",
	);
	const [_openFaqIndex, _setOpenFaqIndex] = React.useState<number | null>(null);
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
						Pricing for{" "}
						<span className="bg-gradient-to-r from-[#00FF41] to-[#10B981] bg-clip-text text-transparent">
							Every Stage
						</span>
					</h1>
					<p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
						Free tier includes everything you need to get started. Upgrade to cloud backup and team features when you scale. <br /> 30-day money-back guarantee on all paid plans.
					</p>
					<p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
						Worried about costs? Try free forever. Cloud backup starts at <strong>$29/mo for solo devs</strong>. Teams pay per seat, starting at <strong>$79/mo</strong>.
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
								const newValue =
									billingCycle === "monthly" ? "annual" : "monthly";
								setBillingCycle(newValue);
								posthog.capture(AnalyticsEvents.PRICING_TOGGLE_CHANGED, {
									value_before: billingCycle,
									value_after: newValue,
								});
							}}
							className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-slate-900"
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
							Annual{" "}
							<span className="text-[#00FF41] text-xs font-semibold">
								(Save 17%)
							</span>
						</span>
					</div>
				</m.div>
			</section>

			{/* Value Proposition Section */}
			<section className="container max-w-5xl mx-auto pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="grid grid-cols-1 md:grid-cols-3 gap-6"
				>
					<div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
						<h3 className="text-lg font-bold text-white mb-2">💰 No Surprises</h3>
						<p className="text-sm text-gray-300">
							Honest pricing. Free tier is free forever. No hidden fees. No forced upgrades.
						</p>
					</div>
					<div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
						<h3 className="text-lg font-bold text-white mb-2">🚀 Scale as You Grow</h3>
						<p className="text-sm text-gray-300">
							Start free. Add cloud backup for $29/mo. Share with team at $79/seat/mo. Pay only for what you use.
						</p>
					</div>
					<div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl p-6">
						<h3 className="text-lg font-bold text-white mb-2">🛡️ Risk-Free Trial</h3>
						<p className="text-sm text-gray-300">
							30-day money-back guarantee. Try paid plans risk-free. We're confident you'll love it.
						</p>
					</div>
				</m.div>
			</section>

			{/* Pricing Cards */}
			<section className="container max-w-7xl mx-auto pb-24 px-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{pricingTiers.map((tier, index) => (
						<PricingCard
							key={tier.id}
							tier={tier}
							billingCycle={billingCycle}
							index={index}
						/>
					))}
				</div>
