"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface FileEntry {
	id: string;
	name: string;
	status: "good" | "bad";
	isSelected: boolean;
}

export function InteractiveFileDemo() {
	const [files, setFiles] = useState<FileEntry[]>([
		{ id: "1", name: "src/auth.ts", status: "good", isSelected: false },
		{ id: "2", name: "src/user.ts", status: "bad", isSelected: false },
		{ id: "3", name: "src/index.ts", status: "bad", isSelected: false },
		{ id: "4", name: "src/middleware.ts", status: "good", isSelected: false },
		{ id: "5", name: "tests/auth.test.ts", status: "good", isSelected: false },
	]);

	const [phase, setPhase] = useState<"initial" | "ai_editing" | "restored">("initial");
	const [isAnimating, setIsAnimating] = useState(false);

	// Auto-play demo on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			playDemo();
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	const playDemo = async () => {
		if (isAnimating) {
			return;
		}
		setIsAnimating(true);

		// Step 1: Show AI editing
		setPhase("ai_editing");
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Step 2: Show restored
		setPhase("restored");
		setFiles((prev) => prev.map((f) => (f.status === "bad" ? { ...f, isSelected: true } : f)));

		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Reset for next demo cycle
		setPhase("initial");
		setFiles((prev) => prev.map((f) => ({ ...f, isSelected: false })));
		setIsAnimating(false);

		// Auto-restart after delay
		setTimeout(() => playDemo(), 3000);
	};

	const badFileCount = files.filter((f) => f.status === "bad").length;

	return (
		<div className="w-full max-w-2xl mx-auto">
			{/* Demo Container */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl"
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="text-2xl">📦</div>
							<div>
								<h3 className="text-sm font-semibold text-white">Session: "Claude refactored auth"</h3>
								<p className="text-xs text-slate-400 mt-0.5">14:05 - 14:23 UTC</p>
							</div>
						</div>

						{/* Status Badge */}
						<AnimatePresence mode="wait">
							{phase === "ai_editing" && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/25 border border-purple-400/50 rounded-md"
								>
									<span className="text-xs text-purple-300 font-medium">🤖 AI editing</span>
									<div className="flex gap-1">
										{[0, 1, 2].map((i) => (
											<motion.div
												key={i}
												className="w-1 h-1 bg-purple-300 rounded-full"
												animate={{ y: [0, -3, 0] }}
												transition={{
													duration: 0.6,
													repeat: Number.POSITIVE_INFINITY,
													delay: i * 0.15,
												}}
											/>
										))}
									</div>
								</motion.div>
							)}

							{phase === "restored" && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/25 border border-emerald-400/50 rounded-md"
								>
									<span className="text-xs text-emerald-300 font-medium">✓ Restored</span>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>

				{/* File List */}
				<div className="p-6 space-y-3">
					{files.map((file) => (
						<motion.div
							key={file.id}
							layout
							className={`group relative flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
								file.status === "good"
									? "bg-emerald-500/10 border-emerald-500/30"
									: file.isSelected
										? "bg-emerald-500/10 border-emerald-500/30"
										: "bg-red-500/10 border-red-500/30"
							}`}
						>
							{/* File Icon & Name */}
							<div className="flex items-center gap-3 min-w-0">
								<span className="text-lg flex-shrink-0">{file.name.endsWith(".ts") ? "📄" : "🧪"}</span>
								<span
									className={`text-sm font-mono truncate ${
										file.status === "good" || file.isSelected ? "text-emerald-300" : "text-red-300"
									}`}
								>
									{file.name}
								</span>
							</div>

							{/* Status Badge */}
							<div className="flex-shrink-0">
								<AnimatePresence mode="wait">
									{file.status === "good" || file.isSelected ? (
										<motion.div
											key="good"
											initial={{ opacity: 0, scale: 0 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0 }}
											className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/25 border border-emerald-400/50 rounded text-emerald-300 text-xs font-medium"
										>
											<span>✓</span>
											<span>{file.isSelected ? "Restored" : "Keep"}</span>
										</motion.div>
									) : (
										<motion.div
											key="bad"
											initial={{ opacity: 0, scale: 0 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0 }}
											className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/25 border border-red-400/50 rounded text-red-300 text-xs font-medium"
										>
											<span>✕</span>
											<span>Restore</span>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</motion.div>
					))}
				</div>

				{/* Footer - Restore Button */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between"
				>
					<div className="text-sm text-slate-400">
						{phase === "restored" ? (
							<motion.span
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="text-emerald-400 font-medium"
							>
								All {badFileCount} files restored to previous state
							</motion.span>
						) : (
							<span>
								<span className="text-red-400 font-semibold">{badFileCount}</span> files to restore
							</span>
						)}
					</div>

					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => {
							setIsAnimating(true);
							playDemo();
						}}
						disabled={isAnimating}
						className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-medium rounded-lg transition-all text-sm"
					>
						{phase === "restored" ? "Reset Demo" : "Restore All"}
					</motion.button>
				</motion.div>
			</motion.div>

			{/* Help Text */}
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.6 }}
				className="text-center text-sm text-slate-400 mt-4"
			>
				Watch the demo: AI edits 5 files, 2 have issues, restore them instantly without losing good changes.
			</motion.p>
		</div>
	);
}
