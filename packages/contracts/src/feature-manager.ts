import { FEATURE_FLAGS, type FeatureFlag } from "./index";
import { createLogger, LogLevel } from "./logger";

// Environment variables should be loaded by the application entry point (e.g. Next.js, or dotenv/config in scripts)

const logger = createLogger({ name: "feature-manager", level: LogLevel.INFO });

/**
 * PostHog client interface for feature flag evaluation
 */
interface PostHogClient {
	isFeatureEnabled(flag: string, userId: string, context?: Record<string, unknown>): Promise<boolean | null>;
	getFeatureFlag(
		flag: string,
		userId: string,
		context?: Record<string, unknown>,
	): Promise<string | boolean | number | null>;
	shutdown(): Promise<void>;
}

export class FeatureManager {
	private static instance: FeatureManager;
	private flags: Map<FeatureFlag, boolean | number> = new Map();
	private posthogClient: PostHogClient | null = null;

	private constructor() {
		// Initialize with default values
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key as FeatureFlag, value as boolean | number);
		}

		// Override with environment variables
		this.loadEnvironmentOverrides();
	}

	static getInstance(): FeatureManager {
		if (!FeatureManager.instance) {
			FeatureManager.instance = new FeatureManager();
		}
		return FeatureManager.instance;
	}

	isEnabled(flag: FeatureFlag): boolean {
		const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
		// For sampling rate flags, compare with random value
		if (flag === "telemetry.sampling_rate" && typeof value === "number") {
			return Math.random() < value;
		}
		return Boolean(value);
	}

	getValue<T>(flag: FeatureFlag): T | undefined {
		return this.flags.get(flag) as T | undefined;
	}

	setFlag(flag: FeatureFlag, value: boolean | number): void {
		this.flags.set(flag, value);
	}

	/**
	 * Set PostHog client for dynamic feature flag evaluation
	 */
	setPostHogClient(client: PostHogClient | null): void {
		this.posthogClient = client;
		if (client) {
			logger.info("PostHog client configured");
		} else {
			logger.info("PostHog client cleared, falling back to static config");
		}
	}

	/**
	 * Asynchronously check if feature is enabled (with PostHog fallback)
	 * @param flag - Feature flag name
	 * @param userId - User ID for targeting rules (optional)
	 * @param context - Additional context for PostHog targeting (optional)
	 * @returns Promise<boolean> - True if feature is enabled
	 */
	async isEnabledAsync(flag: string, userId?: string, context?: Record<string, unknown>): Promise<boolean> {
		// If PostHog is configured and we have a userId, try to use it
		if (this.posthogClient && userId) {
			try {
				const defaultSubscriptionTier = process.env.SNAPBACK_DEFAULT_SUBSCRIPTION_TIER || "free";

				const posthogContext = {
					subscriptionTier: defaultSubscriptionTier,
					...context,
				};

				const result = await this.posthogClient.isFeatureEnabled(flag, userId, posthogContext);

				// If PostHog returns a value, use it. Otherwise fall back to static config
				if (result !== null && result !== undefined) {
					logger.info("Feature flag evaluated via PostHog", {
						flag,
						userId,
						enabled: result,
					});
					return result;
				}
			} catch (error) {
				logger.warn("PostHog feature flag check failed, falling back to static config", {
					flag,
					userId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Fall back to static configuration
		return this.isEnabled(flag as FeatureFlag);
	}

	private loadEnvironmentOverrides(): void {
		// Check for environment variable overrides
		for (const flag of Object.keys(FEATURE_FLAGS)) {
			const envVar = `SNAPBACK_${flag.replace(/\./g, "_").toUpperCase()}`;
			const envValue = process.env[envVar];

			if (envValue !== undefined) {
				// Parse boolean values
				if (envValue === "true" || envValue === "false") {
					this.flags.set(flag as FeatureFlag, envValue === "true");
				}
				// Parse numeric values
				else if (!Number.isNaN(Number(envValue))) {
					this.flags.set(flag as FeatureFlag, Number(envValue));
				}
				// Keep as string for other values (though we don't expect string flags)
			}
		}
	}

	reset(): void {
		this.flags.clear();
		this.posthogClient = null;
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key as FeatureFlag, value as boolean | number);
		}
		this.loadEnvironmentOverrides();
	}
}
