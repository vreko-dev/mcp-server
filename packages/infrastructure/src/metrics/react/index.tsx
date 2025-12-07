/**
 * React Integration for Analytics
 *
 * Provider and hooks for browser-side analytics in React applications.
 */

import type React from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { createBrowserAnalytics } from "../client";
import type { AnalyticsClient, BrowserAnalyticsConfig } from "../core/types";

// ============================================================================
// CONTEXT
// ============================================================================

const AnalyticsContext = createContext<AnalyticsClient | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export interface AnalyticsProviderProps extends BrowserAnalyticsConfig {
	children: React.ReactNode;
}

/**
 * Analytics Provider Component
 *
 * Wraps your application to provide analytics context to all child components.
 *
 * @example
 * ```tsx
 * import { AnalyticsProvider } from '@snapback/analytics/react';
 *
 * function App() {
 *   return (
 *     <AnalyticsProvider
 *       apiKey={import.meta.env.VITE_POSTHOG_KEY!}
 *       plan={user?.plan}
 *       environment="web"
 *       sessionRecording={{
 *         maskTextSelector: '.code-editor, .terminal',
 *       }}
 *     >
 *       <YourApp />
 *     </AnalyticsProvider>
 *   );
 * }
 * ```
 */
export function AnalyticsProvider({ children, ...config }: AnalyticsProviderProps) {
	const analytics = useMemo(() => createBrowserAnalytics(config), [config]);

	return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Use Analytics Hook
 *
 * Access the analytics client from any component within AnalyticsProvider.
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@snapback/analytics/react';
 * import { AnalyticsEvents } from '@snapback/analytics/events';
 *
 * function Dashboard() {
 *   const analytics = useAnalytics();
 *
 *   useEffect(() => {
 *     analytics.track(AnalyticsEvents.DASHBOARD_VIEWED, {
 *       view_duration_ms: 5000,
 *       checkpoint_count: 10,
 *     });
 *   }, []);
 *
 *   return <div>Dashboard</div>;
 * }
 * ```
 */
export function useAnalytics(): AnalyticsClient {
	const analytics = useContext(AnalyticsContext);

	if (!analytics) {
		throw new Error("useAnalytics must be used within an AnalyticsProvider");
	}

	return analytics;
}

/**
 * Use Analytics Event Hook
 *
 * Automatically track an event when component mounts.
 *
 * @example
 * ```tsx
 * import { useAnalyticsEvent } from '@snapback/analytics/react';
 * import { AnalyticsEvents } from '@snapback/analytics/events';
 *
 * function Dashboard() {
 *   useAnalyticsEvent(AnalyticsEvents.DASHBOARD_VIEWED, {
 *     view_duration_ms: 5000,
 *     checkpoint_count: 10,
 *   });
 *
 *   return <div>Dashboard</div>;
 * }
 * ```
 */
export function useAnalyticsEvent<E extends keyof import("../core/events").EventPropertiesMap>(
	event: E,
	properties: import("../core/events").EventPropertiesMap[E],
) {
	const analytics = useAnalytics();

	useEffect(() => {
		analytics.track(event, properties);
	}, [analytics, event, properties]);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AnalyticsEvents } from "../core/events";
export type { AnalyticsClient, BrowserAnalyticsConfig } from "../core/types";
