"use client";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

interface UseIntersectionObserverProps {
	threshold?: number | number[];
	root?: Element | null;
	rootMargin?: string;
	freezeOnceVisible?: boolean;
}

function useIntersectionObserver(
	elementRef: RefObject<Element>,
	options: UseIntersectionObserverProps = {},
): IntersectionObserverEntry | null {
	const { threshold = 0, root = null, rootMargin = "0%", freezeOnceVisible = false } = options;

	const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

	const frozen = entry?.isIntersecting && freezeOnceVisible;

	const updateEntry = useCallback(([entry]: IntersectionObserverEntry[]): void => {
		setEntry(entry || null);
	}, []);

	useEffect(() => {
		const node = elementRef?.current; // DOM node
		const hasIOSupport = !!window.IntersectionObserver;

		if (!hasIOSupport || frozen || !node) {
			return;
		}

		const observerParams = { threshold, root, rootMargin };
		const observer = new IntersectionObserver(updateEntry, observerParams);

		observer.observe(node);

		return () => observer.disconnect();
	}, [elementRef?.current, threshold, root, rootMargin, frozen, updateEntry]);

	return entry;
}

// Simplified hook for just checking visibility
export function useInView(options: UseIntersectionObserverProps = {}): [RefObject<HTMLDivElement>, boolean] {
	const ref = useRef<HTMLDivElement>(null);
	const entry = useIntersectionObserver(ref as RefObject<Element>, {
		threshold: 0.1,
		freezeOnceVisible: true,
		...options,
	});

	return [ref as RefObject<HTMLDivElement>, !!entry?.isIntersecting];
}

// Hook for scroll-triggered animations with progress
export function useScrollProgress(options: UseIntersectionObserverProps = {}): [RefObject<HTMLDivElement>, number] {
	const ref = useRef<HTMLDivElement>(null);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const node = ref.current;
		if (!node) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					const rect = entry.boundingClientRect;
					const windowHeight = window.innerHeight;
					const elementHeight = rect.height;

					// Calculate progress based on how much of the element is visible
					const visibleHeight = Math.min(windowHeight - Math.max(0, rect.top), elementHeight);
					const progressValue = Math.max(0, Math.min(1, visibleHeight / elementHeight));

					setProgress(progressValue);
				}
			},
			{
				threshold: Array.from({ length: 101 }, (_, i) => i / 100),
				...options,
			},
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [options]);

	return [ref as RefObject<HTMLDivElement>, progress];
}

export default useIntersectionObserver;
