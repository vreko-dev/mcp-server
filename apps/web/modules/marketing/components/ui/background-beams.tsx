"use client";

import { useReducedMotion } from "@marketing/lib/motion";
import { motion } from "motion/react";

interface BackgroundBeamsProps {
	className?: string;
	pathCount?: number;
}

export function BackgroundBeams({ className = "", pathCount = 12 }: BackgroundBeamsProps) {
	const reducedMotion = useReducedMotion();

	// Generate paths only on client to prevent hydration mismatch
	const paths = reducedMotion
		? []
		: Array.from({ length: pathCount }, (_, i) => {
				const startPoint = 500 + Math.random() * 200;
				const endPoint = 300 + Math.random() * 600;
				const control1 = 200 + Math.random() * 800;
				const control2 = 100 + Math.random() * 1000;

				return {
					key: `path-${i}`,
					d: `M200,${startPoint} C${control1},${control2} ${control2},${control1} 1000,${endPoint}`,
					opacity: 0.1 + Math.random() * 0.2,
					delay: Math.random() * 2,
				};
			});

	return (
		<div className={`overflow-hidden pointer-events-none ${className}`}>
			<svg
				className="hidden lg:block absolute inset-0 w-full h-full"
				viewBox="0 0 1200 1200"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<title>Background Beams Animation</title>
				{/* Only render defs if we have paths */}
				{!reducedMotion && pathCount > 0 && (
					<defs>
						<motion.linearGradient
							id="gradient"
							gradientUnits="userSpaceOnUse"
							x1="100"
							y1="400"
							x2="1100"
							y2="800"
							initial={{ x1: "0%", x2: "100%" }}
							animate={{
								x1: ["0%", "100%", "0%"],
								x2: ["100%", "0%", "100%"],
							}}
							transition={{
								duration: 10,
								repeat: Number.POSITIVE_INFINITY,
								repeatType: "reverse",
							}}
						>
							<stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
							<stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
							<stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
						</motion.linearGradient>
					</defs>
				)}

				{/* Render paths only on client */}
				{!reducedMotion &&
					paths.map((path) => (
						<motion.path
							key={path.key}
							d={path.d}
							stroke="url(#gradient)"
							strokeWidth="2"
							strokeLinecap="round"
							initial={{ pathLength: 0, opacity: 0 }}
							animate={{
								pathLength: [0, 1, 1],
								opacity: [0, path.opacity, 0],
							}}
							transition={{
								duration: 4 + Math.random() * 3,
								repeat: Number.POSITIVE_INFINITY,
								repeatType: "loop",
								delay: path.delay,
							}}
						/>
					))}
			</svg>
		</div>
	);
}
