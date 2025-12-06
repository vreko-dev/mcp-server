"use client";

import { AnalyticsEvents } from "@analytics";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

export function useScrollDepth(pageName: string) {
	const trackedDepths = useRef<Set<number>>(new Set());

	useEffect(() => {
		const handleScroll = () => {
			const scrollTop = window.scrollY;
			const docHeight = document.documentElement.scrollHeight - window.innerHeight;
			const scrollPercent = (scrollTop / docHeight) * 100;

			const depths = [25, 50, 75, 100];

			depths.forEach((depth) => {
				if (scrollPercent >= depth && !trackedDepths.current.has(depth)) {
					trackedDepths.current.add(depth);
					posthog.capture(AnalyticsEvents.SCROLL_DEPTH, {
						page: pageName,
						depth_percent: depth,
					});
				}
			});
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [pageName]);
}
