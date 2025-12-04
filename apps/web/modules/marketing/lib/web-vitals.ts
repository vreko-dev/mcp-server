// Simplified Web Vitals monitoring without external dependencies
// Will be enhanced when web-vitals package is properly installed

// Core Web Vitals thresholds (Google recommendations)
const THRESHOLDS = {
	LCP: { good: 2500, needsImprovement: 4000 },
	FID: { good: 100, needsImprovement: 300 },
	INP: { good: 200, needsImprovement: 500 },
	CLS: { good: 0.1, needsImprovement: 0.25 },
	FCP: { good: 1800, needsImprovement: 3000 },
	TTFB: { good: 800, needsImprovement: 1800 },
} as const;

type VitalName = keyof typeof THRESHOLDS;
type VitalRating = "good" | "needs-improvement" | "poor";

interface BasicMetric {
	name: string;
	value: number;
	id: string;
	delta?: number;
	navigationType?: string;
	timestamp: number;
}

interface VitalReport extends BasicMetric {
	rating: VitalRating;
	threshold: (typeof THRESHOLDS)[VitalName];
}

// Rate the vital based on thresholds
function rateVital(name: VitalName, value: number): VitalRating {
	const threshold = THRESHOLDS[name];
	if (value <= threshold.good) {
		return "good";
	}
	if (value <= threshold.needsImprovement) {
		return "needs-improvement";
	}
	return "poor";
}

// Enhanced metric reporting with ratings
function reportVital(metric: BasicMetric) {
	const vitalName = metric.name as VitalName;
	if (!THRESHOLDS[vitalName]) {
		return; // Skip unknown metrics
	}

	const rating = rateVital(vitalName, metric.value);
	const threshold = THRESHOLDS[vitalName];

	const report: VitalReport = {
		...metric,
		rating,
		threshold,
	};

	// Log to console in development
	if (process.env.NODE_ENV === "development") {
		const emoji =
			rating === "good" ? "✅" : rating === "needs-improvement" ? "⚠️" : "❌";
		console.group(
			`${emoji} ${vitalName}: ${metric.value.toFixed(2)}${
				vitalName === "CLS" ? "" : "ms"
			}`,
		);
		console.log(`Rating: ${rating}`);
		console.log(`Threshold: ${JSON.stringify(threshold)}`);
		console.log(`Full report: ${JSON.stringify(report)}`);
		console.groupEnd();
	}

	// Send to analytics in production
	if (process.env.NODE_ENV === "production") {
		sendToAnalytics(report);
	}
}

// Analytics reporting function
function sendToAnalytics(report: VitalReport) {
	// Prepare data for analytics
	const body = JSON.stringify({
		name: report.name,
		value: report.value,
		rating: report.rating,
		id: report.id,
		delta: report.delta,
		navigationType: report.navigationType,
		timestamp: report.timestamp,
		url: window.location.href,
		userAgent: navigator.userAgent,
	});

	// Try to send via sendBeacon first (more reliable)
	const vitalsUrl = "/api/web-vitals";

	if (navigator.sendBeacon) {
		navigator.sendBeacon(vitalsUrl, body);
	} else {
		// Fallback to fetch
		fetch(vitalsUrl, {
			body,
			method: "POST",
			keepalive: true,
			headers: {
				"Content-Type": "application/json",
			},
		}).catch(console.error);
	}
}

// Basic performance observer setup for Core Web Vitals
export function initWebVitals() {
	try {
		// LCP Observer
		const lcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			const lastEntry = entries[entries.length - 1];
			if (lastEntry) {
				reportVital({
					name: "LCP",
					value: lastEntry.startTime,
					id: Math.random().toString(36).substr(2, 9),
					timestamp: Date.now(),
				});
			}
		});
		lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

		// FCP Observer
		const fcpObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries();
			entries.forEach((entry) => {
				if (entry.name === "first-contentful-paint") {
					reportVital({
						name: "FCP",
						value: entry.startTime,
						id: Math.random().toString(36).substr(2, 9),
						timestamp: Date.now(),
					});
				}
			});
		});
		fcpObserver.observe({ entryTypes: ["paint"] });

		// CLS Observer
		let clsValue = 0;
		const clsObserver = new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries() as PerformanceEntry[];
			entries.forEach((entry: any) => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
				}
			});

			reportVital({
				name: "CLS",
				value: clsValue,
				id: Math.random().toString(36).substr(2, 9),
				timestamp: Date.now(),
			});
		});
		clsObserver.observe({ entryTypes: ["layout-shift"] });
	} catch (error) {
		console.error("Failed to initialize Web Vitals:", { error });
	}
}

// Performance debugging helper
export function debugPerformance() {
	if (process.env.NODE_ENV !== "development") {
		return;
	}

	// Log performance entries
	console.group("🔍 Performance Debug");

	// Navigation timing
	const navigation = performance.getEntriesByType(
		"navigation",
	)[0] as PerformanceNavigationTiming;
	if (navigation) {
		console.log("Navigation timing:");
		console.table({
			"DNS Lookup": `${(
				navigation.domainLookupEnd - navigation.domainLookupStart
			).toFixed(2)}ms`,
			Connection: `${(navigation.connectEnd - navigation.connectStart).toFixed(
				2,
			)}ms`,
			Request: `${(navigation.responseStart - navigation.requestStart).toFixed(
				2,
			)}ms`,
			Response: `${(navigation.responseEnd - navigation.responseStart).toFixed(
				2,
			)}ms`,
			"DOM Processing": `${(
				navigation.domComplete - navigation.responseEnd
			).toFixed(2)}ms`,
			"Load Event": `${(
				navigation.loadEventEnd - navigation.loadEventStart
			).toFixed(2)}ms`,
		});
	}

	// Resource timing for images
	const resources = performance.getEntriesByType(
		"resource",
	) as PerformanceResourceTiming[];
	const images = resources.filter((r) => r.initiatorType === "img");
	if (images.length > 0) {
		console.log("\nImage loading times:");
		console.table(
			images.map((img) => ({
				name: img.name.split("/").pop(),
				duration: `${img.duration.toFixed(2)}ms`,
				size: `${img.transferSize} bytes`,
			})),
		);
	}

	console.groupEnd();
}

// Export types for use in other files
export type { VitalReport, VitalRating, VitalName, BasicMetric };
