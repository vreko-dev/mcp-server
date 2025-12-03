// Re-export types from contracts package
export type { AnalyticsResponse, FileMetadata } from "@snapback-oss/contracts";

// SDK-specific types
export interface SDKConfig {
	endpoint: string;
	apiKey: string;

	privacy: {
		hashFilePaths: boolean;
		anonymizeWorkspace: boolean;
	};

	cache: {
		enabled: boolean;
		ttl: Record<string, number>;
	};

	retry: {
		maxRetries: number;
		backoffMs: number;
	};
}
