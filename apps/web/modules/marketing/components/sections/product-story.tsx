"use client";
import { StickyScrollReveal } from "@marketing/components/ui/sticky-scroll-reveal";
import { m } from "motion/react";
import { useEffect, useState } from "react";

const ProductStory = () => {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const content = [
		{
			title: "Capture Repetitive Ops",
			description:
				"Turn manual workflows into automated pipelines with intelligent pattern recognition. SnapBack identifies repetitive tasks and converts them into reusable automation blocks.",
			content: (
				<div className="h-full w-full bg-gradient-to-br from-card to-muted/30 flex items-center justify-center p-8">
					<div className="w-full">
						{/* Bracket Divider */}
						<div className="flex items-center justify-center mb-6">
							<span className="text-primary font-mono text-xl">&#123;</span>
							<div className="w-8 h-px bg-gradient-neon mx-2" />
							<span className="text-secondary font-mono text-xl">&#125;</span>
						</div>

						{/* TypeScript Code Sample */}
						<div className="bg-muted/20 rounded-lg p-4 font-mono text-sm border border-border/30">
							<div className="text-muted-foreground mb-2">// Auto-detected pattern</div>
							<div className="text-secondary">interface</div>{" "}
							<div className="text-foreground">DeployWorkflow</div>{" "}
							<div className="text-primary">&#123;</div>
							<div className="ml-4 text-foreground">
								trigger: <span className="text-secondary">'pull_request'</span>;
							</div>
							<div className="ml-4 text-foreground">
								actions: <span className="text-accent">Array&lt;'test' | 'build' | 'deploy'&gt;</span>;
							</div>
							<div className="ml-4 text-foreground">
								frequency: <span className="text-primary">'high'</span>;{" "}
								<span className="text-muted-foreground">// 47x detected</span>
							</div>
							<div className="text-primary">&#125;</div>
							<div className="mt-3 text-muted-foreground">
								<span className="text-accent">const</span> automate ={" "}
								<span className="text-secondary">await</span> snapback.compile(workflow);
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "Auto-route & Build",
			description:
				"Smart routing system automatically assigns tasks to the right team members and builds optimized workflows based on your team's patterns and preferences.",
			content: (
				<div className="h-full w-full bg-gradient-to-br from-card to-muted/30 flex items-center justify-center p-8">
					<div className="w-full">
						<div className="text-center mb-6">
							<div className="text-sm text-muted-foreground mb-2">Building workflow...</div>
							<div className="w-full bg-muted rounded-full h-2">
								<m.div
									className="bg-gradient-neon h-2 rounded-full"
									initial={{ width: 0 }}
									animate={{ width: "85%" }}
									transition={{
										duration: 2,
										repeat: Number.POSITIVE_INFINITY,
										repeatType: "reverse",
									}}
								/>
							</div>
							<div className="text-xs text-muted-foreground mt-2">85% complete</div>
						</div>

						<div className="space-y-2 text-xs">
							<m.div
								className="flex items-center space-x-2"
								initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
							>
								<div className="w-2 h-2 bg-primary rounded-full" />
								<span>Analyzing team capacity</span>
							</m.div>
							<m.div
								className="flex items-center space-x-2"
								initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 1 }}
							>
								<div className="w-2 h-2 bg-secondary rounded-full" />
								<span>Optimizing task routing</span>
							</m.div>
							<m.div
								className="flex items-center space-x-2"
								initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 1.5 }}
							>
								<div className="w-2 h-2 bg-accent rounded-full" />
								<span>Generating automation</span>
							</m.div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "Ship and Observe",
			description:
				"Deploy with confidence using real-time monitoring and intelligent alerting. Track performance metrics and get insights into your automation effectiveness.",
			content: (
				<div className="h-full w-full bg-gradient-to-br from-card to-muted/30 flex items-center justify-center p-8">
					<div className="w-full">
						<div className="grid grid-cols-2 gap-4 text-xs">
							<m.div
								className="bg-card/50 p-3 rounded border border-primary/20"
								whileHover={{ scale: 1.05 }}
							>
								<div className="text-primary font-semibold">Deploy Success</div>
								<div className="text-2xl font-bold text-foreground">98.7%</div>
								<div className="text-muted-foreground">+2.3% this week</div>
							</m.div>

							<m.div
								className="bg-card/50 p-3 rounded border border-secondary/20"
								whileHover={{ scale: 1.05 }}
							>
								<div className="text-secondary font-semibold">Avg Cycle Time</div>
								<div className="text-2xl font-bold text-foreground">4.2h</div>
								<div className="text-muted-foreground">-30min this week</div>
							</m.div>

							<m.div
								className="bg-card/50 p-3 rounded border border-accent/20"
								whileHover={{ scale: 1.05 }}
							>
								<div className="text-accent font-semibold">Automations</div>
								<div className="text-2xl font-bold text-foreground">156</div>
								<div className="text-muted-foreground">+12 this week</div>
							</m.div>

							<m.div
								className="bg-card/50 p-3 rounded border border-outline/20"
								whileHover={{ scale: 1.05 }}
							>
								<div className="text-outline font-semibold">Time Saved</div>
								<div className="text-2xl font-bold text-foreground">23.4h</div>
								<div className="text-muted-foreground">per developer</div>
							</m.div>
						</div>
					</div>
				</div>
			),
		},
	];

	return (
		<section className="py-20">
			<div className="container mb-16">
				<m.div
					className="text-center"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<h2 className="text-display mb-6">
						From chaos to <span className="bracket">&#123;</span>
						clarity
						<span className="bracket">&#125;</span>
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
						Transform your development workflow in three simple steps. No complex setup, no lengthy
						onboarding.
					</p>
				</m.div>
			</div>

			<StickyScrollReveal content={content} />
		</section>
	);
};

export default ProductStory;
