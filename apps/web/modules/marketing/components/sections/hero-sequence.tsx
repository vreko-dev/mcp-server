"use client";
import { Spotlight } from "@marketing/components/ui/aceternity/spotlight";
import { MagneticButton } from "@marketing/components/ui/magnetic-button";
import { Terminal } from "@marketing/components/ui/terminal";
import content from "@marketing/content/snapback.json";
import { m } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

const HeroSequence = () => {
	const [isMounted, setIsMounted] = useState(false);
	// const { shouldReduceAnimations } = useMobileOptimization(); // TODO: Re-enable when mobile optimization is implemented

	// For the terminal animation, we want to show the animation even on mobile
	// unless the user specifically prefers reduced motion for accessibility
	// const _prefersReducedMotion =
	// 	typeof window !== "undefined"
	// 		? window.matchMedia("(prefers-reduced-motion: reduce)").matches
	// 		: false;

	const ref = useRef(null);
	// const _isInView = useInView(ref, { once: true, margin: "-20%" }); // TODO: Re-enable when in-view detection is needed

	// Extract terminal commands from content - memoize to prevent re-renders
	const terminalCommands = React.useMemo(
		() =>
			content.hero.sequence
				.filter((item: any) => item.type === "terminal")
				.map((item: any) => ({
					content: item.content,
					delay: item.delay,
				})),
		[],
	);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<section className="min-h-screen bg-gradient-to-b from-slate-900 via-gray-900 to-black flex flex-col items-center justify-center px-4 relative overflow-hidden pt-20">
			{/* Spotlight Effect */}
			<Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden">
				{[...Array(6)].map((_, i) => (
					<m.div
						key={i}
						className="absolute w-2 h-2 bg-primary rounded-full opacity-20"
						initial={isMounted ? { x: "-100vw", y: `${i * 20}%` } : { x: 0, y: `${i * 20}%` }}
						animate={isMounted ? { x: "100vw" } : { x: 0 }}
						transition={{
							duration: 20 + i * 5,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
							delay: i * 2,
						}}
					/>
				))}
			</div>

			<div className="max-w-6xl mx-auto text-center z-10">
				{/* Main Heading */}
				<m.h1
					className="text-display font-black mb-8"
					initial={isMounted ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.8,
						ease: "easeOut",
						type: "spring",
						stiffness: 100,
						damping: 15,
					}}
					whileHover={{
						scale: 1.02,
						transition: { duration: 0.3 },
					}}
				>
					<span className="block mb-4">SnapBack.dev</span>
					<span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
						Undo the chaos
					</span>
				</m.h1>

				{/* Subheading */}
				<m.p
					className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.8,
						ease: "easeOut",
						delay: 0.2,
						type: "spring",
						stiffness: 100,
						damping: 15,
					}}
					whileHover={{
						y: -5,
						transition: { duration: 0.3 },
					}}
				>
					The missing undo button for developers.
					<span className="text-white font-medium"> SnapBack</span> automatically protects your code from
					accidental changes, so you can code with confidence.
				</m.p>

				{/* CTA Buttons */}
				<m.div
					className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.8,
						ease: "easeOut",
						delay: 0.4,
						type: "spring",
						stiffness: 100,
						damping: 15,
					}}
				>
					<MagneticButton
						className="btn-neon px-8 py-4 text-lg font-semibold"
						strength={0.5}
						radius={80}
						whileHover={{
							scale: 1.05,
							transition: {
								type: "spring",
								stiffness: 400,
								damping: 17,
							},
						}}
						whileTap={{
							scale: 0.95,
							transition: { duration: 0.1 },
						}}
						onClick={() => {
							const waitlistSection = document.querySelector("#waitlist");
							waitlistSection?.scrollIntoView({
								behavior: "smooth",
							});
						}}
					>
						Join Beta Waitlist
					</MagneticButton>

					<MagneticButton
						variant="ghost"
						className="btn-ghost px-8 py-4 text-lg font-semibold"
						strength={0.3}
						radius={60}
						whileHover={{
							scale: 1.05,
							transition: {
								type: "spring",
								stiffness: 400,
								damping: 17,
							},
						}}
						whileTap={{
							scale: 0.95,
							transition: { duration: 0.1 },
						}}
						onClick={() => {
							const featuresSection = document.querySelector("#features");
							featuresSection?.scrollIntoView({
								behavior: "smooth",
							});
						}}
					>
						See How It Works
					</MagneticButton>
				</m.div>

				{/* Terminal Preview */}
				<m.div
					ref={ref}
					className="relative max-w-4xl mx-auto"
					initial={isMounted ? { opacity: 0, y: 40 } : { opacity: 1, y: 0 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.8,
						ease: "easeOut",
						delay: 0.6,
						type: "spring",
						stiffness: 100,
						damping: 15,
					}}
					whileHover={{
						y: -10,
						transition: {
							type: "spring",
							stiffness: 300,
							damping: 20,
						},
					}}
				>
					<div className="bg-black/90 backdrop-blur-none border border-white/30 rounded-2xl p-8 shadow-2xl relative z-0">
						<div className="flex items-center gap-2 mb-6">
							<div className="w-3 h-3 bg-red-500 rounded-full" />
							<div className="w-3 h-3 bg-yellow-500 rounded-full" />
							<div className="w-3 h-3 bg-green-500 rounded-full" />
							<span className="text-xs text-muted-foreground ml-4">terminal-preview.sh</span>
						</div>

						<div className="space-y-6">
							{terminalCommands.length > 0 ? (
								<Terminal
									key="terminal-window"
									lines={terminalCommands.map((cmd) => cmd.content)}
									respectReducedMotion={false}
									className="w-full rounded-lg"
								/>
							) : (
								<div className="text-red-500">No terminal commands found</div>
							)}
						</div>
					</div>
				</m.div>
			</div>

			{/* Bottom fade */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
		</section>
	);
};

export { HeroSequence };
