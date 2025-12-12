"use client";

import { LearningStageCard } from "@marketing/components/ui/learning-stage-card";
import { siteSpec } from "@marketing/config/site-config";
import { LEARNING_STAGES } from "@marketing/constants/learning-stages";

export function ProblemSection() {
	const { problem } = siteSpec.pages.home.sections;

	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4 max-w-6xl">
				{/* Header Section */}
				<div className="text-center mb-16 space-y-6">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium uppercase tracking-wider">
						{problem.content.label}
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
						{problem.content.headline}
					</h2>
					<p className="text-lg text-[#A0A0A0] leading-relaxed max-w-2xl mx-auto">{problem.content.body}</p>
					<p className="text-lg font-medium text-white">{problem.content.closing}</p>
				</div>

				{/* 3-Card Layout */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{LEARNING_STAGES.map((stage, index) => (
						<LearningStageCard key={stage.period} stage={stage} index={index} variant="dark" />
					))}
				</div>
			</div>
		</section>
	);
}
