"use client";

import Lenis from "lenis";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface SmoothScrollProviderProps {
	children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
	useEffect(() => {
		// Apply required positioning to body for Lenis scroll calculations
		document.body.style.position = "relative";

		// Also ensure the body is visible by default
		document.body.style.opacity = "1";

		const lenis = new Lenis({
			duration: 1.2,
			easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)), // Smooth easing function
			smoothWheel: true,
			wheelMultiplier: 1,
			touchMultiplier: 2,
			infinite: false,
			orientation: "vertical",
			gestureOrientation: "vertical",
		});

		// Make lenis globally accessible
		(window as any).lenis = lenis;

		// Handle scroll events
		lenis.on("scroll", (_e) => {
			// Could add custom scroll effects here if needed
		});

		// Handle anchor link clicks
		function handleAnchorClick(this: HTMLElement, e: MouseEvent) {
			const href = this.getAttribute("href");

			// Check if it's an anchor link
			if (href?.startsWith("#")) {
				e.preventDefault();
				lenis.scrollTo(href, {
					offset: -80, // Adjust for navbar height
					duration: 1.5,
					easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
				});
			}
		}

		// Add event listeners for anchor links
		const anchorLinks = document.querySelectorAll('a[href^="#"]');
		anchorLinks.forEach((link) => {
			link.addEventListener("click", handleAnchorClick as EventListener);
		});

		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}

		// Use high-performance animation frame
		const scrollRaf = requestAnimationFrame(raf);

		// Clean up on unmount
		return () => {
			lenis.destroy();
			cancelAnimationFrame(scrollRaf);

			// Remove global reference
			delete (window as any).lenis;

			// Remove event listeners
			anchorLinks.forEach((link) => {
				link.removeEventListener("click", handleAnchorClick as EventListener);
			});

			// Reset body positioning
			document.body.style.position = "";
			document.body.style.opacity = "";
		};
	}, []);

	return <>{children}</>;
}
