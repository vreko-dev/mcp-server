"use client";

import { siteSpec } from "@marketing/config/site-config";
import { Lock } from "lucide-react";
import { m } from "motion/react";

export function PrivacySection() {
	const { privacy } = siteSpec.pages.home.sections;

	return (
		<section className="py-24 bg-[#050505] relative overflow-hidden border-y border-[#111]">
			<div className="container mx-auto px-4">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-16 space-y-4">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#111] border border-[#222] mb-4">
							<Lock className="w-6 h-6 text-[var(--snapback-green)]" />
						</div>
						<h2 className="text-3xl lg:text-4xl font-bold text-white">{privacy.content.headline}</h2>
						<p className="text-[#A0A0A0]">{privacy.content.footer}</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{privacy.content.items.map((item, index) => (
							<m.div
								key={item.title}
								initial={{ opacity: 1, y: 0 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1 }}
								className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[var(--snapback-green)]/30 transition-colors"
							>
								<h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
								<p className="text-[#888] text-sm leading-relaxed">{item.description}</p>
							</m.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
