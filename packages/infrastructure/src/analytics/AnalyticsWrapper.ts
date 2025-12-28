/**
 * AnalyticsWrapper - Privacy-safe analytics abstraction
 *
 * Purpose:
 * - Centralize all analytics calls through a single interface
 * - Enforce privacy filtering before sending to PostHog
 * - Prevent accidental PII transmission
 * - Enable easy analytics provider switching
 *
 * Rules:
 * - NEVER call posthog.capture() directly in application code
 * - ALWAYS use AnalyticsWrapper.track() instead
 * - ALL event properties are filtered through privacy gate
 * - File paths, emails, and PII are automatically scrubbed
 */

import type { PostHog } from "posthog-node";
import { logger } from "../logging/logger";

/**
 * Event name constant following PostHog category:object_action convention
 * Matches schema in @snapback/contracts/events/accountability
 */
const SESSION_FEEDBACK_EVENT = "session:feedback_submitted" as const;

/**
 * Perceived help values matching @snapback/contracts/events/accountability
 */
export type PerceivedHelp = "significantly" | "somewhat" | "not_really" | "blocked";

/**
 * Accountability effect data for session feedback tracking
 * Matches schema in @snapback/contracts/events/accountability
 */
export interface AccountabilityEffectData {
	/** Session identifier */
	session_id: string;
	/** Session duration in milliseconds */
	session_duration_ms: number;
	/** User's perception of how much SnapBack helped */
	perceived_help: PerceivedHelp;
	/** Actual changes made during the session */
	actual_changes: {
		files_modified: number;
		lines_added: number;
		lines_removed: number;
		snapshots_used: number;
	};
	/** Issues prevented by SnapBack */
	prevented_issues: {
		rollbacks_avoided: number;
		pattern_violations_caught: number;
		skipped_tests_flagged: number;
	};
	/** User's subscription tier */
	tier: string;
}

/**
 * Privacy-filtered event properties
 */
export interface SafeEventProperties {
	// Event metadata (safe)
	event_id?: string;
	timestamp?: number;
	session_id?: string;

	// User context (non-PII)
	user_tier?: "free" | "solo" | "team" | "enterprise";
	org_tier?: "free" | "solo" | "team" | "enterprise";
	environment?: "production" | "staging" | "development";

	// Feature usage (counts and durations only)
	feature?: string;
	action?: string;
	success?: boolean;
	duration_ms?: number;
	count?: number;
	size_bytes?: number;

	// Performance (aggregates only)
	response_time_ms?: number;
	memory_usage_mb?: number;

	// Platform (safe)
	platform?: "vscode" | "web" | "cli" | "api";
	version?: string;
	ide_version?: string;

	// Error context (sanitized messages only)
	error_type?: string;
	error_code?: string;

	// Custom properties (must be safe)
	[key: string]: string | number | boolean | undefined;
}

/**
 * Blocked patterns that indicate PII
 */
const PII_PATTERNS = [
	// Email patterns
	/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
	/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,

	// File paths (absolute)
	/\/Users\/[^/]+/,
	/\/home\/[^/]+/,
	/C:\\Users\\[^\\]+/,
	/\/mnt\//,
	/\/var\//,

	// IP addresses
	/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,

	// Phone numbers
	/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,

	// Social Security Numbers
	/\b\d{3}-\d{2}-\d{4}\b/,

	// Credit cards
	/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,

	// API keys and tokens (common patterns)
	/sk_live_[a-zA-Z0-9]{24,}/,
	/pk_live_[a-zA-Z0-9]{24,}/,
	/ghp_[a-zA-Z0-9]{36}/,
	/glpat-[a-zA-Z0-9_-]{20}/,
];

/**
 * Properties that should never be transmitted
 */
const BLOCKED_PROPERTIES = new Set([
	"email",
	"password",
	"token",
	"api_key",
	"secret",
	"filepath",
	"file_path",
	"absolute_path",
	"workspace_path",
	"username",
	"user_name",
	"full_name",
	"address",
	"phone",
	"ssn",
	"credit_card",
	"ip_address",
	"device_id",
	"fingerprint",
]);

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
	/** PostHog client (optional, for server-side) */
	posthog?: PostHog;

	/** User tier for consent checking */
	tier?: "free" | "solo" | "team" | "enterprise";

	/** Analytics consent (required for Solo+ tiers) */
	consent?: boolean;

	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Privacy-safe analytics wrapper
 */
export class AnalyticsWrapper {
	private posthog?: PostHog;
	private tier: "free" | "solo" | "team" | "enterprise";
	private consent: boolean;
	private debug: boolean;

	constructor(config: AnalyticsConfig = {}) {
		this.posthog = config.posthog;
		this.tier = config.tier ?? "free";
		this.consent = config.consent ?? false;
		this.debug = config.debug ?? false;
	}

	/**
	 * Track an event with privacy filtering
	 */
	track(eventName: string, properties: SafeEventProperties = {}, distinctId?: string): void {
		// Free tier: local-only (no transmission)
		if (this.tier === "free") {
			if (this.debug) {
				logger.info("[Analytics] Free tier - event not transmitted", {
					event: eventName,
					properties,
				});
			}
			return;
		}

		// Solo+ tier: require explicit consent
		if (!this.consent) {
			if (this.debug) {
				logger.info("[Analytics] No consent - event not transmitted", {
					event: eventName,
				});
			}
			return;
		}

		// Filter properties through privacy gate
		const safeProperties = this.filterProperties(properties);

		// Transmit to PostHog
		if (this.posthog) {
			try {
				this.posthog.capture({
					distinctId: distinctId ?? "anonymous",
					event: eventName,
					properties: safeProperties,
				});

				if (this.debug) {
					logger.info("[Analytics] Event tracked", {
						event: eventName,
						distinctId,
						properties: safeProperties,
					});
				}
			} catch (error) {
				logger.error("[Analytics] Failed to track event", error as Error);
			}
		} else if (this.debug) {
			logger.info("[Analytics] No PostHog client - event logged only", {
				event: eventName,
				properties: safeProperties,
			});
		}
	}

	/**
	 * Filter properties through privacy gate
	 */
	private filterProperties(properties: SafeEventProperties): Record<string, unknown> {
		const filtered: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(properties)) {
			// Skip blocked property names
			if (BLOCKED_PROPERTIES.has(key.toLowerCase())) {
				if (this.debug) {
					logger.warn("[Analytics] Blocked property name", { key });
				}
				continue;
			}

			// Skip undefined/null values
			if (value === undefined || value === null) {
				continue;
			}

			// Convert value to string for pattern matching
			const valueStr = String(value);

			// Check for PII patterns
			let containsPII = false;
			for (const pattern of PII_PATTERNS) {
				if (pattern.test(valueStr)) {
					containsPII = true;
					if (this.debug) {
						logger.warn("[Analytics] Blocked PII pattern", {
							key,
							pattern: pattern.source,
						});
					}
					break;
				}
			}

			if (!containsPII) {
				filtered[key] = value;
			}
		}

		return filtered;
	}

	/**
	 * Identify a user (Solo+ tier only)
	 */
	identify(userId: string, traits: Record<string, unknown> = {}): void {
		// Free tier: no user identification
		if (this.tier === "free") {
			if (this.debug) {
				logger.info("[Analytics] Free tier - identify not transmitted");
			}
			return;
		}

		// Require consent
		if (!this.consent) {
			if (this.debug) {
				logger.info("[Analytics] No consent - identify not transmitted");
			}
			return;
		}

		// Filter traits
		const safeTraits = this.filterProperties(traits as SafeEventProperties);

		if (this.posthog) {
			try {
				this.posthog.identify({
					distinctId: userId,
					properties: safeTraits,
				});

				if (this.debug) {
					logger.info("[Analytics] User identified", {
						userId,
						traits: safeTraits,
					});
				}
			} catch (error) {
				logger.error("[Analytics] Failed to identify user", error as Error);
			}
		}
	}

	/**
	 * Track accountability effect event
	 * Used for session feedback to measure perception vs reality of SnapBack's value
	 */
	trackAccountability(data: AccountabilityEffectData, distinctId?: string): void {
		// Free tier: local-only (no transmission)
		if (this.tier === "free") {
			if (this.debug) {
				logger.info("[Analytics] Free tier - accountability event not transmitted", {
					session_id: data.session_id,
				});
			}
			return;
		}

		// Solo+ tier: require explicit consent
		if (!this.consent) {
			if (this.debug) {
				logger.info("[Analytics] No consent - accountability event not transmitted", {
					session_id: data.session_id,
				});
			}
			return;
		}

		// Flatten the nested structure for PostHog properties
		const properties: Record<string, unknown> = {
			session_id: data.session_id,
			session_duration_ms: data.session_duration_ms,
			perceived_help: data.perceived_help,
			// Flatten actual_changes
			files_modified: data.actual_changes.files_modified,
			lines_added: data.actual_changes.lines_added,
			lines_removed: data.actual_changes.lines_removed,
			snapshots_used: data.actual_changes.snapshots_used,
			// Flatten prevented_issues
			rollbacks_avoided: data.prevented_issues.rollbacks_avoided,
			pattern_violations_caught: data.prevented_issues.pattern_violations_caught,
			skipped_tests_flagged: data.prevented_issues.skipped_tests_flagged,
			// Tier
			tier: data.tier,
		};

		// Transmit to PostHog
		if (this.posthog) {
			try {
				this.posthog.capture({
					distinctId: distinctId ?? "anonymous",
					event: SESSION_FEEDBACK_EVENT,
					properties,
				});

				if (this.debug) {
					logger.info("[Analytics] Accountability event tracked", {
						session_id: data.session_id,
						perceived_help: data.perceived_help,
					});
				}
			} catch (error) {
				logger.error("[Analytics] Failed to track accountability event", error as Error);
			}
		} else if (this.debug) {
			logger.info("[Analytics] No PostHog client - accountability event logged only", {
				session_id: data.session_id,
				properties,
			});
		}
	}

	/**
	 * Flush events (for server-side usage)
	 */
	async flush(): Promise<void> {
		if (this.posthog) {
			try {
				await this.posthog.flush();
			} catch (error) {
				logger.error("[Analytics] Failed to flush events", error as Error);
			}
		}
	}

	/**
	 * Shutdown analytics (for server-side usage)
	 */
	async shutdown(): Promise<void> {
		if (this.posthog) {
			try {
				await this.posthog.shutdown();
			} catch (error) {
				logger.error("[Analytics] Failed to shutdown", error as Error);
			}
		}
	}
}

/**
 * Create analytics wrapper instance
 */
export function createAnalyticsWrapper(config: AnalyticsConfig): AnalyticsWrapper {
	return new AnalyticsWrapper(config);
}
