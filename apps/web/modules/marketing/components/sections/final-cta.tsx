"use client";
import { BackgroundBeams } from "@marketing/components/ui/background-beams";
import { m } from "motion/react";
import { useEffect, useState } from "react";

const FinalCTA = () => {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<section className="relative py-32 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
			<BackgroundBeams />
			<div className="absolute inset-0 bg-gradient-mesh opacity-20" />

			<div className="container relative z-10">
				<m.div
					className="text-center max-w-4xl mx-auto"
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					viewport={{ once: true }}
				>
					<m.h2
						className="text-hero mb-8"
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						viewport={{ once: true }}
					>
						Snap back to{" "}
						<span className="text-primary font-semibold">building</span>.
					</m.h2>

					<m.p
						className="text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
						viewport={{ once: true }}
					>
						Join the beta and start automating your development workflow today.
						No credit card required, no lengthy setup.
					</m.p>

					{/* CTAs */}
					<m.div
						className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
						initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.6 }}
						viewport={{ once: true }}
					>
						<m.button
							className="btn-neon text-xl px-12 py-4"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							Join the Waitlist
						</m.button>
						<m.button
							className="btn-ghost text-xl px-12 py-4"
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
						>
							Book a Demo
						</m.button>
					</m.div>

					{/* Trust Indicators */}
					<m.div
						className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-muted-foreground"
						initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.8, delay: 0.8 }}
						viewport={{ once: true }}
					>
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-primary rounded-full" />
							<span>Free during beta</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-secondary rounded-full" />
							<span>Setup in under 5 minutes</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-accent rounded-full" />
							<span>SOC2 compliant</span>
						</div>
					</m.div>
				</m.div>

				{/* Floating Brackets */}
				<m.div
					className="absolute top-16 left-16 text-8xl font-mono text-primary/20"
					animate={{
						rotate: [0, 5, -5, 0],
						scale: [1, 1.1, 1],
					}}
					transition={{
						duration: 12,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				>
					&#123;
				</m.div>
				<m.div
					className="absolute bottom-16 right-16 text-8xl font-mono text-secondary/20"
					animate={{
						rotate: [0, -5, 5, 0],
						scale: [1, 1.1, 1],
					}}
					transition={{
						duration: 12,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: 2,
					}}
				>
					&#125;
				</m.div>
			</div>
		</section>
	);
};

export default FinalCTA;
