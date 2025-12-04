"use client";

import { ChevronRight } from "lucide-react";
import { motion as m } from "motion/react";
import Link from "next/link";

export function OriginStory() {
	return (
		<section className="py-24 bg-[#0A0A0A] relative overflow-hidden">
			<div className="container mx-auto px-4">
				{/* Header */}
				<div className="text-center mb-16 space-y-4 max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-medium uppercase tracking-wider">
						The Origin Story
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">
						The $12,000 Mistake That Started Everything
					</h2>
				</div>

				{/* Content */}
				<div className="max-w-3xl mx-auto">
					<m.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="space-y-6 text-lg text-[#A0A0A0] leading-relaxed"
					>
						<p>
							In 2024, we asked an AI assistant to "clean up" our config files.
						</p>

						<p>
							It deleted production database credentials. Overwrote environment
							variables. "Simplified" our webpack config into something that
							couldn't build.
						</p>

						<p>
							By the time we noticed, we'd already saved. Git couldn't help— the
							AI had made commits. Time Machine was too slow. Three days and
							$12,000 later, we were back online.
						</p>

						<p className="text-white font-medium">
							We built SnapBack so this never happens to anyone again.
						</p>
					</m.div>

					{/* CTA */}
					<m.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						viewport={{ once: true }}
						className="mt-12 flex justify-center"
					>
						<Link
							href="/about"
							className="inline-flex items-center gap-2 px-6 py-3 text-white hover:text-[#10B981] transition-colors font-medium"
						>
							Read the Full Story
							<ChevronRight className="w-4 h-4" />
						</Link>
					</m.div>
				</div>
			</div>
		</section>
	);
}
