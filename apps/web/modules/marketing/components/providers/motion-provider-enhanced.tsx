"use client";

// 🚨 AI-CONTEXT: React 19.0.0 Client Component; Next.js 15.x; TS 5.x strict
// 📐 ARCHITECTURE: Enhanced Motion Provider with lazy motion/react and fallbacks
// PURPOSE: Load motion/react lazily with retries, respect reduced motion, provide a11y fallbacks
// DEPENDENCIES: motion/react ^12, CSS data attributes for reduced motion states
// STATE: Local reducer-like state; avoids global stores; idempotent effects
// CONSTRAINTS: Keep lazy import path stable; changing breaks tree‑shaking and timing
// 🎯 PATTERN: Progressive enhancement + exponential backoff on dynamic import
// ERROR HANDLING: Fallback banner in dev; safe no-op in unsupported envs
// 🤖 AI-HELPER: Related: motion-provider.tsx, smooth-scroll-provider.tsx; tests TBD

import type { FeatureBundle, LazyMotion, MotionConfig } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface MotionProviderProps {
	children: React.ReactNode;
	enableRetry?: boolean;
	maxRetries?: number;
	fallbackMessage?: string;
	respectReducedMotion?: boolean;
}

interface MotionState {
	hasError: boolean;
	retryCount: number;
	errorMessage?: string;
	reducedMotion: boolean;
	supportsMotion: boolean;
}

// Enhanced reduced motion detection
const detectReducedMotion = (): boolean => {
	if (typeof window === "undefined") {
		return false;
	}

	try {
		// Check CSS media query
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		return mediaQuery.matches;
	} catch (error) {
		console.warn("Failed to detect reduced motion preference", { error });
		return false;
	}
};

// Check if motion/react is supported
const checkMotionSupport = (): boolean => {
	if (typeof window === "undefined") {
		return true;
	}

	try {
		// Basic feature detection
		return "requestAnimationFrame" in window && "CSS" in window;
	} catch (_error) {
		return false;
	}
};

// Lazy import motion/react to handle loading failures
const loadFramerMotion = async (): Promise<
	| {
			LazyMotion: typeof LazyMotion;
			MotionConfig: typeof MotionConfig;
			domAnimation: FeatureBundle;
			success: true;
	  }
	| { success: false; error: unknown }
> => {
	try {
		const { LazyMotion, MotionConfig, domAnimation } = await import("motion/react");
		return { LazyMotion, MotionConfig, domAnimation, success: true };
	} catch (error) {
		console.warn("Failed to load motion/react", { error });
		return { success: false, error };
	}
};

// Enhanced fallback component with accessibility classes
function MotionFallback({
	children,
	message,
	reducedMotion = false,
}: {
	children: React.ReactNode;
	message?: string;
	reducedMotion?: boolean;
}) {
	useEffect(() => {
		if (process.env.NODE_ENV === "development" && message) {
			console.warn(`MotionProvider fallback active: ${message}`);
		}

		// Apply CSS classes for reduced motion or no motion
		const htmlElement = document.documentElement;

		if (reducedMotion) {
			htmlElement.classList.add("no-motion");
			htmlElement.setAttribute("data-reduced-motion", "true");
		} else {
			htmlElement.classList.add("motion-fallback");
		}

		return () => {
			htmlElement.classList.remove("no-motion", "motion-fallback");
			htmlElement.removeAttribute("data-reduced-motion");
		};
	}, [message, reducedMotion]);

	return (
		<div data-testid="motion-fallback" className={reducedMotion ? "no-motion" : "motion-fallback"}>
			{process.env.NODE_ENV === "development" && (
				<div
					style={{
						position: "fixed",
						top: 0,
						right: 0,
						background: reducedMotion ? "#10b981" : "#ff6b35",
						color: "white",
						padding: "4px 8px",
						fontSize: "12px",
						zIndex: 9999,
						opacity: 0.8,
					}}
				>
					{reducedMotion ? "Reduced Motion" : "Motion Disabled"}
				</div>
			)}
			{children}
		</div>
	);
}

// Enhanced MotionProvider with error boundary and reduced motion support
export function MotionProviderWithErrorBoundary({
	children,
	enableRetry = true,
	maxRetries = 3,
	fallbackMessage = "Motion animation disabled due to initialization error",
	respectReducedMotion = true,
}: MotionProviderProps) {
	const [motionState, setMotionState] = useState<MotionState>({
		hasError: false,
		retryCount: 0,
		reducedMotion: false,
		supportsMotion: true,
	});

	const [motionComponents, setMotionComponents] = useState<{
		LazyMotion?: typeof LazyMotion;
		MotionConfig?: typeof MotionConfig;
		domAnimation?: FeatureBundle;
	}>({});

	// Enhanced motion config with dynamic reduced motion support
	const motionConfig = useMemo(
		() => ({
			// Optimize for performance over visual perfection
			transition: motionState.reducedMotion
				? {
						type: "tween" as const,
						ease: "linear" as const,
						duration: 0.01,
					}
				: {
						type: "tween" as const,
						ease: [0.25, 0.1, 0.25, 1] as const,
						duration: 0.3,
					},
			// Dynamic reduced motion based on user preference
			reducedMotion: motionState.reducedMotion ? ("always" as const) : ("user" as const),
		}),
		[motionState.reducedMotion],
	);

	// Retry logic for loading motion/react
	const attemptMotionLoad = useCallback(async () => {
		try {
			const result = await loadFramerMotion();

			if (result.success && result.LazyMotion && result.MotionConfig && result.domAnimation) {
				setMotionComponents({
					LazyMotion: result.LazyMotion,
					MotionConfig: result.MotionConfig,
					domAnimation: result.domAnimation,
				});
				setMotionState((prevState) => ({
					...prevState,
					hasError: false,
					retryCount: 0,
				}));
				return true;
			}

			throw new Error("Failed to load motion components");
		} catch (error) {
			const newRetryCount = motionState.retryCount + 1;
			const errorMessage = error instanceof Error ? error.message : "Unknown error";

			console.warn(
				`MotionProvider ${
					process.env.NODE_ENV === "development" ? "development" : ""
				} fallback (attempt ${newRetryCount}):`,
				error,
			);

			if (enableRetry && newRetryCount < maxRetries) {
				setMotionState((prevState) => ({
					...prevState,
					hasError: true,
					retryCount: newRetryCount,
					errorMessage,
				}));

				// Exponential backoff retry
				setTimeout(
					() => {
						attemptMotionLoad();
					},
					2 ** newRetryCount * 100,
				);

				return false;
			}

			setMotionState((prevState) => ({
				...prevState,
				hasError: true,
				retryCount: newRetryCount,
				errorMessage,
			}));
			return false;
		}
	}, [motionState.retryCount, enableRetry, maxRetries]);

	// Initialize motion detection and load components
	useEffect(() => {
		// Detect reduced motion preference
		const reducedMotion = respectReducedMotion && detectReducedMotion();
		const supportsMotion = checkMotionSupport();

		setMotionState((prevState) => ({
			...prevState,
			reducedMotion,
			supportsMotion,
		}));

		// Listen for changes in reduced motion preference
		if (typeof window !== "undefined" && respectReducedMotion) {
			try {
				const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
				const handleChange = (e: MediaQueryListEvent) => {
					setMotionState((prevState) => ({
						...prevState,
						reducedMotion: e.matches,
					}));
				};

				mediaQuery.addEventListener("change", handleChange);

				return () => {
					mediaQuery.removeEventListener("change", handleChange);
				};
			} catch (error) {
				console.warn("Failed to setup reduced motion listener", { error });
			}
		}

		// Load motion components if motion is not reduced and supported
		if (!reducedMotion && supportsMotion) {
			attemptMotionLoad();
		}

		// Return cleanup function (even if empty) to satisfy useEffect
		return () => {};
	}, [attemptMotionLoad, respectReducedMotion]);

	// Additional effect for loading motion components
	useEffect(() => {
		if (!motionState.reducedMotion && motionState.supportsMotion && !motionComponents.LazyMotion) {
			attemptMotionLoad();
		}
	}, [motionState.reducedMotion, motionState.supportsMotion, motionComponents.LazyMotion, attemptMotionLoad]);

	// Error boundary for runtime motion errors
	const MotionErrorBoundary = ({ children }: { children: React.ReactNode }) => {
		try {
			return <>{children}</>;
		} catch (error) {
			console.warn("Runtime motion error caught", { error });
			return <MotionFallback message="Runtime motion error">{children}</MotionFallback>;
		}
	};

	// Render reduced motion fallback if user prefers reduced motion
	if (motionState.reducedMotion) {
		return (
			<MotionFallback message="Reduced motion active - respecting user preference" reducedMotion={true}>
				{children}
			</MotionFallback>
		);
	}

	// Render fallback if motion not supported
	if (!motionState.supportsMotion) {
		return <MotionFallback message="Motion not supported in this environment">{children}</MotionFallback>;
	}

	// Render fallback if motion failed to load or has errors
	if (motionState.hasError && motionState.retryCount >= maxRetries) {
		return <MotionFallback message={fallbackMessage}>{children}</MotionFallback>;
	}

	// Render loading state while retrying
	if (motionState.hasError && motionState.retryCount < maxRetries) {
		return (
			<MotionFallback message={`Loading motion (attempt ${motionState.retryCount + 1})`}>
				{children}
			</MotionFallback>
		);
	}

	// Render with motion if components loaded successfully
	if (motionComponents.LazyMotion && motionComponents.MotionConfig && motionComponents.domAnimation) {
		const { LazyMotion, MotionConfig, domAnimation } = motionComponents;

		try {
			return (
				<MotionErrorBoundary>
					<LazyMotion features={domAnimation} strict>
						<MotionConfig transition={motionConfig.transition} reducedMotion={motionConfig.reducedMotion}>
							{children}
						</MotionConfig>
					</LazyMotion>
				</MotionErrorBoundary>
			);
		} catch (error) {
			console.warn("Motion component rendering error", { error });
			return <MotionFallback message="Motion rendering error">{children}</MotionFallback>;
		}
	}

	// Default loading state
	return <MotionFallback message="Loading motion components">{children}</MotionFallback>;
}

// Default export for easier importing
export default MotionProviderWithErrorBoundary;
