/**
 * Session Replay Configuration
 *
 * Centralized configuration for session replay settings including
 * sampling rates, privacy controls, and budget management.
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const SESSION_REPLAY_CONFIG = {
	// Sampling rates by environment
	samplingRates: {
		development: 1.0, // 100% in dev for testing
		staging: 0.5, // 50% in staging
		production: 0.3, // 30% in production (balanced)
	},

	// Error session recording
	errorRecording: {
		enabled: true,
		samplingRate: 1.0, // Always record sessions with errors
	},

	// Plan-based sampling multipliers
	planMultipliers: {
		free: 1.0,
		pro: 2.0,
		team: 3.0,
		enterprise: 5.0,
	},

	// Engagement-based sampling
	engagementMultipliers: {
		low: 0.5, // < 25% engagement
		medium: 1.0, // 25-75% engagement
		high: 2.0, // > 75% engagement
		veryHigh: 3.0, // > 90% engagement
	},

	// Onboarding flow multiplier
	onboardingMultiplier: 5.0,

	// Privacy settings
	privacy: {
		// Default mask for sensitive elements
		defaultMaskSelector: '[data-private="true"],[data-testid="sensitive"]',

		// Always mask these elements
		forcedMaskSelectors: ['input[type="password"]', '[data-private="true"]'],

		// Never record these elements
		blockSelectors: ["video", "canvas", '[data-no-record="true"]'],

		// Mask all inputs by default
		maskAllInputs: true,

		// Mask all text content
		maskAllText: false,

		// Inline stylesheets for accurate recording
		inlineStylesheet: true,
	},

	// Budget management
	budget: {
		// Maximum session recordings per month
		maxSessions: {
			development: 1000,
			staging: 5000,
			production: 10000,
		},

		// Warning thresholds
		warningThreshold: 0.8, // 80% of budget
		criticalThreshold: 0.95, // 95% of budget

		// Auto-adjustment when approaching limits
		autoAdjust: true,
	},

	// Performance settings
	performance: {
		// Maximum recording duration (in minutes)
		maxDuration: 30,

		// Minimum interval between snapshots (ms)
		snapshotInterval: 500,

		// Compress recordings
		compress: true,
	},
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sampling rate for current environment
 */
export function getSamplingRateForEnvironment(environment: string = process.env.NODE_ENV || "production"): number {
	return (
		SESSION_REPLAY_CONFIG.samplingRates[environment as keyof typeof SESSION_REPLAY_CONFIG.samplingRates] ||
		SESSION_REPLAY_CONFIG.samplingRates.production
	);
}

/**
 * Get maximum sessions for current environment
 */
export function getMaxSessionsForEnvironment(environment: string = process.env.NODE_ENV || "production"): number {
	return (
		SESSION_REPLAY_CONFIG.budget.maxSessions[
			environment as keyof typeof SESSION_REPLAY_CONFIG.budget.maxSessions
		] || SESSION_REPLAY_CONFIG.budget.maxSessions.production
	);
}

/**
 * Get privacy configuration
 */
export function getPrivacyConfig() {
	return SESSION_REPLAY_CONFIG.privacy;
}

/**
 * Calculate effective sampling rate based on user context
 */
export function calculateEffectiveSamplingRate(
	environment: string = process.env.NODE_ENV || "production",
	plan = "free",
	isOnboarding = false,
	engagementScore = 0,
): number {
	let baseRate = getSamplingRateForEnvironment(environment);

	// Apply plan multiplier
	const planMultiplier =
		SESSION_REPLAY_CONFIG.planMultipliers[plan as keyof typeof SESSION_REPLAY_CONFIG.planMultipliers] || 1.0;
	baseRate *= planMultiplier;

	// Apply onboarding multiplier
	if (isOnboarding) {
		baseRate *= SESSION_REPLAY_CONFIG.onboardingMultiplier;
	}

	// Apply engagement multiplier
	let engagementMultiplier = 1.0;
	if (engagementScore > 90) {
		engagementMultiplier = SESSION_REPLAY_CONFIG.engagementMultipliers.veryHigh;
	} else if (engagementScore > 75) {
		engagementMultiplier = SESSION_REPLAY_CONFIG.engagementMultipliers.high;
	} else if (engagementScore > 25) {
		engagementMultiplier = SESSION_REPLAY_CONFIG.engagementMultipliers.medium;
	} else {
		engagementMultiplier = SESSION_REPLAY_CONFIG.engagementMultipliers.low;
	}
	baseRate *= engagementMultiplier;

	// Clamp to 0-1 range
	return Math.min(1.0, Math.max(0.0, baseRate));
}
