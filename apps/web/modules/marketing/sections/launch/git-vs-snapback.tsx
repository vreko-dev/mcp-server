"use client";

import { NeonCard } from "@marketing/components/ui";
import { Check, GitBranch, Lock, Users, Zap } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function GitVsSnapback() {
	const gitCardRef = useRef(null);
	const snapbackCardRef = useRef(null);
	const integrationMsgRef = useRef(null);

	const [gitInView, setGitInView] = useState(false);
	const [snapbackInView, setSnapbackInView] = useState(false);
	const [integrationMsgInView, setIntegrationMsgInView] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.target === gitCardRef.current) {
						setGitInView(entry.isIntersecting);
					}
					if (entry.target === snapbackCardRef.current) {
						setSnapbackInView(entry.isIntersecting);
					}
					if (entry.target === integrationMsgRef.current) {
						setIntegrationMsgInView(entry.isIntersecting);
					}
				});
			},
			{ rootMargin: "-100px 0px 0px 0px", threshold: 0.1 },
		);

		if (gitCardRef.current) {
			observer.observe(gitCardRef.current);
		}
		if (snapbackCardRef.current) {
			observer.observe(snapbackCardRef.current);
		}
		if (integrationMsgRef.current) {
			observer.observe(integrationMsgRef.current);
		}

		return () => observer.disconnect();
	}, []);

	const comparisonRows = [
		{
			aspect: "Activation",
			icon: Zap,
			git: "Manual commits when you remember",
			snapback: "Automatic snapshots on save & AI events",
			snapbackHighlight: true,
		},
		{
			aspect: "Scope",
			icon: Users,
			git: "Repo-wide history",
			snapback: "Per-session timeline of your work",
			snapbackHighlight: true,
		},
		{
			aspect: "Use Case",
			icon: GitBranch,
			git: "Designed for collaboration & teams",
			snapback: "Designed as your personal safety net",
			snapbackHighlight: true,
		},
		{
			aspect: "Setup",
			icon: Lock,
			git: "Requires auth, remotes, workflow changes",
			snapback: "Local-only, no account, zero setup",
			snapbackHighlight: true,
		},
	];

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-20 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-medium uppercase tracking-wider">
						Complementary, Not Replacement
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white max-w-3xl mx-auto">
						Git vs SnapBack: Different Tools, Different Jobs
					</h2>
					<p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">
						SnapBack works alongside Git. It handles the moments Git can't—the experimental edits, the AI
						suggestions, the mid-thought code changes.
					</p>
				</div>

				{/* Comparison Grid */}
				<div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
					{/* Git Column */}
					<m.div
						ref={gitCardRef}
						initial={{ opacity: 1, x: 0 }}
						animate={gitInView ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
						transition={{ duration: 0.5 }}
					>
						<NeonCard
							className="h-full"
							borderColor="rgba(136, 136, 136, 0.2)"
							glowColor="rgba(136, 136, 136, 0.2)"
						>
							<div className="p-8 space-y-8">
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#222] border border-[#333]">
										<GitBranch className="w-5 h-5 text-[#888]" />
									</div>
									<h3 className="text-2xl font-bold text-white">Git</h3>
								</div>

								<div className="space-y-6">
									{comparisonRows.map((row, index) => (
										<div key={`git-${index}`} className="space-y-2">
											<div className="text-sm text-[#888] font-medium uppercase tracking-wider">
												{row.aspect}
											</div>
											<p className="text-white text-base leading-relaxed">{row.git}</p>
										</div>
									))}
								</div>

								<div className="pt-8 border-t border-[#222]">
									<p className="text-sm text-[#888]">
										✓ Best for: Teams, long-term history, code review
									</p>
									<p className="text-sm text-[#888] mt-2">
										✓ Strength: Collaboration & accountability
									</p>
								</div>
							</div>
						</NeonCard>
					</m.div>

					{/* SnapBack Column */}
					<m.div
						ref={snapbackCardRef}
						initial={{ opacity: 1, x: 0 }}
						animate={snapbackInView ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<NeonCard
							className="h-full"
							borderColor="rgba(34, 197, 94, 0.3)"
							glowColor="rgba(34, 197, 94, 0.3)"
						>
							<div className="p-8 space-y-8">
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--snapback-green)]/20 border border-[var(--snapback-green)]/50">
										<Zap className="w-5 h-5 text-[var(--snapback-green)]" />
									</div>
									<h3 className="text-2xl font-bold text-white">SnapBack</h3>
								</div>

								<div className="space-y-6">
									{comparisonRows.map((row, index) => (
										<div key={`snapback-${index}`} className="space-y-2">
											<div className="flex items-center gap-2">
												<Check className="w-4 h-4 text-[var(--snapback-green)]" />
												<div className="text-sm text-[var(--snapback-green)] font-medium uppercase tracking-wider">
													{row.aspect}
												</div>
											</div>
											<p className="text-white text-base leading-relaxed">{row.snapback}</p>
										</div>
									))}
								</div>

								<div className="pt-8 border-t border-[var(--snapback-green)]/30">
									<p className="text-sm text-[var(--snapback-green)]">
										✓ Best for: Personal experimentation, AI safety, mid-workflow recovery
									</p>
									<p className="text-sm text-[var(--snapback-green)] mt-2">
										✓ Strength: Speed & instant recovery
									</p>
								</div>
							</div>
						</NeonCard>
					</m.div>
				</div>

				{/* Integration Message */}
				<m.div
					ref={integrationMsgRef}
					initial={{ opacity: 1, y: 0 }}
					animate={integrationMsgInView ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="mt-20 text-center max-w-2xl mx-auto p-8 rounded-2xl bg-[var(--snapback-green)]/5 border border-[var(--snapback-green)]/20"
				>
					<h3 className="text-xl font-bold text-white mb-3">Use Them Together</h3>
					<p className="text-[#A0A0A0]">
						Git for long-term history and team collaboration. SnapBack for instant recovery from
						mid-workflow mistakes. The best workflow uses both.
					</p>
				</m.div>
			</div>
		</section>
	);
}
