// Database functions
// Note: These are SQL functions, not Drizzle ORM tables, so they're defined as types only

// Refresh all materialized views (run every 6-12 hours)
export type RefreshAnalyticsViewsFunction = () => void;

// Reset usage counters at billing period end (run daily)
export type ResetUsageCountersFunction = () => void;

// Aggregate daily stats (run nightly at 1 AM)
export type AggregateDailyStatsFunction = (targetDate?: Date) => void;

// Purge expired cache entries (run hourly)
export type PurgeExpiredCacheFunction = () => number; // Returns deleted count

// Close inactive extension sessions (run every 15 minutes)
export type CloseInactiveSessionsFunction = () => number; // Returns updated count

// Create next month's partitions (run monthly)
export type CreateNextPartitionFunction = () => void;
