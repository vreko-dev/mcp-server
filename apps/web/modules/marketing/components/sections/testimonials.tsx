"use client";
import { InfiniteMovingCards } from "@marketing/components/ui/infinite-moving-cards";
import { m } from "motion/react";
import { useEffect, useState } from "react";

const Testimonials = () => {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const testimonials = [
		{
			quote: "SnapBack transformed our deployment process from a 3-hour manual nightmare into a 15-minute automated flow. Our team can finally focus on building features instead of fighting infrastructure.",
			name: "Sarah Chen",
			title: "Lead Developer at TechFlow",
		},
		{
			quote: "The pattern recognition is incredible. It identified automation opportunities we didn't even know existed. We've saved 40+ hours per week across our engineering team.",
			name: "Marcus Rodriguez",
			title: "CTO at BuildCorp",
		},
		{
			quote: "Finally, a tool that speaks developer. The bracket motif and neon aesthetic perfectly capture that streetwear-meets-tech vibe we love. Plus, it actually works.",
			name: "Alex Kim",
			title: "Senior Engineer at DevStudio",
		},
		{
			quote: "SnapBack's human-in-the-loop approach gives us the perfect balance of automation and control. Critical decisions still go through our team, but everything else just works.",
			name: "Jordan Taylor",
			title: "DevOps Engineer at ScaleTech",
		},
		{
			quote: "The observability features are game-changing. We can see exactly where our bottlenecks are and how automation is impacting our delivery metrics.",
			name: "Riley Morgan",
			title: "Engineering Manager at FlowCorp",
		},
		{
			quote: "Integration was seamless. Connected our GitHub, Slack, and Azure DevOps in minutes. The whole team was up and running before lunch.",
			name: "Casey Wong",
			title: "Platform Engineer at CloudBase",
		},
	];

	return (
		<section className="py-20 bg-gradient-to-b from-background to-muted/20">
			<div className="container">
				<m.div
					className="text-center mb-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<h2 className="text-display mb-6">
						Developers <span className="bracket">&#123;</span>love
						<span className="bracket">&#125;</span> SnapBack
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
						Join thousands of developers who've already streamlined their workflows with SnapBack.
					</p>
				</m.div>

				<m.div
					initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					viewport={{ once: true }}
				>
					<InfiniteMovingCards
						items={testimonials}
						direction="right"
						speed="slow"
						pauseOnHover={true}
						className="mb-8"
					/>
				</m.div>

				{/* Social Stats */}
				<m.div
					className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
				>
					<div className="text-center">
						<div className="text-4xl font-black text-primary mb-2">2,500+</div>
						<div className="text-muted-foreground">Developers using SnapBack</div>
					</div>
					<div className="text-center">
						<div className="text-4xl font-black text-secondary mb-2">15,000+</div>
						<div className="text-muted-foreground">Automations created</div>
					</div>
					<div className="text-center">
						<div className="text-4xl font-black text-accent mb-2">300+</div>
						<div className="text-muted-foreground">Hours saved per team/month</div>
					</div>
				</m.div>
			</div>
		</section>
	);
};

export default Testimonials;
