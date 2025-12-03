import type { SDKConfig } from "./types.js";

export const defaultConfig: SDKConfig = {
	endpoint: "https://api.snapback.dev",
	apiKey: "",

	privacy: {
		hashFilePaths: true,
		anonymizeWorkspace: false,
	},

	cache: {
		enabled: true,
		ttl: {
			analytics: 3600, // 1 hour
			recommendations: 1800, // 30 minutes
			patterns: 7200, // 2 hours
		},
	},

	retry: {
		maxRetries: 3,
		backoffMs: 1000,
	},
};

export function createConfig(overrides: Partial<SDKConfig> = {}): SDKConfig {
	return {
		...defaultConfig,
		...overrides,
		privacy: {
			...defaultConfig.privacy,
			...overrides.privacy,
		},
		cache: {
			...defaultConfig.cache,
			...overrides.cache,
			ttl: {
				...defaultConfig.cache.ttl,
				...overrides.cache?.ttl,
			},
		},
		retry: {
			...defaultConfig.retry,
			...overrides.retry,
		},
	};
}
