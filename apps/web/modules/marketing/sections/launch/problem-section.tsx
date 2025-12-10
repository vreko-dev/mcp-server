"use client";

import { LearningStageCard } from "@marketing/components/ui/learning-stage-card";
import { LEARNING_STAGES } from "@marketing/constants/learning-stages";

export function ProblemSection() {
	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4 max-w-6xl">
				{/* Header Section */}
				<div className="text-center mb-16">
					<h2 className="text-3xl lg:text-5xl font-bold text-white">It gets smarter</h2>
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
