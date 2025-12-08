"use client";

import { cn } from "@marketing/lib/utils";
import { m } from "motion/react";
import type React from "react";

interface TracingBeamProps {
	children?: React.ReactNode;
	className?: string;
}

export function TracingBeam({ children, className }: TracingBeamProps) {
	return (
		<div className={cn("relative", className)}>
			{/* Vertical beam */}
			<div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2">
				<div className="w-full h-full bg-gradient-to-b from-transparent via-[#34D399] to-transparent opacity-30" />

				{/* Animated glow */}
				<m.div
					className="absolute top-0 left-1/2 w-1 h-20 -translate-x-1/2"
					style={{
						background: "linear-gradient(90deg, #34D399 0%, #10B981 50%, transparent 100%)",
						filter: "blur(2px)",
					}}
					animate={{
						y: [0, "calc(100vh - 80px)"],
					}}
					transition={{
						duration: 3,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
				/>

				{/* Static nodes */}
				<div className="absolute top-4 left-1/2 w-3 h-3 -translate-x-1/2 bg-[#34D399] rounded-full shadow-lg shadow-[#34D399]/50" />
				<div className="absolute bottom-4 left-1/2 w-3 h-3 -translate-x-1/2 bg-[#34D399] rounded-full shadow-lg shadow-[#34D399]/50" />
			</div>

			{children}
		</div>
	);
}
