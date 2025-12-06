"use client";

import { useMobileOptimization } from "@marketing/hooks/use-mobile-optimization";
import { cn } from "@ui/lib";
import { type HTMLMotionProps, m, useAnimation } from "motion/react";
import React, { forwardRef, useEffect, useState } from "react";

// ===== SNAP BACK BRAND MOTION PRESETS =====
// All animations designed to reinforce <100ms protection promise

/**
 * Core SnapBack easing curves - elastic and protective feeling
 */
export const snapEasing = {
	// Main brand easing - elastic snap back effect
	snap: [0.25, 0.46, 0.45, 0.94] as const,
	// Fast protective response
	protect: [0.4, 0, 0.2, 1] as const,
	// Smooth recovery
	recover: [0.25, 1, 0.5, 1] as const,
	// Instant response (for <100ms promise)
	instant: [0.8, 0, 0.2, 1] as const,
	// Elastic bounce back
	elastic: [0.68, -0.55, 0.265, 1.55] as const,
} as const;

/**
 * Performance-optimized base props for all SnapBack animations
 */
const baseMotionProps = {
	// Performance hints
	layout: false,
	layoutDependency: false,
} as const;

// Helper function to get motion styles (only on client)
const getMotionStyles = () => {
	if (typeof window === "undefined") {
		return {};
	}

	return {
		willChange: "transform" as const,
		transformStyle: "preserve-3d" as const,
		backfaceVisibility: "hidden" as const,
	};
};

// ===== SNAP ENTRANCE ANIMATIONS =====

interface SnapEntranceProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate"> {
	children: React.ReactNode;
	delay?: number;
	direction?: "up" | "down" | "left" | "right" | "scale";
	intensity?: "subtle" | "normal" | "strong";
	once?: boolean;
	className?: string;
}

/**
 * SnapEntrance - Brand entrance animation with elastic snap-in effect
 * Reinforces the "snap back" brand concept with <100ms feeling
 */
export const SnapEntrance = forwardRef<HTMLDivElement, SnapEntranceProps>(
	({ children, delay = 0, direction = "up", intensity = "normal", once = true, className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Reduce animations for accessibility and mobile performance
		if (shouldReduceAnimations || !isMounted) {
			return (
				<div ref={ref} className={className} {...(props as any)}>
					{children}
				</div>
			);
		}

		const intensityMap = {
			subtle: { distance: 15, scale: 0.98 },
			normal: { distance: 30, scale: 0.95 },
			strong: { distance: 50, scale: 0.9 },
		};

		const { distance, scale } = intensityMap[intensity as "subtle" | "normal" | "strong"];

		const getInitial = () => {
			switch (direction) {
				case "up":
					return { y: distance, opacity: 0 };
				case "down":
					return { y: -distance, opacity: 0 };
				case "left":
					return { x: distance, opacity: 0 };
				case "right":
					return { x: -distance, opacity: 0 };
				case "scale":
					return { scale, opacity: 0 };
				default:
					return { y: distance, opacity: 0 };
			}
		};

		return (
			<m.div
				ref={ref}
				initial={getInitial()}
				whileInView={{ x: 0, y: 0, scale: 1, opacity: 1 }}
				viewport={{ once, margin: "-10%" }}
				transition={{
					duration: 0.6,
					delay,
					ease: snapEasing.snap,
					// Stagger children automatically
					staggerChildren: 0.1,
				}}
				className={className}
				style={getMotionStyles()}
				{...baseMotionProps}
				{...props}
			>
				{children}
			</m.div>
		);
	},
);

SnapEntrance.displayName = "SnapEntrance";

// ===== PROTECTIVE HOVER ANIMATIONS =====

interface ProtectiveHoverProps extends HTMLMotionProps<"div"> {
	children: React.ReactNode;
	intensity?: "subtle" | "normal" | "strong";
	protectionGlow?: boolean;
	className?: string;
}

/**
 * ProtectiveHover - Hover animation that feels like protection activation
 * Scales slightly and adds protective glow effect
 */
export const ProtectiveHover = forwardRef<HTMLDivElement, ProtectiveHoverProps>(
	({ children, intensity = "normal", protectionGlow = false, className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		const intensityMap = {
			subtle: { scale: 1.02, glow: 0.1 },
			normal: { scale: 1.05, glow: 0.2 },
			strong: { scale: 1.08, glow: 0.3 },
		};

		const { scale: hoverScale, glow } = intensityMap[intensity as "subtle" | "normal" | "strong"];

		// For SSR or when animations are reduced, render without motion
		if (shouldReduceAnimations || !isMounted) {
			return (
				<div
					ref={ref}
					className={cn(
						"cursor-pointer select-none",
						protectionGlow && "hover:shadow-lg hover:shadow-primary/20",
						className,
					)}
					{...(props as any)}
				>
					{children}
				</div>
			);
		}

		const hoverProps = {
			whileHover: { scale: hoverScale },
			whileTap: { scale: 0.98 },
			transition: {
				duration: 0.15,
				ease: snapEasing.instant,
			},
		};

		const glowStyle = protectionGlow
			? {
					filter: `drop-shadow(0 0 ${glow * 20}px hsl(var(--primary) / ${glow}))`,
				}
			: {};

		return (
			<m.div
				ref={ref}
				className={cn(
					"cursor-pointer select-none",
					protectionGlow && "hover:shadow-lg hover:shadow-primary/20",
					className,
				)}
				style={{ ...getMotionStyles(), ...glowStyle }}
				{...baseMotionProps}
				{...hoverProps}
				{...props}
			>
				{children}
			</m.div>
		);
	},
);

ProtectiveHover.displayName = "ProtectiveHover";

// ===== ELASTIC SNAP ANIMATION =====

interface ElasticSnapProps extends HTMLMotionProps<"div"> {
	children: React.ReactNode;
	trigger?: boolean;
	direction?: "x" | "y" | "both";
	intensity?: number;
	className?: string;
}

/**
 * ElasticSnap - Core brand animation showing elastic "snap back" effect
 * Simulates the feeling of instant protection and recovery
 */
export const ElasticSnap = forwardRef<HTMLDivElement, ElasticSnapProps>(
	({ children, trigger = false, direction = "y", intensity = 10, className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();
		const controls = useAnimation();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		useEffect(() => {
			if (!trigger || shouldReduceAnimations || !isMounted) {
				return;
			}

			const snapAnimation = async () => {
				// Quick displacement (simulating "attack" or disturbance)
				await controls.start({
					x: direction === "x" || direction === "both" ? intensity : 0,
					y: direction === "y" || direction === "both" ? intensity : 0,
					transition: { duration: 0.05, ease: snapEasing.instant },
				});

				// Elastic snap back (protection engaging)
				await controls.start({
					x: 0,
					y: 0,
					transition: { duration: 0.4, ease: snapEasing.elastic },
				});
			};

			snapAnimation();
		}, [trigger, controls, direction, intensity, shouldReduceAnimations, isMounted]);

		if (shouldReduceAnimations || !isMounted) {
			return (
				<div ref={ref} className={className} {...(props as any)}>
					{children}
				</div>
			);
		}

		return (
			<m.div
				ref={ref}
				animate={controls}
				className={className}
				style={getMotionStyles()}
				{...baseMotionProps}
				{...props}
			>
				{children}
			</m.div>
		);
	},
);

ElasticSnap.displayName = "ElasticSnap";

// ===== CHECKPOINT CREATION ANIMATION =====

interface CheckpointPulseProps extends HTMLMotionProps<"div"> {
	children: React.ReactNode;
	active?: boolean;
	speed?: "slow" | "normal" | "fast";
	className?: string;
}

/**
 * CheckpointPulse - Simulates the <100ms checkpoint creation
 * Subtle pulse animation that reinforces protection activity
 */
export const CheckpointPulse = forwardRef<HTMLDivElement, CheckpointPulseProps>(
	({ children, active = true, speed = "normal", className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		const speedMap = {
			slow: 3,
			normal: 2,
			fast: 1,
		};

		const duration = speedMap[speed as "slow" | "normal" | "fast"];

		if (shouldReduceAnimations || !isMounted || !active) {
			return (
				<div ref={ref} className={className} {...(props as any)}>
					{children}
				</div>
			);
		}

		return (
			<m.div
				ref={ref}
				animate={{
					scale: [1, 1.02, 1],
					opacity: [0.8, 1, 0.8],
				}}
				transition={{
					duration,
					repeat: Number.POSITIVE_INFINITY,
					ease: snapEasing.recover,
				}}
				className={className}
				style={getMotionStyles()}
				{...baseMotionProps}
				{...props}
			>
				{children}
			</m.div>
		);
	},
);

CheckpointPulse.displayName = "CheckpointPulse";

// ===== RECOVERY TIMELINE ANIMATION =====

interface RecoveryTimelineProps {
	steps: {
		label: string;
		duration: string;
		status: "complete" | "active" | "pending";
	}[];
	className?: string;
}

/**
 * RecoveryTimeline - Animated timeline showing <2s recovery process
 * Reinforces speed and efficiency brand promises
 */
export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({ steps, className }) => {
	const [isMounted, setIsMounted] = useState(false);
	const { shouldReduceAnimations } = useMobileOptimization();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<div className={cn("space-y-4", className)}>
			{steps.map((step, index) => {
				const isComplete = step.status === "complete";
				const isActive = step.status === "active";

				return (
					<div key={step.label} className="flex items-center gap-4">
						{/* Status Indicator */}
						<div
							className={cn(
								"relative w-6 h-6 rounded-full border-2 flex items-center justify-center",
								isComplete && "border-primary bg-primary",
								isActive && "border-primary bg-primary/20",
								step.status === "pending" && "border-muted-foreground/30",
							)}
						>
							{isComplete &&
								(!shouldReduceAnimations && isMounted ? (
									<m.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											delay: index * 0.1 + 0.2,
											duration: 0.3,
											ease: snapEasing.snap,
										}}
										style={getMotionStyles()}
									>
										✓
									</m.div>
								) : (
									<div>✓</div>
								))}
							{isActive && (
								<CheckpointPulse speed="fast">
									<div className="w-2 h-2 bg-primary rounded-full" />
								</CheckpointPulse>
							)}
						</div>

						{/* Step Content */}
						<div className="flex-1">
							<div className="flex items-center justify-between">
								<span
									className={cn(
										"font-medium",
										isComplete && "text-primary",
										isActive && "text-foreground",
										step.status === "pending" && "text-muted-foreground",
									)}
								>
									{step.label}
								</span>
								<span
									className={cn(
										"text-sm font-mono",
										isComplete && "text-primary",
										isActive && "text-foreground",
										step.status === "pending" && "text-muted-foreground",
									)}
								>
									{step.duration}
								</span>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

// ===== PERFORMANCE METRICS DISPLAY =====

interface PerformanceMetricProps {
	value: string;
	label: string;
	target: string;
	status: "excellent" | "good" | "warning";
	className?: string;
}

/**
 * PerformanceMetric - Animated metric display emphasizing speed
 * Shows performance numbers with satisfying animations
 */
export const PerformanceMetric: React.FC<PerformanceMetricProps> = ({ value, label, target, status, className }) => {
	const [isMounted, setIsMounted] = useState(false);
	const { shouldReduceAnimations } = useMobileOptimization();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const statusColors = {
		excellent: "text-green-400",
		good: "text-primary",
		warning: "text-yellow-400",
	};

	return (
		<div className={cn("text-center", className)}>
			<div className={cn("text-3xl font-bold font-mono transition-colors", statusColors[status])}>
				{!shouldReduceAnimations && isMounted ? (
					<m.span
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5, ease: snapEasing.elastic }}
						style={getMotionStyles()}
					>
						{value}
					</m.span>
				) : (
					value
				)}
			</div>
			<div className="text-sm text-muted-foreground mt-1">{label}</div>
			<div className="text-xs text-muted-foreground/70">Target: {target}</div>
		</div>
	);
};

// ===== STAGGER CONTAINER =====

interface SnapStaggerProps extends HTMLMotionProps<"div"> {
	children: React.ReactNode;
	stagger?: number;
	className?: string;
}

/**
 * SnapStagger - Container that staggers children with snap animations
 * Perfect for lists, feature cards, etc.
 */
export const SnapStagger = forwardRef<HTMLDivElement, SnapStaggerProps>(
	({ children, stagger = 0.1, className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		// For SSR, render children without animations to prevent hydration mismatch
		if (!isMounted) {
			return (
				<div ref={ref} className={className} {...(props as any)}>
					{React.Children.map(children, (child, index) => (
						<div key={index}>{child}</div>
					))}
				</div>
			);
		}

		if (shouldReduceAnimations) {
			return (
				<div ref={ref} className={className} {...(props as any)}>
					{children}
				</div>
			);
		}

		return (
			<m.div
				ref={ref}
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, margin: "-10%" }}
				variants={{
					hidden: { opacity: 1 },
					visible: {
						opacity: 1,
						transition: {
							staggerChildren: stagger,
							delayChildren: 0.1,
						},
					},
				}}
				className={className}
				style={getMotionStyles()}
				{...baseMotionProps}
				{...props}
			>
				{React.Children.map(children, (child, index) => (
					<m.div
						key={index}
						variants={{
							hidden: { y: 0, opacity: 1 },
							visible: {
								y: 0,
								opacity: 1,
								transition: {
									duration: 0.6,
									ease: snapEasing.snap,
								},
							},
						}}
						style={getMotionStyles()}
					>
						{child}
					</m.div>
				))}
			</m.div>
		);
	},
);

SnapStagger.displayName = "SnapStagger";

// ===== BRAND BUTTON WRAPPER =====

interface SnapButtonProps extends HTMLMotionProps<"button"> {
	children: React.ReactNode;
	variant?: "primary" | "secondary" | "ghost";
	size?: "sm" | "md" | "lg";
	protective?: boolean;
	className?: string;
}

/**
 * SnapButton - Brand-consistent button with protective animations
 * Reinforces the protection and speed brand promises
 */
export const SnapButton = forwardRef<HTMLButtonElement, SnapButtonProps>(
	({ children, variant = "primary", size = "md", protective = false, className, ...props }, ref) => {
		const [isMounted, setIsMounted] = useState(false);
		const { shouldReduceAnimations } = useMobileOptimization();

		useEffect(() => {
			setIsMounted(true);
		}, []);

		const sizeClasses = {
			sm: "px-4 py-2 text-sm",
			md: "px-6 py-3 text-base",
			lg: "px-8 py-4 text-lg",
		};

		const variantClasses = {
			primary: "bg-primary text-primary-foreground shadow-md",
			secondary: "bg-secondary text-secondary-foreground border border-border",
			ghost: "bg-transparent text-foreground hover:bg-accent",
		};

		// For SSR or when animations are reduced, render without motion
		if (shouldReduceAnimations || !isMounted) {
			return (
				<button
					ref={ref as any}
					className={cn(
						"relative font-medium rounded-lg transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						sizeClasses[size as "sm" | "md" | "lg"],
						variantClasses[variant as "primary" | "secondary" | "ghost"],
						protective && "overflow-hidden",
						className,
					)}
					{...(props as any)}
				>
					{children}
				</button>
			);
		}

		const hoverProps = {
			whileHover: {
				scale: 1.02,
				...(protective && {
					boxShadow: "0 10px 25px -5px hsl(var(--primary) / 0.3)",
				}),
			},
			whileTap: { scale: 0.98 },
			transition: { duration: 0.15, ease: snapEasing.instant },
		};

		return (
			<m.button
				ref={ref}
				className={cn(
					"relative font-medium rounded-lg transition-all duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
					"disabled:opacity-50 disabled:cursor-not-allowed",
					sizeClasses[size as "sm" | "md" | "lg"],
					variantClasses[variant as "primary" | "secondary" | "ghost"],
					protective && "overflow-hidden",
					className,
				)}
				style={getMotionStyles()}
				{...baseMotionProps}
				{...hoverProps}
				{...props}
			>
				{children}

				{/* Protective glow effect */}
				{protective && (
					<m.div
						className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20"
						initial={{ x: "-100%" }}
						whileHover={{ x: "100%" }}
						transition={{ duration: 0.6, ease: snapEasing.recover }}
					/>
				)}
			</m.button>
		);
	},
);

SnapButton.displayName = "SnapButton";

// ===== EXPORT ALL =====
export type {
	SnapEntranceProps,
	ProtectiveHoverProps,
	ElasticSnapProps,
	CheckpointPulseProps,
	RecoveryTimelineProps,
	PerformanceMetricProps,
	SnapStaggerProps,
	SnapButtonProps,
};
