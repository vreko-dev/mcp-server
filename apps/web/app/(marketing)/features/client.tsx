"use client";


import { AlertTriangle, Brain, Clock, Shield, Zap } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";

const features = [
	{
		icon: Shield,
		title: "Remembers What Breaks",
		subtitle: "Learns What Breaks",
		description:
			"SnapBack learns what went wrong in YOUR codebase. Watch level auto-snapshots what you care about. Warn level asks before changes. Block level creates audit trails. Your protection rules sync across the team.",
		benefits: [
			"Auto-snapshots remember what changes matter",
			"Confirmation dialogs for risky edits",
			"Audit trail for critical file modifications",
			"Team-wide consistency via .snapbackrc",
		],
		docsLink: "/docs/concepts/protection-levels",
		color: "text-emerald-400",
		bgGlow: "from-emerald-500/20",
	},
	{
		icon: Clock,
		title: "Learns from Outcomes",
		subtitle: "Gets Smarter Over Time",
		description:
			"Every time you restore files, SnapBack learns what patterns caused problems. Day 1: detects 94% of issues. Day 30: knows YOUR codebase's specific risks. Month 3: catches patterns before you even notice them.",
		benefits: [
			"Day 1: 94% accurate out of the box",
			"Day 30: Learns your specific patterns",
			"Month 3: Detects what others miss",
			"Outcome loop: Restore → Learn → Improve",
		],
		docsLink: "/docs/concepts/sessions",
		color: "text-blue-400",
		bgGlow: "from-blue-500/20",
	},
	{
		icon: Brain,
		title: "Detects What Breaks",
		subtitle: "94% Accurate",
		description:
			"Catches hardcoded secrets, phantom dependencies, test code in production, and risky patterns. Every change gets a risk score. You see exactly what's dangerous and why.",
		benefits: [
			"Hardcoded secrets (API keys, passwords)",
			"Phantom dependencies (imports without package.json entry)",
			"Test mocks in production code",
			"Per-change risk scoring in real-time",
		],
		docsLink: "/docs/how-to/guardian-detection",
		color: "text-purple-400",
		bgGlow: "from-purple-500/20",
	},
	{
		icon: AlertTriangle,
		title: "Severity Matters",
		subtitle: "Risk-Based Action",
		description:
			"Not all issues are equal. Critical finds block. High-risk changes warn. Low-risk changes proceed. You decide the rules. When AI tools break something, you see exactly what went wrong and how to fix it.",
		benefits: [
			"Color-coded severity levels in VS Code",
			"Actionable remediation suggestions",
			"Auto-blocking for critical issues",
			"Learn from each detection",
		],
		docsLink: "/docs/concepts/severity",
		color: "text-orange-400",
		bgGlow: "from-orange-500/20",
	},
	{
		icon: Zap,
		title: "Lightning Fast",
		subtitle: "<200ms snapshots",
		description:
			"Snapshots happen in under 200ms. Checks take 10ms. Restore is instant. Speed matters because developers won't wait around for safety—it has to vanish into the background.",
		benefits: [
			"Snapshot creation in <200ms",
			"Risk checks <10ms (per-change)",
			"Session finalization <50ms avg",
			"90% space savings with deduplication",
		],
		docsLink: "/docs/architecture/performance",
		color: "text-yellow-400",
		bgGlow: "from-yellow-500/20",
	},
];

export default function FeaturesClient() {
	return (
		<main className="min-h-screen bg-[#0A0A0A]">
			{/* Hero Section */}
			<section className="container max-w-6xl mx-auto pt-24 pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-16"
				>
					<h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
						SnapBack Learns
						<br />
						<span className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent">
							What Breaks
						</span>
					</h1>
					<p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
						Every time you undo a mistake, SnapBack gets smarter. Day 1 catches 94% of issues. Day 30 knows
						YOUR codebase. Month 3 prevents what you didn't even know could break.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="https://docs.snapback.dev"
							className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
						>
							Read Documentation
						</Link>
						<Link
							href="/pricing"
							className="px-6 py-3 bg-emerald-400 hover:bg-emerald-400/90 text-black font-medium rounded-xl transition-all"
						>
							View Pricing
						</Link>
					</div>
				</m.div>
			</section>

			{/* Features Grid */}
			<section className="container max-w-7xl mx-auto pb-24 px-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{features.map((feature, index) => (
						<m.div
							key={feature.title}
							initial={{ opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group relative"
						>
							{/* Card */}
							<div className="relative bg-[#0E0E0E] backdrop-blur-sm border border-[#222] rounded-2xl p-8 h-full hover:border-emerald-400/30 transition-all duration-300">
								{/* Gradient glow effect */}
								<div
									className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.bgGlow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
								/>

								{/* Icon */}
								<div className="mb-6">
									<feature.icon className={`w-12 h-12 ${feature.color}`} strokeWidth={1.5} />
								</div>

								{/* Title & Subtitle */}
								<div className="flex items-center gap-3 mb-2">
									<h2 className="text-2xl font-bold text-white">{feature.title}</h2>

								</div>
								<p className={`text-sm font-mono ${feature.color} mb-4`}>{feature.subtitle}</p>

								{/* Description */}
								<p className="text-gray-300 mb-6 leading-relaxed">{feature.description}</p>

								{/* Benefits List */}
								<ul className="space-y-3 mb-6">
									{feature.benefits.map((benefit) => (
										<li key={benefit} className="flex items-start gap-3">
											<span className="text-emerald-400 mt-1">✓</span>
											<span className="text-gray-400 text-sm">{benefit}</span>
										</li>
									))}
								</ul>

								{/* Docs Link */}
								<Link
									href={feature.docsLink}
									className={`inline-flex items-center gap-2 text-sm font-medium ${feature.color} hover:underline`}
								>
									Learn more →
								</Link>
							</div>
						</m.div>
					))}
				</div>
			</section>

			{/* CTA Section */}
			<section className="container max-w-4xl mx-auto pb-24 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="bg-gradient-to-r from-emerald-400/20 to-emerald-500/20 border border-emerald-400/30 rounded-2xl p-12 text-center"
				>
					<h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Ready to learn smarter?</h2>
					<p className="text-xl text-gray-300 mb-8">
						Install SnapBack for VS Code. It learns from your first mistake.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<a
							href="https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode"
							target="_blank"
							rel="noopener noreferrer"
							className="px-8 py-4 bg-emerald-400 hover:bg-emerald-400/90 text-black font-bold rounded-xl transition-all text-lg"
						>
							Get Started
						</a>
						<Link
							href="/pricing"
							className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all text-lg"
						>
							View Pricing
						</Link>
					</div>
				</m.div>
			</section>
		</main>
	);
}
