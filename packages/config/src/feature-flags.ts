/**
 * Feature Flags
 *
 * Controls availability of features that are implemented but not ready for production.
 * Set environment variables to enable features when ready.
 */

/**
 * Extension Authentication
 * Enables VS Code extension auth endpoints (link token, exchange, refresh)
 * @default false
 */
export const ENABLE_EXTENSION_AUTH = process.env.ENABLE_EXTENSION_AUTH === 'true';

/**
 * API Key Authentication
 * Enables API key creation and Bearer token auth
 * Requires: argon2 or alternative hashing library resolved
 * @default false
 */
export const ENABLE_API_KEYS = process.env.ENABLE_API_KEYS === 'true';

/**
 * Rate Limiting
 * Enables rate limit middleware for auth endpoints
 * @default false (disabled until type declarations fixed)
 */
export const ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING === 'true';

/**
 * Feature flag configuration object
 */
export const featureFlags = {
	extensionAuth: ENABLE_EXTENSION_AUTH,
	apiKeys: ENABLE_API_KEYS,
	rateLimiting: ENABLE_RATE_LIMITING,
} as const;

export type FeatureFlags = typeof featureFlags;
