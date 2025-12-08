"use client";

import { Button } from "@ui/components/button";
import { Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { animations } from "@/lib/animations";
import { captureEvent } from "@/lib/posthog-client";

export function MobileHero() {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || isSubmitting) return;

		setIsSubmitting(true);
		captureEvent("mobile_hero_email_capture", { email });

		// TODO: Integrate with actual email service
		await new Promise((resolve) => setTimeout(resolve, 1000));

		setIsSubmitted(true);
		setIsSubmitting(false);
	};

	return (
		<section className="px-4 py-12 max-w-md mx-auto">
			{/* Headline */}
			<motion.h1
				variants={animations.fadeInUp}
				initial="initial"
				animate="animate"
				className="text-4xl font-bold text-center mb-8 leading-tight"
			>
				<span className="text-white">Code Breaks.</span>
				<br />
				<span className="text-green-500 drop-shadow-[0_0_25px_rgba(52,211,153,0.4)]">Snap Back.</span>
			</motion.h1>

			{/* Static result image - showing the end state */}
			<motion.div
				variants={animations.fadeInUp}
				initial="initial"
				animate="animate"
				transition={{ delay: 0.1 }}
				className="relative rounded-lg overflow-hidden border border-white/10 bg-[#1E1E1E] mb-6"
			>
				{/* Badge: Interactive demo on desktop */}
				<div className="absolute top-3 right-3 z-10">
					<span className="text-[10px] bg-black/60 backdrop-blur-sm text-gray-400 px-2 py-1 rounded border border-white/10 font-mono">
						Interactive on desktop
					</span>
				</div>

				{/* Static screenshot placeholder - will need actual screenshot */}
				<div className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#18181B] to-[#09090B] p-6">
					<div className="text-center space-y-3">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-2">
							<Shield className="w-8 h-8 text-green-500" />
						</div>
						<h3 className="text-xl font-bold text-white">Restored & Protected</h3>
						<p className="text-gray-400 text-sm">
							SnapBack caught the error and restored your state in{" "}
							<span className="font-mono font-bold text-green-400">47ms</span>.
						</p>
					</div>
				</div>

				{/* Timeline strip */}
				<div className="border-t border-white/10 bg-black/40 px-4 py-3">
					<div className="flex items-center justify-between text-xs max-w-xs mx-auto">
						<div className="flex flex-col items-center gap-1">
							<div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center text-green-500 text-sm">
								✓
							</div>
							<span className="text-gray-500 text-[10px]">saved</span>
						</div>
						<div className="flex-1 h-px bg-green-500/30 mx-2" />
						<div className="flex flex-col items-center gap-1">
							<div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-sm">
								🤖
							</div>
							<span className="text-gray-500 text-[10px]">AI edit</span>
						</div>
						<div className="flex-1 h-px bg-red-500/30 mx-2" />
						<div className="flex flex-col items-center gap-1">
							<div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 text-sm">
								🔴
							</div>
							<span className="text-gray-500 text-[10px]">error</span>
						</div>
						<div className="flex-1 h-px bg-green-500/30 mx-2" />
						<div className="flex flex-col items-center gap-1">
							<div className="w-6 h-6 rounded-full bg-green-500 border border-green-500 flex items-center justify-center text-black text-sm">
								✓
							</div>
							<span className="text-gray-500 text-[10px]">restored</span>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Tighter copy */}
			<motion.p
				variants={animations.fadeInUp}
				initial="initial"
				animate="animate"
				transition={{ delay: 0.2 }}
				className="text-center text-gray-400 mb-8 leading-relaxed"
			>
				AI rewrites your code. You save. Git can't help—nothing was committed. SnapBack restores everything in
				one click.
			</motion.p>

			{/* Mobile-specific CTA: Email capture */}
			<motion.div
				variants={animations.fadeInUp}
				initial="initial"
				animate="animate"
				transition={{ delay: 0.3 }}
				className="p-5 bg-white/5 rounded-lg border border-white/10 mb-6"
			>
				{!isSubmitted ? (
					<>
						<p className="text-sm text-center text-gray-300 mb-4 font-medium">
							Get a reminder when you're at your desk
						</p>
						<form onSubmit={handleSubmit} className="flex flex-col gap-3">
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
								className="px-4 py-3 rounded-lg bg-black border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
							/>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 font-medium text-white transition-all h-auto"
							>
								{isSubmitting ? "Sending..." : "Notify me"}
							</Button>
						</form>
						<p className="text-[10px] text-center text-gray-500 mt-3">
							We'll email you the VS Code install link
						</p>
					</>
				) : (
					<div className="text-center py-4">
						<div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-full mb-3">
							<Shield className="w-6 h-6 text-green-500" />
						</div>
						<p className="text-green-400 font-medium mb-1">Check your email!</p>
						<p className="text-xs text-gray-400">
							We sent you the install link for when you're on desktop.
						</p>
					</div>
				)}
			</motion.div>

			{/* Trust signals */}
			<motion.div
				variants={animations.fadeInUp}
				initial="initial"
				animate="animate"
				transition={{ delay: 0.4 }}
				className="flex justify-center gap-6 text-sm text-gray-500"
			>
				<span className="flex items-center gap-1">
					<span className="text-green-500">✓</span> VS Code
				</span>
				<span className="flex items-center gap-1">
					<span className="text-green-500">✓</span> Cursor
				</span>
				<span className="flex items-center gap-1">
					<span className="text-green-500">✓</span> Free
				</span>
			</motion.div>
		</section>
	);
}
