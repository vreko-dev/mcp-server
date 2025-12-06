"use client";
import { m } from "motion/react";
import React, { useEffect, useState } from "react";

export function InteractiveDemo() {
	const [isSnapping, setIsSnapping] = useState(false);
	const [isRestored, setIsRestored] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleSnapBack = () => {
		setIsSnapping(true);
		// After 2 seconds, animation completes and code stays restored
		setTimeout(() => {
			setIsSnapping(false);
			setIsRestored(true); // Persist the restored state
		}, 2000);
	};

	const handleReset = () => {
		setIsRestored(false);
		setIsSnapping(false);
	};

	return (
		<div className="container mx-auto px-4">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">See SnapBack in action</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Watch how SnapBack detects AI changes and creates instant recovery points
				</p>
			</div>

			{/* Interactive CTA */}
			<div className="flex justify-center mb-8">
				<m.div
					animate={{ y: [0, -8, 0] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/40 border border-primary text-primary text-sm font-medium shadow-lg shadow-primary/30"
				>
					<span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
					Try it: Click the button below →
				</m.div>
			</div>

			{/* Main Demo Container */}
			<div className="max-w-6xl mx-auto bg-slate-900/60 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
				{/* Mobile & Desktop Layout */}
				<div className="grid md:grid-cols-2 gap-0">
					{/* Left: Code Editor */}
					<div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-border">
						<div className="bg-slate-800/80 rounded-lg p-4 mb-4 border border-slate-700">
							<div className="flex items-center mb-4">
								<div className="flex space-x-2">
									<div className="w-3 h-3 bg-red-500 rounded-full" />
									<div className="w-3 h-3 bg-yellow-500 rounded-full" />
									<div className="w-3 h-3 bg-green-500 rounded-full" />
								</div>
								<span className="ml-4 text-sm text-muted-foreground">src/auth.js</span>
							</div>

							<m.div
								className="font-mono text-sm overflow-x-auto"
								animate={isSnapping ? { opacity: [0.5, 1] } : {}}
								transition={{ duration: 0.5 }}
							>
								<div className="text-muted-foreground">1</div>
								<div className="text-muted-foreground">2</div>
								{/* UNSAFE LINE - Only shows when NOT restored */}
								{!isRestored && (
									<>
										<m.div
											className="text-red-500"
											animate={
												isSnapping
													? {
															backgroundColor: [
																"rgba(239, 68, 68, 0.3)",
																"rgba(16, 185, 129, 0.3)",
																"transparent",
															],
														}
													: {}
											}
											transition={{ duration: 1.5 }}
										>
											3 &nbsp;&nbsp;// AI-generated authentication logic
										</m.div>
										<m.div
											className="text-red-500"
											animate={
												isSnapping
													? {
															backgroundColor: [
																"rgba(239, 68, 68, 0.3)",
																"rgba(16, 185, 129, 0.3)",
																"transparent",
															],
														}
													: {}
											}
											transition={{ duration: 1.5, delay: 0.1 }}
										>
											4 &nbsp;&nbsp;function authenticate(user) {"{"}
										</m.div>
										<m.div
											className="text-red-500"
											animate={
												isSnapping
													? {
															backgroundColor: [
																"rgba(239, 68, 68, 0.3)",
																"rgba(16, 185, 129, 0.3)",
																"transparent",
															],
														}
													: {}
											}
											transition={{ duration: 1.5, delay: 0.2 }}
										>
											5 &nbsp;&nbsp;&nbsp;&nbsp;return user.password === "admin123";
										</m.div>
										<m.div
											className="text-red-500"
											animate={
												isSnapping
													? {
															backgroundColor: [
																"rgba(239, 68, 68, 0.3)",
																"rgba(16, 185, 129, 0.3)",
																"transparent",
															],
														}
													: {}
											}
											transition={{ duration: 1.5, delay: 0.3 }}
										>
											6 &nbsp;&nbsp;{"}"}
										</m.div>
									</>
								)}
								{/* SAFE CODE - Only shows when restored */}
								{isRestored && (
									<>
										<div className="text-emerald-400">
											3 &nbsp;&nbsp;// Secure password comparison with bcrypt
										</div>
										<div className="text-emerald-400">
											{"4 \u00a0\u00a0function authenticate(user, password) {"}
										</div>
										<div className="text-emerald-400">
											5 &nbsp;&nbsp;&nbsp;&nbsp;return await bcrypt.compare(password, user.hash);
										</div>
										<div className="text-emerald-400">{"6 \u00a0\u00a0}"}</div>
									</>
								)}
								<div className="text-muted-foreground">7</div>
							</m.div>
						</div>

						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<div className="flex items-center space-x-2">
								<div
									className={`w-2 h-2 rounded-full animate-pulse ${isRestored ? "bg-green-400" : "bg-orange-400"}`}
								/>
								<span
									className={`text-sm font-medium ${isRestored ? "text-green-400" : "text-orange-400"}`}
								>
									{isRestored ? "Code restored safely" : "AI modifying code..."}
								</span>
							</div>
							<div className={`text-xs ${isRestored ? "text-green-400" : "text-muted-foreground"}`}>
								{isRestored ? "✓ Safe version restored" : "Copilot detected"}
							</div>
						</div>
					</div>

					{/* Right: SnapBack Timeline */}
					<div className="p-4 md:p-6 flex flex-col">
						<h3 className="text-lg font-semibold text-white mb-4">SnapBack Timeline</h3>

						<div className="space-y-3 flex-grow">
							<m.div
								className="flex items-center space-x-3 p-3 bg-emerald-500/20 rounded-lg border-l-4 border-emerald-400"
								animate={isSnapping ? { scale: [1, 1.02, 1] } : {}}
							>
								<div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
								<div className="min-w-0">
									<div className="text-sm font-medium text-white">Safe checkpoint created</div>
									<div className="text-xs text-muted-foreground">
										{isRestored ? "Just now" : "2 minutes ago"}
									</div>
								</div>
							</m.div>

							<m.div
								className="flex items-center space-x-3 p-3 bg-blue-500/20 rounded-lg border-l-4 border-blue-400"
								animate={isSnapping ? { scale: [1, 1.02, 1] } : {}}
								transition={{ delay: 0.1 }}
							>
								<div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 animate-pulse" />
								<div className="min-w-0">
									<div className="text-sm font-medium text-white">AI changes detected</div>
									<div className="text-xs text-muted-foreground">
										{isRestored ? "Reverted" : "1 line modified by Copilot"}
									</div>
								</div>
							</m.div>

							{/* SECURITY RISK - Red when danger, Green when averted */}
							<m.div
								className={`flex items-center space-x-3 p-3 rounded-lg border-l-4 ${
									isRestored ? "bg-emerald-500/20 border-emerald-400" : "bg-red-500/20 border-red-400"
								}`}
								animate={isSnapping ? { scale: [1, 1.02, 1] } : {}}
								transition={{ delay: 0.2 }}
							>
								<div
									className={`w-2 h-2 rounded-full flex-shrink-0 ${isRestored ? "bg-emerald-400" : "bg-red-400"}`}
								/>
								<div className="min-w-0">
									<div className="text-sm font-medium text-white">
										{isRestored ? "Risk averted" : "Security risk identified"}
									</div>
									<div className={`text-xs ${isRestored ? "text-emerald-400" : "text-red-400"}`}>
										{isRestored ? "Safe checkpoint restored" : "Hardcoded credentials detected"}
									</div>
								</div>
							</m.div>
						</div>

						{/* Button with Pulse Animation */}
						<div className="mt-6">
							{!isRestored ? (
								<m.button
									onClick={handleSnapBack}
									className="w-full py-3 px-4 font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									disabled={isSnapping}
									animate={
										isSnapping
											? {
													boxShadow: [
														"0 0 30px rgba(16, 185, 129, 0.8)",
														"0 0 60px rgba(16, 185, 129, 1)",
														"0 0 30px rgba(16, 185, 129, 0.8)",
													],
												}
											: {
													boxShadow: [
														"0 0 25px rgba(16, 185, 129, 0.6)",
														"0 0 50px rgba(16, 185, 129, 0.8)",
														"0 0 25px rgba(16, 185, 129, 0.6)",
													],
												}
									}
									transition={
										isSnapping
											? { duration: 0.6 }
											: { duration: 2, repeat: Number.POSITIVE_INFINITY }
									}
								>
									{isSnapping ? "Restoring code..." : "Snap Back"}
								</m.button>
							) : (
								<m.button
									onClick={handleReset}
									className="w-full py-3 px-4 font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									Reset Demo
								</m.button>
							)}
							{!isSnapping && !isRestored && (
								<div className="text-xs text-center text-muted-foreground mt-2">
									Click to restore code
								</div>
							)}
							{isRestored && (
								<div className="text-xs text-center text-emerald-400 mt-2">
									✓ Code restored to safe version
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Visual Diff - Shows during and after restoration */}
				{(isSnapping || isRestored) && (
					<m.div
						className="border-t border-slate-700 p-4 md:p-6 bg-slate-900/40"
						initial={isMounted ? { opacity: 0, height: 0 } : { opacity: 1, height: "auto" }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
					>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
							<h4 className="text-sm font-medium text-white">
								{isRestored ? "Recovery Complete ✓" : "Restoring code..."}
							</h4>
							<div className="text-xs text-emerald-400">
								{isRestored ? "✓ Restored to safe checkpoint" : "Analyzing and reverting changes..."}
							</div>
						</div>
						<div className="grid md:grid-cols-2 gap-4 text-sm font-mono text-xs md:text-sm">
							<div>
								<div className="text-xs text-red-400 mb-2">- Removed (AI-injected code)</div>
								<div className="bg-red-500/20 p-2 rounded border-l-2 border-red-400 overflow-x-auto">
									<div className="text-red-400 font-medium">
										- return user.password === "admin123";
									</div>
								</div>
							</div>
							<div>
								<div className="text-xs text-green-400 mb-2">+ Restored (secure comparison)</div>
								<div className="bg-green-500/20 p-2 rounded border-l-2 border-green-400 overflow-x-auto">
									<div className="text-green-400 font-medium">
										+ return await bcrypt.compare(password, user.hash);
									</div>
								</div>
							</div>
						</div>
					</m.div>
				)}
			</div>
		</div>
	);
}
