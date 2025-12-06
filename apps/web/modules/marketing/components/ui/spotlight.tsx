"use client";
import { m } from "motion/react";
import type React from "react";
import { useMemo } from "react";

export interface SpotlightProps {
	className?: string;
	fill?: string;
}

export const Spotlight: React.FC<SpotlightProps> = ({ className, fill = "hsl(140 100% 50%)" }) => {
	// Use stable ID for SSR compatibility
	const filterId = useMemo(() => `spotlight-filter-${className || "default"}`, [className]);

	return (
		<m.svg
			className={`animate-spotlight pointer-events-none absolute z-[1] h-[169%] w-[138%] lg:w-[84%] opacity-0 will-change-opacity ${className}`}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 3787 2842"
			fill="none"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{
				duration: 2,
				ease: "easeInOut",
				delay: 0.5,
			}}
			style={{
				// Performance optimizations to force hardware acceleration
				transform: "translateZ(0)",
				backfaceVisibility: "hidden",
				isolation: "isolate",
			}}
		>
			<defs>
				<filter
					id={filterId}
					x="0.860352"
					y="0.838989"
					width="3785.16"
					height="2840.26"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
					<feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
				</filter>
			</defs>
			<g filter={`url(#${filterId})`}>
				<ellipse
					cx="1924.71"
					cy="273.501"
					rx="1924.71"
					ry="273.501"
					transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
					fill={fill}
					fillOpacity="0.21"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
		</m.svg>
	);
};

// Add SpotlightCard for MDX components compatibility
export interface SpotlightCardProps {
	className?: string;
	children: React.ReactNode;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({ className, children }) => {
	return (
		<div className={`relative overflow-hidden ${className}`}>
			<Spotlight className="absolute -top-40 -left-40 md:-left-32 lg:-left-10" />
			{children}
		</div>
	);
};
