"use client";

import { Heart, Shield, Target, Users, Zap } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";

const values = [
	{
		icon: Shield,
		title: "Developer-First Safety",
		description:
			"Every feature designed to protect developers while they ship fast. No friction, just protection.",
		color: "text-green-400",
	},
	{
		icon: Zap,
		title: "Performance Obsessed",
		description:
			"<200ms snapshots, <10ms checks. Performance budgets enforced in tests. Speed is a feature.",
		color: "text-yellow-400",
	},
	{
		icon: Users,
		title: "Community Driven",
		description:
			"Free forever plan. Open source core. Built with feedback from our early alpha community.",
		color: "text-blue-400",
	},
	{
		icon: Heart,
		title: "Empathy in Code",
		description:
			"We've all lost work to AI mistakes. SnapBack exists because we felt that pain firsthand.",
		color: "text-red-400",
	},
];

export default function AboutClient() {
	return (
		<main className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900">
			{/* Hero Section */}
			<section className="container max-w-4xl mx-auto pt-24 pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-12"
				>
					<h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
						The{" "}
						<span className="bg-gradient-to-r from-[#FF6B35] to-[#EF4444] bg-clip-text text-transparent">
							$12K Disaster
						</span>{" "}
						<br />
						That Started It All
					</h1>
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						One AI mistake. One production deploy. A mission to protect every
						developer from the same fate.
					</p>
				</m.div>
			</section>

			{/* Story Section */}
			<section id="story" className="container max-w-3xl mx-auto pb-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="prose prose-invert prose-lg max-w-none"
				>
					<div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 lg:p-12">
						<h2 className="text-3xl font-bold text-white mb-6">
							3:47 AM, Tuesday
						</h2>

						<p className="text-gray-300 leading-relaxed mb-4">
							The Slack notification woke me up. Production was down. Revenue
							streaming to zero. My AI coding assistant had "optimized" our
							dependencies. One click. Package.json rewritten. Build configs
							corrupted. TypeScript errors cascading through 47 files.
						</p>

						<p className="text-gray-300 leading-relaxed mb-4">
							I spent the next 6 hours manually reconstructing what the AI had
							destroyed in 3 seconds. Git history was useless—the AI had made
							dozens of "improvements" across multiple commits, all tangled
							together. No clean rollback point. Just chaos.
						</p>

						<p className="text-gray-300 leading-relaxed mb-4">
							Final damage:{" "}
							<span className="text-[#FF6B35] font-bold">$12,000</span> in lost
							revenue, missed deadlines, and a team that lost trust in AI tools.
							But here's the thing—the AI wasn't wrong to try helping. It just
							needed a safety net.
						</p>

						<div className="bg-black/50 border border-[#00FF41]/20 rounded-lg p-6 my-8">
							<p className="text-[#00FF41] font-semibold mb-2">
								The Realization
							</p>
							<p className="text-gray-300 leading-relaxed">
								Every developer using AI tools is one bad suggestion away from
								this nightmare. Cursor, Copilot, Windsurf, Claude—they're all
								powerful, but none of them have a proper undo button. Git isn't
								enough when AI makes 20 changes across 10 files in 30 seconds.
							</p>
						</div>

						<p className="text-gray-300 leading-relaxed mb-4">
							That's why we built SnapBack. Not to replace AI assistants, but to
							make them safe. Every AI action triggers an automatic checkpoint.
							Recovery takes one click. You get to move fast <em>and</em> break
							things—because you can always snap back.
						</p>

						<p className="text-gray-300 leading-relaxed">
							We're in early days—currently protecting 55+ developers in private
							alpha who have created over 1,000 snapshots. The system works, the
							speed is real (&lt;200ms snapshots), and we're confident in what
							we're building. If you use AI to code, you'll want SnapBack.
						</p>
					</div>
				</m.div>
			</section>

			{/* Mission & Values */}
			<section id="mission" className="container max-w-6xl mx-auto py-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="text-center mb-12"
				>
					<h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
						Mission & Values
					</h2>
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						Guiding principles that shape every feature we build
					</p>
				</m.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{values.map((value, index) => (
						<m.div
							key={value.title}
							initial={{ opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all"
						>
							<value.icon className={`w-12 h-12 ${value.color} mb-4`} />
							<h3 className="text-2xl font-bold text-white mb-3">
								{value.title}
							</h3>
							<p className="text-gray-300 leading-relaxed">
								{value.description}
							</p>
						</m.div>
					))}
				</div>
			</section>

			{/* Roadmap Postcard */}
			<section id="roadmap" className="container max-w-4xl mx-auto py-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="bg-gradient-to-r from-[#00FF41]/20 to-[#10B981]/20 border border-[#00FF41]/30 rounded-2xl p-12"
				>
					<div className="flex items-start gap-4 mb-6">
						<Target className="w-8 h-8 text-[#00FF41] flex-shrink-0 mt-1" />
						<div>
							<h2 className="text-3xl font-bold text-white mb-2">
								What's Next
							</h2>
							<p className="text-gray-300">
								Our roadmap is driven by community feedback
							</p>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<span className="text-[#00FF41] mt-1">✓</span>
							<div>
								<h4 className="text-white font-semibold">
									Q1 2025 - Cloud Sync & Team Features
								</h4>
								<p className="text-gray-400 text-sm">
									Shared snapshots, team policies, analytics dashboard
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="text-[#00FF41] mt-1">→</span>
							<div>
								<h4 className="text-white font-semibold">
									Q2 2025 - Advanced Guardian Detection
								</h4>
								<p className="text-gray-400 text-sm">
									ML-powered risk scoring, custom detection plugins, API
									contract monitoring
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="text-gray-500 mt-1">○</span>
							<div>
								<h4 className="text-white font-semibold">
									Q3 2025 - JetBrains & Multi-IDE Support
								</h4>
								<p className="text-gray-400 text-sm">
									IntelliJ, PyCharm, WebStorm extensions with unified snapshot
									sync
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<span className="text-gray-500 mt-1">○</span>
							<div>
								<h4 className="text-white font-semibold">
									Q4 2025 - Enterprise Features
								</h4>
								<p className="text-gray-400 text-sm">
									SSO, SAML, air-gapped deployment, compliance certifications
									(SOC2, ISO 27001)
								</p>
							</div>
						</div>
					</div>

					<div className="mt-8 pt-6 border-t border-white/10">
						<p className="text-gray-300 text-sm">
							Want to influence our roadmap?{" "}
							<Link
								href="/community"
								className="text-[#00FF41] hover:underline focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
							>
								Join our community
							</Link>{" "}
							or{" "}
							<Link
								href="/blog"
								className="text-[#00FF41] hover:underline focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
							>
								read our blog
							</Link>{" "}
							to share feedback.
						</p>
					</div>
				</m.div>
			</section>

			{/* Team Section */}
			<section id="team" className="container max-w-4xl mx-auto py-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="text-center"
				>
					<h2 className="text-4xl font-bold text-white mb-6">
						Built by Developers,
						<br />
						for Developers
					</h2>
					<p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
						SnapBack is developed by{" "}
						<a
							href="https://marcellelabs.com"
							className="text-[#00FF41] hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							Marcelle Labs
						</a>
						, a team obsessed with developer experience and AI safety. We've all
						lost work to AI mistakes—now we're making sure it never happens to
						you.
					</p>

					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/blog"
							className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-900"
						>
							Read Our Blog
						</Link>
						<Link
							href="/community"
							className="px-6 py-3 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-bold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-slate-900"
						>
							Join Community
						</Link>
					</div>
				</m.div>
			</section>

			{/* Stats Bar */}
			<section className="container max-w-6xl mx-auto py-16 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
				>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
						<div>
							<div className="text-4xl font-bold text-[#00FF41] mb-2">55+</div>
							<div className="text-gray-400">Early Alpha Users</div>
						</div>
						<div>
							<div className="text-4xl font-bold text-[#00FF41] mb-2">
								1,000+
							</div>
							<div className="text-gray-400">Snapshots Created</div>
						</div>
						<div>
							<div className="text-4xl font-bold text-[#00FF41] mb-2">
								&lt;200ms
							</div>
							<div className="text-gray-400">Snapshot Creation Speed</div>
						</div>
					</div>
				</m.div>
			</section>

			{/* Final CTA */}
			<section className="container max-w-4xl mx-auto pb-24 px-4">
				<m.div
					initial={{ opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-100px" }}
					transition={{ duration: 0.6 }}
					className="text-center"
				>
					<h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
						Ready to protect your code?
					</h2>
					<p className="text-xl text-gray-300 mb-8">
						Join our private alpha. Beta launching Q1 2026.
					</p>
					{/* Hidden install button as requested */}
					{/*
					<Link
						href="/docs/getting-started"
						className="inline-flex items-center px-8 py-4 bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-bold rounded-xl transition-all text-lg focus:outline-none focus:ring-2 focus:ring-[#00FF41] focus:ring-offset-2 focus:ring-offset-slate-900"
					>
						Install SnapBack Free →
					</Link>
					*/}
				</m.div>
			</section>
		</main>
	);
}
