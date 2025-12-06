// SEO Tracking System - SnapBack Marketing
// Comprehensive SEO metrics tracking with Core Web Vitals integration

import type { CLSMetric, FCPMetric, INPMetric, LCPMetric, TTFBMetric } from "web-vitals";

// Network Information API types (not in standard DOM types)
interface NetworkInformation {
	effectiveType?: "2g" | "3g" | "4g" | "slow-2g";
	downlink?: number;
	rtt?: number;
	saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
	connection?: NetworkInformation;
}

interface SEOMetric {
	name: string;
	value: number | string;
	timestamp: number;
	url: string;
	sessionId: string;
}

interface ScrollMetric {
	depth: number;
	timestamp: number;
	url: string;
}

interface EngagementMetric {
	type: "scroll_depth" | "time_on_page" | "link_click" | "form_interaction";
	value: number | string;
	timestamp: number;
	url: string;
	element?: string;
}

// Global tracking state
let tracked: Record<string, boolean> = {};
let sessionId: string;
let pageStartTime: number;
let maxScrollDepth = 0;

// Initialize session tracking
function initializeSession() {
	if (typeof window === "undefined") {
		return;
	}

	sessionId = Math.random().toString(36).substr(2, 9);
	pageStartTime = Date.now();
	tracked = {};
	maxScrollDepth = 0;

	// Reset tracking state on page navigation
	window.addEventListener("beforeunload", () => {
		trackTimeOnPage();
	});
}

// Enhanced tracking function that integrates with analytics
function trackSEOEvent(eventName: string, data: unknown) {
	if (typeof window === "undefined") {
		return;
	}

	const metric: SEOMetric = {
		name: eventName,
		value:
			typeof data === "object" && data !== null
				? (() => {
						const objValue = (data as Record<string, unknown>).value;
						return typeof objValue === "string" || typeof objValue === "number"
							? objValue
							: JSON.stringify(data);
					})()
				: String(data),
		timestamp: Date.now(),
		url: window.location.href,
		sessionId: sessionId || "unknown",
	};

	// Send to analytics
	sendSEOMetric(metric);

	// Log in development
	if (process.env.NODE_ENV === "development") {
		console.log(`🔍 SEO Event: ${eventName} - ${JSON.stringify(data)}`);
	}
}

// Core Web Vitals tracking with enhanced reporting
export const trackSEOMetrics = () => {
	if (typeof window === "undefined") {
		return;
	}

	initializeSession();

	// Core Web Vitals with web-vitals library
	try {
		import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
			onCLS((metric: CLSMetric) => trackSEOEvent("CLS", metric));
			onFCP((metric: FCPMetric) => trackSEOEvent("FCP", metric));
			onLCP((metric: LCPMetric) => trackSEOEvent("LCP", metric));
			onTTFB((metric: TTFBMetric) => trackSEOEvent("TTFB", metric));
			onINP((metric: INPMetric) => trackSEOEvent("INP", metric));
		});
	} catch (error) {
		console.warn("Web Vitals not available", { error });
	}

	// Engagement metrics
	setupScrollTracking();
	setupLinkTracking();
	setupFormTracking();
	setupVisibilityTracking();
};

// Enhanced scroll depth tracking
function setupScrollTracking() {
	if (typeof window === "undefined") {
		return;
	}

	const trackScrollDepth = () => {
		const winHeight = window.innerHeight;
		const docHeight = document.documentElement.scrollHeight;
		const scrollTop = window.scrollY;
		const scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);

		// Update max scroll depth
		maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);

		// Track milestone scroll depths
		const milestones = [25, 50, 75, 90, 100];

		for (const milestone of milestones) {
			if (scrollPercent >= milestone && !tracked[`scroll_${milestone}`]) {
				trackSEOEvent("scroll_depth", {
					depth: milestone,
					maxDepth: maxScrollDepth,
					timeToReach: Date.now() - pageStartTime,
				});
				tracked[`scroll_${milestone}`] = true;
			}
		}
	};

	// Throttle scroll tracking
	let scrollTimeout: NodeJS.Timeout;
	window.addEventListener(
		"scroll",
		() => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(trackScrollDepth, 100);
		},
		{ passive: true },
	);
}

// Link click tracking for internal navigation and external links
function setupLinkTracking() {
	if (typeof window === "undefined") {
		return;
	}

	document.addEventListener("click", (event) => {
		const target = event.target as HTMLElement;
		const link = target.closest("a");

		if (link?.href) {
			const isExternal = !link.href.startsWith(window.location.origin);

			trackSEOEvent("link_click", {
				type: isExternal ? "external" : "internal",
				href: link.href,
				text: link.textContent?.trim().substring(0, 50),
				timeOnPageBeforeClick: Date.now() - pageStartTime,
			});
		}
	});
}

// Form interaction tracking
function setupFormTracking() {
	if (typeof window === "undefined") {
		return;
	}

	// Track form starts (first interaction)
	document.addEventListener("focusin", (event) => {
		const target = event.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
			const form = target.closest("form");
			if (form && !tracked[`form_start_${form.id || "unnamed"}`]) {
				trackSEOEvent("form_start", {
					formId: form.id || "unnamed",
					fieldType: target.tagName.toLowerCase(),
					timeToStart: Date.now() - pageStartTime,
				});
				tracked[`form_start_${form.id || "unnamed"}`] = true;
			}
		}
	});

	// Track form submissions
	document.addEventListener("submit", (event) => {
		const form = event.target as HTMLFormElement;
		trackSEOEvent("form_submit", {
			formId: form.id || "unnamed",
			action: form.action,
			method: form.method,
			timeToSubmit: Date.now() - pageStartTime,
		});
	});
}

// Page visibility tracking for engagement
function setupVisibilityTracking() {
	if (typeof window === "undefined") {
		return;
	}

	let visibilityStartTime = Date.now();
	let totalVisibleTime = 0;

	const handleVisibilityChange = () => {
		if (document.hidden) {
			// Page became hidden
			totalVisibleTime += Date.now() - visibilityStartTime;
			trackSEOEvent("page_visibility", {
				type: "hidden",
				visibleTime: totalVisibleTime,
				totalTime: Date.now() - pageStartTime,
			});
		} else {
			// Page became visible
			visibilityStartTime = Date.now();
			trackSEOEvent("page_visibility", {
				type: "visible",
				totalVisibleTime: totalVisibleTime,
			});
		}
	};

	document.addEventListener("visibilitychange", handleVisibilityChange);
}

// Track time on page before leaving
function trackTimeOnPage() {
	const timeOnPage = Date.now() - pageStartTime;

	trackSEOEvent("time_on_page", {
		duration: timeOnPage,
		maxScrollDepth: maxScrollDepth,
		url: window.location.href,
	});
}

// Send metrics to analytics endpoint
function sendSEOMetric(metric: SEOMetric) {
	if (typeof window === "undefined") {
		return;
	}

	const body = JSON.stringify({
		...metric,
		userAgent: navigator.userAgent,
		viewport: {
			width: window.innerWidth,
			height: window.innerHeight,
		},
		connection: (navigator as NavigatorWithConnection).connection
			? {
					effectiveType: (navigator as NavigatorWithConnection).connection?.effectiveType,
					downlink: (navigator as NavigatorWithConnection).connection?.downlink,
				}
			: null,
	});

	const endpoint = "/api/seo-analytics";

	// Use sendBeacon for reliability, fallback to fetch
	if (navigator.sendBeacon) {
		navigator.sendBeacon(endpoint, body);
	} else {
		fetch(endpoint, {
			method: "POST",
			body,
			keepalive: true,
			headers: {
				"Content-Type": "application/json",
			},
		}).catch((error) => {
			console.error("Failed to send SEO metric:", { error });
		});
	}
}

// Enhanced performance tracking with SEO focus
export function trackSEOPerformance() {
	if (typeof window === "undefined") {
		return;
	}

	// Track key performance metrics that affect SEO
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			if (entry.entryType === "navigation") {
				const nav = entry as PerformanceNavigationTiming;

				// Track navigation timing that affects SEO
				trackSEOEvent("navigation_timing", {
					dns: nav.domainLookupEnd - nav.domainLookupStart,
					connection: nav.connectEnd - nav.connectStart,
					request: nav.responseStart - nav.requestStart,
					response: nav.responseEnd - nav.responseStart,
					domProcessing: nav.domComplete - nav.responseEnd,
					loadComplete: nav.loadEventEnd - nav.loadEventStart,
				});
			}

			if (entry.entryType === "resource") {
				const resource = entry as PerformanceResourceTiming;

				// Track slow resources that might affect SEO
				if (resource.duration > 1000) {
					// Resources taking over 1 second
					trackSEOEvent("slow_resource", {
						name: resource.name,
						duration: resource.duration,
						size: resource.transferSize,
						type: resource.initiatorType,
					});
				}
			}
		}
	});

	observer.observe({ entryTypes: ["navigation", "resource"] });
}

// Initialize all SEO tracking
export function initializeSEOTracking() {
	if (typeof window === "undefined") {
		return;
	}

	// Wait for page to be ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			trackSEOMetrics();
			trackSEOPerformance();
		});
	} else {
		trackSEOMetrics();
		trackSEOPerformance();
	}
}

// Export types for TypeScript support
export type { SEOMetric, ScrollMetric, EngagementMetric };
