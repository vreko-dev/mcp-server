"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollState {
	velocity: number;
	position: number;
	target: number;
	isScrolling: boolean;
}

export function useSmoothScroll() {
	const [scrollState, setScrollState] = useState<ScrollState>({
		velocity: 0,
		position: 0,
		target: 0,
		isScrolling: false,
	});

	const [isMounted, setIsMounted] = useState(false);
	const rafRef = useRef<number | undefined>(undefined);
	const lastTimeRef = useRef<number>(0);
	const lastScrollRef = useRef<number>(0);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted) {
			return;
		}
		const handleScroll = () => {
			const currentScroll = window.scrollY;
			const currentTime = performance.now();

			// Calculate velocity (pixels per ms)
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

		const smoothScrollTo = (target: number) => {
			const start = window.scrollY;
			const distance = target - start;
			const duration = Math.min(Math.abs(distance) * 0.8, 1200); // More natural timing
			const startTime = performance.now();

			const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

			const animate = (currentTime: number) => {
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const easedProgress = easeOutCubic(progress);

				const currentPosition = start + distance * easedProgress;
				window.scrollTo(0, currentPosition);

				if (progress < 1) {
					rafRef.current = requestAnimationFrame(animate);
				}
			};

			rafRef.current = requestAnimationFrame(animate);
		};

		// Enhanced scroll behavior
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

		window.addEventListener("scroll", handleSmoothScroll, {
			passive: true,
		});

		// Custom smooth scroll for anchor links
		const handleAnchorClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const href =
				target.getAttribute("href") ||
				target.closest("a")?.getAttribute("href");

			if (href?.startsWith("#")) {
				e.preventDefault();
				const element = document.querySelector(href);
				if (element) {
					const rect = element.getBoundingClientRect();
					const targetPosition = window.scrollY + rect.top - 120; // Navbar offset
					smoothScrollTo(targetPosition);
				}
			}
		};

		// Scroll to hash on initial load and hash changes
		const scrollToHash = (hash?: string) => {
			const targetHash = hash || window.location.hash;
			if (targetHash.startsWith("#")) {
				const element = document.querySelector(targetHash);
				if (element) {
					const rect = element.getBoundingClientRect();
					const targetPosition = window.scrollY + rect.top - 120; // Navbar offset
					smoothScrollTo(targetPosition);
				}
			}
		};

		// Handle initial hash on page load
		if (window.location.hash) {
			// Delay to ensure page is fully rendered
			setTimeout(() => scrollToHash(), 100);
		}

		// Handle hash changes (browser back/forward, manual URL changes)
		const handleHashChange = () => {
			scrollToHash();
		};

		document.addEventListener("click", handleAnchorClick);
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("scroll", handleSmoothScroll);
			document.removeEventListener("click", handleAnchorClick);
			window.removeEventListener("hashchange", handleHashChange);
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	return scrollState;
}
