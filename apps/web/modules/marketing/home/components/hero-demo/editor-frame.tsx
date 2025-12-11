"use client";

import { IconCursor, IconVSCode } from "@marketing/components/icons";
import { Button } from "@ui/components/button";
import { Confetti } from "@ui/components/motion/magic/confetti";
import { AlertTriangle, Circle, Download, MousePointerClick, RotateCcw, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { captureEvent } from "@/lib/posthog-client";
import { TerminalPane } from "./terminal-pane";

interface EditorFrameProps {
	node: any;
	currentState: string;
	children: React.ReactNode;
	showCTA: boolean;
	showRestorePrompt?: boolean;
	onRestore?: () => void;
	onReplay?: () => void;
}

export function EditorFrame({
	node,
	currentState,
	children,
	showCTA,
	showRestorePrompt,
	onRestore,
	onReplay,
}: EditorFrameProps) {
	const [showConfetti, setShowConfetti] = useState(false);
	const [restoreTime, setRestoreTime] = useState(0);
	const isUnsaved = currentState === "ai_edit" || currentState === "break";
	// We treat "break" as just another state now, reliance on Terminal logs for drama
	const isDanger = currentState === "break";
	const isRestored = currentState === "restored";

	// Count up animation for restore time
	useEffect(() => {
		if (isRestored) {
			setShowConfetti(true);
			const end = 47;
			const duration = 500; // 0.5s animation
			const startTime = Date.now();

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const current = Math.floor(progress * end);
				setRestoreTime(current);

				if (progress < 1) {
					requestAnimationFrame(animate);
				}
			};

			requestAnimationFrame(animate);

			// Hide confetti after duration
			const timer = setTimeout(() => setShowConfetti(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [isRestored]);

	return (
		<motion.div
			className="relative w-full h-[520px] md:h-[550px] rounded-lg overflow-hidden flex flex-col bg-[#1E1E1E] border border-[#2D2D2D] shadow-2xl"
			animate={
				isDanger
					? {
							boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.4)",
							borderColor: "#EF4444",
						}
					: {
							boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
							borderColor: currentState === "restored" ? "#10B981" : "#2D2D2D",
						}
			}
			transition={{ duration: 0.4 }}
		>
			{/* Title Bar / Tabs / Header Metrics */}
			<div className="h-9 bg-[#18181B] flex items-center px-4 border-b border-[#2D2D2D] shrink-0 justify-between">
				<div className="flex items-center gap-4">
					<div className="flex space-x-2">
						<div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
						<div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
						<div className="w-3 h-3 rounded-full bg-[#27C93F]" />
					</div>
					{/* Active Tab */}
					<div className="flex items-center px-3 py-1.5 bg-[#1E1E1E] border-t border-l border-r border-[#2D2D2D] rounded-t-md text-xs text-gray-300 font-mono relative top-[1px]">
						<span className="mr-2">config.ts</span>
						{isUnsaved ? (
							<Circle className="w-2 h-2 fill-white text-white" />
						) : (
							<X className="w-3 h-3 text-gray-500 hover:text-white" />
						)}
					</div>
				</div>

				{/* V6: Header Trust Score (Low Profile) */}
				<div className="flex items-center gap-3 text-[10px] font-mono bg-black/20 px-2 py-1 rounded border border-white/5">
					<span className="text-gray-500">TRUST SCORE</span>
					<div className="w-px h-3 bg-white/10" />
					{currentState === "safe" || currentState === "ai_edit" ? (
						<span className="text-green-500 flex items-center gap-1.5">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
							</span>
							94
						</span>
					) : isDanger ? (
						<span className="text-red-500 flex items-center gap-1.5 font-bold">
							<AlertTriangle className="w-3 h-3" />
							73
						</span>
					) : (
						<span className="text-green-400 flex items-center gap-1.5">
							<ShieldCheck className="w-3 h-3" />
							94
						</span>
					)}
				</div>
			</div>

			{/* Main Split Layout */}
			<div className="flex-1 flex flex-col min-h-0">
				{/* Top: Code Area (Flex 1) */}
				<div className="relative flex-1 flex min-h-0">
					{/* Gutter */}
					<div className="w-12 bg-[#1E1E1E] text-gray-600 text-right pr-4 pt-4 select-none flex flex-col leading-5 border-r border-[#2D2D2D]">
						{Array.from({ length: 20 }).map((_, i) => (
							<span key={i} className="block text-[10px] sm:text-xs">
								{i + 1}
							</span>
						))}
					</div>

					{/* Code Content - Smaller Font for V6, VS Code Font Stack for V7 */}
					<div
						className="flex-1 p-4 bg-[#1E1E1E] text-gray-300 overflow-hidden relative text-xs sm:text-[13px] leading-relaxed"
						style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}
					>
						{children}

						{/* In-Editor CTA Overlay */}
						<AnimatePresence>
							{showCTA && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="absolute inset-0 z-20 bg-[#1E1E1E]/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
								>
									<motion.div
										initial={{ scale: 0.9 }}
										animate={{ scale: 1 }}
										className="max-w-md w-full space-y-6"
									>
										{/* Staggered Success Elements */}
										<motion.div
											className="flex justify-center mb-4"
											initial={{ opacity: 0, scale: 0.5 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ delay: 0 }}
										>
											<div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
												<ShieldCheck className="w-8 h-8 text-green-500" />
											</div>
										</motion.div>

										<motion.h3
											className="text-xl font-bold text-white mb-2"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.1 }}
										>
											Restored & Protected
										</motion.h3>

										<motion.p
											className="text-gray-400 text-sm"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.2 }}
										>
											SnapBack caught the error and restored your state in{" "}
											<motion.span
												className="font-mono font-bold text-green-400"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ delay: 0.3 }}
											>
												{restoreTime}ms
											</motion.span>
											.
										</motion.p>

										<motion.div
											className="flex flex-col gap-3 w-full"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.3 }}
										>
											{/* Desktop Options (Hidden on Mobile) */}
											<div className="hidden md:grid grid-cols-2 gap-4">
												<Button
													asChild
													size="lg"
													className="w-full bg-[#007ACC] hover:bg-[#007ACC]/90 text-white border-0 gap-2 shadow-lg shadow-blue-900/30 h-12 text-base"
													onClick={() =>
														captureEvent("hero_cta_click", {
															type: "vscode",
															source: "desktop_matrix",
														})
													}
												>
													<Link href="/connect/vscode">
														<IconVSCode className="w-5 h-5" />
														Install for VS Code
													</Link>
												</Button>
												<Button
													asChild
													variant="ghost"
													className="w-full gap-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all h-10 text-sm"
													onClick={() =>
														captureEvent("hero_cta_click", {
															type: "cursor",
															source: "desktop_matrix",
														})
													}
												>
													<Link href="https://cursor.sh" target="_blank">
														<IconCursor className="w-4 h-4" />
														Also works with Cursor
													</Link>
												</Button>
											</div>

											{/* Replay Button */}
											{onReplay && (
												<motion.button
													onClick={onReplay}
													className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 mx-auto mt-4"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													transition={{ delay: 0.5 }}
												>
													<RotateCcw className="w-3 h-3" />
													Replay Demo
												</motion.button>
											)}
										</motion.div>
									</motion.div>

									{/* Subtle Confetti Celebration */}
									{showConfetti && (
										<Confetti
											particleCount={30}
											duration={2000}
											colors={["#10B981", "#34D399", "#6EE7B7"]}
										/>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Glitch Overlay (Subtle, on code only) */}
					{isDanger && (
						<motion.div
							className="absolute inset-0 bg-red-500/5 z-10 pointer-events-none mix-blend-overlay"
							animate={{ opacity: [0, 0.1, 0, 0.2, 0] }}
							transition={{ duration: 0.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 3 }}
						/>
					)}
				</div>

				{/* Bottom: Terminal Pane (Reduced Height: ~105px) */}
				<div
					className="h-[105px] shrink-0 z-20 relative border-t border-[#2D2D2D] bg-[#18181B]"
					style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}
				>
					<TerminalPane lines={node.terminal || []} showCTA={showCTA} />

					{/* Restore Button with Hint Text (Overlaid in Terminal Bottom Right) */}
					<AnimatePresence>
						{showRestorePrompt && onRestore && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 5 }}
								className="absolute bottom-3 right-3 z-50 flex flex-col items-end gap-1.5"
							>
								{/* Hint Text with Icon */}
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.3 }}
									className="text-[10px] text-emerald-400/90 font-mono bg-black/60 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1"
								>
									<MousePointerClick className="w-3 h-3 animate-bounce" />
									<span>Click to restore 453 files</span>
								</motion.div>
								<Button
									size="sm"
									onClick={onRestore}
									className="bg-green-500 hover:bg-green-600 text-black font-bold shadow-lg animate-pulse"
								>
									<ShieldCheck className="mr-2 h-4 w-4" />
									Snap Back
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			{/* V6 Layout: Status Bar at very bottom */}
			<div
				className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-30 relative"
				style={{ backgroundColor: isDanger ? "#B91C1C" : isRestored ? "#059669" : "#007ACC" }}
			>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1">
						<Download className="w-3 h-3 rotate-45" />
						<span>origin/main</span>
					</div>
					{isDanger && <div className="flex items-center gap-1 font-bold animate-pulse">⨯ 1 Error</div>}
				</div>
				<div className="flex items-center gap-4 opacity-90">
					<span>Ln 12, Col 34</span>
					<span>UTF-8</span>
					<span>TypeScript</span>
				</div>
			</div>
		</motion.div>
	);
}
