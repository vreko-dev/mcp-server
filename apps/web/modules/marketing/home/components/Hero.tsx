// apps/web/modules/marketing/home/components/Hero.tsx
"use client";

import { AnalyticsEvents } from "@analytics";
import { IconCursor, IconVSCode } from "@marketing/components/icons";
import { AlphaBadge } from "@marketing/components/ui/alpha-badge";
import { siteSpec } from "@marketing/config/site-config";
import { Button } from "@ui/components/button";
import { Shield } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { animations } from "@/lib/animations";

export function Hero() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const heroContent = siteSpec.pages.home.sections.hero.content;

	useEffect(() => {
		// Mobile optimization: Pause when out of viewport
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (videoRef.current) {
						// Only play if more than 20% is visible to avoid rapid toggling
						if (entry.isIntersecting) {
							videoRef.current.play().catch(() => {
								// Autoplay might be blocked, handle gracefully
							});
						} else {
							videoRef.current.pause();
						}
					}
				});
			},
			{ threshold: 0.2 },
		);

		if (videoRef.current) {
			observer.observe(videoRef.current);
		}

		return () => {
			if (videoRef.current) {
				observer.unobserve(videoRef.current);
			}
		};
	}, []);

	const handleVideoLoaded = () => {
		posthog.capture(AnalyticsEvents.HERO_VIDEO_PLAYED, {
			autoplay: true,
			timestamp: new Date().toISOString(),
		});
	};

	return (
		<section className="relative w-full h-screen min-h-[800px] flex flex-col overflow-hidden bg-[#0A0A0A]">
			{/* Video Background */}
			<div className="absolute inset-0 z-0">
				{/* Fallback Gradient */}
				<div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] to-[#00FF41]/20 z-0" />

				<video
					ref={videoRef}
					autoPlay
					loop
					muted
					playsInline
					preload="auto"
					onCanPlay={handleVideoLoaded}
					className="w-full h-full object-cover motion-reduce:hidden relative z-10 opacity-40"
				>
					<source src="/assets/SnapBack-Hero.webm" type="video/webm" />
					<source src="/assets/SnapBack-Hero.mp4" type="video/mp4" />
				</video>

				{/* Overlay - Neon Green Tint */}
				<div
					className="absolute inset-0 z-10"
					style={{
						background:
							"linear-gradient(180deg, rgba(10, 10, 10, 0.8) 0%, rgba(10, 10, 10, 0.4) 50%, rgba(10, 10, 10, 0.9) 100%)",
					}}
				/>
				<div className="absolute inset-0 z-10 bg-green/5 mix-blend-overlay" />
			</div>

			{/* Main Content Layer - Centered */}
			<div className="relative z-20 container mx-auto px-4 flex-grow flex flex-col items-center justify-center pt-20">
				<motion.div
					className="max-w-5xl mx-auto text-center"
					initial="initial"
					animate="animate"
					variants={{
						animate: {
							transition: {
								staggerChildren: 0.1,
							},
						},
					}}
				>
					{/* Alpha announcement */}
					<motion.div variants={animations.fadeInUp} className="mb-8 flex justify-center">
						<AlphaBadge />
					</motion.div>

					{/* Main headline */}
					<motion.h1
						variants={animations.fadeInUp}
						className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 drop-shadow-2xl"
					>
						<span className="text-text-primary">Code Breaks.</span>
						<br />
						<span className="text-green drop-shadow-[0_0_25px_rgba(0,255,65,0.3)]">Snap Back.</span>
					</motion.h1>

					{/* Founder Story */}
					<motion.p
						variants={animations.fadeInUp}
						className="text-sm md:text-base text-green/80 max-w-3xl mx-auto leading-relaxed mb-12 px-4 font-mono"
					>
						{heroContent.founder_story}
					</motion.p>

					{/* CTA buttons */}
					<motion.div
						variants={animations.fadeInUp}
						className="flex flex-col sm:flex-row items-center justify-center gap-4"
					>
						<Button
							size="lg"
							asChild
							className="group relative overflow-hidden bg-white hover:bg-gray-100 text-black font-bold px-8 h-14 text-lg shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:shadow-[0_0_40px_rgba(0,255,65,0.6)] hover:scale-105 transition-all duration-300"
						>
							<Link href={heroContent.primary_cta.href}>
								<span className="relative z-10 flex items-center gap-2">
									<IconVSCode className="h-5 w-5 mr-2 transition-transform group-hover:translate-x-1" />
									{heroContent.primary_cta.label}
								</span>
							</Link>
						</Button>

						<Button
							size="lg"
							variant="outline"
							asChild
							className="border-border-strong hover:bg-bg-tertiary h-14 px-8 text-lg backdrop-blur-sm bg-black/40 text-white"
						>
							<Link href={heroContent.secondary_cta.href} target="_blank">
								<IconCursor className="h-5 w-5 mr-2" />
								{heroContent.secondary_cta.label}
							</Link>
						</Button>
					</motion.div>
				</motion.div>
			</div>

			{/* Bottom Anchored Elements: Trust Bar & Scroll Indicator */}
			<div className="relative z-20 container mx-auto px-4 pb-8 flex flex-col items-center gap-8">
				{/* Trust bar - from site-spec */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.5 }}
					className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm text-text-tertiary px-4"
				>
					<div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
						<Shield className="h-4 w-4 text-green" />
						<span>{heroContent.trust_line}</span>
					</div>
					<div className="hidden md:block w-px h-4 bg-border-subtle" />
					<div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
						<motion.span
							animate={{ scale: [1, 1.2, 1] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
							className="h-2 w-2 rounded-full bg-green shadow-[0_0_10px_#00FF41]"
						/>
						<span>{heroContent.primary_cta.subtext}</span>
					</div>
					<div className="hidden md:block w-px h-4 bg-border-subtle" />
					<div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
						<span className="text-green font-mono">Local-first</span>
						<span>no cloud uploads</span>
					</div>
				</motion.div>

				{/* Scroll indicator */}
				<motion.div
					animate={{ y: [0, 10, 0] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
					className="flex flex-col items-center gap-2 text-text-tertiary cursor-pointer hover:text-green transition-colors"
					onClick={() => {
						const nextSection =
							document.getElementById("trust-bar") || document.querySelector("section:nth-of-type(2)");
						if (nextSection) {
							nextSection.scrollIntoView({ behavior: "smooth" });
						}
					}}
				>
					<span className="text-xs uppercase tracking-wider font-mono">Scroll to explore</span>
					<div className="w-px h-8 bg-gradient-to-b from-green to-transparent" />
				</motion.div>
			</div>
		</section>
	);
}
