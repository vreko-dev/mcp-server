"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { motion } from "motion/react";
import { useMediaQuery } from "usehooks-ts";

export const BackgroundBeams = ({ className }: { className?: string }) => {
	const reducedMotion = useReducedMotion();
	const isMobile = useMediaQuery("(max-width: 768px)");

	// Reduce paths on mobile for performance
	const pathCount = isMobile ? 10 : 20;

	return (
		<div
			className={cn(
				"absolute inset-0 overflow-hidden pointer-events-none",
				className,
			)}
		>
			<svg
				className="hidden lg:block absolute -top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] opacity-10"
				viewBox="0 0 1200 1200"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				role="img"
				aria-label="Background beams animation"
			>
				{/* Only render a subset of paths based on pathCount and reducedMotion */}
				{Array.from({ length: pathCount }).map((_, i) => {
					if (reducedMotion) {
						return null;
					}

					return (
						<motion.path
							key={i}
							d={`M${100 + ((i * 50) % 1000)},${
								100 + ((i * 30) % 1000)
							} C${200 + ((i * 70) % 1000)},${
								150 + ((i * 40) % 1000)
							} ${300 + ((i * 90) % 1000)},${
								200 + ((i * 50) % 1000)
							} ${400 + ((i * 110) % 1000)},${250 + ((i * 60) % 1000)}`}
							stroke="url(#gradient)"
							strokeWidth="2"
							strokeLinecap="round"
							initial={{ pathLength: 0 }}
							animate={{ pathLength: 1 }}
							transition={{
								duration: Math.random() * 10 + 10,
								ease: [0.4, 0.0, 0.2, 1],
								repeat: Number.POSITIVE_INFINITY,
								delay: Math.random() * 5,
							}}
						/>
					);
				})}
				<defs>
					<motion.linearGradient
						id="gradient"
						gradientUnits="userSpaceOnUse"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
						animate={{
							x1: ["0%", "100%"],
							x2: ["0%", "95%"],
							y1: ["0%", "100%"],
							y2: ["0%", `${93 + Math.random() * 8}%`],
						}}
						transition={{
							duration: Math.random() * 10 + 10,
							ease: [0.4, 0.0, 0.2, 1],
							repeat: Number.POSITIVE_INFINITY,
							delay: Math.random() * 10,
						}}
					>
						<stop offset="0%" stopColor="#10B981" />
						<stop offset="50%" stopColor="#065F46" />
						<stop offset="100%" stopColor="#047857" />
					</motion.linearGradient>
				</defs>
			</svg>
		</div>
	);
};
