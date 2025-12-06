/**
 * @snapback/analytics
 *
 * Type-safe analytics package with PostHog integration.
 *
 * ## Installation
 *
 * ```bash
 * pnpm add @snapback/analytics
 * ```
 *
 * ## Usage
 *
 * ### Server-side (Node.js)
 * ```typescript
 * import { createServerAnalytics, AnalyticsEvents } from '@snapback/analytics/server';
 *
 * const analytics = createServerAnalytics({
 *   apiKey: process.env.POSTHOG_API_KEY!,
 * });
 *
 * analytics.track(AnalyticsEvents.SNAPSHOT_CREATED, {
 *   snapshot_id: 'snap_123',
 *   branch_name: 'main',
 *   file_count: 10,
 *   size_bytes: 1024,
 * });
 *
 * // IMPORTANT: Always shutdown on process exit
 * process.on('SIGTERM', () => analytics.shutdown());
 * ```
 *
 * ### Browser-side
 * ```typescript
 * import { createBrowserAnalytics, AnalyticsEvents } from '@snapback/analytics/client';
 *
 * const analytics = createBrowserAnalytics({
 *   apiKey: import.meta.env.VITE_POSTHOG_KEY!,
 * });
 *
 * analytics.track(AnalyticsEvents.DASHBOARD_VIEWED, {
 *   view_duration_ms: 5000,
 *   snapshot_count: 10,
 * });
 * ```
 *
 * ### React
 * ```tsx
 * import { AnalyticsProvider, useAnalytics } from '@snapback/analytics/react';
 *
 * function App() {
 *   return (
 *     <AnalyticsProvider apiKey={import.meta.env.VITE_POSTHOG_KEY!}>
 *       <Dashboard />
 *     </AnalyticsProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const analytics = useAnalytics();
 *   // Use analytics client
 * }
 * ```
 */

// ============================================================================
// SAFE SHARED EXPORTS
// These can be imported in any environment (server/browser)
// ============================================================================

export type { EventPropertiesMap } from "./core/events";
export { AnalyticsEvents } from "./core/events";
export type {
	AnalyticsClient,
	BrowserAnalyticsConfig,
	GroupProperties,
	ServerAnalyticsConfig,
	UserTraits,
} from "./core/types";

// ============================================================================
// IMPORTANT: Environment-specific imports
// ============================================================================
// For server-side: import from '@snapback/analytics/server'
// For browser-side: import from '@snapback/analytics/client'
// For React: import from '@snapback/analytics/react'
// For testing: import from '@snapback/analytics/test-utils'
