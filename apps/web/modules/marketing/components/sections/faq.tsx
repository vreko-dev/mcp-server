"use client";
import { ChevronDown } from "lucide-react";
import { m } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";

const FAQ = () => {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const faqs = [
		{
			question: "How does SnapBack identify automation opportunities?",
			answer:
				"SnapBack uses advanced pattern recognition to analyze your development workflows, identifying repetitive tasks, bottlenecks, and manual processes that can be automated. It learns from your team's behavior and suggests optimizations based on industry best practices.",
		},
		{
			question: "What integrations are supported?",
			answer:
				"SnapBack integrates with all major development tools including GitHub, GitLab, Bitbucket, Slack, Microsoft Teams, Azure DevOps, Jira, n8n, Zapier, and many more. Our REST API also allows custom integrations.",
		},
		{
			question: "Is my data secure with SnapBack?",
			answer:
				"Absolutely. SnapBack is SOC2 compliant with end-to-end encryption, zero-trust architecture, and enterprise-grade security. Your code and data never leave your infrastructure unless explicitly configured.",
		},
		{
			question: "How long does it take to see results?",
			answer:
				"Most teams see immediate value within the first week. Our smart onboarding identifies quick wins in your current workflows, while deeper automation opportunities are discovered as SnapBack learns your patterns over time.",
		},
		{
			question: "Do I need DevOps expertise to use SnapBack?",
			answer:
				"Not at all! SnapBack is designed for developers, not just DevOps experts. Our visual workflow builder and pre-built templates make automation accessible to any developer, regardless of their infrastructure experience.",
		},
		{
			question: "What happens during the beta period?",
			answer:
				"Beta users get free access to all Pro features, priority support, and direct input on our roadmap. The beta program helps us refine SnapBack based on real-world usage before our general availability launch.",
		},
	];

	const toggleAccordion = (index: number) => {
		setOpenIndex(openIndex === index ? null : index);
	};

	const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			toggleAccordion(index);
		}
	};

	const handleContactSupport = () => {
		// Contact support logic would go here
		console.log("Contact support clicked");
	};

	return (
		<section className="section bg-muted/10" aria-labelledby="faq-heading">
			<div className="container">
				<m.div
					className="text-center mb-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
				>
					<h2 id="faq-heading" className="text-display mb-6">
						Frequently asked{" "}
						<span className="bracket" aria-hidden="true">
							&#123;
						</span>
						questions
						<span className="bracket" aria-hidden="true">
							&#125;
						</span>
					</h2>
					<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
						Got questions? We've got answers. Can't find what you're looking
						for?{" "}
						<a
							href="#docs"
							className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
							aria-describedby="docs-link-desc"
						>
							Check our docs
						</a>{" "}
						or reach out to our team.
						<span id="docs-link-desc" className="sr-only">
							Visit documentation for detailed guides and tutorials
						</span>
					</p>
				</m.div>

				<m.div
					className="max-w-3xl mx-auto"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					viewport={{ once: true }}
				>
					<section className="space-y-4" aria-labelledby="faq-heading">
						{faqs.map((faq, index) => {
							const isOpen = openIndex === index;
							return (
								<div
									key={`faq-${index}-${faq.question
										.replace(/\s+/g, "-")
										.toLowerCase()}`}
									className="bg-card/50 backdrop-blur-sm border border-border rounded-lg hover:border-primary/30 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
								>
									<button
										className="w-full px-6 py-4 text-left hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-md flex justify-between items-center"
										onClick={() => toggleAccordion(index)}
										onKeyDown={(e) => handleKeyDown(e, index)}
										aria-expanded={isOpen}
										aria-controls={`faq-answer-${index}`}
										id={`faq-question-${index}`}
										type="button"
									>
										<span className="font-semibold pr-4">{faq.question}</span>
										<m.div
											animate={{
												rotate: isOpen ? 180 : 0,
											}}
											transition={{ duration: 0.2 }}
											className="flex-shrink-0"
											aria-hidden="true"
										>
											<ChevronDown className="h-5 w-5 text-muted-foreground" />
										</m.div>
									</button>

									<m.div
										initial={false}
										animate={{
											height: isOpen ? "auto" : 0,
											opacity: isOpen ? 1 : 0,
										}}
										transition={{
											duration: 0.3,
											ease: "easeInOut",
										}}
										className="overflow-hidden"
										id={`faq-answer-${index}`}
										role="region"
										aria-labelledby={`faq-question-${index}`}
										aria-hidden={!isOpen}
									>
										<div className="px-6 pb-4 text-muted-foreground">
											{faq.answer}
										</div>
									</m.div>
								</div>
							);
						})}
					</section>
				</m.div>

				{/* Additional CTA */}
				<m.div
					className="text-center mt-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					viewport={{ once: true }}
				>
					<p className="text-muted-foreground mb-6">
						Still have questions? Our team is here to help.
					</p>
					<m.button
						className="btn-ghost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleContactSupport}
						type="button"
						aria-describedby="support-desc"
					>
						Contact Support
						<span id="support-desc" className="sr-only">
							Get direct help from our support team
						</span>
					</m.button>
				</m.div>
			</div>
		</section>
	);
};

export default FAQ;
