"use client";

import { cn } from "@ui/lib";
import { m, useAnimationControls, useMotionValue, useSpring, useTransform } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

// Performance-optimized motion tokens aligned with SnapBack brand promises
export const MOTION_TOKENS = {
	// <100ms interactions (instant feel)
	instant: {
		duration: 0.08, // 80ms - faster than 100ms promise
		ease: [0.76, 0, 0.24, 1], // snappy easing
	},
	// <200ms quick responses (smooth feel)
	quick: {
		duration: 0.15, // 150ms
		ease: [0.4, 0, 0.2, 1], // material design ease
	},
	// Snap-back elastic (brand reinforcement)
	snapBack: {
		duration: 0.4,
		ease: [0.68, -0.6, 0.32, 1.6], // elastic overshoot
	},
	// Protective/security feeling (smooth assurance)
	protective: {
		duration: 0.3,
		ease: [0.23, 1, 0.32, 1], // smooth confident
	},
} as const;

// Reduced motion detection
export const useCustomReducedMotion = () => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return prefersReducedMotion;
};

// High-performance spring configurations
export const SPRING_CONFIGS = {
	instant: { damping: 30, stiffness: 400, mass: 0.8 },
	quick: { damping: 25, stiffness: 300, mass: 1 },
	snapBack: { damping: 15, stiffness: 200, mass: 1.2 },
	smooth: { damping: 20, stiffness: 100, mass: 1 },
} as const;

interface OptimizedMotionProps {
	children: React.ReactNode;
	className?: string;
	variant?: keyof typeof MOTION_TOKENS;
	hover?: boolean;
	tap?: boolean;
	focus?: boolean;
	style?: React.CSSProperties;
}

// Core optimized motion wrapper with GPU acceleration
export const OptimizedMotion = ({
	children,
	className,
	variant = "quick",
	hover = true,
	tap = true,
	focus = true,
	style,
	...props
}: OptimizedMotionProps & React.ComponentProps<typeof m.div>) => {
	const prefersReducedMotion = useCustomReducedMotion();
	const motionConfig = MOTION_TOKENS[variant as "instant" | "quick" | "snapBack" | "protective"];

	// Base animations with GPU optimization
	const baseAnimations = {
		initial: { opacity: 0, y: 4 },
		animate: { opacity: 1, y: 0 },
		transition: prefersReducedMotion
			? { duration: 0.01 }
			: {
					...motionConfig,
					// GPU layer promotion
					transformTemplate: ({ y }: any) =>
						`translate3d(0, ${y}, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg)`,
				},
	};

	// Interaction animations
	const interactionAnimations = {
		...(hover && {
			whileHover: prefersReducedMotion
				? {}
				: {
						scale: 1.02,
						transition: MOTION_TOKENS.instant,
					},
		}),
		...(tap && {
			whileTap: prefersReducedMotion
				? {}
				: {
						scale: 0.98,
						transition: MOTION_TOKENS.instant,
					},
		}),
		...(focus && {
			whileFocus: prefersReducedMotion
				? {}
				: {
						scale: 1.01,
						transition: MOTION_TOKENS.instant,
					},
		}),
	};

	return (
		<m.div
			className={cn("will-change-transform", className)}
			style={{
				...style,
				// Force GPU acceleration
				transform: "translateZ(0)",
				backfaceVisibility: "hidden",
				perspective: 1000,
			}}
			{...baseAnimations}
			{...interactionAnimations}
			{...props}
		>
			{children}
		</m.div>
	);
};

// Snap-back button with elastic feel
interface SnapBackButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
	variant?: "primary" | "secondary" | "ghost";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
}

export const SnapBackButton = ({
	children,
	onClick,
	className,
	variant = "primary",
	size = "md",
	disabled = false,
}: SnapBackButtonProps) => {
	const prefersReducedMotion = useCustomReducedMotion();
	const controls = useAnimationControls();

	const handleClick = useCallback(async () => {
		if (disabled || prefersReducedMotion) {
			onClick?.();
			return;
		}

		// Snap-back animation sequence
		await controls.start({
			scale: 0.95,
			transition: MOTION_TOKENS.instant,
		});
		await controls.start({
			scale: 1.05,
			transition: { ...MOTION_TOKENS.snapBack, duration: 0.2 },
		});
		await controls.start({
			scale: 1,
			transition: MOTION_TOKENS.quick,
		});

		onClick?.();
	}, [disabled, prefersReducedMotion, controls, onClick]);

	const buttonVariants = {
		primary: "btn-neon",
		secondary: "btn-secondary",
		ghost: "btn-ghost",
	};

	const sizeVariants = {
		sm: "px-4 py-2 text-sm",
		md: "px-6 py-3 text-base",
		lg: "px-8 py-4 text-lg",
	};

	return (
		<m.button
			className={cn(
				"relative inline-flex items-center justify-center rounded-xl font-semibold",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				"transition-colors duration-200",
				"will-change-transform transform-gpu",
				buttonVariants[variant as "primary" | "secondary" | "ghost"],
				sizeVariants[size as "sm" | "md" | "lg"],
				disabled && "opacity-50 cursor-not-allowed",
				className,
			)}
			animate={controls}
			whileHover={
				!disabled && !prefersReducedMotion
					? {
							scale: 1.02,
							transition: MOTION_TOKENS.instant,
						}
					: undefined
			}
			whileFocus={
				!disabled && !prefersReducedMotion
					? {
							scale: 1.01,
							transition: MOTION_TOKENS.instant,
						}
					: undefined
			}
			onClick={handleClick}
			disabled={disabled}
			style={{
				transform: "translateZ(0)",
				backfaceVisibility: "hidden",
			}}
		>
			{children}
		</m.button>
	);
};

// Protective container with security-focused animations
interface ProtectiveContainerProps {
	children: React.ReactNode;
	className?: string;
	glowOnHover?: boolean;
	shield?: boolean;
}

export const ProtectiveContainer = ({
	children,
	className,
	glowOnHover = true,
	shield = false,
}: ProtectiveContainerProps) => {
	const prefersReducedMotion = useCustomReducedMotion();
	const glowOpacity = useMotionValue(0);
	const glowScale = useSpring(1, SPRING_CONFIGS.smooth);

	const glowStyle = useTransform([glowOpacity, glowScale] as any, ([opacity, scale]: any) => ({
		opacity,
		transform: `scale(${scale})`,
	})) as any;

	return (
		<m.div
			className={cn(
				"relative rounded-2xl border border-border/20",
				"bg-gradient-to-br from-card/50 to-card/30",
				"backdrop-blur-xl will-change-transform",
				shield && "ring-1 ring-primary/20",
				className,
			)}
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={prefersReducedMotion ? { duration: 0.01 } : MOTION_TOKENS.protective}
			whileHover={
				glowOnHover && !prefersReducedMotion
					? {
							scale: 1.02,
							borderColor: "hsl(var(--primary) / 0.3)",
							transition: MOTION_TOKENS.quick,
						}
					: undefined
			}
			onHoverStart={() => {
				if (!prefersReducedMotion && glowOnHover) {
					glowOpacity.set(0.3);
					glowScale.set(1.1);
				}
			}}
			onHoverEnd={() => {
				if (!prefersReducedMotion && glowOnHover) {
					glowOpacity.set(0);
					glowScale.set(1);
				}
			}}
			style={{
				transform: "translateZ(0)",
				backfaceVisibility: "hidden",
			}}
		>
			{/* Glow effect */}
			<m.div
				className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl -z-10"
				style={glowStyle as any}
				aria-hidden="true"
			/>

			{/* Shield indicator */}
			{shield && (
				<m.div
					className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary/60"
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={prefersReducedMotion ? { duration: 0.01 } : { ...MOTION_TOKENS.snapBack, delay: 0.2 }}
					aria-hidden="true"
				/>
			)}

			{children}
		</m.div>
	);
};

// Instant feedback text with performance optimizations
interface InstantTextProps {
	children: React.ReactNode;
	className?: string;
	highlight?: boolean;
	typing?: boolean;
}

export const InstantText = ({ children, className, highlight = false, typing = false }: InstantTextProps) => {
	const prefersReducedMotion = useCustomReducedMotion();
	const [displayText, setDisplayText] = useState(typing ? "" : String(children));
	const [isTyping, setIsTyping] = useState(typing);

	useEffect(() => {
		if (!typing || prefersReducedMotion) {
			setDisplayText(String(children));
			return;
		}

		const text = String(children);
		let index = 0;
		setDisplayText("");
		setIsTyping(true);

		const typeInterval = setInterval(() => {
			setDisplayText(text.slice(0, index + 1));
			index++;

			if (index >= text.length) {
				clearInterval(typeInterval);
				setIsTyping(false);
			}
		}, 30); // ~33fps for smooth typing

		return () => clearInterval(typeInterval);
	}, [children, typing, prefersReducedMotion]);

	return (
		<m.span
			className={cn("inline-block will-change-transform", highlight && "text-primary font-semibold", className)}
			initial={{ opacity: 0, y: 2 }}
			animate={{ opacity: 1, y: 0 }}
			transition={prefersReducedMotion ? { duration: 0.01 } : MOTION_TOKENS.instant}
			style={{
				transform: "translateZ(0)",
			}}
		>
			{displayText}
			{isTyping && !prefersReducedMotion && (
				<m.span
					className="inline-block w-0.5 h-5 bg-primary ml-1"
					animate={{ opacity: [1, 0] }}
					transition={{
						duration: 0.5,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
					}}
				/>
			)}
		</m.span>
	);
};

// Stagger container for lists with optimized timings
interface StaggerContainerProps {
	children: React.ReactNode;
	className?: string;
	staggerDelay?: number;
	direction?: "up" | "down" | "left" | "right";
}

export const StaggerContainer = ({
	children,
	className,
	staggerDelay = 0.05,
	direction = "up",
}: StaggerContainerProps) => {
	const prefersReducedMotion = useCustomReducedMotion();

	const directionVariants = {
		up: { y: 20 },
		down: { y: -20 },
		left: { x: 20 },
		right: { x: -20 },
	};

	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: prefersReducedMotion
				? { duration: 0.01 }
				: {
						staggerChildren: staggerDelay,
						delayChildren: 0.1,
					},
		},
	};

	const item = {
		hidden: {
			opacity: 0,
			...directionVariants[direction],
		},
		show: {
			opacity: 1,
			x: 0,
			y: 0,
			transition: prefersReducedMotion ? { duration: 0.01 } : MOTION_TOKENS.quick,
		},
	};

	return (
		<m.div
			className={cn("will-change-transform", className)}
			variants={container}
			initial="hidden"
			animate="show"
			style={{
				transform: "translateZ(0)",
			}}
		>
			{React.Children.map(children, (child, index) => (
				<m.div key={index} variants={item} style={{ transform: "translateZ(0)" }}>
					{child}
				</m.div>
			))}
		</m.div>
	);
};

// Performance monitoring hook for development
export const useMotionPerformance = () => {
	const [fps, setFps] = useState(60);
	const frameCount = useRef(0);
	const lastTime = useRef(performance.now());

	useEffect(() => {
		let animationFrame: number;

		const measure = () => {
			frameCount.current++;
			const now = performance.now();

			if (now - lastTime.current >= 1000) {
				setFps(Math.round((frameCount.current * 1000) / (now - lastTime.current)));
				frameCount.current = 0;
				lastTime.current = now;
			}

			animationFrame = requestAnimationFrame(measure);
		};

		animationFrame = requestAnimationFrame(measure);
		return () => cancelAnimationFrame(animationFrame);
	}, []);

	return { fps };
};

// Export all motion utilities
export { m as motion, useAnimationControls, useMotionValue, useSpring, useTransform };
