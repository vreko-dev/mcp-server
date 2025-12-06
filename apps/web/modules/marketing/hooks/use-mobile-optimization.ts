"use client";

import { useMediaQuery, useWindowSize } from "usehooks-ts";

/**
 * Mobile optimization hook for SnapBack marketing site
 * Provides responsive utilities for better mobile experience
 */
export function useMobileOptimization() {
	// Breakpoint detection
	const isMobile = useMediaQuery("(max-width: 768px)");
	const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
	const isDesktop = useMediaQuery("(min-width: 1025px)");

	// Touch device detection
	const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");

	// Orientation detection
	const isPortrait = useMediaQuery("(orientation: portrait)");
	const isLandscape = useMediaQuery("(orientation: landscape)");

	// Small mobile detection (for ultra-compact layouts)
	const isSmallMobile = useMediaQuery("(max-width: 480px)");

	// Window dimensions with debouncing for performance
	const { width = 0, height = 0 } = useWindowSize({
		debounceDelay: 100,
		initializeWithValue: true,
	});

	// Prefers reduced motion (accessibility)
	const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

	// High DPI/Retina detection
	const isHighDPI = useMediaQuery("(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)");

	// Dark mode preference
	const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

	return {
		// Device type
		isMobile,
		isTablet,
		isDesktop,
		isSmallMobile,
		isTouchDevice,

		// Orientation
		isPortrait,
		isLandscape,

		// Dimensions
		windowWidth: width,
		windowHeight: height,

		// Accessibility & Performance
		prefersReducedMotion,
		isHighDPI,
		prefersDarkMode,

		// Computed utilities
		isCompact: isMobile || isSmallMobile,
		shouldReduceAnimations: prefersReducedMotion || isMobile,
		aspectRatio: width > 0 ? width / height : 16 / 9,
	};
}
