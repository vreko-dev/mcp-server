import type { TelemetrySinkDb } from "@snapback/platform/db/adapters/TelemetrySinkDb";

// Use InstanceType to get the type of TelemetrySinkDb instances
type TelemetrySink = InstanceType<typeof TelemetrySinkDb>;

export interface IngestEvent {
	requestId: string;
	userId: string;
	apiKeyId: string;
	sessionId?: string;
	eventType: string;
	properties: Record<string, unknown>;
	timestamp: Date;
}

export interface IngestBatch {
	events: IngestEvent[];
	batchId: string;
	timestamp: Date;
}

export class TelemetryIngestHandler {
	private pendingBatches: Map<string, IngestBatch> = new Map();
	private processedEvents: Set<string> = new Set(); // Track processed event IDs
	private batchTimeout: NodeJS.Timeout | null = null;
	private readonly BATCH_SIZE_LIMIT = 100;
	private readonly BATCH_TIME_LIMIT_MS = 5000; // 5 seconds
	private sink: TelemetrySink;

	constructor(sink: TelemetrySink) {
		this.sink = sink;
	}

	/**
	 * Ingest a single event with idempotency
	 */
	async ingestEvent(event: IngestEvent): Promise<void> {
		// Check if event already processed (idempotency)
		if (this.processedEvents.has(event.requestId)) {
			// Event already processed, no-op
			return;
		}

		// Mark event as processed
		this.processedEvents.add(event.requestId);

		// For now, we'll directly pass the event to the sink
		// In a production implementation, we might want to queue events for batch processing
		const props = event.properties;

		switch (event.eventType) {
			case "agent_suggestion":
				await this.sink.insertAgentSuggestion({
					requestId: event.requestId,
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					sessionId: event.sessionId,
					suggestionId: props.suggestionId as string,
					suggestionText: props.suggestionText as string,
					suggestionType: props.suggestionType as string,
					filePath: props.filePath as string | undefined,
					lineStart: props.lineStart as number | undefined,
					lineEnd: props.lineEnd as number | undefined,
					characterStart: props.characterStart as number | undefined,
					characterEnd: props.characterEnd as number | undefined,
					accepted: props.accepted as boolean,
					dismissed: props.dismissed as boolean,
					timestamp: event.timestamp,
				});
				break;

			case "post_accept_outcome":
				await this.sink.insertPostAcceptOutcome({
					requestId: event.requestId,
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					sessionId: event.sessionId,
					suggestionId: props.suggestionId as string,
					editsMade: props.editsMade as string[],
					timeToEditMs: props.timeToEditMs as number | undefined,
					timeToSubmitMs: props.timeToSubmitMs as number | undefined,
					userFeedback: props.userFeedback as string | undefined,
					timestamp: event.timestamp,
				});
				break;

			case "policy_evaluation":
				await this.sink.insertPolicyEvaluation({
					requestId: event.requestId,
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					sessionId: event.sessionId,
					policyName: props.policyName as string,
					policyVersion: props.policyVersion as string | undefined,
					evaluationResult: props.evaluationResult as string,
					violations: props.violations as string[],
					remediationSteps: props.remediationSteps as string[],
					timestamp: event.timestamp,
				});
				break;

			case "loop":
				await this.sink.insertLoop({
					requestId: event.requestId,
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					sessionId: event.sessionId,
					loopType: props.loopType as string,
					iterationCount: props.iterationCount as number,
					durationMs: props.durationMs as number | undefined,
					success: props.success as boolean,
					errorMessage: props.errorMessage as string | undefined,
					timestamp: event.timestamp,
				});
				break;

			case "feedback":
				await this.sink.insertFeedback({
					requestId: event.requestId,
					userId: event.userId,
					apiKeyId: event.apiKeyId,
					sessionId: event.sessionId,
					feedbackType: props.feedbackType as string,
					feedbackText: props.feedbackText as string | undefined,
					rating: props.rating as number | undefined,
					metadata: props.metadata as Record<string, unknown> | undefined,
					timestamp: event.timestamp,
				});
				break;

			default:
				// Handle unknown event types
				console.warn(`Unknown event type: ${event.eventType}`);
				// Remove from processed events since we didn't actually process it
				this.processedEvents.delete(event.requestId);
				break;
		}
	}

	/**
	 * Ingest a batch of events with backpressure handling
	 */
	async ingestBatch(batch: IngestBatch): Promise<void> {
		// Check if we're exceeding backpressure limits
		if (this.pendingBatches.size >= 10) {
			// If we have too many pending batches, process them now
			await this.processPendingBatches();
		}

		// Add batch to pending batches
		this.pendingBatches.set(batch.batchId, batch);

		// Set timeout to process batches if not already set
		if (!this.batchTimeout) {
			this.batchTimeout = setTimeout(() => {
				this.processPendingBatches();
				this.batchTimeout = null;
			}, this.BATCH_TIME_LIMIT_MS);
		}

		// If we've reached the batch size limit, process immediately
		if (this.pendingBatches.size >= this.BATCH_SIZE_LIMIT) {
			await this.processPendingBatches();
		}
	}

	/**
	 * Process all pending batches
	 */
	private async processPendingBatches(): Promise<void> {
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}

		// Process all pending batches
		for (const [batchId, batch] of this.pendingBatches) {
			try {
				// Process each event in the batch
				for (const event of batch.events) {
					await this.ingestEvent(event);
				}

				// Remove processed batch
				this.pendingBatches.delete(batchId);
			} catch (error) {
				console.error(`Error processing batch ${batchId}:`, error);
				// In a production implementation, we might want to retry or store failed batches
			}
		}
	}

	/**
	 * Flush all pending batches
	 */
	async flush(): Promise<void> {
		await this.processPendingBatches();
	}

	/**
	 * Clear the processed events cache (for testing purposes)
	 */
	clearProcessedEvents(): void {
		this.processedEvents.clear();
	}
}
