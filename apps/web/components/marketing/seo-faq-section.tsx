"use client";

import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";

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

export function FAQSection() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

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

	return (
		<section className="py-20 bg-zinc-950">
			{/* Schema markup for AI search engines */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

			<div className="container mx-auto px-4 max-w-4xl">
				<div className="text-center mb-12">
					<h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
					<p className="text-zinc-400">Everything you need to know about AI code protection with SnapBack</p>
				</div>

				<div className="space-y-4">
					{faqs.map((faq, index) => (
						<div key={index} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
							<button
								onClick={() => setOpenIndex(openIndex === index ? null : index)}
								className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
							>
								<h3 className="text-lg font-semibold text-white pr-8">{faq.question}</h3>
								<svg
									className={`w-5 h-5 text-emerald-500 transition-transform ${
										openIndex === index ? "rotate-180" : ""
									}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							<AnimatePresence>
								{openIndex === index && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
									>
										<div className="px-6 pb-4 text-zinc-400 leading-relaxed">{faq.answer}</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					))}
				</div>

				{/* CTA after FAQ */}
				<div className="text-center mt-12">
					<p className="text-zinc-500 mb-4">Still have questions?</p>
					<div className="flex gap-4 justify-center">
						<a
							href="https://new-docs.snapback.dev"
							className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
						>
							Read Documentation
						</a>
						<a
							href="https://discord.gg/SF6Vcjzj"
							className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-colors"
						>
							Join Discord
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
