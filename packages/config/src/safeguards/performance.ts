/**
 * Safeguard 3: Performance Monitoring
 *
 * Per TDD_CORE.md: Detects config load performance degradation
 * Tracks metrics and alerts on slow operations (line 86: <1s for 10K+ entries)
 */

export interface PerformanceThresholds {
	fast: number; // < 100ms ✅
	slow: number; // 100-500ms ⚠️
	critical: number; // > 1000ms 🔴
}

export interface PerformanceMetrics {
	duration: number;
	label: string;
	timestamp: Date;
	threshold: "fast" | "slow" | "critical";
}

export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
	fast: 100,
	slow: 500,
	critical: 1000,
};

/**
 * Monitor config load performance
 * Ensures migrations complete in <1s for 10K+ entries (TDD_CORE.md line 86)
 */
export class ConfigLoadPerformanceMonitor {
	private metrics: PerformanceMetrics[] = [];
	private readonly maxMetrics = 1000; // Keep last 1000 measurements

	/**
	 * Measure operation duration and classify performance
	 */
	async measureConfigLoad<T>(
		fn: () => Promise<T>,
		label: string,
	): Promise<{ result: T; duration: number; threshold: "fast" | "slow" | "critical" }> {
		const start = Date.now();
		const result = await fn();
		const duration = Date.now() - start;

		// Classify performance
		let threshold: "fast" | "slow" | "critical" = "fast";
		if (duration > PERFORMANCE_THRESHOLDS.critical) {
			threshold = "critical";
		} else if (duration > PERFORMANCE_THRESHOLDS.slow) {
			threshold = "slow";
		}

		// Record metric
		this.recordMetric({
			duration,
			label,
			timestamp: new Date(),
			threshold,
		});

		// Log if slow or critical
		if (threshold !== "fast") {
			const icon = threshold === "critical" ? "🔴" : "⚠️";
			console.warn(`[Performance] ${icon} Slow operation: ${label} (${duration}ms)`);
		}

		return { result, duration, threshold };
	}

	/**
	 * Synchronous operation measurement (for simpler operations)
	 */
	measureSync<T>(fn: () => T, label: string): { result: T; duration: number } {
		const start = Date.now();
		const result = fn();
		const duration = Date.now() - start;

		// Log if slow
		if (duration > PERFORMANCE_THRESHOLDS.slow) {
			console.warn(`[Performance] ⚠️  Slow operation: ${label} (${duration}ms)`);
		}

		return { result, duration };
	}

	/**
	 * Record performance metric (circular buffer)
	 */
	private recordMetric(metric: PerformanceMetrics): void {
		this.metrics.push(metric);

		// Keep circular buffer size under control
		if (this.metrics.length > this.maxMetrics) {
			this.metrics.shift();
		}
	}

	/**
	 * Get performance statistics
	 */
	getStats(): {
		total: number;
		average: number;
		min: number;
		max: number;
		p95: number;
		p99: number;
		slowCount: number;
		criticalCount: number;
	} {
		if (this.metrics.length === 0) {
			return {
				total: 0,
				average: 0,
				min: 0,
				max: 0,
				p95: 0,
				p99: 0,
				slowCount: 0,
				criticalCount: 0,
			};
		}

		const durations = this.metrics.map((m) => m.duration).sort((a, b) => a - b);
		const total = durations.length;
		const sum = durations.reduce((a, b) => a + b, 0);
		const average = sum / total;

		// Percentiles
		const p95Index = Math.floor(total * 0.95);
		const p99Index = Math.floor(total * 0.99);

		const slowCount = this.metrics.filter((m) => m.threshold === "slow").length;
		const criticalCount = this.metrics.filter((m) => m.threshold === "critical").length;

		return {
			total,
			average: Math.round(average),
			min: durations[0],
			max: durations[total - 1],
			p95: durations[p95Index],
			p99: durations[p99Index],
			slowCount,
			criticalCount,
		};
	}

	/**
	 * Check if performance is within acceptable bounds
	 */
	isHealthy(): boolean {
		const stats = this.getStats();

		// Fail if p99 exceeds critical threshold or >50% slow
		return stats.p99 < PERFORMANCE_THRESHOLDS.critical && stats.slowCount / stats.total < 0.5;
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics = [];
	}
}
