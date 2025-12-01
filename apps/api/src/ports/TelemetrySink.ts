/**
 * Telemetry Sink Port Interface
 * Defines the contract for telemetry data storage
 */

export interface TelemetryEvent {
	id: string;
	eventType: string;
	payload: Record<string, any>;
	timestamp: number;
	context?: {
		sessionId: string;
		requestId: string;
		workspaceId?: string;
		client: string;
	};
}

export interface TelemetrySink {
	/**
	 * Store telemetry events
	 * @param events Array of telemetry events to store
	 * @returns Promise that resolves when events are stored
	 */
	storeEvents(events: TelemetryEvent[]): Promise<void>;

	/**
	 * Retrieve telemetry events
	 * @param filter Filter criteria for events
	 * @returns Promise that resolves to array of telemetry events
	 */
	getEvents(filter?: {
		eventType?: string;
		sessionId?: string;
		startTime?: number;
		endTime?: number;
	}): Promise<TelemetryEvent[]>;

	/**
	 * Check if a request ID has already been processed (for idempotency)
	 * @param requestId The request ID to check
	 * @returns Promise that resolves to true if request ID exists
	 */
	hasRequestId(requestId: string): Promise<boolean>;

	/**
	 * Record a request ID as processed (for idempotency)
	 * @param requestId The request ID to record
	 * @returns Promise that resolves when request ID is recorded
	 */
	recordRequestId(requestId: string): Promise<void>;
}
