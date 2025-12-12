/**
 * Safeguard 4: Feature Flag Validation
 *
 * Per TDD_CORE.md: Prevents feature flag edge cases
 * Validates FEATURE_CONFIG_V2 environment variable
 * Ensures safe defaults and prevents invalid values from breaking the system
 */

export interface FeatureFlagSource {
	value: boolean;
	source: "env" | "default" | "error";
	rawValue?: string;
	error?: string;
}

export interface FeatureFlagHealth {
	isHealthy: boolean;
	lastChecked: Date;
	evaluationsCount: number;
	errorsCount: number;
}

/**
 * Validate feature flag value
 * Strict validation to prevent edge cases and invalid configurations
 */
export class FeatureFlagValidator {
	private readonly VALID_VALUES = ["true", "false", "1", "0"];
	private evaluationsCount = 0;
	private errorsCount = 0;
	private lastChecked: Date | null = null;

	/**
	 * Validate and convert feature flag value to boolean
	 * Default: true (safe default - prefers v2 over v1)
	 */
	validateFeatureFlag(value: string | undefined): boolean {
		try {
			if (value === undefined) {
				console.warn("[FeatureFlag] Undefined, using default (enabled)");
				return true;
			}

			if (value === null) {
				console.warn("[FeatureFlag] Null value, using default (enabled)");
				return true;
			}

			const normalized = value.toLowerCase().trim();

			// Check if value is valid
			if (!this.VALID_VALUES.includes(normalized)) {
				console.warn(`[FeatureFlag] Invalid value: "${value}", using default (enabled)`);
				this.errorsCount++;
				return true;
			}

			// Convert to boolean
			const result = normalized === "true" || normalized === "1";

			return result;
		} catch (error) {
			console.error("[FeatureFlag] Validation error:", error);
			this.errorsCount++;
			return true; // Safe default
		}
	}

	/**
	 * Evaluate feature flag with source tracking
	 * Returns detailed information about where the flag value came from
	 */
	evaluateWithSourceTracking(envValue?: string): FeatureFlagSource {
		this.evaluationsCount++;
		this.lastChecked = new Date();

		try {
			if (envValue === undefined) {
				return {
					value: true,
					source: "default",
					error: "No environment value provided",
				};
			}

			if (envValue === null) {
				return {
					value: true,
					source: "default",
					error: "Environment value is null",
				};
			}

			const normalized = envValue.toLowerCase().trim();

			// Validate
			if (!this.VALID_VALUES.includes(normalized)) {
				return {
					value: true,
					source: "error",
					rawValue: envValue,
					error: `Invalid value: "${envValue}". Valid: ${this.VALID_VALUES.join(", ")}`,
				};
			}

			const value = normalized === "true" || normalized === "1";

			return {
				value,
				source: "env",
				rawValue: envValue,
			};
		} catch (error) {
			return {
				value: true,
				source: "error",
				rawValue: envValue,
				error: `Evaluation error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Get current health metrics
	 */
	getHealth(): FeatureFlagHealth {
		const errorRate = this.evaluationsCount > 0 ? this.errorsCount / this.evaluationsCount : 0;

		return {
			isHealthy: errorRate < 0.1, // Fail if >10% errors
			lastChecked: this.lastChecked || new Date(),
			evaluationsCount: this.evaluationsCount,
			errorsCount: this.errorsCount,
		};
	}

	/**
	 * Check feature flag health
	 * Used by Safeguard 8 (Rollback) to detect configuration issues
	 */
	async validateFeatureFlagHealth(): Promise<boolean> {
		const health = this.getHealth();

		if (!health.isHealthy) {
			console.error(`[FeatureFlag] Health check failed: ${health.errorsCount}/${health.evaluationsCount} errors`);
			return false;
		}

		return true;
	}

	/**
	 * Reset statistics (useful for testing)
	 */
	reset(): void {
		this.evaluationsCount = 0;
		this.errorsCount = 0;
		this.lastChecked = null;
	}

	/**
	 * Get detailed statistics
	 */
	getStats(): {
		evaluations: number;
		errors: number;
		errorRate: number;
		successRate: number;
	} {
		const errorRate = this.evaluationsCount > 0 ? this.errorsCount / this.evaluationsCount : 0;

		return {
			evaluations: this.evaluationsCount,
			errors: this.errorsCount,
			errorRate: Math.round(errorRate * 100) / 100,
			successRate: Math.round((1 - errorRate) * 100) / 100,
		};
	}
}

/**
 * Global feature flag validator instance
 * Can be reset for testing or replaced with custom validator
 */
let globalValidator = new FeatureFlagValidator();

/**
 * Get the global feature flag validator
 */
export function getFeatureFlagValidator(): FeatureFlagValidator {
	return globalValidator;
}

/**
 * Set a custom feature flag validator (useful for testing)
 */
export function setFeatureFlagValidator(validator: FeatureFlagValidator): void {
	globalValidator = validator;
}

/**
 * Quick convenience function to validate without creating an instance
 */
export function isConfigV2Enabled(envValue?: string): boolean {
	return globalValidator.validateFeatureFlag(envValue);
}

/**
 * Quick convenience function with source tracking
 */
export function evaluateConfigV2(envValue?: string): FeatureFlagSource {
	return globalValidator.evaluateWithSourceTracking(envValue);
}
