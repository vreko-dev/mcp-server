import type { FeatureFlag } from "@snapback/contracts";
import { FEATURE_FLAGS, FeatureManager } from "@snapback/contracts";
import type { LegacyTelemetryEvent as TelemetryEvent } from "@snapback/contracts/events";
import { validateLegacyTelemetryEvent as validateTelemetryEvent } from "@snapback/contracts/events";

interface TelemetryEventInternal {
	event: string;
	properties?: Record<string, any>;
	timestamp: number;
}

export class TelemetryClient {
	private flags: Map<FeatureFlag, boolean> = new Map();
	private eventQueue: TelemetryEventInternal[] = [];
	private flushInterval = 5000; // 5 seconds
	private maxQueueSize = 100;
	private rateLimitWindow = 60000; // 1 minute
	private eventCounts: Map<string, number> = new Map();
	private lastRateLimitReset: number = Date.now();
	private proxyUrl: string;
	private offlineMode = false;

	constructor(
		_apiKey: string,
		proxyHost: string,
		private environment: "vscode" | "mcp" | "cli",
	) {
		this.proxyUrl = `${proxyHost}/api/telemetry/events`;
		// DO NOT initialize PostHog SDK with direct host
		// Instead, implement custom transport layer

		// Generate anonymous ID for this client instance (stored for future use)
		this.generateAnonymousId();

		// Start periodic flush
		setInterval(() => this.flush(), this.flushInterval);
	}

	async initialize() {
		// Feature flags are not supported in proxy mode
		// In a real implementation, you might fetch flags through the proxy
		console.warn("Feature flags not supported in proxy mode");
	}

	/**
	 * Set offline mode
	 * @param enabled Whether offline mode is enabled
	 */
	setOfflineMode(enabled: boolean): void {
		this.offlineMode = enabled;
	}

	/**
	 * Check if offline mode is enabled
	 * @returns Whether offline mode is enabled
	 */
	isOfflineMode(): boolean {
		return this.offlineMode;
	}

	isEnabled(flag: FeatureFlag): boolean {
		// Local cache with fallback to defaults
		const value = this.flags.get(flag) ?? FEATURE_FLAGS[flag];
		return Boolean(value);
	}

	async reloadFlags() {
		// Feature flags are not supported in proxy mode
		console.warn("Feature flags not supported in proxy mode");
	}

	/**
	 * Track a telemetry event with strict typing and validation
	 * @param event The event name (must be from the whitelist)
	 * @param properties The event properties (validated at runtime)
	 */
	trackEvent(event: TelemetryEvent): void {
		// Validate the event at runtime
		if (!validateTelemetryEvent(event)) {
			console.warn("Invalid telemetry event, skipping:", event);
			return;
		}

		// If offline mode is enabled, skip tracking
		if (this.offlineMode) {
			return;
		}

		const featureManager = FeatureManager.getInstance();

		// Check if telemetry is enabled
		if (!featureManager.isEnabled("telemetry.detailed_events")) {
			// Only track minimal events
			if (!["checkpoint.created", "risk.high", "error"].includes(event.event)) {
				return;
			}
		}

		// Apply sampling rate
		const samplingRate = featureManager.getValue<number>("telemetry.sampling_rate") ?? 1.0;
		if (Math.random() > samplingRate) {
			return;
		}

		// Rate limiting
		if (this.isRateLimited(event.event)) {
			return;
		}

		// Add to queue
		this.eventQueue.push({
			event: event.event,
			properties: {
				...this.sanitizeProperties(event.properties || {}),
				environment: this.environment,
				timestamp: event.timestamp,
			},
			timestamp: event.timestamp,
		});

		// Flush if queue is full
		if (this.eventQueue.length >= this.maxQueueSize) {
			this.flush();
		}
	}

	/**
	 * Track a telemetry event with string-based event name (legacy compatibility)
	 * @param event The event name
	 * @param properties The event properties
	 */
	track(event: string, properties?: Record<string, any>) {
		// Convert to typed event for validation
		const typedEvent: TelemetryEvent = {
			event,
			properties,
			timestamp: Date.now(),
		};

		this.trackEvent(typedEvent);
	}

	private isRateLimited(event: string): boolean {
		const now = Date.now();

		// Reset rate limit counters every minute
		if (now - this.lastRateLimitReset > this.rateLimitWindow) {
			this.eventCounts.clear();
			this.lastRateLimitReset = now;
		}

		// Check event count for this event type
		const count = this.eventCounts.get(event) || 0;
		const maxEventsPerWindow = 10; // Max 10 events per minute per event type

		if (count >= maxEventsPerWindow) {
			return true;
		}

		// Increment counter
		this.eventCounts.set(event, count + 1);
		return false;
	}

	/**
	 * Sanitize properties to remove PII before sending
	 */
	private sanitizeProperties(properties?: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		if (!properties) {
			return sanitized;
		}

		// Allowlist of safe properties
		const allowedProps = [
			"version",
			"platform",
			"duration",
			"success",
			"filesCount",
			"method",
			"trigger",
			"feature",
			"viewId",
			"command",
		];

		for (const key of allowedProps) {
			if (key in properties) {
				sanitized[key] = properties[key];
			}
		}

		return sanitized;
	}

	private generateAnonymousId(): string {
		// Simple implementation - in real app would use machine ID
		return `${this.environment}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get current package version
	 * @returns The current version string
	 */
	private getVersion(): string {
		try {
			// Try to get version from package.json
			const packageJson = require("../../package.json");
			return packageJson.version || "unknown";
		} catch (_error) {
			// Fallback to environment variable or default
			return process.env.SNAPBACK_VERSION || "1.0.0";
		}
	}

	/**
	 * Custom transport layer - routes all events through proxy
	 */
	private async customTransport(batch: TelemetryEventInternal[]): Promise<void> {
		// If offline mode is enabled, skip network requests
		if (this.offlineMode) {
			return;
		}

		try {
			const response = await fetch(this.proxyUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-SnapBack-Platform": this.environment,
					"X-SnapBack-Version": this.getVersion(),
				},
				body: JSON.stringify({
					events: batch.map((event) => ({
						event: event.event,
						properties: this.sanitizeProperties(event.properties || {}),
						timestamp: event.timestamp,
					})),
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				console.warn("Telemetry proxy rejected events", {
					status: response.status,
					error,
				});
			}
		} catch (error) {
			console.error("Failed to send telemetry through proxy", error);
			// Fail silently - never block user operations for telemetry
		}
	}

	private async flush() {
		// If offline mode is enabled, skip flushing
		if (this.offlineMode) {
			return;
		}

		if (this.eventQueue.length === 0) {
			return;
		}

		const eventsToFlush = [...this.eventQueue];
		this.eventQueue = [];

		try {
			// Use custom transport instead of direct PostHog connection
			await this.customTransport(eventsToFlush);
		} catch (error) {
			console.warn("Failed to send telemetry events:", error);
			// Re-add events to queue for retry
			this.eventQueue.unshift(...eventsToFlush);
		}
	}
}
