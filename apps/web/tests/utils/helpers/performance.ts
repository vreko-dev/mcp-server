import type { Page } from "@playwright/test";

// Measure page load performance
export async function measurePageLoadPerformance(
	page: Page,
	url: string,
): Promise<{
	loadTime: number;
	domContentLoadedTime: number;
	firstPaintTime: number;
	firstContentfulPaintTime: number;
}> {
	// const _metricsBefore = await page.evaluate(() => ({ // TODO: Re-enable when detailed performance metrics are implemented
	// 	navigationStart: performance.timing.navigationStart,
	// }));

	await page.goto(url);

	const metrics = await page.evaluate(() => {
		// Get performance metrics
		const perf = performance.getEntriesByType(
			"navigation",
		)[0] as PerformanceNavigationTiming;

		return {
			loadTime: perf.loadEventEnd - perf.fetchStart,
			domContentLoadedTime: perf.domContentLoadedEventEnd - perf.fetchStart,
			firstPaintTime: performance.getEntriesByType("paint")[0]?.startTime || 0,
			firstContentfulPaintTime:
				performance.getEntriesByType("paint")[1]?.startTime || 0,
		};
	});

	return metrics;
}

// Check if page load time is within acceptable limits
export async function assertPageLoadTime(
	page: Page,
	url: string,
	maxLoadTime = 3000,
): Promise<void> {
	const metrics = await measurePageLoadPerformance(page, url);

	if (metrics.loadTime > maxLoadTime) {
		throw new Error(
			`Page load time ${metrics.loadTime}ms exceeds maximum ${maxLoadTime}ms`,
		);
	}
}

// Measure API response times
export async function measureApiResponseTime(
	page: Page,
	apiUrl: string,
): Promise<number> {
	const startTime = Date.now();

	// Make API request
	const response = await page.request.get(apiUrl);

	const endTime = Date.now();

	if (!response.ok()) {
		throw new Error(`API request failed with status ${response.status()}`);
	}

	return endTime - startTime;
}

// Check if API response time is within acceptable limits
export async function assertApiResponseTime(
	page: Page,
	apiUrl: string,
	maxResponseTime = 1000,
): Promise<void> {
	const responseTime = await measureApiResponseTime(page, apiUrl);

	if (responseTime > maxResponseTime) {
		throw new Error(
			`API response time ${responseTime}ms exceeds maximum ${maxResponseTime}ms`,
		);
	}
}

// Simulate network conditions
export async function simulateNetworkConditions(
	page: Page,
	conditions: "slow-3g" | "fast-3g" | "offline" | "custom",
): Promise<void> {
	switch (conditions) {
		case "slow-3g":
			await page.context().setOffline(false);
			// Simulate 3G network (0.4 Mbps down, 0.2 Mbps up, 400ms RTT)
			await page.context().setExtraHTTPHeaders({
				"x-simulate-network": "slow-3g",
			});
			break;

		case "fast-3g":
			await page.context().setOffline(false);
			// Simulate fast 3G network (1.6 Mbps down, 0.8 Mbps up, 150ms RTT)
			await page.context().setExtraHTTPHeaders({
				"x-simulate-network": "fast-3g",
			});
			break;

		case "offline":
			await page.context().setOffline(true);
			break;

		case "custom":
			// Custom network conditions would be set via browser context options
			break;
	}
}
