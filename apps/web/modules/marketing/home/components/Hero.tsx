// apps/web/modules/marketing/home/components/Hero.tsx
"use client";

import { AlphaBadge } from "@marketing/components/ui/alpha-badge";
import { siteSpec } from "@marketing/config/site-config";
import { HeroDemo } from "@marketing/home/components/hero-demo";
import { Shield } from "lucide-react";
import { motion } from "motion/react";
import { animations } from "@/lib/animations";

export function Hero() {
	const heroContent = siteSpec.pages.home.sections.hero.content;

	return (
		<section className="relative w-full min-h-screen flex flex-col bg-[#0A0A0A] overflow-x-hidden">
			{/* Main Content Layer - Centered */}
			<div className="relative z-20 container mx-auto px-4 flex-grow flex flex-col items-center pt-32 pb-12">
				<motion.div
					className="max-w-6xl mx-auto w-full flex flex-col items-center"
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
					<motion.div variants={animations.fadeInUp} className="mb-6 flex justify-center">
						<AlphaBadge />
					</motion.div>

					{/* Main headline */}
					<motion.h1
						variants={animations.fadeInUp}
						className="text-center text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-12 drop-shadow-2xl"
					>
						<span className="text-text-primary">Code Breaks.</span>
						<br />
						<span className="text-green drop-shadow-[0_0_25px_rgba(0,255,65,0.3)]">Snap Back.</span>
					</motion.h1>

					{/* NEW: Interactive Hero Demo */}
					<motion.div variants={animations.fadeInUp} className="w-full mb-12">
						<HeroDemo />
					</motion.div>

					{/* Founder Story (Secondary) */}
					<motion.p
						variants={animations.fadeInUp}
						className="text-center text-sm md:text-base text-green/80 max-w-2xl mx-auto leading-relaxed mb-8 px-4 font-mono opacity-60 hover:opacity-100 transition-opacity"
					>
						{heroContent.founder_story}
					</motion.p>
				</motion.div>
			</div>

			{/* Bottom Trust Bar */}
			<div className="relative z-20 container mx-auto px-4 pb-8 flex flex-col items-center gap-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.5 }}
					className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm text-text-tertiary px-4 border-t border-white/5 pt-8 w-full"
				>
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-green" />
						<span>{heroContent.trust_line}</span>
					</div>
					<div className="hidden md:block w-px h-4 bg-border-subtle" />
					<div className="flex items-center gap-2">
						<motion.span
							animate={{ scale: [1, 1.2, 1] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
							className="h-2 w-2 rounded-full bg-green shadow-[0_0_10px_#34D399]"
						/>
						<span>{heroContent.primary_cta.subtext}</span>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
