"use client";

import { type MotionProps, m } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface MagneticButtonProps extends MotionProps {
	children: React.ReactNode;
	className?: string;
	variant?: "neon" | "ghost" | "accent" | "secondary";
	onClick?: () => void;
	href?: string;
	strength?: number;
	radius?: number;
	disabled?: boolean;
}

export function MagneticButton({
	children,
	className = "",
	variant = "neon",
	onClick,
	href,
	strength = 0.6,
	radius = 80,
	disabled = false,
	...props
}: MagneticButtonProps) {
	const ref = useRef<HTMLButtonElement>(null);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isHovered, setIsHovered] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (!ref.current || disabled) {
			return;
		}

		const rect = ref.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const deltaX = e.clientX - centerX;
		const deltaY = e.clientY - centerY;
		const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

		if (distance < radius) {
			const magnetForce = Math.max(0, 1 - distance / radius);
			const elasticForce = magnetForce ** 1.5; // More dramatic attraction
			setPosition({
				x: deltaX * strength * elasticForce,
				y: deltaY * strength * elasticForce,
			});
		} else {
			setPosition({ x: 0, y: 0 });
		}
	};

	const handleMouseEnter = () => {
		if (!disabled) {
			setIsHovered(true);
		}
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		setPosition({ x: 0, y: 0 });
	};

	const handleClick = () => {
		if (!disabled && onClick) {
			onClick();
		}
	};

	const baseClasses = `btn-${variant}`;
	const buttonClasses = `${baseClasses} ${className} relative overflow-hidden transition-all duration-300 transform-gpu will-change-transform cursor-pointer`;

	// Render static version on server-side
	if (!isMounted) {
		const StaticButton = (
			<m.button className={buttonClasses} onClick={handleClick} disabled={disabled} {...props}>
				<span className="relative z-10">{children}</span>
			</m.button>
		);

		if (href) {
			return (
				<a href={href} className="inline-block">
					{StaticButton}
				</a>
			);
		}
		return StaticButton;
	}

	const AnimatedButton = (
		<m.button
			ref={ref}
			className={buttonClasses}
			onClick={handleClick}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			disabled={disabled}
			animate={{
				x: position.x,
				y: position.y,
				scale: isHovered ? 1.05 : 1,
			}}
			whileTap={{
				scale: disabled ? 1 : 0.95,
			}}
			transition={{
				type: "spring",
				stiffness: 300,
				damping: 20,
				mass: 0.8,
			}}
			style={{
				transformOrigin: "center",
			}}
			{...props}
		>
			<span className="relative z-10">{children}</span>

			{/* Magnetic field indicator */}
			{isHovered && !disabled && (
				<m.div
					className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-lg"
					initial={{ scale: 0, opacity: 0 }}
					animate={{
						scale: 1,
						opacity: 1,
					}}
					exit={{ scale: 0, opacity: 0 }}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 25,
					}}
				/>
			)}

			{/* Elastic glow effect */}
			{isHovered && !disabled && (
				<m.div
					className="absolute inset-0 rounded-lg"
					style={{
						background: `radial-gradient(circle at ${50 + (position.x / radius) * 100}% ${
							50 + (position.y / radius) * 100
						}%, rgba(0, 255, 65, 0.2) 0%, transparent 60%)`,
					}}
					animate={{
						opacity: [0.5, 1, 0.5],
					}}
					transition={{
						duration: 2,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				/>
			)}

			{/* Shimmer effect on click */}
			<m.div
				className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
				animate={
					isHovered && !disabled
						? {
								translateX: ["100%", "200%"],
							}
						: {}
				}
				transition={{
					duration: 1.5,
					repeat: Number.POSITIVE_INFINITY,
					ease: "linear",
				}}
			/>
		</m.button>
	);

	if (href) {
		return (
			<a href={href} className="inline-block">
				{AnimatedButton}
			</a>
		);
	}

	return AnimatedButton;
}
