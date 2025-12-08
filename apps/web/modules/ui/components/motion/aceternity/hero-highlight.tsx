"use client";

import { cn } from "@ui/lib";
import { m } from "motion/react";

import React from "react";

export const HeroHighlight = ({
	children,
	className,
	containerClassName,
}: {
	children: React.ReactNode;
	className?: string;
	containerClassName?: string;
}) => {
	const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		setMousePosition({ x, y });
	};

	return (
		<div className={cn("relative h-full w-full overflow-hidden", containerClassName)} onMouseMove={handleMouseMove}>
			<m.div
				className="absolute inset-0 transition-all duration-300"
				style={{
					background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(16, 185, 129, 0.15), transparent 80%)`,
				}}
			/>
			<div className={cn("relative z-20", className)}>{children}</div>
		</div>
	);
};

export const Highlight = ({ children, className }: { children: React.ReactNode; className?: string }) => {
	return (
		<m.span
			initial={{ backgroundSize: "0% 100%" }}
			animate={{ backgroundSize: "100% 100%" }}
			transition={{ duration: 2, ease: "linear", delay: 0.5 }}
			style={{
				backgroundRepeat: "no-repeat",
				backgroundPosition: "left center",
				display: "inline",
				backgroundImage: "linear-gradient(90deg, #34D399 0%, #10B981 50%, transparent 100%)",
				zIndex: -1,
			}}
			className={cn("relative", className)}
		>
			<span className="relative" style={{ zIndex: 999999999 }}>
				{children}
			</span>
		</m.span>
	);
};
