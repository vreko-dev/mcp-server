"use client";

import { useEffect } from "react";

const plausibleUrl = process.env.NEXT_PUBLIC_PLAUSIBLE_URL as string;

export function AnalyticsScript() {
	useEffect(() => {
		if (!plausibleUrl) return;

		const script = document.createElement("script");
		script.src = "https://plausible.io/js/script.js";
		script.async = true;
		script.setAttribute("data-domain", plausibleUrl);
		document.head.appendChild(script);

		return () => {
			const element = document.querySelector(
				'script[data-domain="' + plausibleUrl + '"]',
			);
			if (element) element.remove();
		};
	}, [plausibleUrl]);

	return null;
}

export function useAnalytics() {
	const trackEvent = (event: string, data?: Record<string, unknown>) => {
		if (typeof window === "undefined" || !(window as any).plausible) {
			return;
		}

		(window as any).plausible(event, {
			props: data,
		});
	};

	return {
		trackEvent,
	};
}
