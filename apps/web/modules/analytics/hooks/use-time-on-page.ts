"use client";

import { AnalyticsEvents } from "@analytics";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

export function useTimeOnPage(pageName: string) {
	const startTime = useRef<number>(Date.now());

	useEffect(() => {
		startTime.current = Date.now();

		const trackTime = () => {
			const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
			// Track at specific intervals: 10s, 30s, 60s, etc.
			const intervals = [10, 30, 60, 120, 300];

			if (intervals.includes(timeSpent)) {
				posthog.capture(AnalyticsEvents.TIME_ON_PAGE, {
					page: pageName,
					seconds: timeSpent,
				});
			}
		};

		const interval = setInterval(trackTime, 1000);

		return () => {
			clearInterval(interval);
			// Optional: Track total time on unmount
			const totalTime = Math.floor((Date.now() - startTime.current) / 1000);
			if (totalTime > 5) {
				posthog.capture(AnalyticsEvents.TIME_ON_PAGE, {
					page: pageName,
					seconds: totalTime,
					type: "exit",
				});
			}
		};
	}, [pageName]);
}
