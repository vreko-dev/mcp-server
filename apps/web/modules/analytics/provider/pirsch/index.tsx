"use client";

import { useEffect } from "react";

const pirschCode = process.env.NEXT_PUBLIC_PIRSCH_CODE as string;

export function AnalyticsScript() {
	useEffect(() => {
		if (!pirschCode) return;

		const script = document.createElement("script");
		script.src = "https://api.pirsch.io/pirsch-extended.js";
		script.id = "pirschextendedjs";
		script.async = true;
		script.setAttribute("data-code", pirschCode);
		document.head.appendChild(script);

		return () => {
			const element = document.getElementById("pirschextendedjs");
			if (element) element.remove();
		};
	}, [pirschCode]);

	return null;
}

export function useAnalytics() {
	const trackEvent = (event: string, data?: Record<string, unknown>) => {
		if (typeof window === "undefined" || !(window as any).pirsch) {
			return;
		}

		(window as any).pirsch(event, {
			meta: data,
		});
	};

	return {
		trackEvent,
	};
}
