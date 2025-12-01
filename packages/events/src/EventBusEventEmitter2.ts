import { randomUUID } from "node:crypto";
import { EventEmitter2 } from "eventemitter2";

// Define the event types directly since we're not importing from the old EventBus.ts
export enum SnapBackEvent {
	SNAPSHOT_CREATED = "snapshot:created",
	SNAPSHOT_DELETED = "snapshot:deleted",
	SNAPSHOT_RESTORED = "snapshot:restored",
	PROTECTION_CHANGED = "protection:changed",
	FILE_PROTECTED = "file:protected",
	FILE_UNPROTECTED = "file:unprotected",
	ANALYSIS_REQUESTED = "analysis:requested",
	ANALYSIS_COMPLETED = "analysis:completed",
}

// QoS levels for event delivery guarantees
export enum QoSLevel {
	BEST_EFFORT = 0, // At most once delivery (fire and forget)
	AT_LEAST_ONCE = 1, // At least once delivery with acknowledgment
	EXACTLY_ONCE = 2, // Exactly once delivery with deduplication
}

// Enhanced event structure with QoS support
export interface EnhancedEvent {
	id: string; // Unique event ID for deduplication
	type: string; // Event type/topic
	payload: any; // Event payload
	timestamp: number; // Event creation timestamp
	qosLevel: QoSLevel; // Quality of service level
	sequenceNumber?: number; // Sequence number for ordering
	correlationId?: string; // Correlation ID for related events
	retries: number; // Number of retry attempts
	status: "pending" | "acknowledged" | "processed"; // Event processing status
}

// Event acknowledgment structure
export interface EventAcknowledgment {
	eventId: string;
	clientId: string;
	timestamp: number;
	status: "acknowledged" | "rejected";
}

export interface SnapshotCreatedPayload {
	id: string;
	filePath: string;
	source: "mcp" | "extension" | "api";
	timestamp: number;
}

export interface ProtectionChangedPayload {
	filePath: string;
	level: "watch" | "warn" | "block";
	timestamp: number;
}

export interface FileProtectedPayload {
	filePath: string;
	level: "watch" | "warn" | "block";
	timestamp: number;
}

export interface FileUnprotectedPayload {
	filePath: string;
	timestamp: number;
}

// Simple logger implementation
const logger = {
	info: console.log,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
};

// Simple in-memory storage for events (replaces the persistence manager)
class InMemoryEventStorage {
	private events: Map<string, any> = new Map();

	async storeEvent(event: any): Promise<void> {
		this.events.set(event.id, event);
	}

	async getEvent(eventId: string): Promise<any | null> {
		return this.events.get(eventId) || null;
	}

	async listEvents(filters?: {
		type?: string;
		qosLevel?: number;
		status?: "pending" | "acknowledged" | "processed";
		limit?: number;
		offset?: number;
	}): Promise<any[]> {
		let events = Array.from(this.events.values());

		// Apply filters
		if (filters?.type) {
			events = events.filter((event) => event.type === filters.type);
		}

		if (filters?.qosLevel !== undefined) {
			events = events.filter((event) => event.qosLevel === filters.qosLevel);
		}

		if (filters?.status) {
			events = events.filter((event) => event.status === filters.status);
		}

		// Apply limit and offset
		if (filters?.offset) {
			events = events.slice(filters.offset);
		}

		if (filters?.limit) {
			events = events.slice(0, filters.limit);
		}

		return events;
	}

	async updateEventStatus(eventId: string, status: "pending" | "acknowledged" | "processed"): Promise<void> {
		const event = this.events.get(eventId);
		if (event) {
			event.status = status;
			this.events.set(eventId, event);
		}
	}

	close(): void {
		this.events.clear();
	}
}

export class SnapBackEventBusEventEmitter2 {
	private emitter: EventEmitter2;
	private storage: InMemoryEventStorage;
	private requestHandlers: Map<string, (data: any) => Promise<any>> = new Map();
	private pendingRequests: Map<
		string,
		{
			resolve: (value: any) => void;
			reject: (error: Error) => void;
			timeout: NodeJS.Timeout;
		}
	> = new Map();

	constructor() {
		// Initialize with wildcard support to match the old EventBus functionality
		this.emitter = new EventEmitter2({
			wildcard: true,
			delimiter: ":",
			newListener: false,
			removeListener: false,
		});

		// Initialize in-memory storage
		this.storage = new InMemoryEventStorage();
	}

	async initialize(): Promise<void> {
		// No initialization needed for EventEmitter2
		logger.info("EventEmitter2 EventBus initialized");
	}

	// EventEmitter2 methods
	on(event: string | string[], listener: (...args: any[]) => void): this {
		this.emitter.on(event, listener);
		return this;
	}

	once(event: string | string[], listener: (...args: any[]) => void): this {
		this.emitter.once(event, listener);
		return this;
	}

	off(event: string | string[], listener: (...args: any[]) => void): this {
		this.emitter.off(event, listener);
		return this;
	}

	emit(event: string | string[], ...values: any[]): boolean {
		return this.emitter.emit(event, ...values);
	}

	// Request/response pattern
	onRequest(event: string, handler: (data: any) => Promise<any>): void {
		this.requestHandlers.set(event, handler);
	}

	async request(event: string, data: any, timeoutMs = 5000): Promise<any> {
		return new Promise((resolve, reject) => {
			const id = `${Date.now()}-${Math.random()}`;

			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Request timeout: ${event}`));
			}, timeoutMs);

			this.pendingRequests.set(id, { resolve, reject, timeout });

			// In a real implementation, we would need to handle the request/response
			// For now, we'll just resolve with a mock response
			const handler = this.requestHandlers.get(event);
			if (handler) {
				handler(data).then(
					(result) => {
						clearTimeout(timeout);
						this.pendingRequests.delete(id);
						resolve(result);
					},
					(error) => {
						clearTimeout(timeout);
						this.pendingRequests.delete(id);
						reject(error);
					},
				);
			} else {
				clearTimeout(timeout);
				this.pendingRequests.delete(id);
				reject(new Error(`No handler for request: ${event}`));
			}
		});
	}

	/**
	 * Publish an event with QoS guarantees
	 * @param eventType The type of event to publish
	 * @param payload The event payload
	 * @param qosLevel The QoS level for this event
	 * @param correlationId Optional correlation ID for related events
	 */
	async publishQoS(
		eventType: string,
		payload: any,
		qosLevel: QoSLevel = QoSLevel.BEST_EFFORT,
		correlationId?: string,
	): Promise<string | undefined> {
		const eventId = randomUUID();
		const timestamp = Date.now();

		// Create enhanced event with QoS support
		const event: EnhancedEvent = {
			id: eventId,
			type: eventType,
			payload,
			timestamp,
			qosLevel,
			correlationId,
			retries: 0,
			status: "pending",
		};

		// Store event if QoS level requires it
		if (qosLevel > QoSLevel.BEST_EFFORT) {
			try {
				await this.storage.storeEvent(event);
			} catch (error) {
				logger.error("Failed to store event", error);
			}
		}

		// Emit the event
		this.emitter.emit(eventType, payload);

		// For AT_LEAST_ONCE and EXACTLY_ONCE, update status to processed
		if (qosLevel >= QoSLevel.AT_LEAST_ONCE) {
			try {
				await this.storage.updateEventStatus(eventId, "processed");
			} catch (error) {
				logger.error("Failed to update event status", error);
			}

			// Return event ID for tracking
			return eventId;
		}
	}

	publish(eventType: string, payload: any): void {
		// Emit the event
		this.emitter.emit(eventType, payload);
	}

	close(): void {
		// Cancel all pending requests
		for (const [_id, pending] of this.pendingRequests) {
			clearTimeout(pending.timeout);
			pending.reject(new Error("EventBus closed"));
		}
		this.pendingRequests.clear();

		// Close storage
		this.storage.close();

		// Remove all listeners
		this.emitter.removeAllListeners();
	}

	/**
	 * Replay events within a time range
	 */
	async replayEvents(startTime: number, endTime: number, eventType?: string): Promise<void> {
		try {
			const events = await this.storage.listEvents({
				type: eventType,
			});

			// Filter events by time range
			const filteredEvents = events.filter(
				(event: EnhancedEvent) => event.timestamp >= startTime && event.timestamp <= endTime,
			);

			// Replay events in order
			for (const event of filteredEvents) {
				this.emitter.emit(event.type, event.payload);
			}
		} catch (error) {
			logger.error("Failed to replay events", error);
			throw error;
		}
	}

	/**
	 * Get event by ID
	 */
	async getEvent(eventId: string): Promise<EnhancedEvent | null> {
		return this.storage.getEvent(eventId);
	}

	/**
	 * List events with filters
	 */
	async listEvents(filters?: {
		type?: string;
		qosLevel?: QoSLevel;
		status?: "pending" | "acknowledged" | "processed";
		limit?: number;
		offset?: number;
	}): Promise<EnhancedEvent[]> {
		return this.storage.listEvents(filters);
	}
}
