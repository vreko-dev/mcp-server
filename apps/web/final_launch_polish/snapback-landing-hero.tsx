"use client";

import { motion } from "motion/react";
import { useState } from "react";

export function Hero() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus("loading");

		try {
			// Replace with your actual endpoint
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) throw new Error("Failed to join waitlist");

			setStatus("success");
			setEmail("");

			// Optional: Track with PostHog/Analytics
			if (typeof window !== "undefined" && (window as any).posthog) {
				(window as any).posthog.capture("waitlist_joined", { email });
			}
		} catch (_error) {
			setStatus("error");
			setErrorMessage("Something went wrong. Please try again.");
		}
	};

	return (
		<section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black overflow-hidden">
			{/* Animated background gradient */}
			<div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent animate-pulse-slow" />

			{/* Grid pattern overlay */}
			<div className="absolute inset-0 bg-grid-white/[0.02]" />

			<div className="relative z-10 container mx-auto px-4 py-20">
				<div className="max-w-5xl mx-auto text-center">
					{/* Badge - Alpha Status */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-8"
					>
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
						</span>
						<span className="text-sm text-orange-400 font-medium">
							Private Alpha • Limited Access
						</span>
					</motion.div>

					{/* Main Headline - SEO Optimized */}
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="text-6xl md:text-8xl font-bold mb-6 leading-tight"
					>
						<span className="text-white">AI Code Protection</span>
						<br />
						<span className="text-white">for VS Code</span>
						<br />
						<span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
							When AI Breaks Your Code
						</span>
					</motion.h1>

					{/* Subheadline - Includes target keywords */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="text-xl md:text-2xl text-zinc-400 mb-4 max-w-3xl mx-auto leading-relaxed"
					>
						<strong className="text-white">SnapBack</strong> is a VS Code
						extension that creates automatic code snapshots before AI assistants
						make changes. Instant restore when GitHub Copilot, Cursor, or Claude
						breaks something.
					</motion.p>

					{/* SEO Context - Emotional hook */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.25 }}
						className="text-base text-zinc-500 mb-8 max-w-2xl mx-auto"
					>
						AI destroyed $12,000 of production code. We built the safety net so
						it never happens to you.
					</motion.p>

					{/* Social Proof */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="flex items-center justify-center gap-6 mb-12 text-sm text-zinc-500"
					>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4 text-emerald-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
							<span>247 developers protected</span>
						</div>
						<div className="w-1 h-1 rounded-full bg-zinc-700" />
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4 text-emerald-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							<span>1,842 checkpoints created today</span>
						</div>
					</motion.div>

					{/* Email Capture Form */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.4 }}
						className="max-w-xl mx-auto mb-8"
					>
						{status === "success" ? (
							<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
								<div className="flex items-center gap-3 mb-2">
									<svg
										className="w-6 h-6 text-emerald-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<h3 className="text-lg font-semibold text-emerald-400">
										You're on the list!
									</h3>
								</div>
								<p className="text-zinc-400 text-sm">
									Check your email for alpha access instructions. We'll send
									your invite code within 24 hours.
								</p>
							</div>
						) : (
							<form
								onSubmit={handleSubmit}
								className="flex flex-col sm:flex-row gap-3"
							>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your.email@company.com"
									className="flex-1 px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
									disabled={status === "loading"}
								/>
								<button
									type="submit"
									disabled={status === "loading"}
									className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-semibold rounded-lg transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
								>
									{status === "loading" ? "Joining..." : "Request Alpha Access"}
								</button>
							</form>
						)}

						{status === "error" && (
							<p className="text-red-400 text-sm mt-2">{errorMessage}</p>
						)}

						<p className="text-xs text-zinc-600 mt-3">
							Join the private alpha. No credit card required. Free forever for
							alpha users.
						</p>
					</motion.div>

					{/* Urgency Message */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.5 }}
						className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full text-sm text-zinc-400"
					>
						<svg
							className="w-4 h-4 text-orange-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>
							<strong className="text-white">83 spots remaining</strong> in this
							cohort
						</span>
					</motion.div>

					{/* Trust Badges */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.6 }}
						className="mt-16 pt-12 border-t border-zinc-800"
					>
						<p className="text-xs text-zinc-600 mb-6 uppercase tracking-wider">
							Works with your AI tools
						</p>
						<div className="flex justify-center items-center gap-12 opacity-40 grayscale hover:opacity-60 hover:grayscale-0 transition-all">
							<div className="text-zinc-400 text-sm font-medium">
								GitHub Copilot
							</div>
							<div className="text-zinc-400 text-sm font-medium">Cursor</div>
							<div className="text-zinc-400 text-sm font-medium">Windsurf</div>
							<div className="text-zinc-400 text-sm font-medium">Claude</div>
						</div>
					</motion.div>
				</div>
			</div>

			{/* Scroll indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1, delay: 1 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2"
			>
				<div className="flex flex-col items-center gap-2 text-zinc-600 animate-bounce">
					<span className="text-xs uppercase tracking-wider">
						Scroll to see how it works
					</span>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						/>
					</svg>
				</div>
			</motion.div>
		</section>
	);
}
