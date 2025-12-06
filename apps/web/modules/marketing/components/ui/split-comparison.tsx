"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DamageCounter } from "./damage-counter";
import { MagneticButton } from "./magnetic-button";

interface SplitComparisonProps {
	beforeCode: string;
	afterCode: string;
	beforeTitle?: string;
	afterTitle?: string;
	damageStart?: number;
	damageEnd?: number;
	className?: string;
}

export function SplitComparison({
	beforeCode,
	afterCode,
	beforeTitle = "[ UNPROTECTED ]",
	afterTitle = "[ SNAPBACK PROTECTED ]",
	damageStart = 0,
	damageEnd = 50000,
	className = "",
}: SplitComparisonProps) {
	const [isProtected, setIsProtected] = useState(false);
	const [showDamage, setShowDamage] = useState(true);
	const [isMounted, setIsMounted] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const damageRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Intersection Observer for scroll-triggered animation
	useEffect(() => {
		if (!isMounted || !damageRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry?.isIntersecting && !isInView) {
					setIsInView(true);
				}
			},
			{
				threshold: 0.3, // Trigger when 30% visible
				rootMargin: "-50px 0px", // Add some margin
			},
		);

		observer.observe(damageRef.current);

		return () => observer.disconnect();
	}, [isMounted, isInView]);

	const handleSnapBackClick = () => {
		setIsProtected(true);
		setShowDamage(false);
	};

	const handleReset = () => {
		setIsProtected(false);
		setShowDamage(true);
	};

	if (!isMounted) {
		return (
			<div className={`w-full max-w-6xl mx-auto ${className}`}>
				<div className="grid md:grid-cols-2 gap-8">
					{/* Before Column */}
					<div className="space-y-4">
						<div className="text-red-400 font-mono text-lg font-bold">{beforeTitle}</div>
						<div className="bg-black/50 border border-red-500/30 rounded-lg p-6">
							<pre className="text-sm text-red-300 overflow-x-auto">{beforeCode}</pre>
						</div>
					</div>

					{/* After Column */}
					<div className="space-y-4">
						<div className="text-matrix-green font-mono text-lg font-bold">{afterTitle}</div>
						<div className="bg-black/50 border border-matrix-green/30 rounded-lg p-6">
							<pre className="text-sm text-matrix-green overflow-x-auto">{afterCode}</pre>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`w-full max-w-6xl mx-auto ${className}`}>
			<div className="grid md:grid-cols-2 gap-8 relative">
				{/* Before Column */}
				<m.div
					className="space-y-4"
					animate={{
						scale: isProtected ? 0.95 : 1,
						opacity: isProtected ? 0.7 : 1,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
					}}
				>
					<m.div
						className="text-red-400 font-mono text-lg font-bold"
						animate={{
							textShadow: isProtected
								? "none"
								: [
										"0 0 5px rgba(239, 68, 68, 0.5)",
										"0 0 15px rgba(239, 68, 68, 0.8)",
										"0 0 5px rgba(239, 68, 68, 0.5)",
									],
						}}
						transition={{
							duration: 2,
							repeat: isProtected ? 0 : 2,
							ease: "easeInOut",
						}}
					>
						{beforeTitle}
					</m.div>

					<m.div
						className="bg-black/50 border border-red-500/30 rounded-lg p-6 relative overflow-hidden"
						animate={{
							borderColor: isProtected ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.5)",
						}}
					>
						<pre className="text-sm text-red-300 overflow-x-auto relative z-10">{beforeCode}</pre>

						{/* Danger overlay */}
						<AnimatePresence>
							{!isProtected && (
								<m.div
									className="absolute inset-0 bg-red-500/5"
									initial={{ opacity: 0 }}
									animate={{
										opacity: [0.05, 0.15, 0.05],
									}}
									exit={{ opacity: 0 }}
									transition={{
										duration: 3,
										repeat: 2,
										ease: "easeInOut",
									}}
								/>
							)}
						</AnimatePresence>

						{/* Vulnerability indicators */}
						{!isProtected && (
							<m.div
								className="absolute top-2 right-2"
								animate={{
									scale: [1, 1.2, 1],
									rotate: [0, 5, -5, 0],
								}}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								}}
							>
								<div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
							</m.div>
						)}
					</m.div>

					{/* Damage Counter */}
					<AnimatePresence>
						{showDamage && !isProtected && (
							<m.div
								ref={damageRef}
								className="text-center"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.5 }}
							>
								<div className="text-red-400 text-sm font-mono mb-2">SECURITY VIOLATIONS DETECTED</div>
								{isInView && (
									<DamageCounter
										start={damageStart}
										end={damageEnd}
										duration={3000}
										prefix="$"
										delay={500}
									/>
								)}
								<div className="text-red-300 text-xs font-mono mt-2">Estimated damage per month</div>
							</m.div>
						)}
					</AnimatePresence>
				</m.div>

				{/* After Column */}
				<m.div
					className="space-y-4"
					animate={{
						scale: isProtected ? 1.05 : 1,
						opacity: isProtected ? 1 : 0.7,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 25,
					}}
				>
					<m.div
						className="text-matrix-green font-mono text-lg font-bold"
						animate={{
							textShadow: isProtected
								? [
										"0 0 5px rgba(0, 255, 65, 0.5)",
										"0 0 15px rgba(0, 255, 65, 0.8)",
										"0 0 5px rgba(0, 255, 65, 0.5)",
									]
								: "none",
						}}
						transition={{
							duration: 2,
							repeat: isProtected ? 2 : 0,
							ease: "easeInOut",
						}}
					>
						{afterTitle}
					</m.div>

					<m.div
						className="bg-black/50 border border-matrix-green/30 rounded-lg p-6 relative overflow-hidden"
						animate={{
							borderColor: isProtected ? "rgba(0, 255, 65, 0.6)" : "rgba(0, 255, 65, 0.2)",
						}}
					>
						<pre className="text-sm text-matrix-green overflow-x-auto relative z-10">{afterCode}</pre>

						{/* Protection overlay */}
						<AnimatePresence>
							{isProtected && (
								<m.div
									className="absolute inset-0 bg-matrix-green/5"
									initial={{ opacity: 0 }}
									animate={{
										opacity: [0.05, 0.15, 0.05],
									}}
									exit={{ opacity: 0 }}
									transition={{
										duration: 3,
										repeat: 2,
										ease: "easeInOut",
									}}
								/>
							)}
						</AnimatePresence>

						{/* Shield indicators */}
						{isProtected && (
							<m.div
								className="absolute top-2 right-2"
								initial={{ scale: 0, rotate: -180 }}
								animate={{
									scale: 1,
									rotate: 0,
								}}
								transition={{
									type: "spring",
									stiffness: 400,
									damping: 15,
								}}
							>
								<div className="w-3 h-3 bg-matrix-green rounded-full shadow-lg shadow-matrix-green/50" />
							</m.div>
						)}
					</m.div>

					{/* Protection Status */}
					<AnimatePresence>
						{isProtected && (
							<m.div
								className="text-center"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.5 }}
							>
								<div className="text-matrix-green text-sm font-mono mb-2">PROTECTION ACTIVE</div>
								<m.div
									className="text-4xl md:text-6xl font-bold text-matrix-green"
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{
										type: "spring",
										stiffness: 400,
										damping: 15,
									}}
								>
									✓ SECURE
								</m.div>
								<div className="text-matrix-green text-xs font-mono mt-2">
									Code automatically protected
								</div>
							</m.div>
						)}
					</AnimatePresence>
				</m.div>

				{/* Central Action Button */}
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
					<AnimatePresence mode="wait">
						{!isProtected ? (
							<MagneticButton
								key="snapback"
								onClick={handleSnapBackClick}
								variant="neon"
								className="px-8 py-4 text-lg font-bold"
								strength={0.8}
								radius={100}
							>
								<m.span
									className="flex items-center gap-2"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
								>
									<span>SNAPBACK</span>
									<m.span
										animate={{
											x: [0, 5, 0],
										}}
										transition={{
											duration: 1.5,
											repeat: 2,
											ease: "easeInOut",
										}}
									>
										→
									</m.span>
								</m.span>
							</MagneticButton>
						) : (
							<MagneticButton
								key="reset"
								onClick={handleReset}
								variant="ghost"
								className="px-6 py-3 text-sm"
								strength={0.4}
								radius={60}
							>
								<m.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
									Reset Demo
								</m.span>
							</MagneticButton>
						)}
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
