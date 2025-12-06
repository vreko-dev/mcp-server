"use client";

import { cn } from "@ui/lib";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export interface ApiKeyRevealProps {
	apiKey: string;
	className?: string;
}

export function ApiKeyReveal({ apiKey, className }: ApiKeyRevealProps) {
	const [revealed, setRevealed] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(apiKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err as Error);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className={cn("bg-terminal-bg border border-snapback-500/20 rounded-lg p-6", className)}
		>
			<div className="space-y-4">
				<motion.div
					className="font-code text-snapback-400 text-sm tracking-wide select-all"
					initial={{ filter: "blur(8px)" }}
					animate={{ filter: revealed ? "blur(0px)" : "blur(8px)" }}
					transition={{ duration: 0.3 }}
				>
					{apiKey}
				</motion.div>

				{!revealed && (
					<motion.button
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => setRevealed(true)}
						className="text-sm text-snapback-400 hover:text-snapback-300 transition-colors"
					>
						Click to reveal your key
					</motion.button>
				)}

				{revealed && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
						<button
							type="button"
							onClick={handleCopy}
							className="relative text-sm text-snapback-400 hover:text-snapback-300 transition-colors"
						>
							<AnimatePresence>
								{copied && (
									<motion.div
										initial={{ opacity: 0, y: -20 }}
										animate={{ opacity: 1, y: -30 }}
										exit={{ opacity: 0 }}
										className="absolute -top-8 left-0 text-snapback-400 text-xs whitespace-nowrap"
									>
										Copied! ✓
									</motion.div>
								)}
							</AnimatePresence>
							<span>Copy to clipboard</span>
						</button>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
}
