"use client";

import { TestimonialCard } from "@marketing/components/ui/testimonial-card";
import { motion } from "motion/react";

export function Testimonials() {
	const testimonials = [
		{
			name: "Sarah K.",
			role: "Senior Frontend Developer",
			company: "TechCorp",
			quote:
				"GitHub Copilot deleted 3 days of work. SnapBack restored it in seconds. Game changer for AI-assisted development.",
		},
		{
			name: "Michael T.",
			role: "Tech Lead",
			company: "StartupX",
			quote:
				"Our team uses Cursor extensively. SnapBack gives us the confidence to experiment without fear of losing progress.",
		},
		{
			name: "Alex R.",
			role: "Full Stack Engineer",
			company: "DevSolutions",
			quote:
				"Windsurf integration caught a catastrophic refactor before it went to production. Saved us hours of debugging.",
		},
		{
			name: "Jamie L.",
			role: "Engineering Manager",
			company: "EnterpriseSoft",
			quote:
				"SnapBack's AI detection is incredibly accurate. We've reduced code recovery time from hours to seconds.",
		},
		{
			name: "David P.",
			role: "DevOps Engineer",
			company: "CloudTech",
			quote:
				"The automatic checkpointing saved our microservices during a massive AI refactoring session. Worth every penny.",
		},
		{
			name: "Rachel M.",
			role: "Software Architect",
			company: "InnovateLab",
			quote:
				"Finally, a tool that understands modern AI-assisted workflows. SnapBack is now part of our standard dev stack.",
		},
	];

	return (
		<section className="py-16">
			<div className="container max-w-7xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-12"
				>
					<h2 className="font-bold text-3xl md:text-4xl mb-4">
						Trusted by Developers
					</h2>
					<p className="text-foreground/60 max-w-2xl mx-auto">
						Join thousands of developers who rely on SnapBack to protect their
						code
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
				>
					{testimonials.map((testimonial, index) => (
						<TestimonialCard
							key={index}
							quote={testimonial.quote}
							author={testimonial.name}
							role={testimonial.role}
							company={testimonial.company}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.3,
								delay: index * 0.1 + 0.3,
							}}
						/>
					))}
				</motion.div>
			</div>
		</section>
	);
}
