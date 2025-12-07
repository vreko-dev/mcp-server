"use client";

import { IconCursor, IconVSCode } from "@marketing/components/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { TerminalLine } from "./types";

// Helper to get colors based on message type
const getColor = (type: string) => {
	switch (type) {
		case "error":
			return "#EF4444"; // Red-500
		case "success":
			return "#10B981"; // Emerald-500
		case "system":
			return "#3B82F6"; // Blue-500
		case "dim":
			return "#6B7280"; // Gray-500
		default:
			return "#D4D4D4";
	}
};

function TerminalLineItem({ line, index }: { line: TerminalLine; index: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -5 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.15 }} // Slower typing for reality
			style={{ color: getColor(line.type) }}
			className="font-mono text-[11px] md:text-xs leading-5 mb-1 break-words"
		>
			<span className="opacity-50 mr-2 select-none w-3 inline-block">
				{line.type === "error" ? "⨯" : line.type === "success" ? "✓" : "›"}
			</span>
			{line.text}
		</motion.div>
	);
}

export function TerminalPane({ lines, showCTA = false }: { lines: TerminalLine[]; showCTA?: boolean }) {
	// VS Code Terminal Colors
	const COLORS = {
		border: "#2D2D2D",
		bg: "#18181B", // Zinc-900 (Panel color)
		header: "#1E1E1E",
		textMuted: "#6B7280",
		text: "#E5E5E5",
	};

	return (
		<div className="flex flex-col h-full w-full bg-[#18181B] border-t border-[#2D2D2D]">
			{/* Terminal Tabs - Authentic Look */}
			<div
				className="flex gap-6 px-4 h-8 items-center text-[10px] uppercase tracking-wider select-none border-b border-[#2D2D2D] bg-[#1E1E1E]"
				style={{ color: COLORS.textMuted }}
			>
				<span className="hover:text-gray-300 cursor-pointer transition-colors">Problems</span>
				<span className="hover:text-gray-300 cursor-pointer transition-colors">Output</span>
				<span className="hover:text-gray-300 cursor-pointer transition-colors">Debug Console</span>
				<span
					style={{
						color: COLORS.text,
						borderBottom: `1px solid ${COLORS.text}`,
						height: "100%",
						display: "flex",
						alignItems: "center",
					}}
				>
					Terminal
				</span>
			</div>

			{/* Terminal Content */}
			<div className="flex-1 p-4 overflow-hidden font-mono text-xs relative flex flex-col">
				<AnimatePresence mode="wait">
					<motion.div
						key={lines[0]?.text || "empty"}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col justify-start h-full max-w-2xl"
					>
						{lines.map((line, i) => (
							<TerminalLineItem key={`${line.text}-${i}`} line={line} index={i} />
						))}

						{/* Blinking Block Cursor (Only active if no CTA or CTA is loading) */}
						{!showCTA && (
							<motion.div
								className="w-2 h-4 bg-gray-500 mt-1 ml-5"
								animate={{ opacity: [1, 0] }}
								transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
							/>
						)}

						{/* CTA Buttons - Reveal inside terminal */}
						{showCTA && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.8, duration: 0.4 }}
								className="mt-6 ml-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
							>
								<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
									<Link
										href="/connect/vscode"
										className="group flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#2D2D2D] hover:border-green-500/50 text-white rounded-sm text-xs font-mono transition-all"
									>
										<IconVSCode className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" />
										<span>Install Extension</span>
									</Link>
								</motion.div>

								<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
									<Link
										href="https://cursor.sh"
										target="_blank"
										className="group flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#2D2D2D] hover:border-white/30 text-white rounded-sm text-xs font-mono transition-all"
									>
										<IconCursor className="w-4 h-4 opacity-70 group-hover:opacity-100" />
										<span>Add to Cursor</span>
									</Link>
								</motion.div>

								{/* Blinking cursor at end of prompt */}
								<motion.div
									className="w-2 h-4 bg-green-500"
									animate={{ opacity: [1, 0] }}
									transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
								/>
							</motion.div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
