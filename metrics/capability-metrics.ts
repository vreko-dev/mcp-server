/**
 * Capability Cache Metrics Reporter
 *
 * Reports capability cache hit/miss rates to PostHog every 5 minutes.
 * Part of Phase 2: MCP Server Integration + Metrics.
 *
 * Metrics are collected by the API server (which owns the capability cache).
 * The MCP server fetches them via HTTP to preserve the zero-DB-import boundary.
 *
 * @packageDocumentation
 */

import { captureEvent } from "../analytics/posthog.js";
import { fetchWithPooling } from "../http-client.js";
import { logger } from "../utils/logger.js";

// Metrics reporting interval: 5 minutes
const METRICS_INTERVAL_MS = 5 * 60 * 1000;

// Interval handle for cleanup
let metricsInterval: NodeJS.Timeout | null = null;

// API base URL  -  same source of truth as index.ts
const API_URL = process.env.VREKO_API_URL || "https://api.vreko.dev";
// Internal service token for server-to-server calls (injected via env in production).
// Hard-fail on startup if missing  -  unauthenticated server-to-server calls are not allowed.
// Cast to string: TypeScript cannot narrow module-level const into function bodies;
// the guard below handles the undefined case at runtime.
const INTERNAL_API_KEY = process.env.VREKO_INTERNAL_API_KEY as string;
if (!INTERNAL_API_KEY) {
	throw new Error(
		"VREKO_INTERNAL_API_KEY is required. Set this environment variable before starting the MCP server.",
	);
}

/** Shape returned by GET /api/v1/capabilities/metrics */
interface CapabilityMetricsResponse {
	hits: number;
	misses: number;
	hitRate: number;
}

/**
 * Fetch capability cache metrics from the API server.
 *
 * The API endpoint snapshots the counters AND resets them atomically,
 * so each call covers exactly the period since the last call.
 * Returns null when the API is unavailable (soft failure  -  metrics are best-effort).
 */
async function fetchCacheMetrics(): Promise<CapabilityMetricsResponse | null> {
	try {
		const headers: Record<string, string> = {
			Accept: "application/json",
			"x-api-key": INTERNAL_API_KEY,
		};

		const res = await fetchWithPooling(`${API_URL}/api/v1/capabilities/metrics`, {
			method: "GET",
			headers,
		});

		if (!res.ok) {
			logger.debug("Capability metrics fetch returned non-OK status", { status: res.status });
			return null;
		}

		return (await res.json()) as CapabilityMetricsResponse;
	} catch (error) {
		logger.debug("Failed to fetch capability metrics from API", {
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Report capability cache metrics to PostHog
 *
 * Called every 5 minutes by the interval timer.
 * Only reports if there were any cache operations in the period.
 */
async function reportCacheMetrics(): Promise<void> {
	const metrics = await fetchCacheMetrics();

	// API unreachable  -  skip silently (metrics are best-effort)
	if (!metrics) {
		return;
	}

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
		reportCacheMetrics().catch((_error) => {
			/* interval errors are non-fatal */
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
