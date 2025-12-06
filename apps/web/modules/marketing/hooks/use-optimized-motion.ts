"use client";

import { useMotionValue, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// Performance-first motion tokens designed for 60fps
export const PERFORMANCE_MOTION = {
	// Ultra-fast for instant feedback (<100ms)
	instant: {
		type: "tween" as const,
		duration: 0.08,
		ease: [0.76, 0, 0.24, 1],
	},
	// Quick interactions (150ms)
	quick: {
		type: "tween" as const,
		duration: 0.15,
		ease: [0.4, 0, 0.2, 1],
	},
	// Snap-back brand reinforcement
	snapBack: {
		type: "spring" as const,
		damping: 15,
		stiffness: 200,
		mass: 1.2,
	},
	// Smooth protective animations
	protective: {
		type: "spring" as const,
		damping: 20,
		stiffness: 100,
		mass: 1,
	},
} as const;

// Hook for optimized hover interactions with magnetic effect
export const useMagneticHover = (strength = 0.3, radius = 30) => {
	const ref = useRef<HTMLElement>(null);
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const springX = useSpring(x, { damping: 20, stiffness: 300, mass: 0.8 });
	const springY = useSpring(y, { damping: 20, stiffness: 300, mass: 0.8 });

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!ref.current) {
				return;
			}

			const rect = ref.current.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const distanceX = event.clientX - centerX;
			const distanceY = event.clientY - centerY;
			const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

			if (distance < radius) {
				const magneticForce = Math.max(0, (radius - distance) / radius);
				x.set(distanceX * strength * magneticForce);
				y.set(distanceY * strength * magneticForce);
			} else {
				x.set(0);
				y.set(0);
			}
		},
		[x, y, strength, radius],
	);

	const handleMouseLeave = useCallback(() => {
		x.set(0);
		y.set(0);
	}, [x, y]);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		element.addEventListener("mousemove", handleMouseMove);
		element.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			element.removeEventListener("mousemove", handleMouseMove);
			element.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [handleMouseMove, handleMouseLeave]);

	return {
		ref,
		x: springX,
		y: springY,
		style: {
			transform: useTransform([springX, springY], ([x, y]) => `translate3d(${x}px, ${y}px, 0)`),
		},
	};
};

// Hook for elastic button interactions
export const useElasticInteraction = () => {
	const scale = useMotionValue(1);
	const springScale = useSpring(scale, PERFORMANCE_MOTION.snapBack);

	const handleInteraction = useCallback(
		(type: "hover" | "tap" | "release") => {
			switch (type) {
				case "hover":
					scale.set(1.02);
					break;
				case "tap":
					scale.set(0.95);
					break;
				case "release":
					scale.set(1);
					break;
			}
		},
		[scale],
	);

	return {
		scale: springScale,
		onHoverStart: () => handleInteraction("hover"),
		onHoverEnd: () => handleInteraction("release"),
		onTapStart: () => handleInteraction("tap"),
		onTap: () => handleInteraction("release"),
		style: {
			scale: springScale,
			transform: "translateZ(0)", // GPU acceleration
		},
	};
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
	const [metrics, setMetrics] = useState({
		fps: 60,
		frameTime: 16.67,
		isOptimal: true,
	});

	const frameCount = useRef(0);
	const lastTime = useRef(performance.now());
	const frameTimes = useRef<number[]>([]);

	useEffect(() => {
		let animationFrame: number;

		const measure = (currentTime: number) => {
			const deltaTime = currentTime - lastTime.current;
			frameTimes.current.push(deltaTime);

			// Keep only last 60 frames for rolling average
			if (frameTimes.current.length > 60) {
				frameTimes.current.shift();
			}

			frameCount.current++;

			// Update metrics every second
			if (deltaTime >= 1000) {
				const avgFrameTime =
					frameTimes.current.reduce((sum, time) => sum + time, 0) / frameTimes.current.length;
				const currentFps = Math.round(1000 / avgFrameTime);

				setMetrics({
					fps: currentFps,
					frameTime: avgFrameTime,
					isOptimal: currentFps >= 55, // Allow 5fps buffer
				});

				frameCount.current = 0;
				lastTime.current = currentTime;
			}

			animationFrame = requestAnimationFrame(measure);
		};

		animationFrame = requestAnimationFrame(measure);
		return () => cancelAnimationFrame(animationFrame);
	}, []);

	return metrics;
};

// Hook for scroll-based parallax with performance optimization
export const useParallax = (speed = 0.5, threshold = 100) => {
	const ref = useRef<HTMLElement>(null);
	const y = useMotionValue(0);
	const [isInView, setIsInView] = useState(false);

	const transform = useTransform(y, (value) => `translate3d(0, ${value * speed}px, 0)`);

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsInView(!!entry?.isIntersecting); // Add null check for entry
			},
			{ rootMargin: `${threshold}px` },
		);

		observer.observe(element);

		const handleScroll = () => {
			if (!isInView) {
				return;
			}

			const scrolled = window.scrollY;
			const rate = scrolled * -speed;

			// Use requestAnimationFrame for smooth updates
			requestAnimationFrame(() => {
				y.set(rate);
			});
		};

		if (isInView) {
			window.addEventListener("scroll", handleScroll, { passive: true });
		}

		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", handleScroll);
		};
	}, [y, speed, threshold, isInView]);

	return {
		ref,
		style: { transform },
	};
};

// Hook for reduced motion detection with context
export const useAccessibleMotion = () => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const [hasInteracted, setHasInteracted] = useState(false);

	useEffect(() => {
		// Check system preference
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setPrefersReducedMotion(mediaQuery.matches);

		const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
		mediaQuery.addEventListener("change", handleChange);

		// Track user interaction for progressive enhancement
		const handleInteraction = () => setHasInteracted(true);
		document.addEventListener("click", handleInteraction, { once: true });
		document.addEventListener("keydown", handleInteraction, { once: true });

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
			document.removeEventListener("click", handleInteraction);
			document.removeEventListener("keydown", handleInteraction);
		};
	}, []);

	// Return motion configuration based on preferences
	const getMotionConfig = useCallback(
		(baseConfig: typeof PERFORMANCE_MOTION.instant) => {
			if (prefersReducedMotion) {
				return { duration: 0.01, ease: "linear" as const };
			}
			return baseConfig;
		},
		[prefersReducedMotion],
	);

	return {
		prefersReducedMotion,
		hasInteracted,
		shouldAnimate: !prefersReducedMotion && hasInteracted,
		getMotionConfig,
	};
};

// Hook for stagger animations with performance optimization
export const useStaggeredAnimation = (delay = 0.05) => {
	const [animationStarted, setAnimationStarted] = useState(false);
	const ref = useRef<HTMLElement>(null);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: delay,
				delayChildren: 0.1,
				when: "beforeChildren",
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: PERFORMANCE_MOTION.quick,
		},
	};

	useEffect(() => {
		const element = ref.current;
		if (!element || animationStarted) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					// Add null check for entry
					setAnimationStarted(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [animationStarted]);

	return {
		ref,
		containerVariants,
		itemVariants,
		shouldAnimate: animationStarted,
	};
};

// Hook for auto-optimizing animations based on device capabilities
export const useAdaptiveMotion = () => {
	const [capabilities, setCapabilities] = useState({
		highPerformance: true,
		reducedMotion: false,
		touchDevice: false,
	});

	const performance = usePerformanceMonitor();

	useEffect(() => {
		// Detect device capabilities
		const detectCapabilities = () => {
			const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
			const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			const isHighPerformance = performance.fps >= 55 && performance.frameTime <= 18;

			setCapabilities({
				highPerformance: isHighPerformance,
				reducedMotion: prefersReducedMotion,
				touchDevice: isTouchDevice,
			});
		};

		detectCapabilities();

		// Re-evaluate capabilities if performance changes significantly
		const performanceThreshold = 10;
		if (Math.abs(performance.fps - 60) > performanceThreshold) {
			detectCapabilities();
		}
	}, [performance.fps, performance.frameTime]);

	// Return optimized motion configuration
	const getOptimizedConfig = useCallback(
		(baseConfig: keyof typeof PERFORMANCE_MOTION) => {
			if (capabilities.reducedMotion) {
				return { duration: 0.01, ease: "linear" as const };
			}

			if (!capabilities.highPerformance) {
				// Reduce complex springs to simple tweens for low-performance devices
				return baseConfig === "snapBack" || baseConfig === "protective"
					? PERFORMANCE_MOTION.quick
					: PERFORMANCE_MOTION[baseConfig];
			}

			return PERFORMANCE_MOTION[baseConfig];
		},
		[capabilities],
	);

	return {
		capabilities,
		performance,
		getOptimizedConfig,
	};
};
