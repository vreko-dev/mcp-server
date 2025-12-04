"use client";

import { ComingSoonBadge } from "@marketing/components/ui/coming-soon-badge";
import { AlertTriangle, Brain, Clock, Plug, Shield, Zap } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { InteractiveFileDemo } from "@/components/demo/InteractiveFileDemo";

const features = [
	{
		icon: Shield,
		title: "Granular Protection",
		subtitle: "Watch • Warn • Block",
		description:
			"Not all files matter equally. Watch your test files silently, Warn before sensitive changes, Block critical infrastructure. Your team defines rules once, SnapBack enforces them everywhere.",
		benefits: [
			"Watch mode: Silent snapshots for low-risk files",
			"Warn mode: Confirm before sensitive changes",
			"Block mode: Require audit notes for critical files",
			"Team policies synced via .snapbackrc—one config, all machines",
		],
		docsLink: "/docs/protection-levels",
		color: "text-green-400",
		bgGlow: "from-green-500/20",
	},
	{
		icon: Clock,
		title: "Multi-File Undo",
		subtitle: "Sessions & Time-Travel",
		description:
			"Your AI assistant refactored 8 files in 2 minutes. Three look great, five need work. Sessions group related changes, so you restore all 5 bad files instantly—without losing the good work.",
		benefits: [
			"Automatic session grouping by timing and AI patterns",
			"Restore entire sessions with one click",
			"Or pick individual files to keep the good changes",
			"Visual timeline shows exactly what changed when and why",
		],
		docsLink: "/docs/sessions",
		color: "text-blue-400",
		bgGlow: "from-blue-500/20",
	},
	{
		icon: Brain,
		title: "AI Risk Detection",
		subtitle: "94% Accuracy",
		description:
			"AI makes mistakes you can't see: hardcoded test mocks, leaked API keys, phantom dependencies. Guardian analyzes every change in real-time and flags risky patterns before they reach production.",
		benefits: [
			"Secret detection with Shannon entropy (catches API keys, tokens)",
			"Mock/test artifact detection in production code",
			"Phantom dependency detection (import ↔ package.json)",
			"Real-time risk scoring: low → medium → high → critical",
		],
		docsLink: "/docs/ai-detection",
		color: "text-purple-400",
		bgGlow: "from-purple-500/20",
	},
	{
		icon: AlertTriangle,
		title: "Severity Analysis",
		subtitle: "Risk-Based Workflows",
		description:
			"Each risk detection includes severity classification (low/medium/high/critical) with actionable recommendations. Never miss critical issues. Auto-block critical risks in sensitive files.",
		benefits: [
			"Color-coded risk levels in VS Code sidebar",
			"Contextual recommendations per severity",
			"Integration with protection levels (auto-block critical)",
			"Real-time notifications with progressive disclosure",
		],
		docsLink: "/docs/protection-levels",
		color: "text-orange-400",
		bgGlow: "from-orange-500/20",
	},
	{
		icon: Plug,
		title: "MCP Integration",
		subtitle: "Coming Soon",
		comingSoon: true,
		description:
			"Model Context Protocol server will expose Guardian, dependency checks, and snapshot creation to AI assistants like Claude and Cursor. Let AI analyze risks before it makes changes.",
		benefits: [
			"analyze_risk tool for real-time Guardian detection (<200ms)",
			"check_dependencies for phantom dependency detection (<300ms)",
			"create_checkpoint for manual snapshots (<500ms)",
			"JSON-RPC 2.0 stdio transport (universal compatibility)",
		],
		docsLink: "/docs/mcp",
		color: "text-cyan-400",
		bgGlow: "from-cyan-500/20",
	},
	{
		icon: Zap,
		title: "Lightning Performance",
		subtitle: "Zero Friction",
		description:
			"Snapshots captured in <200ms. Protection checks in <10ms. No waiting, no progress bars. We benchmark every feature. If you feel slowdown, we've failed.",
		benefits: [
			"SQLite with WAL mode for concurrent reads",
			"Hash-based deduplication (>90% space savings)",
			"Event bus pub/sub with <10ms latency",
			"Indexed queries for sub-10ms session retrieval",
		],
		docsLink: "/docs/performance",
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
						Built for the{" "}
						<span className="bg-gradient-to-r from-[#00FF41] to-[#10B981] bg-clip-text text-transparent">
							AI Era
						</span>
					</h1>
					<p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
						Your AI assistant moves fast. SnapBack makes sure it moves{" "}
						<em>safely</em>. Every feature designed to catch what AI misses and
						undo what AI breaks.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/docs"
							className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
						>
							Read Documentation
						</Link>
						<Link
							href="/pricing"
							className="px-6 py-3 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-medium rounded-xl transition-all"
						>
							View Pricing Plans
						</Link>
					</div>
				</m.div>
			</section>

			{/* Problem → Solution Framing */}
			<section className="container max-w-5xl mx-auto pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8 mb-16"
				>
					<h2 className="text-2xl font-bold text-white mb-4">
						The Problem: AI Changes You Can't Control
					</h2>
					<p className="text-gray-300 mb-4">
						Your Cursor or Claude refactors 8 files in 30 minutes. Three are
						brilliant. Three have bugs. Two have secrets. You have no way to
						undo just the broken ones without losing the good work.
					</p>
					<p className="text-gray-300">
						SnapBack's features below solve this: automatic session grouping,
						real-time risk detection, granular protection levels, and
						lightning-fast multi-file undo.
					</p>
				</m.div>
			</section>

			{/* Interactive File Demo */}
			<section className="container max-w-5xl mx-auto pb-24 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="mb-12"
				>
					<h2 className="text-2xl font-bold text-white mb-6 text-center">
						See It In Action
					</h2>
					<InteractiveFileDemo />
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
							<div className="relative bg-[#0E0E0E] backdrop-blur-sm border border-[#222] rounded-2xl p-8 h-full hover:border-[#00FF41]/30 transition-all duration-300">
								{/* Gradient glow effect */}
								<div
									className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.bgGlow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
								/>

								{/* Icon */}
								<div className="mb-6">
									<feature.icon
										className={`w-12 h-12 ${feature.color}`}
										strokeWidth={1.5}
									/>
								</div>

								{/* Title & Subtitle */}
								<div className="flex items-center gap-3 mb-2">
									<h2 className="text-2xl font-bold text-white">
										{feature.title}
									</h2>
									{(feature as any).comingSoon && (
										<ComingSoonBadge variant="inline" />
									)}
								</div>
								<p className={`text-sm font-mono ${feature.color} mb-4`}>
									{feature.subtitle}
								</p>

								{/* Description */}
								<p className="text-gray-300 mb-6 leading-relaxed">
									{feature.description}
								</p>

								{/* Benefits List */}
								<ul className="space-y-3 mb-6">
									{feature.benefits.map((benefit) => (
										<li key={benefit} className="flex items-start gap-3">
											<span className="text-[#00FF41] mt-1">✓</span>
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
					className="bg-gradient-to-r from-[#00FF41]/20 to-[#10B981]/20 border border-[#00FF41]/30 rounded-2xl p-12 text-center"
				>
					<h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
						Ready to protect your code?
					</h2>
					<p className="text-xl text-gray-300 mb-8">
						Install the free VS Code extension. Create your first snapshot in
						under 1 minute. No config, no credit card, no limits.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<a
							href="https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode"
							target="_blank"
							rel="noopener noreferrer"
							className="px-8 py-4 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-bold rounded-xl transition-all text-lg"
						>
							Install Free Extension
						</a>
						<Link
							href="/pricing"
							className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all text-lg"
						>
							View Plans & Enterprise
						</Link>
					</div>
				</m.div>
			</section>
		</main>
	);
}
