/**
 * Device Trial Constants
 *
 * Centralized configuration for device trial operations.
 * All thresholds, limits, and durations defined here for easy adjustment.
 *
 * @module DEVICE_TRIAL_CONSTANTS
 * @package @snapback/core
 */

/**
 * Constants for device trials
 *
 * Organized by category:
 * - Quota limits: Anonymous and email-converted tier limits
 * - Abuse prevention: Install count restrictions and block duration
 * - Expiration: Trial lifecycle duration
 * - Validation: Fingerprint format constraints
 * - API key generation: Key format and length
 */
export const DEVICE_TRIAL_CONSTANTS = {
	// Quota limits (snapshots per trial stage)
	ANONYMOUS_SNAPSHOT_LIMIT: 50,
	ANONYMOUS_API_CALL_LIMIT: 10000,
	CONVERTED_SNAPSHOT_LIMIT: 1000,
	CONVERTED_API_CALL_LIMIT: 50000,

	// Abuse prevention
	// Max reinstalls allowed within 24h of creation
	MAX_INSTALLS_IN_24H: 3,
	// Duration to block device after exceeding install limit
	BLOCK_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours

	// Expiration
	TRIAL_EXPIRATION_DAYS: 30,
	TRIAL_EXPIRATION_MS: 30 * 24 * 60 * 60 * 1000,

	// Validation
	// Minimum fingerprint length (e.g., device hash)
	MIN_FINGERPRINT_LENGTH: 16,
	// Maximum fingerprint length (e.g., serialized device data)
	MAX_FINGERPRINT_LENGTH: 1024,

	// API key generation
	API_KEY_PREFIX: "snap",
	API_KEY_LENGTH: 32,
} as const;

/**
 * Type for accessing constant values
 * Useful for type-safe threshold checking
 */
export type DeviceTrialConstants = typeof DEVICE_TRIAL_CONSTANTS;
