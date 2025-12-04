/**
 * Dashboard Metrics SDK Client (GREEN Phase Implementation)
 *
 * Provides a type-safe client for consuming dashboard metrics from the API.
 * Acts as a thin wrapper around the ORPC API client, enforcing package boundaries
 * and providing convenient methods for web app consumption.
 *
 * Usage:
 * ```typescript
 * import { createDashboardMetricsClient } from "@snapback/sdk";
 * import { orpcClient } from "@shared/lib/orpc-client";
 *
 * const client = createDashboardMetricsClient(orpcClient);
 * const result = await client.getDashboardMetrics();
 *
 * if (isDashboardMetrics(result)) {
 *   console.log("Total checkpoints:", result.total_checkpoints);
 * } else {
 *   console.error("Error:", result.code, result.message);
 * }
 * ```
 */

import type { DashboardMetricsResponse } from "@snapback/contracts";

/**
 * ORPC Client Interface
 * Minimal interface needed by SDK client to work with ORPC API
 */
export interface ORPCClient {
	dashboard: {
		getMetrics: () => Promise<DashboardMetricsResponse>;
	};
}

/**
 * Dashboard Metrics SDK Client Interface
 * Public API for consuming dashboard metrics
 */
export interface DashboardMetricsClient {
	/**
	 * Get aggregated dashboard metrics for the authenticated user
	 *
	 * Returns discriminated union:
	 * - Success: { protection_status, total_checkpoints, total_recoveries, ... }
	 * - Error: { error: true, code: "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR", message }
	 *
	 * @returns Promise<DashboardMetricsResponse>
	 * @throws Error if network request fails
	 *
	 * @example
	 * const result = await client.getDashboardMetrics();
	 * if (isDashboardMetrics(result)) {
	 *   // Success path - access metrics
	 *   console.log(result.protection_status);
	 * } else if (isDashboardMetricsError(result)) {
	 *   // Error path - access error details
	 *   console.error(result.code, result.message);
	 * }
	 */
	getDashboardMetrics(): Promise<DashboardMetricsResponse>;
}

/**
 * Create a dashboard metrics SDK client
 *
 * Factory function that creates a client instance from an ORPC client.
 * Enforces package boundaries: SDK clients delegate to ORPC, web apps use SDK clients,
 * preventing direct API imports from web app code.
 *
 * @param orpcClient - ORPC client with dashboard.getMetrics() method
 * @returns DashboardMetricsClient instance
 *
 * @example
 * import { createDashboardMetricsClient } from "@snapback/sdk";
 * import { orpcClient } from "@shared/lib/orpc-client";
 *
 * const dashboardClient = createDashboardMetricsClient(orpcClient);
 */
export function createDashboardMetricsClient(orpcClient: ORPCClient): DashboardMetricsClient {
	return {
		async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
			// Delegate to ORPC API client
			// ORPC client handles:
			// - Network communication to /api/rpc endpoint
			// - Response deserialization
			// - Authentication via cookies
			// - Error handling (throws on network/ORPC errors, returns error discriminant for business errors)
			return orpcClient.dashboard.getMetrics();
		},
	};
}
