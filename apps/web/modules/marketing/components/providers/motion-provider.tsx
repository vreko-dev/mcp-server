"use client";
// 🚨 AI-CONTEXT: React 19.0.0 Client Component; Next.js 15.x; TS 5.x strict
// 📐 ARCHITECTURE: Motion Provider (Lenis)
// PURPOSE: Adds smooth scrolling while respecting reduced-motion and hydration constraints
// DEPENDENCIES: lenis ^1.x
// STATE: Local state for reduced motion + client detection; no global state
// CONSTRAINTS: Run effects client-side only; avoid SSR-only access to window
// 🎯 PATTERN: Progressive enhancement — degrade gracefully when reduced-motion is set
// ERROR HANDLING: Destroy Lenis on unmount to avoid memory leaks
// 🤖 AI-HELPER: Related: motion-provider-enhanced.tsx, smooth-scroll-provider.tsx

import Lenis from "lenis";
import { type ReactNode, useEffect, useState } from "react";

interface MotionProviderProps {
	children: ReactNode;
}

/**
 * Simplified Motion Provider to avoid React Compiler conflicts
 * Handles SSR/hydration mismatch with minimal complexity
 */
function MotionProvider({ children }: MotionProviderProps) {
	const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
	const [isClient, setIsClient] = useState(false);

	// Runtime motion preference check
	useEffect(() => {
		setIsClient(true);

		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		setShouldReduceMotion(mediaQuery.matches);

		const handleChange = (e: MediaQueryListEvent) => {
			setShouldReduceMotion(e.matches);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	// Initialize Lenis only if motion is not reduced
	useEffect(() => {
		if (!isClient || shouldReduceMotion || typeof window === "undefined") {
			return;
		}

		const lenisInstance = new Lenis({
			duration: 1.2,
			easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
			orientation: "vertical",
			gestureOrientation: "vertical",
			smoothWheel: true,
			wheelMultiplier: 1,
			touchMultiplier: 2,
			infinite: false,
		});

		function raf(time: number) {
			lenisInstance.raf(time);
			requestAnimationFrame(raf);
		}

		requestAnimationFrame(raf);

		return () => {
			lenisInstance.destroy();
		};
	}, [isClient, shouldReduceMotion]);

	// Simple wrapper without complex motion components
	return (
		<div
			className={shouldReduceMotion ? "motion-reduced" : isClient ? "lenis-smooth" : ""}
			suppressHydrationWarning={true}
		>
			{children}
		</div>
	);
}

export default MotionProvider;
