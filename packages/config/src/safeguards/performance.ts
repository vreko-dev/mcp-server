/**
 * Safeguard 3: Performance Monitoring
 *
 * Per TDD_CORE.md: Detects config load performance degradation
 * Tracks metrics and alerts on slow operations
 */

export interface PerformanceThresholds {
	fast: number; // < 100ms ✅
	slow: number; // 100-500ms ⚠️
	critical: number; // > 1000ms 🔴
}

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
	fast: 100,
	slow: 500,
	critical: 1000,
};

/**
 * Monitor config load performance
 */
export class ConfigLoadPerformanceMonitor {
	async measureConfigLoad<T>(fn: () => Promise<T>, label: string): Promise<{ result: T; duration: number }> {
		const start = Date.now();
		const result = await fn();
		const duration = Date.now() - start;

		// Log if slow
		if (duration > PERFORMANCE_THRESHOLDS.slow) {
			console.warn(`[Performance] Slow operation: ${label} (${duration}ms)`);
		}

		return { result, duration };
	}
}
