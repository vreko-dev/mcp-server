/**
 * Quality of Service module for the Snapback SDK
 * Implements enqueue, batching, retries/backoff, and drop handling
 */

import { logger } from "@snapback-oss/infrastructure";
import ky from "ky";
import { THRESHOLDS } from "./config/Thresholds.js";

// Define specific types for QoS data
export interface QoSData {
	[key: string]: unknown;
}

export interface QoSResult {
	success: boolean;
	id: string;
	[key: string]: unknown;
}

export interface BatchResult {
	results: Array<{
		id: string;
		success: boolean;
		error?: string;
		[key: string]: unknown;
	}>;
}

export interface QoSConfig {
	/** Maximum items in batch */
	batchMax: number;
	/** Time interval for batch flush in milliseconds */
	batchIntervalMs: number;
	/** Base retry delay in milliseconds */
	retryBaseMs: number;
	/** Maximum retry delay in milliseconds */
	retryMaxMs: number;
	/** Maximum queue size before dropping items */
	maxQueueSize: number;
	/** API endpoint for batch processing */
	endpoint: string;
	/** API key for authentication */
	apiKey: string;
}

const DEFAULT_QOS_CONFIG: Omit<QoSConfig, "endpoint" | "apiKey"> = {
	batchMax: THRESHOLDS.qos.batchMax,
	batchIntervalMs: THRESHOLDS.qos.batchIntervalMs,
	retryBaseMs: THRESHOLDS.qos.retryBaseMs,
	retryMaxMs: THRESHOLDS.qos.retryMaxMs,
	maxQueueSize: THRESHOLDS.qos.maxQueueSize,
};

export interface QueueItem {
	id: string;
	data: QoSData;
	timestamp: number;
	retries: number;
	resolve: (value: QoSResult) => void;
	reject: (reason: Error) => void;
}

export class QoSService {
	private queue: QueueItem[] = [];
	private batchTimer: NodeJS.Timeout | null = null;
	private dropCounter = 0;
	private config: QoSConfig;
	private httpClient: typeof ky;

	constructor(config: Partial<QoSConfig> = {}) {
		this.config = {
			...DEFAULT_QOS_CONFIG,
			endpoint: "",
			apiKey: "",
			...config,
		};

		// Initialize HTTP client
		this.httpClient = ky.create({
			prefixUrl: this.config.endpoint,
			headers: {
				"X-API-Key": this.config.apiKey,
				"X-SnapBack-SDK": "1.0.0",
			},
			retry: {
				limit: THRESHOLDS.qos.eventBusMaxRetries,
				methods: ["post"],
				statusCodes: [408, 413, 429, 500, 502, 503, 504],
			},
			timeout: THRESHOLDS.qos.httpTimeout,
		});
	}

	/**
	 * Enqueue an item for processing
	 * @returns Promise that resolves when item is processed
	 */
	enqueue(data: QoSData): Promise<QoSResult> {
		// Check if queue is at maximum capacity
		if (this.queue.length >= this.config.maxQueueSize) {
			this.dropCounter++;
			throw new Error(`Queue full. Dropped item. Total drops: ${this.dropCounter}`);
		}

		return new Promise((resolve, reject) => {
			const item: QueueItem = {
				id: this.generateId(),
				data,
				timestamp: Date.now(),
				retries: 0,
				resolve,
				reject,
			};

			this.queue.push(item);

			// Start batch timer if not already running
			if (!this.batchTimer) {
				this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchIntervalMs);
			}

			// Flush immediately if batch is full
			if (this.queue.length >= this.config.batchMax) {
				this.flushBatch();
			}
		});
	}

	/**
	 * Flush the current batch
	 */
	async flushBatch(): Promise<void> {
		if (this.queue.length === 0) {
			return;
		}

		// Clear the batch timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}

		// Take items up to batchMax
		const batch = this.queue.splice(0, this.config.batchMax);

		try {
			// Send batch to API (timeout configured in ky client constructor)
			const response = await this.httpClient
				.post("v1/batch", {
					json: {
						items: batch.map((item) => ({
							id: item.id,
							data: item.data,
							timestamp: item.timestamp,
						})),
					},
				})
				.json<BatchResult>();

			// Process results
			const results = response.results;
			for (const result of results) {
				const item = batch.find((i) => i.id === result.id);
				if (item) {
					if (result.success) {
						item.resolve({ success: true, id: item.id });
					} else {
						item.reject(new Error(result.error || "Batch item processing failed"));
					}
				}
			}
		} catch (error) {
			logger.error("Batch flush failed", error as Error);

			// Reject all items in the batch
			for (const item of batch) {
				item.reject(error as Error);
			}
		} finally {
			// Restart batch timer if there are more items
			if (this.queue.length > 0) {
				this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchIntervalMs);
			}
		}
	}

	/**
	 * Calculate exponential backoff delay with jitter
	 */
	calculateBackoff(retries: number): number {
		const base = Math.min(this.config.retryBaseMs * 2 ** retries, this.config.retryMaxMs);
		// Add jitter: 0-50% randomization
		const jitter = Math.random() * 0.5;
		return base * (1 + jitter);
	}

	/**
	 * Get current drop counter
	 */
	getDropCount(): number {
		return this.dropCounter;
	}

	/**
	 * Generate unique ID for queue items
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}
		this.queue = [];
	}
}
