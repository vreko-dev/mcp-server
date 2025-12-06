"use client";

import { BentoGrid, BentoGridItem } from "@marketing/components/ui/bento-grid";
import { cn } from "@ui/lib";
import {
	CodeIcon,
	CpuIcon,
	FileIcon,
	GlobeIcon,
	LayersIcon,
	LockIcon,
	RotateCcwIcon,
	ShieldIcon,
	TerminalIcon,
	ZapIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

// Define the actual SnapBack features
const featureTabs = [
	{
		id: "ai-detection",
		title: "AI Pattern Detection",
		icon: CpuIcon,
		subtitle: "94% Accuracy",
		description: "Detects Copilot, Cursor, and Windsurf patterns. Shows detection confidence on every change.",
		highlights: [
			{
				title: "Multi-Platform Support",
				description: "Detects activity from GitHub Copilot, Cursor, Windsurf, and other AI coding assistants.",
				icon: GlobeIcon,
			},
			{
				title: "Confidence Scoring",
				description: "Real-time confidence percentage on every detected change with 94% accuracy.",
				icon: ZapIcon,
			},
			{
				title: "Pattern Recognition",
				description: "Identifies specific AI behavior patterns like multi-file refactoring and bulk changes.",
				icon: CodeIcon,
			},
		],
	},
	{
		id: "auto-checkpoints",
		title: "Automatic Checkpoints",
		icon: RotateCcwIcon,
		subtitle: "Smart Triggers",
		description:
			"Triggers on: sensitive files (.env, package.json), large changes (>1000 lines), AI velocity patterns",
		highlights: [
			{
				title: "Smart Triggers",
				description:
					"Automatically creates checkpoints based on file sensitivity, change volume, and AI activity patterns.",
				icon: ShieldIcon,
			},
			{
				title: "File Watching",
				description: "Monitors 247 files per project with real-time change detection.",
				icon: FileIcon,
			},
			{
				title: "Performance Optimized",
				description: "Lightweight monitoring with <100ms checkpoint creation speed.",
				icon: ZapIcon,
			},
		],
	},
	{
		id: "snap-back",
		title: "One-Click Snap Back",
		icon: TerminalIcon,
		subtitle: "Instant Recovery",
		description: "VS Code command palette: 'SnapBack: Snap Back'. Right-click context menu integration.",
		highlights: [
			{
				title: "VS Code Integration",
				description: "Full extension with command palette and context menu integration.",
				icon: CodeIcon,
			},
			{
				title: "CLI Tool",
				description: "Command-line interface for terminal-based recovery operations (Coming Soon).",
				icon: TerminalIcon,
			},
			{
				title: "Instant Restore",
				description: "Restore to any checkpoint in milliseconds with zero data loss.",
				icon: RotateCcwIcon,
			},
		],
	},
	{
		id: "notifications",
		title: "Rich Notification System",
		icon: LayersIcon,
		subtitle: "Progressive Disclosure",
		description: "Progressive disclosure with collapsed/expanded views. Actionable buttons for immediate recovery.",
		highlights: [
			{
				title: "Multi-Level Views",
				description: "Collapsed and expanded notification states for optimal information density.",
				icon: LayersIcon,
			},
			{
				title: "Actionable Alerts",
				description: "One-click recovery buttons directly in notifications.",
				icon: ZapIcon,
			},
			{
				title: "Risk Assessment",
				description: "Color-coded risk levels with confidence percentages.",
				icon: ShieldIcon,
			},
		],
	},
	{
		id: "workspace-aware",
		title: "Workspace-Aware Protection",
		icon: LockIcon,
		subtitle: "Monorepo Support",
		description: "Monorepo support. Per-project checkpoint isolation. .snapback/checkpoints encrypted storage.",
		highlights: [
			{
				title: "Monorepo Support",
				description: "Full support for complex monorepo structures with isolated project protection.",
				icon: LayersIcon,
			},
			{
				title: "Project Isolation",
				description: "Per-project checkpoint isolation to prevent cross-contamination.",
				icon: LockIcon,
			},
			{
				title: "Encrypted Storage",
				description: "AES-256 encrypted .snapback/checkpoints directory for maximum security.",
				icon: ShieldIcon,
			},
		],
	},
	{
		id: "multi-platform",
		title: "Multi-Platform Integration",
		icon: GlobeIcon,
		subtitle: "Full Coverage",
		description:
			"VS Code extension available now. CLI tool and MCP server coming soon. GitHub Actions CI/CD pipeline included.",
		highlights: [
			{
				title: "VS Code Extension",
				description: "Full-featured extension with real-time monitoring and recovery.",
				icon: CodeIcon,
			},
			{
				title: "CLI Tool",
				description: "Powerful command-line interface for advanced users and automation (Coming Soon).",
				icon: TerminalIcon,
			},
			{
				title: "CI/CD Integration",
				description: "GitHub Actions workflows for automated protection in your pipeline.",
				icon: GlobeIcon,
			},
		],
	},
];

export function Features() {
	const firstTab = featureTabs[0];
	const [selectedTab, setSelectedTab] = useState(firstTab?.id ?? "");
	return (
		<section id="features" className="scroll-my-20 pt-12 lg:pt-16">
			<div className="container max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mx-auto mb-6 lg:mb-0 lg:max-w-5xl lg:text-center"
				>
					<h2 className="font-bold text-4xl lg:text-5xl">Pattern Memory. Gets Smarter.</h2>
					<p className="mt-6 text-balance text-lg">
						Every restore teaches SnapBack. Accuracy improves: Day 1 (94%) → Day 30 (98%) → Month 3 (99%+)
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="mt-8 mb-4 hidden justify-center lg:flex"
				>
					{featureTabs.map((tab, _index) => {
						return (
							<motion.button
								type="button"
								key={tab.id}
								onClick={() => setSelectedTab(tab.id)}
								whileHover={{ y: -5, scale: 1.05 }}
								whileTap={{ y: 0, scale: 0.95 }}
								transition={{
									type: "spring",
									stiffness: 400,
									damping: 17,
								}}
								className={cn(
									"flex w-32 flex-col items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200",
									selectedTab === tab.id
										? "bg-primary/10 font-bold text-primary shadow-lg"
										: "font-medium text-muted-foreground hover:bg-primary/5",
								)}
							>
								<motion.div
									whileHover={{ scale: 1.2, rotate: 10 }}
									transition={{
										type: "spring",
										stiffness: 300,
									}}
								>
									<tab.icon
										className={cn(
											"size-6 md:size-8 transition-all duration-200",
											selectedTab === tab.id ? "text-primary" : "text-muted-foreground",
										)}
									/>
								</motion.div>
								<motion.span className="text-xs md:text-sm" whileHover={{ y: -2 }}>
									{tab.title}
								</motion.span>
							</motion.button>
						);
					})}
				</motion.div>
			</div>

			{/* Bento Grid Section */}
			<div className="container max-w-7xl py-12">
				<BentoGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Large tile - AI Detection */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<BentoGridItem
							className="md:col-span-2 bg-snapback-dark border border-white/10 rounded-xl p-8 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="flex items-center gap-3">
									<CpuIcon className="size-8 text-snapback-green" />
									<span className="font-bold text-2xl text-white">Pattern Memory</span>
								</div>
							}
							description={
								<div className="mt-4">
									<p className="text-white/70">
										Learns what breaks in YOUR codebase. Catches hardcoded secrets, phantom
										dependencies, test code in prod, and risky patterns. Accuracy improves with
										every restore.
									</p>
									<div className="mt-6 flex items-center gap-4">
										<div className="flex items-center gap-2">
											<div className="size-3 rounded-full bg-snapback-green animate-pulse" />
											<span className="text-sm text-white/80">Day 1: 94%</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="size-3 rounded-full bg-snapback-green animate-pulse" />
											<span className="text-sm text-white/80">Day 30: 98%</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="size-3 rounded-full bg-snapback-green animate-pulse" />
											<span className="text-sm text-white/80">Month 3: 99%+</span>
										</div>
									</div>
								</div>
							}
						/>
					</motion.div>

					{/* Medium tile - Instant Recovery */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="flex items-center gap-3">
									<RotateCcwIcon className="size-6 text-snapback-green" />
									<span className="font-bold text-lg text-white">Learns from Outcomes</span>
								</div>
							}
							description={
								<p className="mt-2 text-sm text-white/70">
									Every restore teaches what patterns broke. Pattern memory uses outcome data to
									improve.
								</p>
							}
						/>
					</motion.div>

					{/* Medium tile - Cloud Backup */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="flex items-center gap-3">
									<GlobeIcon className="size-6 text-snapback-green" />
									<span className="font-bold text-lg text-white">Cloud Learning</span>
								</div>
							}
							description={
								<p className="mt-2 text-sm text-white/70">
									Metadata-only cloud features. Your code stays local.
								</p>
							}
						/>
					</motion.div>

					{/* Medium tile - Team Sharing */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.4 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-6 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="flex items-center gap-3">
									<LayersIcon className="size-6 text-snapback-green" />
									<span className="font-bold text-lg text-white">Team Patterns</span>
								</div>
							}
							description={
								<p className="mt-2 text-sm text-white/70">
									Learn from team's recoveries, patterns, and risks
								</p>
							}
						/>
					</motion.div>

					{/* Small tile - 94% Accuracy */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.5 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-4 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="text-center">
									<span className="font-bold text-lg text-white">Day 1</span>
									<p className="text-xs text-white/70">Accuracy</p>
								</div>
							}
						/>
					</motion.div>

					{/* Small tile - 1-Click Restore */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.6 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-4 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="text-center">
									<span className="font-bold text-lg text-white">1-Click</span>
									<p className="text-xs text-white/70">Restore</p>
								</div>
							}
						/>
					</motion.div>

					{/* Small tile - Zero Config */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.7 }}
					>
						<BentoGridItem
							className="bg-snapback-dark border border-white/10 rounded-xl p-4 transition-all duration-300 hover:border-snapback-green/50 hover:shadow-lg"
							title={
								<div className="text-center">
									<span className="font-bold text-lg text-white">Zero</span>
									<p className="text-xs text-white/70">Config</p>
								</div>
							}
						/>
					</motion.div>
				</BentoGrid>
			</div>

			<div>
				<div className="container max-w-5xl">
					{featureTabs.map((tab) => {
						const filteredHighlights = tab.highlights || [];
						return (
							<motion.div
								key={tab.id}
								initial={{ opacity: 0 }}
								animate={{
									opacity: selectedTab === tab.id ? 1 : 0,
								}}
								transition={{ duration: 0.3 }}
								className={cn(
									"border-t py-8 first:border-t-0 md:py-12 lg:border lg:first:border-t lg:rounded-3xl lg:p-6",
									selectedTab === tab.id ? "block" : "hidden lg:hidden",
								)}
							>
								<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 lg:gap-12">
									<motion.div
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.5,
											delay: 0.1,
										}}
									>
										<h3 className="font-normal text-2xl leading-normal md:text-3xl">
											<strong className="text-secondary">{tab.title}. </strong>
											{tab.subtitle}
										</h3>

										{tab.description && (
											<motion.p
												className="mt-4"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{
													duration: 0.3,
													delay: 0.2,
												}}
											>
												{tab.description}
											</motion.p>
										)}

										<motion.div
											className="mt-6"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.3,
											}}
										>
											<h4 className="font-semibold text-lg mb-3">Key Benefits</h4>
											<ul className="space-y-2">
												{filteredHighlights.map((highlight, k) => (
													<motion.li
														key={k}
														initial={{
															opacity: 0,
															x: -20,
														}}
														animate={{
															opacity: 1,
															x: 0,
														}}
														transition={{
															duration: 0.3,
															delay: k * 0.1 + 0.4,
														}}
														whileHover={{
															x: 10,
														}}
														className="flex items-start gap-2 cursor-pointer"
													>
														<motion.div
															whileHover={{
																scale: 1.2,
																rotate: 5,
															}}
															transition={{
																type: "spring",
																stiffness: 300,
															}}
														>
															<highlight.icon className="text-primary mt-0.5 size-5 flex-shrink-0" />
														</motion.div>
														<span>{highlight.description}</span>
													</motion.li>
												))}
											</ul>
										</motion.div>
									</motion.div>
									<motion.div
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.5,
											delay: 0.2,
										}}
									>
										<div className="bg-muted border rounded-xl h-64 flex items-center justify-center">
											<div className="text-center">
												<motion.div
													whileHover={{
														scale: 1.1,
														rotate: 5,
													}}
													transition={{
														type: "spring",
														stiffness: 300,
													}}
												>
													<tab.icon className="mx-auto size-12 text-muted-foreground" />
												</motion.div>
												<motion.p className="mt-2 text-muted-foreground" whileHover={{ y: -2 }}>
													{tab.title}
												</motion.p>
											</div>
										</div>
									</motion.div>
								</div>

								{filteredHighlights.length > 0 && (
									<motion.div
										className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.3,
											delay: 0.5,
										}}
									>
										{filteredHighlights.map((highlight, k) => (
											<motion.div
												key={`highlight-${k}`}
												initial={{
													opacity: 0,
													y: 20,
												}}
												animate={{
													opacity: 1,
													y: 0,
												}}
												transition={{
													duration: 0.3,
													delay: k * 0.1 + 0.6,
												}}
												whileHover={{
													y: -10,
													scale: 1.02,
													boxShadow:
														"0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
												}}
												className="flex flex-col items-stretch justify-between rounded-xl bg-card border p-4 transition-all duration-300 cursor-pointer"
											>
												<div>
													<motion.div
														whileHover={{
															scale: 1.1,
														}}
														transition={{
															type: "spring",
															stiffness: 300,
														}}
													>
														<highlight.icon
															className="text-primary text-xl"
															width="1em"
															height="1em"
														/>
													</motion.div>
													<motion.strong
														className="mt-2 block"
														whileHover={{
															x: 5,
														}}
													>
														{highlight.title}
													</motion.strong>
													<motion.p
														className="mt-1 text-sm"
														whileHover={{
															opacity: 0.8,
														}}
													>
														{highlight.description}
													</motion.p>
												</div>
											</motion.div>
										))}
									</motion.div>
								)}
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
