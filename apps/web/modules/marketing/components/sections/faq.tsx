import { logger } from "@snapback/infrastructure";

("use client");

import { ChevronDown } from "lucide-react";
import { m } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";

// FAQ data structured for Schema.org markup
const faqs = [
	{
		question: "How does SnapBack differ from Git?",
		answer: "Git tracks commits (deliberate saves), while SnapBack captures every save automatically—even before you commit. It's designed for instant restore, not version control. SnapBack is specifically built for protecting against AI coding mistakes, with automatic snapshots before AI assistants like Copilot or Cursor make changes.",
		keywords: ["git alternative", "vscode snapshot", "automatic code backup"],
	},
	{
		question: "Does SnapBack work with GitHub Copilot and Cursor?",
		answer: "Yes. SnapBack detects AI activity from GitHub Copilot, Cursor, Claude, Windsurf, and other AI coding assistants. It creates checkpoints automatically before AI-generated changes, giving you instant rollback capability if something breaks.",
		keywords: ["github copilot safety", "cursor alternative", "ai coding safety"],
	},
	{
		question: "How do I recover code after AI breaks it?",
		answer: "Open the SnapBack Explorer in VS Code, select your most recent session, click 'Preview Restore' to see what changed, then click 'Restore'. The entire process takes less than 5 seconds and recovers your code instantly.",
		keywords: ["recover from ai code error", "undo ai changes", "ai broke my code"],
	},
	{
		question: "Is my code stored in the cloud?",
		answer: "No. SnapBack stores all snapshots locally on your machine. Your code never leaves your computer. This ensures privacy, speed (<50ms overhead), and works offline. For teams, optional cloud backup is available but not required.",
		keywords: ["local code backup", "privacy focused code tool", "offline code protection"],
	},
	{
		question: "Will SnapBack slow down my editor?",
		answer: "No. SnapBack adds less than 50ms overhead per save—completely imperceptible. It uses efficient delta compression and runs asynchronously, so your coding experience remains smooth even on large projects.",
		keywords: ["vscode performance", "fast code backup", "zero latency backup"],
	},
	{
		question: "What is the Guardian feature?",
		answer: "Guardian is SnapBack's AI-powered code analysis that detects dangerous patterns in real-time: exposed secrets (API keys, passwords), test mocks in production code, and phantom dependencies. It warns you before these issues reach production.",
		keywords: ["guardian code analysis", "secret detection", "ai code security"],
	},
	{
		question: "Can I use SnapBack for production code?",
		answer: "Yes. SnapBack is designed for production environments. It helps prevent AI-generated bugs from reaching production by providing instant rollback when AI suggestions break tests, corrupt configs, or introduce security issues.",
		keywords: ["ai coding for production", "production code safety", "safe ai refactoring"],
	},
	{
		question: "How much storage does SnapBack use?",
		answer: "SnapBack uses delta compression to store only what changed between snapshots. A typical project with 1,000 files uses ~10-50MB for 100 snapshots. Automatic pruning keeps storage efficient.",
		keywords: ["vscode storage", "efficient code backup", "local code history"],
	},
];

const FAQ = () => {
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Generate Schema.org FAQPage structured data
	const schemaData = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.answer,
			},
		})),
	};

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
		logger.debug("Support contact initiated");
	};

	return (
		<section className="section bg-muted/10" aria-labelledby="faq-heading">
			{/* Schema markup for AI search engines and featured snippets */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
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
						Got questions? We've got answers. Can't find what you're looking for?{" "}
						<a
							href="https://new-docs.snapback.dev/faq"
							className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
							aria-describedby="docs-link-desc"
						>
							Check our full FAQ
						</a>{" "}
						or reach out to our team.
						<span id="docs-link-desc" className="sr-only">
							Visit full FAQ page for more questions and answers
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
									key={`faq-${index}-${faq.question.replace(/\s+/g, "-").toLowerCase()}`}
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
										<div className="px-6 pb-4 text-muted-foreground">{faq.answer}</div>
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
					<p className="text-muted-foreground mb-6">Still have questions? Our team is here to help.</p>
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
