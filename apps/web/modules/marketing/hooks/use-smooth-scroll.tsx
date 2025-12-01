"use client";
import { useCallback, useEffect, useState } from "react";

interface UseSmoothScrollProps {
	offset?: number;
	duration?: number;
}

export function useSmoothScroll({
	offset = 80,
	duration = 1000,
}: UseSmoothScrollProps = {}) {
	const [activeSection, setActiveSection] = useState<string>("");

	// Smooth scroll to element
	const scrollTo = useCallback(
		(elementId: string) => {
			const element = document.getElementById(elementId);
			if (!element) {
				return;
			}

			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - offset;

			// Use smooth scrolling with custom implementation for better control
			const startPosition = window.pageYOffset;
			const distance = offsetPosition - startPosition;
			let startTime: number | null = null;

			function animation(currentTime: number) {
				if (startTime === null) {
					startTime = currentTime;
				}
				const timeElapsed = currentTime - startTime;
				const run = easeInOutCubic(
					timeElapsed,
					startPosition,
					distance,
					duration,
				);
				window.scrollTo(0, run);
				if (timeElapsed < duration) {
					requestAnimationFrame(animation);
				}
			}

			// Easing function for smooth animation
			function easeInOutCubic(t: number, b: number, c: number, d: number) {
				t /= d / 2;
				if (t < 1) {
					return (c / 2) * t * t * t + b;
				}
				t -= 2;
				return (c / 2) * (t * t * t + 2) + b;
			}

			requestAnimationFrame(animation);
		},
		[offset, duration],
	);

	// Track active section based on scroll position
	useEffect(() => {
		const handleScroll = () => {
			const sections = document.querySelectorAll("section[id]");
			const scrollPos = window.scrollY + offset + 100;

			sections.forEach((section) => {
				const element = section as HTMLElement;
				const sectionTop = element.offsetTop;
				const sectionHeight = element.offsetHeight;

				if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
					setActiveSection(element.id);
				}
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll(); // Check initial position

		return () => window.removeEventListener("scroll", handleScroll);
	}, [offset]);

	return {
		scrollTo,
		activeSection,
	};
}

// Hook for scroll progress
export function useScrollProgress() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const totalScroll = document.documentElement.scrollTop;
			const windowHeight =
				document.documentElement.scrollHeight -
				document.documentElement.clientHeight;
			const scroll = totalScroll / windowHeight;

			setProgress(scroll);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll(); // Check initial position

		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return progress;
}

// Hook for navigation-specific scroll functionality
export function useNavigationScroll() {
	const { scrollTo, activeSection } = useSmoothScroll();
	return { scrollTo, activeSection };
}

// Hook for scroll to top functionality
export function useScrollToTop() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsVisible(window.scrollY > 300);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const scrollToTop = useCallback(() => {
		window.scrollTo({
			top: 0,
			behavior: "smooth",
		});
	}, []);

	return {
		isVisible,
		scrollToTop,
	};
}

// Default export for easier importing
export default useScrollToTop;
