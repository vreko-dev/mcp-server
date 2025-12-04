/**
 * Analytics Client Wrapper - Single Writer to Database
 *
 * CRITICAL: This is the ONLY module allowed to write analytics events
 * Direct PostHog calls are FORBIDDEN and will fail CI guards
 *
 * Features:
 * - Event queueing with configurable batch size
 * - Automatic sanitization (PII removal, path normalization)
 * - Batch POST to /analytics/ingest
 * - Retry logic with exponential backoff
 * - Local persistence for offline resilience
 */

import crypto from "node:crypto";
import type { AnalyticsBatch, AnalyticsIngestResponse, ProductAnalyticsEvent } from "@snapback/contracts";
import { redactObject, redactString } from "./redaction.js";

/**
 * Client configuration
 */
export interface AnalyticsClientConfig {
	/** API base URL for analytics ingestion */
	apiBaseUrl: string;

	/** Maximum batch size before auto-flush */
	maxBatchSize?: number;

	/** Auto-flush interval in milliseconds */
	flushIntervalMs?: number;

	/** Enable offline persistence */
	enableOfflinePersistence?: boolean;

	/** Maximum retries for failed requests */
	maxRetries?: number;

	/** Initial retry delay in milliseconds */
	retryDelayMs?: number;

	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<AnalyticsClientConfig, "apiBaseUrl">> = {
	maxBatchSize: 50,
	flushIntervalMs: 10000, // 10 seconds
	enableOfflinePersistence: true,
	maxRetries: 3,
	retryDelayMs: 1000,
	debug: false,
};

/**
 * Analytics Client class
 */
export class AnalyticsClient {
	private config: Required<AnalyticsClientConfig>;
	private queue: ProductAnalyticsEvent[] = [];
	private flushTimer: NodeJS.Timeout | null = null;
	private isOnline = true;
	private isFlushing = false;

	constructor(config: AnalyticsClientConfig) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		// Start auto-flush timer
		this.startFlushTimer();

		// Listen for online/offline events (browser only)
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => this.handleOnline());
			window.addEventListener("offline", () => this.handleOffline());
		}

		// Load persisted events on init
		if (this.config.enableOfflinePersistence) {
			this.loadPersistedEvents();
		}
	}

	/**
	 * Track a product analytics event
	 * Automatically sanitizes metadata and queues for batching
	 */
	public track(event: Omit<ProductAnalyticsEvent, "timestamp">): void {
		// Add timestamp if not provided
		const fullEvent: ProductAnalyticsEvent = {
			name: event.name,
			userId: event.userId,
			meta: event.meta,
			timestamp: Date.now(),
		} as ProductAnalyticsEvent;

		// Sanitize event metadata
		const sanitized = this.sanitizeEvent(fullEvent);

		// Add to queue
		this.queue.push(sanitized);

		this.log(`Event queued: ${sanitized.name} (queue size: ${this.queue.length})`);

		// Persist to local storage if enabled
		if (this.config.enableOfflinePersistence) {
			this.persistQueue();
		}

		// Auto-flush if batch size reached
		if (this.queue.length >= this.config.maxBatchSize) {
			this.log(`Batch size reached (${this.queue.length}), flushing...`);
			this.flush();
		}
	}

	/**
	 * Manually flush the queue
	 */
	public async flush(): Promise<void> {
		if (this.queue.length === 0) {
			this.log("Queue empty, nothing to flush");
			return;
		}

		if (this.isFlushing) {
			this.log("Already flushing, skipping...");
			return;
		}

		if (!this.isOnline) {
			this.log("Offline, will retry when online");
			return;
		}

		this.isFlushing = true;

		try {
			// Create batch
			const batch: AnalyticsBatch = {
				events: [...this.queue],
				sentAt: Date.now(),
				batchId: this.generateBatchId(),
			};

			this.log(`Flushing batch of ${batch.events.length} events`);

			// Send to API with retries
			const success = await this.sendBatchWithRetry(batch);

			if (success) {
				// Clear queue on successful send
				this.queue = [];

				// Clear persisted queue
				if (this.config.enableOfflinePersistence) {
					this.clearPersistedQueue();
				}

				this.log("Batch sent successfully");
			} else {
				this.log("Failed to send batch after retries");
			}
		} catch (error) {
			this.log(`Error flushing queue: ${error}`);
		} finally {
			this.isFlushing = false;
		}
	}

	/**
	 * Destroy the client (cleanup)
	 */
	public destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}

		// Flush remaining events
		this.flush();
	}

	/**
	 * Sanitize event metadata
	 * Removes PII, normalizes paths, redacts secrets
	 */
	private sanitizeEvent(event: ProductAnalyticsEvent): ProductAnalyticsEvent {
		const { meta, ...rest } = event;
		const sanitizedMeta = meta ? this.sanitizeMeta(meta as Record<string, any>) : meta;

		return {
			...rest,
			meta: sanitizedMeta,
		} as ProductAnalyticsEvent;
	}

	/**
	 * Sanitize metadata object
	 */
	private sanitizeMeta(meta: Record<string, any>): Record<string, any> {
		// Deep clone to avoid mutations
		const sanitized = structuredClone(meta);

		// Apply redaction
		const redacted = redactObject(sanitized);

		// Additional path normalization
		for (const [key, value] of Object.entries(redacted)) {
			if (
				typeof value === "string" &&
				(key.toLowerCase().includes("path") || key.toLowerCase().includes("file"))
			) {
				redacted[key] = this.normalizePath(value);
			}
		}

		return redacted;
	}

	/**
	 * Normalize file paths (remove user-specific prefixes)
	 */
	private normalizePath(path: string): string {
		// Remove common user directory prefixes
		let normalized = path
			.replace(/\/Users\/[^/]+\//, "/Users/[user]/")
			.replace(/\/home\/[^/]+\//, "/home/[user]/")
			.replace(/C:\\Users\\[^\\]+\\/, "C:\\Users\\[user]\\")
			.replace(/C:\/Users\/[^/]+\//, "C:/Users/[user]/");

		// Apply string redaction for any remaining sensitive patterns
		normalized = redactString(normalized);

		return normalized;
	}

	/**
	 * Send batch with retry logic
	 */
	private async sendBatchWithRetry(batch: AnalyticsBatch): Promise<boolean> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
			try {
				const response = await this.sendBatch(batch);

				if (response.success) {
					return true;
				}

				// Log any partial errors
				if (response.errors && response.errors.length > 0) {
					this.log(`Batch sent with ${response.errors.length} errors`);
				}

				return response.success;
			} catch (error) {
				lastError = error as Error;
				this.log(`Attempt ${attempt + 1} failed: ${error}`);

				// Wait before retry (exponential backoff)
				if (attempt < this.config.maxRetries - 1) {
					const delay = this.config.retryDelayMs * 2 ** attempt;
					this.log(`Retrying in ${delay}ms...`);
					await this.sleep(delay);
				}
			}
		}

		this.log(`All retry attempts failed: ${lastError}`);
		return false;
	}

	/**
	 * Send batch to API
	 */
	private async sendBatch(batch: AnalyticsBatch): Promise<AnalyticsIngestResponse> {
		const url = `${this.config.apiBaseUrl}/analytics/ingest`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(batch),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Start auto-flush timer
	 */
	private startFlushTimer(): void {
		this.flushTimer = setInterval(() => {
			if (this.queue.length > 0) {
				this.log("Auto-flush triggered");
				this.flush();
			}
		}, this.config.flushIntervalMs);
	}

	/**
	 * Handle online event
	 */
	private handleOnline(): void {
		this.log("Network online");
		this.isOnline = true;

		// Flush any queued events
		if (this.queue.length > 0) {
			this.flush();
		}
	}

	/**
	 * Handle offline event
	 */
	private handleOffline(): void {
		this.log("Network offline");
		this.isOnline = false;
	}

	/**
	 * Persist queue to local storage
	 */
	private persistQueue(): void {
		if (typeof window === "undefined" && typeof localStorage === "undefined") { return; }

		try {
			localStorage.setItem("snapback_analytics_queue", JSON.stringify(this.queue));
		} catch (error) {
			this.log(`Failed to persist queue: ${error}`);
		}
	}

	/**
	 * Load persisted events from local storage
	 */
	private loadPersistedEvents(): void {
		if (typeof window === "undefined" && typeof localStorage === "undefined") { return; }

		try {
			const persisted = localStorage.getItem("snapback_analytics_queue");
			if (persisted) {
				this.queue = JSON.parse(persisted);
				this.log(`Loaded ${this.queue.length} persisted events`);
			}
		} catch (error) {
			this.log(`Failed to load persisted queue: ${error}`);
		}
	}

	/**
	 * Clear persisted queue
	 */
	private clearPersistedQueue(): void {
		if (typeof window === "undefined" && typeof localStorage === "undefined") { return; }

		try {
			localStorage.removeItem("snapback_analytics_queue");
		} catch (error) {
			this.log(`Failed to clear persisted queue: ${error}`);
		}
	}

	/**
	 * Generate unique batch ID
	 */
	private generateBatchId(): string {
		return `batch_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Debug logging
	 */
	private log(message: string): void {
		if (this.config.debug) {
			console.log(`[AnalyticsClient] ${message}`);
		}
	}
}

/**
 * Singleton instance for convenience
 */
let defaultClient: AnalyticsClient | null = null;

/**
 * Initialize the default analytics client
 */
export function initAnalyticsClient(config: AnalyticsClientConfig): AnalyticsClient {
	defaultClient = new AnalyticsClient(config);
	return defaultClient;
}

/**
 * Get the default analytics client
 */
export function getAnalyticsClient(): AnalyticsClient {
	if (!defaultClient) {
		throw new Error("Analytics client not initialized. Call initAnalyticsClient() first.");
	}
	return defaultClient;
}

/**
 * Convenience function to track an event using the default client
 */
export function trackEvent(event: Omit<ProductAnalyticsEvent, "timestamp">): void {
	getAnalyticsClient().track(event);
}
