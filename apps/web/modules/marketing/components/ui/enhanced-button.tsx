"use client";

import { useReducedMotion } from "@ui/lib/motion";
import { m } from "motion/react";
import { useEffect, useState } from "react";
import { MagneticHover } from "./magnetic-hover";

interface EnhancedButtonProps {
	children: React.ReactNode;
	className?: string;
	variant?: "neon" | "ghost" | "accent" | "secondary";
	onClick?: () => void;
	href?: string;
	magnetic?: boolean;
	ripple?: boolean;
}

export function EnhancedButton({
	children,
	className = "",
	variant = "neon",
	onClick,
	href,
	magnetic = true,
	ripple = true,
	...props
}: EnhancedButtonProps) {
	const [isMounted, setIsMounted] = useState(false);
	const reducedMotion = useReducedMotion();
	const baseClasses = `btn-${variant}`;

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Create static version for SSR
	const staticButtonContent = (
		<button className={`${baseClasses} ${className} relative overflow-hidden`} onClick={onClick} {...props}>
			<span className="relative z-10">{children}</span>
		</button>
	);

	// Create animated version for client-side
	const animatedButtonContent = (
		<m.button
			className={`${baseClasses} ${className} relative overflow-hidden`}
			onClick={onClick}
			whileHover={
				reducedMotion
					? {}
					: {
							scale: 1.02,
							y: -2,
						}
			}
			whileTap={
				reducedMotion
					? {}
					: {
							scale: 0.98,
							y: 0,
						}
			}
			transition={
				reducedMotion
					? { duration: 0 }
					: {
							type: "spring",
							stiffness: 400,
							damping: 25,
							mass: 0.5,
						}
			}
			{...props}
		>
			<span className="relative z-10">{children}</span>

			{/* Ripple effect background */}
			{ripple && !reducedMotion && (
				<m.div
					className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20"
					initial={{ scale: 0, opacity: 0 }}
					whileHover={{
						scale: 1,
						opacity: 1,
					}}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
				/>
			)}

			{/* Gradient overlay */}
			{!reducedMotion && (
				<m.div
					className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
					initial={{ x: "-100%" }}
					whileHover={{
						x: "100%",
					}}
					transition={{
						duration: 0.6,
						ease: [0.23, 1, 0.32, 1],
					}}
				/>
			)}
		</m.button>
	);

	const buttonContent = isMounted ? animatedButtonContent : staticButtonContent;

	if (href) {
		const linkContent = (
			<a href={href} className="inline-block">
				{buttonContent}
			</a>
		);

		return magnetic && !reducedMotion ? (
			<MagneticHover strength={0.4} radius={25}>
				{linkContent}
			</MagneticHover>
		) : (
			linkContent
		);
	}

	return magnetic && !reducedMotion ? (
		<MagneticHover strength={0.4} radius={25}>
			{buttonContent}
		</MagneticHover>
	) : (
		buttonContent
	);
}
