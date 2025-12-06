"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMediaQuery, useScrollLock } from "usehooks-ts";

/**
 * Mobile performance optimization hook
 * Handles scroll locking, lazy loading, and performance hints
 */
export function useMobilePerformance() {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

	// Scroll lock utilities (useful for mobile modals/overlays)
	const { lock: lockScroll, unlock: unlockScroll } = useScrollLock({
		autoLock: false,
	});

	// Intersection observer for lazy loading
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Initialize performance observer for mobile
	useEffect(() => {
		if (!isMobile || typeof window === "undefined") {
			return;
		}

		// Performance hints for mobile browsers
		if ("connection" in navigator) {
			const connection = (navigator as any).connection;
			if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
				// Reduce image quality, disable non-critical animations
				document.documentElement.setAttribute("data-slow-connection", "true");
			}
		}

		// Memory pressure detection
		if ("memory" in performance && (performance as any).memory) {
			const memory = (performance as any).memory;
			const memoryRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

			if (memoryRatio > 0.8) {
				document.documentElement.setAttribute("data-memory-pressure", "true");
			}
		}

		return () => {
			document.documentElement.removeAttribute("data-slow-connection");
			document.documentElement.removeAttribute("data-memory-pressure");
		};
	}, [isMobile]);

	// Lazy loading utility
	const createLazyLoader = useCallback(
		(threshold = 0.1) => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}

			observerRef.current = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							const element = entry.target as HTMLElement;

							// Load images
							if (element.tagName === "IMG") {
								const img = element as HTMLImageElement;
								const dataSrc = img.getAttribute("data-src");
								if (dataSrc) {
									img.src = dataSrc;
									img.removeAttribute("data-src");
								}
							}

							// Trigger custom load events
							const loadEvent = new CustomEvent("lazyload", {
								detail: { element },
							});
							element.dispatchEvent(loadEvent);

							observerRef.current?.unobserve(element);
						}
					});
				},
				{
					threshold,
					rootMargin: isMobile ? "50px" : "100px", // Smaller margin on mobile
				},
			);

			return observerRef.current;
		},
		[isMobile],
	);

	// Touch-friendly utilities
	const getTouchEventOptions = useCallback(
		() => ({
			passive: true,
			capture: false,
		}),
		[],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

	return {
		// Device info
		isMobile,
		prefersReducedMotion,

		// Scroll management
		lockScroll,
		unlockScroll,

		// Lazy loading
		createLazyLoader,

		// Touch utilities
		getTouchEventOptions,

		// Performance utilities
		shouldReduceQuality: isMobile,
		shouldPreloadImages: !isMobile,
		shouldUseNativeScroll: isMobile,
	};
}
