/**
 * Capability Cache Metrics Reporter
 *
 * Reports capability cache hit/miss rates to PostHog every 5 minutes.
 * Part of Phase 2: MCP Server Integration + Metrics.
 *
 * @packageDocumentation
 */

import { getCacheMetrics, resetCacheMetrics } from "@snapback/platform/db/queries/capabilities";
import { captureEvent } from "../analytics/posthog.js";

// Metrics reporting interval: 5 minutes
const METRICS_INTERVAL_MS = 5 * 60 * 1000;

// Interval handle for cleanup
let metricsInterval: NodeJS.Timeout | null = null;

// Simple logger
const logger = {
	info: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL !== "silent") {
			console.log(`[INFO] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
	debug: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL === "debug") {
			console.log(`[DEBUG] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
};

/**
 * Report capability cache metrics to PostHog
 *
 * Called every 5 minutes by the interval timer.
 * Only reports if there were any cache operations in the period.
 */
async function reportCacheMetrics(): Promise<void> {
	const metrics = getCacheMetrics();
	const total = metrics.hits + metrics.misses;

	// Only report if there were cache operations
	if (total === 0) {
		logger.debug("No cache operations in period, skipping metrics report");
		return;
	}

	await captureEvent("system", "capability_cache_metrics", {
		cache_hits: metrics.hits,
		cache_misses: metrics.misses,
		cache_hit_rate: metrics.hitRate,
		cache_total_ops: total,
		reporting_period_ms: METRICS_INTERVAL_MS,
	});

	logger.info("Reported capability cache metrics", {
		hits: metrics.hits,
		misses: metrics.misses,
		hitRate: `${(metrics.hitRate * 100).toFixed(1)}%`,
	});

	// Reset counters for next period
	resetCacheMetrics();
}

/**
 * Start capability metrics reporting
 *
 * Call once during server startup.
 * Reports cache hit/miss rates to PostHog every 5 minutes.
 */
export function startCapabilityMetricsReporting(): void {
	if (metricsInterval) {
		logger.debug("Capability metrics reporting already started");
		return;
	}

	metricsInterval = setInterval(() => {
		reportCacheMetrics().catch((error) => {
			console.error("[ERROR] Failed to report capability metrics:", error);
		});
	}, METRICS_INTERVAL_MS);

	// Don't block server shutdown
	metricsInterval.unref();

	logger.info("Started capability metrics reporting", {
		intervalMs: METRICS_INTERVAL_MS,
	});
}

/**
 * Stop capability metrics reporting
 *
 * Call during graceful shutdown.
 */
export function stopCapabilityMetricsReporting(): void {
	if (metricsInterval) {
		clearInterval(metricsInterval);
		metricsInterval = null;
		logger.info("Stopped capability metrics reporting");
	}
}

/**
 * Flush final metrics report before shutdown
 *
 * Call during graceful shutdown to capture any remaining metrics.
 */
export async function flushCapabilityMetrics(): Promise<void> {
	await reportCacheMetrics();
}
