import { FEATURE_FLAGS, type FeatureFlag } from "./index.js";

// Environment variables should be loaded by the application entry point (e.g. Next.js, or dotenv/config in scripts)

export class FeatureManager {
	private static instance: FeatureManager;
	private flags: Map<FeatureFlag, boolean | number> = new Map();

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
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key as FeatureFlag, value as boolean | number);
		}
		this.loadEnvironmentOverrides();
	}
}
