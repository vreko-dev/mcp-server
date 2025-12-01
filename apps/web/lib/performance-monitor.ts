// Performance monitoring utilities for SnapBack dashboard
import posthog from "posthog-js";

// Track component render times
export function trackRenderTime(componentName: string, renderTime: number) {
	if (typeof window !== "undefined" && posthog.__loaded) {
		posthog.capture("performance_metric", {
			component: componentName,
			metric: "render_time",
			value: renderTime,
		});
	}
}

// Track API response times
export function trackApiPerformance(
	endpoint: string,
	responseTime: number,
	statusCode: number,
) {
	if (typeof window !== "undefined" && posthog.__loaded) {
		posthog.capture("api_performance", {
			endpoint,
			response_time: responseTime,
			status_code: statusCode,
		});
	}
}

// Track user interactions
export function trackUserInteraction(action: string, component: string) {
	if (typeof window !== "undefined" && posthog.__loaded) {
		posthog.capture("user_interaction", {
			action,
			component,
		});
	}
}

// Memory usage tracking
export function trackMemoryUsage() {
	if (typeof window !== "undefined" && "memory" in performance) {
		// Type-safe access to Chrome-specific memory API
		const memory = (performance as any).memory;
		if (memory && posthog.__loaded) {
			posthog.capture("memory_usage", {
				used_mb: Math.round(memory.usedJSHeapSize / 1048576),
				total_mb: Math.round(memory.totalJSHeapSize / 1048576),
				limit_mb: Math.round(memory.jsHeapSizeLimit / 1048576),
			});
		}
	}
}

// FPS monitoring
export function monitorFPS(callback: (fps: number) => void) {
	let frameCount = 0;
	let lastTime = performance.now();

	function loop() {
		const now = performance.now();
		frameCount++;

		if (now - lastTime >= 1000) {
			const fps = Math.round((frameCount * 1000) / (now - lastTime));
			callback(fps);
			frameCount = 0;
			lastTime = now;
		}

		requestAnimationFrame(loop);
	}

	requestAnimationFrame(loop);
}
