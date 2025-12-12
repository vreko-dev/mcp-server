/**
 * Safeguard 4: Feature Flag Validation
 *
 * Per TDD_CORE.md: Prevents feature flag edge cases
 * Validates FEATURE_CONFIG_V2 environment variable
 */

export interface FeatureFlagSource {
	value: boolean;
	source: "env" | "default";
	rawValue?: string;
}

/**
 * Validate feature flag value
 */
export class FeatureFlagValidator {
	private readonly VALID_VALUES = ["true", "false", "1", "0"];

	validateFeatureFlag(value: string | undefined): boolean {
		if (value === undefined) {
			console.warn("[FeatureFlag] Undefined, using default (enabled)");
			return true;
		}

		const normalized = value.toLowerCase().trim();

		if (!this.VALID_VALUES.includes(normalized)) {
			console.warn(`[FeatureFlag] Invalid value: ${value}, using default`);
			return true;
		}

		return normalized === "true" || normalized === "1";
	}

	evaluateWithSourceTracking(envValue?: string): FeatureFlagSource {
		if (envValue) {
			const isEnabled = this.validateFeatureFlag(envValue);
			return {
				value: isEnabled,
				source: "env",
				rawValue: envValue,
			};
		}

		return {
			value: true,
			source: "default",
		};
	}

	async validateFeatureFlagHealth(): Promise<boolean> {
		// TODO: Check feature flag health
		return true;
	}
}
