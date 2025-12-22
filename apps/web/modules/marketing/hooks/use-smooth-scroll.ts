"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll state tracking (velocity, position, etc.)
 */
interface ScrollState {
	velocity: number;
	position: number;
	target: number;
	isScrolling: boolean;
}

/**
 * Configuration for smooth scroll behavior
 */
interface UseSmoothScrollProps {
	offset?: number;
	duration?: number;
}

/**
 * Core smooth scroll hook with velocity tracking and hash anchor support
 * Combines velocity tracking + section tracking + anchor navigation
 */
export function useSmoothScroll({ offset = 80, duration = 1000 }: UseSmoothScrollProps = {}) {
	const [scrollState, setScrollState] = useState<ScrollState>({
		velocity: 0,
		position: 0,
		target: 0,
		isScrolling: false,
	});

	const [activeSection, setActiveSection] = useState<string>("");
	const [isMounted, setIsMounted] = useState(false);
	const lastTimeRef = useRef<number>(0);
	const lastScrollRef = useRef<number>(0);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Smooth scroll to element by ID
	const scrollTo = useCallback(
		(elementId: string) => {
			const element = document.getElementById(elementId);
			if (!element) {
				return;
			}

			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - offset;

			const startPosition = window.pageYOffset;
			const distance = offsetPosition - startPosition;
			let startTime: number | null = null;

			function animation(currentTime: number) {
				if (startTime === null) {
					startTime = currentTime;
				}
				const timeElapsed = currentTime - startTime;
				const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
				window.scrollTo(0, run);
				if (timeElapsed < duration) {
					requestAnimationFrame(animation);
				}
			}

			requestAnimationFrame(animation);
		},
		[offset, duration],
	);

	// Easing function for smooth animation
	const easeInOutCubic = useCallback((t: number, b: number, c: number, d: number) => {
		t /= d / 2;
		if (t < 1) {
			return (c / 2) * t * t * t + b;
		}
		t -= 2;
		return (c / 2) * (t * t * t + 2) + b;
	}, []);

	// Track scroll state and velocity
	useEffect(() => {
		if (!isMounted) {
			return;
		}

		const handleScroll = () => {
			const currentScroll = window.scrollY;
			const currentTime = performance.now();

			// Calculate velocity
			const timeDelta = currentTime - lastTimeRef.current;
			const scrollDelta = currentScroll - lastScrollRef.current;
			const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;

			setScrollState((prev) => ({
				...prev,
				position: currentScroll,
				velocity: Math.abs(velocity),
				isScrolling: Math.abs(velocity) > 0.1,
			}));

			lastTimeRef.current = currentTime;
			lastScrollRef.current = currentScroll;
		};

		let ticking = false;
		const handleSmoothScroll = () => {
			if (!ticking) {
				requestAnimationFrame(() => {
					handleScroll();
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener("scroll", handleSmoothScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleSmoothScroll);
	}, [isMounted]);

	// Track active section
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
		handleScroll();
		return () => window.removeEventListener("scroll", handleScroll);
	}, [offset]);

	// Anchor link handling
	useEffect(() => {
		const handleAnchorClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const href = target.getAttribute("href") || target.closest("a")?.getAttribute("href");

			if (href?.startsWith("#")) {
				e.preventDefault();
				scrollTo(href.slice(1));
			}
		};

		// Scroll to hash on initial load
		if (window.location.hash) {
			setTimeout(() => scrollTo(window.location.hash.slice(1)), 100);
		}

		const handleHashChange = () => {
			if (window.location.hash) {
				scrollTo(window.location.hash.slice(1));
			}
		};

		document.addEventListener("click", handleAnchorClick);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			document.removeEventListener("click", handleAnchorClick);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [scrollTo]);

	return {
		scrollTo,
		activeSection,
		...scrollState,
	};
}
