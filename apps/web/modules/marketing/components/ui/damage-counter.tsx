"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";

interface DamageCounterProps {
	start: number;
	end: number;
	duration: number;
	prefix?: string | undefined;
	onComplete?: () => void;
	delay?: number;
}

export function DamageCounter({ start, end, duration, prefix = "", onComplete, delay = 0 }: DamageCounterProps) {
	const [count, setCount] = useState(start);
	const [isAnimating, setIsAnimating] = useState(false);
	const [hasCompleted, setHasCompleted] = useState(false);

	useEffect(() => {
		if (hasCompleted) {
			return;
		}

		const timeout = setTimeout(() => {
			setIsAnimating(true);
			const startTime = Date.now();
			const difference = end - start;

			const updateCounter = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);

				// Enhanced easing function for more dramatic effect
				const easeOut = 1 - (1 - progress) ** 4;
				const currentValue = Math.floor(start + difference * easeOut);

				setCount(currentValue);

				if (progress < 1) {
					requestAnimationFrame(updateCounter);
				} else {
					setIsAnimating(false);

					// Single cycle complete
					setHasCompleted(true);
					onComplete?.();
				}
			};

			requestAnimationFrame(updateCounter);
		}, delay);

		return () => clearTimeout(timeout);
	}, [start, end, duration, delay, onComplete, hasCompleted]);

	const isHighDamage = count > end * 0.7;
	const isCriticalDamage = count > end * 0.9;

	return (
		<m.div
			initial={{ scale: 0, rotateX: -90 }}
			animate={{
				scale: 1,
				rotateX: 0,
				color: isCriticalDamage ? "#DC2626" : isHighDamage ? "#EF4444" : "#FF6B35",
			}}
			transition={{
				scale: {
					type: "spring",
					stiffness: 300,
					damping: 15,
					bounce: 0.4,
				},
				rotateX: {
					type: "spring",
					stiffness: 400,
					damping: 20,
				},
				color: { duration: 0.2 },
			}}
			className="text-6xl md:text-8xl font-bold text-center relative"
			style={{
				textShadow: isCriticalDamage
					? "0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)"
					: count === end
						? "0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)"
						: "0 0 20px rgba(255, 107, 53, 0.4)",
				filter: isCriticalDamage
					? "drop-shadow(0 0 30px rgba(220, 38, 38, 0.5))"
					: count === end
						? "drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))"
						: "drop-shadow(0 0 15px rgba(255, 107, 53, 0.3))",
			}}
		>
			{/* Pulsing background effect */}
			<m.div
				className="absolute inset-0 -z-10"
				animate={
					isAnimating && isCriticalDamage
						? {
								scale: [1, 1.2, 1],
								opacity: [0.3, 0.6, 0.3],
							}
						: {}
				}
				transition={{
					duration: 1.5,
					repeat: 3,
					ease: "easeInOut",
				}}
				style={{
					background: `radial-gradient(circle, ${
						isCriticalDamage ? "rgba(220, 38, 38, 0.2)" : "rgba(239, 68, 68, 0.1)"
					} 0%, transparent 70%)`,
				}}
			/>

			{/* Glitch effect for critical damage */}
			{isCriticalDamage && (
				<m.div
					className="absolute inset-0"
					animate={{
						x: [0, -2, 2, 0],
						textShadow: [
							"2px 0 #ff0000, -2px 0 #00ffff",
							"-2px 0 #ff0000, 2px 0 #00ffff",
							"2px 0 #ff0000, -2px 0 #00ffff",
						],
					}}
					transition={{
						duration: 0.1,
						repeat: 5,
						repeatType: "reverse",
					}}
				>
					{prefix}
					{count.toLocaleString()}
				</m.div>
			)}

			{prefix}
			{count.toLocaleString()}

			{/* Warning indicators */}
			{isHighDamage && (
				<m.div
					className="absolute -top-2 -right-2"
					animate={{
						scale: [1, 1.3, 1],
						rotate: [0, 15, -15, 0],
					}}
					transition={{
						duration: 0.8,
						repeat: 2,
						ease: "easeInOut",
					}}
				>
					<div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
				</m.div>
			)}
		</m.div>
	);
}
