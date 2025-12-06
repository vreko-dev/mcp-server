"use client";

import { AnalyticsEvents } from "@analytics";
import { siteSpec } from "@marketing/config/site-config";
import { motion } from "motion/react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

export function HeroSection() {
	const { hero } = siteSpec.pages.home.sections;
	const videoRef = useRef<HTMLVideoElement>(null);

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
			{ threshold: 0.2 }, // Increased threshold for stability
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

	const scrollToNextSection = () => {
		const nextSection = document.getElementById("trust-bar");
		if (nextSection) {
			nextSection.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<section className="relative w-full h-[75vh] min-h-[600px] max-h-[900px] flex items-center justify-center overflow-hidden bg-[#0A0A0A]">
			{/* Video Background */}
			<div className="absolute inset-0 z-0">
				{/* Fallback Gradient for Reduced Motion / Loading */}
				<div className="absolute inset-0 bg-gradient-to-br from-[#212121] to-[#4A7C59] z-0" />

				<video
					ref={videoRef}
					autoPlay
					loop
					muted
					playsInline
					preload="auto"
					onCanPlay={handleVideoLoaded}
					className="w-full h-full object-cover motion-reduce:hidden relative z-10"
				>
					<source src="/assets/SnapBack-Hero.webm" type="video/webm" />
					<source src="/assets/SnapBack-Hero.mp4" type="video/mp4" />
				</video>

				{/* Overlay */}
				<div
					className="absolute inset-0 z-10"
					style={{
						background: "linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(74, 124, 89, 0.55) 100%)",
					}}
				/>
			</div>

			{/* Content Layer */}
			<div className="container mx-auto px-4 relative z-20 text-center flex flex-col items-center">
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-white font-bold leading-[1.2] tracking-[-0.02em] drop-shadow-lg"
					style={{
						fontSize: "clamp(2.5rem, 5vw, 4rem)",
						textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
					}}
				>
					AI broke production.
					<br />
					SnapBack fixed it in 0.8s.
				</motion.h1>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="mt-8 flex flex-col items-center gap-6"
				>
					{/* Primary CTA */}
					<Link
						href={hero.content.primary_cta.href}
						onClick={() =>
							posthog.capture(AnalyticsEvents.INSTALL_BUTTON_CLICKED, {
								source_section: "hero",
							})
						}
						className="group relative inline-flex items-center justify-center px-10 py-[18px] bg-white hover:bg-gray-50 text-[#4A7C59] text-lg font-bold rounded-lg transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 hover:-translate-y-1 animate-[subtle-pulse_3s_ease-in-out_infinite]"
					>
						<span className="relative z-10">Install for VS Code — Free Forever</span>
					</Link>

					{/* Secondary CTA - Tutorial Link */}
					<Link
						href="https://new-docs.snapback.dev/getting-started/first-restore"
						target="_blank"
						rel="noopener noreferrer"
						className="text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
					>
						New to SnapBack? Try the 5-minute tutorial →
					</Link>

					{/* Trust Signals */}
					<div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-4 py-2 rounded-[20px] border border-white/20 bg-white/10 backdrop-blur-[10px]">
						<div className="flex items-center gap-2 text-white/90 font-medium">
							<span>✓</span> Local-first
						</div>
						<div className="flex items-center gap-2 text-white/90 font-medium">
							<span>2,847</span> devs protected
						</div>
						<div className="flex items-center gap-2 text-white/90 font-medium">
							<span>⭐</span> 4.5k GitHub
						</div>
						<div className="flex items-center gap-2 text-white/90 font-medium">
							<span className="bg-[#f26522] text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
								YC
							</span>{" "}
							W25
						</div>
					</div>
				</motion.div>
			</div>

			{/* Scroll Indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 0.7 }}
				transition={{ delay: 1, duration: 1 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer hover:opacity-100 transition-opacity"
				onClick={scrollToNextSection}
			>
				<div className="animate-bounce">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
					</svg>
				</div>
			</motion.div>
		</section>
	);
}
