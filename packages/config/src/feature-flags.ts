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
export const ENABLE_EXTENSION_AUTH = process.env.ENABLE_EXTENSION_AUTH === "true";

/**
 * API Key Authentication
 * Enables API key creation and Bearer token auth
 * Requires: argon2 or alternative hashing library resolved
 * @default false
 */
export const ENABLE_API_KEYS = process.env.ENABLE_API_KEYS === "true";

/**
 * Rate Limiting
 * Enables rate limit middleware for auth endpoints
 * @default false (disabled until type declarations fixed)
 */
export const ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING === "true";

/**
 * Intelligence Layer (Master Toggle)
 * Enables all intelligence layer features: trust calibration, pattern library, prediction engine
 * @default false (controlled rollout via PostHog)
 */
export const ENABLE_INTELLIGENCE_LAYER = process.env.ENABLE_INTELLIGENCE_LAYER === "true";

/**
 * Trust Calibration Engine
 * Enables momentum-based EWMA trust scoring for AI tools
 * Requires: ENABLE_INTELLIGENCE_LAYER = true
 * @default false
 */
export const ENABLE_TRUST_CALIBRATION = process.env.ENABLE_TRUST_CALIBRATION === "true";

/**
 * Pattern Library
 * Enables pgvector-powered pattern matching and similarity search
 * Requires: ENABLE_INTELLIGENCE_LAYER = true, pgvector extension in database
 * @default false
 */
export const ENABLE_PATTERN_LIBRARY = process.env.ENABLE_PATTERN_LIBRARY === "true";

/**
 * Prediction Engine
 * Enables tiered risk prediction (cache → heuristics → ML)
 * Requires: ENABLE_INTELLIGENCE_LAYER = true, ENABLE_PATTERN_LIBRARY = true
 * @default false
 */
export const ENABLE_PREDICTION_ENGINE = process.env.ENABLE_PREDICTION_ENGINE === "true";

/**
 * GitHub Integration
 * Enables GitHub App webhooks for ground truth AI contribution detection
 * Requires: GitHub App configured, webhook endpoint deployed
 * @default false
 */
export const ENABLE_GITHUB_INTEGRATION = process.env.ENABLE_GITHUB_INTEGRATION === "true";

/**
 * Feature flag configuration object
 */
export const featureFlags = {
	extensionAuth: ENABLE_EXTENSION_AUTH,
	apiKeys: ENABLE_API_KEYS,
	rateLimiting: ENABLE_RATE_LIMITING,

	// Intelligence Layer
	intelligenceLayer: ENABLE_INTELLIGENCE_LAYER,
	trustCalibration: ENABLE_TRUST_CALIBRATION,
	patternLibrary: ENABLE_PATTERN_LIBRARY,
	predictionEngine: ENABLE_PREDICTION_ENGINE,
	githubIntegration: ENABLE_GITHUB_INTEGRATION,
} as const;

export type FeatureFlags = typeof featureFlags;
