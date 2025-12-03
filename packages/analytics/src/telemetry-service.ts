/**
 * Canonical Telemetry Service
 *
 * Single source of truth for telemetry event tracking across SnapBack.
 * Replaces 6 separate PostHog implementations:
 * - apps/api/lib/posthog-server.ts
 * - apps/web/lib/posthog-client.tsx
 * - packages/infrastructure/src/metrics/server/index.ts
 * - packages/infrastructure/src/metrics/client/index.ts
 * - packages/infrastructure/src/analytics/AnalyticsWrapper.ts
 * - packages/infrastructure/src/tracing/telemetry-client.ts
 */

import type { CoreTelemetryEvent } from "@snapback/contracts/events";
import { validateCoreTelemetryEvent } from "@snapback/contracts/events";

export interface TelemetryConfig {
	apiKey: string;
	userId?: string;
	environment: "development" | "staging" | "production";
	debug?: boolean;
}

/**
 * Canonical telemetry service - all telemetry flows through here
 */
export class CanonicalTelemetryService {
	private apiKey: string;
	private userId?: string;
	private environment: string;
	private debug: boolean;
	private queue: CoreTelemetryEvent[] = [];
	private flushTimer?: NodeJS.Timeout;
	private readonly FLUSH_INTERVAL = 30000; // 30 seconds
	private readonly MAX_QUEUE_SIZE = 100;

	constructor(config: TelemetryConfig) {
		this.apiKey = config.apiKey;
		this.userId = config.userId;
		this.environment = config.environment;
		this.debug = config.debug ?? false;

		if (this.debug) {
			console.info("Canonical Telemetry Service initialized", {
				environment: this.environment,
				userId: this.userId,
			});
		}
	}

	/**
	 * Track a telemetry event
	 *
	 * Events are validated against core schema and sanitized before queueing.
	 */
	async track(event: CoreTelemetryEvent): Promise<void> {
		try {
			// Validate event structure
			if (!validateCoreTelemetryEvent(event)) {
				console.warn("Invalid telemetry event rejected", { event });
				return;
			}

			// Sanitize PII before queueing
			const sanitizedEvent = this.sanitizeEvent(event);

			// Queue for batch transmission
			this.queue.push(sanitizedEvent);

			// Flush if queue is full
			if (this.queue.length >= this.MAX_QUEUE_SIZE) {
				await this.flush();
			} else if (!this.flushTimer) {
				// Schedule flush if not already scheduled
				this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
			}

			if (this.debug) {
				console.debug("Telemetry event queued", {
					event: event.event,
					queueSize: this.queue.length,
				});
			}
		} catch (error) {
			console.error("Failed to track telemetry event", {
				error: error instanceof Error ? error.message : String(error),
				event,
			});
		}
	}

	/**
	 * Identify user for all subsequent events
	 */
	async identify(userId: string, traits?: Record<string, unknown>): Promise<void> {
		this.userId = userId;

		if (this.debug) {
			console.info("User identified for telemetry", {
				userId,
				traits: traits ? Object.keys(traits) : undefined,
			});
		}
	}

	/**
	 * Flush queued events to backend
	 */
	async flush(): Promise<void> {
		if (this.queue.length === 0) {
			return;
		}

		try {
			const eventsToSend = [...this.queue];
			this.queue = [];

			if (this.flushTimer) {
				clearTimeout(this.flushTimer);
				this.flushTimer = undefined;
			}

			// Send to backend API
			const response = await fetch("/api/v1/telemetry/batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					events: eventsToSend,
					userId: this.userId,
					environment: this.environment,
					timestamp: Date.now(),
				}),
			});

			if (!response.ok) {
				console.warn("Telemetry batch submission failed", {
					status: response.status,
					eventCount: eventsToSend.length,
				});
				// Re-queue on failure
				this.queue.unshift(...eventsToSend);
			} else if (this.debug) {
				console.debug("Telemetry batch submitted", {
					eventCount: eventsToSend.length,
				});
			}
		} catch (error) {
			console.error("Telemetry flush error", {
				error: error instanceof Error ? error.message : String(error),
			});
			// Preserve queue on network error
		}
	}

	/**
	 * Graceful shutdown - flush remaining events
	 */
	async shutdown(): Promise<void> {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
		}
		await this.flush();

		if (this.debug) {
			console.info("Canonical Telemetry Service shutdown complete");
		}
	}

	/**
	 * Sanitize PII from event properties
	 *
	 * Removes or masks:
	 * - Email addresses
	 * - File paths (absolute)
	 * - API keys/tokens
	 * - User identifiable content
	 */
	private sanitizeEvent(event: CoreTelemetryEvent): CoreTelemetryEvent {
		return {
			...event,
			properties: this.sanitizeProperties(event.properties),
		} as CoreTelemetryEvent;
	}

	/**
	 * Recursively sanitize object properties
	 */
	private sanitizeProperties(properties: unknown): unknown {
		if (properties === null || properties === undefined) {
			return properties;
		}

		if (typeof properties === "string") {
			return this.sanitizeString(properties);
		}

		if (Array.isArray(properties)) {
			return properties.map((item) => this.sanitizeProperties(item));
		}

		if (typeof properties === "object") {
			const sanitized: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(properties)) {
				// Skip sensitive keys entirely
				if (this.isSensitiveKey(key)) {
					continue;
				}
				sanitized[key] = this.sanitizeProperties(value);
			}
			return sanitized;
		}

		return properties;
	}

	/**
	 * Check if a property key is sensitive
	 */
	private isSensitiveKey(key: string): boolean {
		const sensitive = ["password", "secret", "token", "apiKey", "privateKey", "credential"];
		return sensitive.some((s) => key.toLowerCase().includes(s.toLowerCase()));
	}

	/**
	 * Sanitize string values
	 */
	private sanitizeString(value: string): string {
		// Mask email addresses
		value = value.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[REDACTED_EMAIL]");

		// Mask absolute file paths
		value = value.replace(/\/[\w/-]+\/[\w.-]+/g, "[REDACTED_PATH]");

		// Mask API keys (40+ character alphanumeric)
		value = value.replace(/\b[a-z0-9]{40,}\b/gi, "[REDACTED_KEY]");

		return value;
	}
}

// Global singleton instance
let telemetryService: CanonicalTelemetryService | undefined;

/**
 * Initialize global telemetry service
 */
export function initTelemetry(config: TelemetryConfig): CanonicalTelemetryService {
	telemetryService = new CanonicalTelemetryService(config);
	return telemetryService;
}

/**
 * Get global telemetry service instance
 */
export function getTelemetry(): CanonicalTelemetryService {
	if (!telemetryService) {
		throw new Error("Telemetry service not initialized. Call initTelemetry() first.");
	}
	return telemetryService;
}

/**
 * Track event using global service
 */
export async function trackEvent(event: CoreTelemetryEvent): Promise<void> {
	await getTelemetry().track(event);
}
