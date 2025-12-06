/**
 * Quality of Service module for the Snapback SDK
 * Implements enqueue, batching, retries/backoff, and drop handling
 */
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
export interface QueueItem {
	id: string;
	data: QoSData;
	timestamp: number;
	retries: number;
	resolve: (value: QoSResult) => void;
	reject: (reason: Error) => void;
}
export declare class QoSService {
	private queue;
	private batchTimer;
	private dropCounter;
	private config;
	private httpClient;
	constructor(config?: Partial<QoSConfig>);
	/**
	 * Enqueue an item for processing
	 * @returns Promise that resolves when item is processed
	 */
	enqueue(data: QoSData): Promise<QoSResult>;
	/**
	 * Flush the current batch
	 */
	flushBatch(): Promise<void>;
	/**
	 * Calculate exponential backoff delay with jitter
	 */
	calculateBackoff(retries: number): number;
	/**
	 * Get current drop counter
	 */
	getDropCount(): number;
	/**
	 * Generate unique ID for queue items
	 */
	private generateId;
	/**
	 * Cleanup resources
	 */
	destroy(): void;
}
//# sourceMappingURL=qos.d.ts.map
