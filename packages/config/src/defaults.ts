export const snapbackDefaults = {
	mcp: {
		timeoutMs: 5_000, // hard cap per tool call
		maxConcurrent: 4, // global concurrency cap
		retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
		circuit: {
			// opossum
			enabled: true,
			errorThresholdPercentage: 50, // open after 50% failures
			volumeThreshold: 10, // at least 10 calls before evaluating
			timeoutMs: 5_000, // same as timeoutMs above
			resetMs: 30_000, // half-open after 30s
			rollingCountMs: 60_000, // lookback window
			rollingCountBuckets: 6,
		},
		batch: { size: 5, maxWaitMs: 150 }, // batch tiny calls (registry/search)
	},
	watcher: {
		debounceMs: 120,
		awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
		ignored: ["**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"],
	},
	storage: {
		retention: { maxSnapshots: 100, maxBytes: 256 * 1024 * 1024 }, // 256MB
		compression: "brotli", // 'gzip' on older Node
		metadataOnlyForLargeFilesKb: 1024,
	},
	analysis: {
		deep: {
			enabled: true,
			lazyLoad: true,
			toolCacheTtlMs: 24 * 60 * 60 * 1000,
		},
	},
	telemetry: {
		enabled: true,
		level: "warn", // 'info' in dev
		redact: ["data.content", "data.filePath", "data.files", "error.stack"],
	},
} as const;
