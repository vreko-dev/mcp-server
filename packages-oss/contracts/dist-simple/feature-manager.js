import { FEATURE_FLAGS } from ".";
import * as dotenv from "dotenv";
// Load environment variables
dotenv.config();
export class FeatureManager {
	static instance;
	flags = new Map();
	constructor() {
		// Initialize with default values
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key, value);
		}
		// Override with environment variables
		this.loadEnvironmentOverrides();
	}
	static getInstance() {
		if (!FeatureManager.instance) {
			FeatureManager.instance = new FeatureManager();
		}
		return FeatureManager.instance;
	}
	isEnabled(flag) {
		const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
		// For sampling rate flags, compare with random value
		if (flag === "telemetry.sampling_rate" && typeof value === "number") {
			return Math.random() < value;
		}
		return Boolean(value);
	}
	getValue(flag) {
		return this.flags.get(flag);
	}
	setFlag(flag, value) {
		this.flags.set(flag, value);
	}
	loadEnvironmentOverrides() {
		// Check for environment variable overrides
		for (const flag of Object.keys(FEATURE_FLAGS)) {
			const envVar = `SNAPBACK_${flag.replace(/\./g, "_").toUpperCase()}`;
			const envValue = process.env[envVar];
			if (envValue !== undefined) {
				// Parse boolean values
				if (envValue === "true" || envValue === "false") {
					this.flags.set(flag, envValue === "true");
				}
				// Parse numeric values
				else if (!Number.isNaN(Number(envValue))) {
					this.flags.set(flag, Number(envValue));
				}
				// Keep as string for other values (though we don't expect string flags)
			}
		}
	}
	reset() {
		this.flags.clear();
		for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
			this.flags.set(key, value);
		}
		this.loadEnvironmentOverrides();
	}
}
