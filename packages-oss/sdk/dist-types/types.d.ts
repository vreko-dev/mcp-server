export type { AnalyticsResponse, FileMetadata } from "@snapback-oss/contracts";
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
//# sourceMappingURL=types.d.ts.map
