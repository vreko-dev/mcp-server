"use client";

import { cn } from "@marketing/lib/utils";
import { motion } from "motion/react";

type SpotlightProps = {
	className?: string;
	fill?: string;
};

export const Spotlight = ({ className, fill }: SpotlightProps) => {
	return (
		<motion.div
			initial={{
				opacity: 0,
				scale: 0.8,
			}}
			animate={{
				opacity: 1,
				scale: 1,
			}}
			transition={{
				duration: 0.5,
			}}
			className={cn("absolute inset-0 z-0 h-full w-full overflow-hidden rounded-3xl", className)}
		>
			<svg
				className="absolute inset-0 h-full w-full"
				viewBox="0 0 1000 1000"
				preserveAspectRatio="xMidYMid slice"
			>
				<defs>
					<radialGradient id="spotlight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
						<stop offset="0%" stopColor={fill || "rgba(255, 255, 255, 0.1)"} />
						<stop offset="100%" stopColor={fill || "rgba(255, 255, 255, 0)"} />
					</radialGradient>
				</defs>
				<rect width="100%" height="100%" fill="url(#spotlight)" fillOpacity="0.3" />
			</svg>
		</motion.div>
	);
};
