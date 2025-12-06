"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";

export function FaqSection({ className }: { className?: string }) {
	const items = [
		{
			question: "How does SnapBack protect my code from AI assistants?",
			answer: "SnapBack monitors your file system for AI activity patterns and automatically creates checkpoints before AI assistants like GitHub Copilot, Cursor, or Windsurf make changes. If an AI-induced change breaks your code, you can instantly restore to any previous working state with one click.",
		},
		{
			question: "What file types does SnapBack monitor?",
			answer: "SnapBack monitors all file types but pays special attention to critical configuration files like package.json, .env files, tsconfig.json, webpack.config.js, and other build configuration files that are commonly corrupted by AI assistants. You can customize which files and directories to monitor in your settings.",
		},
		{
			question: "How does SnapBack detect AI activity?",
			answer: "SnapBack uses behavioral analysis to detect rapid file changes that indicate AI activity (multiple files changed in less than a second). It also recognizes patterns specific to popular AI tools like GitHub Copilot, Cursor, and Windsurf through IDE integration and file change signatures.",
		},
		{
			question: "Can I restore individual files or do I have to restore everything?",
			answer: "You have full flexibility. You can restore your entire project to a previous checkpoint, selectively restore individual files, or cherry-pick specific changes to keep. Our visual diff interface shows exactly what changed so you can make informed decisions.",
		},
		{
			question: "Does SnapBack work with my IDE?",
			answer: "SnapBack has native extensions for VS Code and is planning support for JetBrains IDEs, Neovim, Cursor, and Zed. The core protection works at the file system level, so even without IDE integration you're protected. IDE extensions provide additional features like visual indicators and easier restoration.",
		},
		{
			question: "Is my code secure with SnapBack?",
			answer: "Absolutely. SnapBack is local-first with zero required cloud connectivity. Your code never leaves your machine without explicit consent. Checkpoints are stored locally using Git with optional encryption. For team plans, we offer end-to-end encryption for cloud sync with zero-knowledge architecture.",
		},
	];

	if (!items) {
		return null;
	}

	return (
		<section className={cn("scroll-mt-20 border-t py-12 lg:py-16", className)} id="faq">
			<div className="container max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mb-12 lg:text-center"
				>
					<h1 className="mb-2 font-bold text-4xl lg:text-5xl">Frequently asked questions</h1>
					<p className="text-lg opacity-50">
						Everything you need to know about protecting your code from AI mistakes.
					</p>
				</motion.div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{items.map((item, i) => (
						<motion.div
							key={`faq-item-${i}`}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: i * 0.1 }}
							className="rounded-lg bg-card border p-4 lg:p-6"
						>
							<h4 className="mb-2 font-semibold text-lg">{item.question}</h4>
							<p className="text-foreground/60">{item.answer}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
