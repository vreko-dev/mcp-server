"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export function CommandReference() {
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

	const copyToClipboard = (text: string, index: number) => {
		navigator.clipboard.writeText(text);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2000);
	};

	const vscodeCommands = [
		{
			command: "SnapBack: Create Checkpoint",
			description: "Manually create a checkpoint with an optional message",
		},
		{
			command: "SnapBack: Snap Back",
			description: "Restore to the most recent checkpoint",
		},
		{
			command: "SnapBack: Show Protection Status",
			description: "Display current protection status and monitoring details",
		},
		{
			command: "SnapBack: Analyze Risk",
			description: "Analyze risk level of current directory changes",
		},
		{
			command: "SnapBack: Toggle AI Monitoring",
			description: "Enable or disable AI activity monitoring",
		},
		{
			command: "SnapBack: Auto-Apply Suggestions",
			description: "Automatically apply trusted AI suggestions",
		},
	];

	const cliCommands = [
		{
			command: "snapback init",
			description: "Initialize SnapBack in the current directory",
		},
		{
			command: "snapback status",
			description: "Show current protection status and checkpoint information",
		},
		{
			command: "snapback checkpoint [message]",
			description: "Create a manual checkpoint with an optional message",
		},
		{
			command: "snapback restore [id]",
			description: "Restore to a specific checkpoint by ID",
		},
		{
			command: "snapback analyze [path]",
			description: "Analyze risk level of changes in the specified path",
		},
		{
			command: "snapback history",
			description: "Show checkpoint history with timestamps and messages",
		},
	];

	return (
		<section className="py-16">
			<div className="container max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h2 className="font-bold text-3xl md:text-4xl">Every Command You Need</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Complete reference for VS Code and CLI commands
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						viewport={{ once: true }}
						className="bg-card border rounded-2xl p-6"
					>
						<h3 className="font-semibold text-xl mb-4">VS Code Commands</h3>
						<div className="space-y-4">
							{vscodeCommands.map((item, index) => (
								<motion.div
									key={index}
									className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
									whileHover={{
										x: 5,
										backgroundColor: "var(--muted)",
									}}
									transition={{
										type: "spring",
										stiffness: 300,
									}}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
								>
									<div className="flex-1">
										<motion.div
											className="font-mono text-sm bg-muted px-2 py-1 rounded"
											whileHover={{ scale: 1.02 }}
										>
											{item.command}
										</motion.div>
										<motion.p
											className="mt-1 text-sm text-muted-foreground"
											whileHover={{ opacity: 0.8 }}
										>
											{item.description}
										</motion.p>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 20 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						viewport={{ once: true }}
						className="bg-card border rounded-2xl p-6"
					>
						<h3 className="font-semibold text-xl mb-4">CLI Commands</h3>
						<div className="space-y-4">
							{cliCommands.map((item, index) => (
								<motion.div
									key={index}
									className="group flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
									whileHover={{
										x: 5,
										backgroundColor: "var(--muted)",
									}}
									transition={{
										type: "spring",
										stiffness: 300,
									}}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
								>
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<motion.div
												className="font-mono text-sm bg-muted px-2 py-1 rounded"
												whileHover={{ scale: 1.02 }}
											>
												{item.command}
											</motion.div>
											<motion.button
												onClick={() => copyToClipboard(item.command, index)}
												className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted-foreground/10 rounded"
												aria-label="Copy command"
												whileHover={{ scale: 1.2 }}
												whileTap={{ scale: 0.9 }}
											>
												{copiedIndex === index ? (
													<CheckIcon className="h-4 w-4 text-green-500" />
												) : (
													<CopyIcon className="h-4 w-4" />
												)}
											</motion.button>
										</div>
										{copiedIndex === index && (
											<motion.div
												className="text-xs text-green-600 mt-1"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
											>
												Copied to clipboard!
											</motion.div>
										)}
										<motion.p
											className="mt-1 text-sm text-muted-foreground"
											whileHover={{ opacity: 0.8 }}
										>
											{item.description}
										</motion.p>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
