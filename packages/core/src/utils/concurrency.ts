import retry from "async-retry";
import pLimit from "p-limit";
import { withBreaker } from "./circuit-breaker";
import { logger } from "./logger";

// Configuration with safe defaults
const snapbackDefaults = {
	mcp: {
		timeoutMs: 5000,
		maxConcurrent: 4,
		retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
		circuit: {
			enabled: true,
			errorThresholdPercentage: 50,
			volumeThreshold: 10,
			timeoutMs: 5000,
			resetMs: 30000,
			rollingCountMs: 60000,
			rollingCountBuckets: 6,
		},
		batch: {
			size: 5,
			maxWaitMs: 150,
		},
	},
} as const;

const limit = pLimit(snapbackDefaults.mcp.maxConcurrent);

// Batch queue for homogeneous requests
type BatchItem<I, O> = {
	input: I;
	resolve: (value: O) => void;
	reject: (reason: unknown) => void;
};

const batchQueues = new Map<string, BatchItem<any, any>[]>();

export const callTool = <I, O>(name: string, raw: (i: I) => Promise<O>) => {
	const wrapped = withBreaker(name, raw);
	return (input: I) =>
		limit(() =>
			retry(() => wrapped(input), {
				retries: snapbackDefaults.mcp.retry.retries,
				factor: snapbackDefaults.mcp.retry.factor,
				minTimeout: snapbackDefaults.mcp.retry.min,
				maxTimeout: snapbackDefaults.mcp.retry.max,
				randomize: snapbackDefaults.mcp.retry.jitter,
				onRetry: (e: Error, n: number) =>
					logger.warn({ error: e }, `Retrying tool ${name} attempt ${n}: ${e.message}`),
			}),
		) as Promise<O>;
};

/**
 * Batch homogeneous requests
 * @param batchKey - Key to identify the batch type
 * @param input - Input for this request
 * @param processor - Function to process the batch
 */
export async function batchCall<I, O>(
	batchKey: string,
	input: I,
	processor: (inputs: I[]) => Promise<O[]>,
): Promise<O> {
	// Get or create batch queue
	if (!batchQueues.has(batchKey)) {
		batchQueues.set(batchKey, []);
	}

	const queue = batchQueues.get(batchKey);
	if (!queue) {
		throw new Error(`Batch queue not found for key: ${batchKey}`);
	}

	// Create promise for this request
	return new Promise<O>((resolve, reject) => {
		// Add this request to the queue
		queue.push({ input, resolve, reject } as BatchItem<any, any>);

		// If we've reached batch size, process immediately
		if (queue.length >= snapbackDefaults.mcp.batch.size) {
			processBatch(batchKey, processor);
			return;
		}

		// Otherwise, set a timer to process the batch
		setTimeout(() => {
			const queue = batchQueues.get(batchKey);
			if (queue && queue.length > 0) {
				processBatch(batchKey, processor);
			}
		}, snapbackDefaults.mcp.batch.maxWaitMs);
	});
}

/**
 * Process a batch of requests
 */
async function processBatch<I, O>(batchKey: string, processor: (inputs: I[]) => Promise<O[]>): Promise<void> {
	const queue = batchQueues.get(batchKey);
	if (!queue || queue.length === 0) {
		return;
	}
	// Clear the queue and process
	const batch = queue.splice(0, snapbackDefaults.mcp.batch.size);
	const inputs = batch.map((item) => item.input);

	try {
		logger.debug(`Processing batch of ${inputs.length} requests for ${batchKey}`);
		const results = await processor(inputs);

		// Resolve each promise with its corresponding result
		batch.forEach((item, index) => {
			if (index < results.length) {
				item.resolve(results[index]);
			} else {
				item.reject(new Error(`No result for batch item ${index}`));
			}
		});
	} catch (error: any) {
		// Reject all promises in the batch
		for (const item of batch) {
			item.reject(error);
		}
		logger.error({ error }, `Batch processing failed for ${batchKey}: ${(error as Error).message}`);
	}
}
