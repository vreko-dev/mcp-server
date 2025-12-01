/**
 * Analytics Module Exports
 *
 * Central export point for all analytics-related functionality
 */

// Analytics events - import directly from package source to avoid module resolution issues
export { type AnalyticsEvent, AnalyticsEvents } from "./events";

// Providers
export { AnalyticsScript, useAnalytics } from "./provider/posthog/index.js";
