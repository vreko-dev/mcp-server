"use client";
import { m } from "motion/react";
import type React from "react";
import { useState } from "react";

export function FinalCTASection() {
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitted(true);
		// Handle email submission here
		setTimeout(() => setIsSubmitted(false), 3000);
	};

	return (
		<div className="relative overflow-hidden">
			{/* Matrix rain effect background */}
			<div className="absolute inset-0 opacity-10">
				<MatrixRain />
			</div>

			<div className="container mx-auto relative z-10">
				<m.div
					className="text-center max-w-4xl mx-auto"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					<h2 className="text-display font-black text-white mb-6">
						Never lose code to AI again
					</h2>
					<p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
						Join 50,000+ developers who code fearlessly with SnapBack protection
					</p>

					<m.form
						onSubmit={handleSubmit}
						className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.2 }}
					>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter your email"
							className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							required
						/>
						<m.button
							type="submit"
							className="btn-neon px-8 py-3 whitespace-nowrap"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							disabled={isSubmitted}
						>
							{isSubmitted
								? "Welcome aboard! 🚀"
								: "Start protecting your code"}
						</m.button>
					</m.form>

					<p className="text-sm text-muted-foreground mb-12">
						Free forever. No credit card required.
					</p>

					{/* Trust indicators */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
						<m.div
							className="flex items-center justify-center space-x-3"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
						>
							<div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									className="text-primary"
								>
									<path
										d="M13.5 4.5L6 12L2.5 8.5"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<span className="text-muted-foreground">SOC 2 Compliant</span>
						</m.div>

						<m.div
							className="flex items-center justify-center space-x-3"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.5 }}
						>
							<div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									className="text-primary"
								>
									<rect
										x="3"
										y="6"
										width="10"
										height="7"
										rx="1"
										stroke="currentColor"
										strokeWidth="2"
									/>
									<circle cx="8" cy="9.5" r="1" fill="currentColor" />
									<path
										d="M5.5 6V4.5C5.5 3.12 6.62 2 8 2s2.5 1.12 2.5 2.5V6"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							</div>
							<span className="text-muted-foreground">Enterprise Security</span>
						</m.div>

						<m.div
							className="flex items-center justify-center space-x-3"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.6 }}
						>
							<div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									className="text-primary"
								>
									<circle
										cx="8"
										cy="8"
										r="6"
										stroke="currentColor"
										strokeWidth="2"
									/>
									<path
										d="M8 4v4l3 2"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							</div>
							<span className="text-muted-foreground">24/7 Monitoring</span>
						</m.div>
					</div>
				</m.div>
			</div>
		</div>
	);
}

// Matrix rain effect component
const MatrixRain = () => {
	const chars =
		"ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９";

	return (
		<div className="absolute inset-0 overflow-hidden">
			{Array.from({ length: 50 }, (_, i) => (
				<m.div
					key={i}
					className="absolute text-primary/30 font-mono text-sm"
					style={{
						left: `${Math.random() * 100}%`,
						animationDelay: `${Math.random() * 2}s`,
					}}
					animate={{
						y: ["0vh", "100vh"],
						opacity: [0, 1, 1, 0],
					}}
					transition={{
						duration: 3 + Math.random() * 2,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				>
					{chars.charAt(Math.floor(Math.random() * chars.length))}
				</m.div>
			))}
		</div>
	);
};
