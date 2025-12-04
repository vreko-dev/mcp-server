"use client";

import { useEffect } from "react";

const umamiTrackingId = process.env.NEXT_PUBLIC_UMAMI_TRACKING_ID as string;

export function AnalyticsScript() {
	useEffect(() => {
		if (!umamiTrackingId) return;

		const script = document.createElement("script");
		script.src = "https://analytics.eu.umami.is/script.js";
		script.async = true;
		script.setAttribute("data-website-id", umamiTrackingId);
		document.head.appendChild(script);

		return () => {
			const element = document.querySelector(
				`script[data-website-id="${umamiTrackingId}"]`,
			);
			if (element) element.remove();
		};
	}, [umamiTrackingId]);

	return null;
}

export function useAnalytics() {
	const trackEvent = (event: string, data?: Record<string, unknown>) => {
		if (typeof window === "undefined" || !(window as any).umami) {
			return;
		}

		(window as any).umami.track(event, {
			props: data,
		});
	};

	return {
		trackEvent,
	};
}
