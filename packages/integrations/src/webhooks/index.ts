// POST on snapshot/guardian events; retry/backoff; offline fixtures for tests

import { EventEmitter } from "node:events";
import { RetryPresets, withRetry } from "@snapback-oss/sdk";

export interface WebhookEvent {
	id: string;
	type: "snapshot.created" | "snapshot.restored" | "guardian.alert" | "guardian.block";
	timestamp: Date;
	payload: any;
	metadata?: Record<string, any>;
}

export interface WebhookConfig {
	url: string;
	secret?: string;
	retries?: number;
	timeout?: number;
}

export class WebhookService extends EventEmitter {
	private config: WebhookConfig;
	private retryQueue: WebhookEvent[] = [];

	constructor(config: WebhookConfig) {
		super();
		this.config = {
			retries: 3,
			timeout: 5000,
			...config,
		};
	}

	async sendEvent(event: WebhookEvent): Promise<boolean> {
		try {
			// In offline mode, just log the event
			if (process.env.OFFLINE_MODE === "true") {
				console.log("Offline mode: Webhook event queued", event);
				return true;
			}

			// Send the webhook
			const response = await this.makeRequest(event);

			if (response.ok) {
				this.emit("success", event);
				return true;
			}
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		} catch (error) {
			console.error("Webhook failed:", error);

			// Add to retry queue
			this.retryQueue.push(event);
			this.emit("retry", event, error);

			// Attempt retry with exponential backoff
			return this.retryWithBackoff(event);
		}
	}

	private async makeRequest(event: WebhookEvent): Promise<Response> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": "SnapBack-Webhook/1.0",
		};

		// Add signature if secret is provided
		if (this.config.secret) {
			const signature = this.generateSignature(event, this.config.secret);
			headers["X-SnapBack-Signature"] = signature;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

		try {
			const response = await fetch(this.config.url, {
				method: "POST",
				headers,
				body: JSON.stringify(event),
				signal: controller.signal,
			});

			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private generateSignature(event: WebhookEvent, secret: string): string {
		// Simple signature generation (in reality, you'd use a proper HMAC)
		const data = JSON.stringify(event);
		// This is a placeholder - in reality, you'd use crypto.createHmac
		return `sha256=${Buffer.from(data + secret).toString("hex")}`;
	}

	private async retryWithBackoff(event: WebhookEvent): Promise<boolean> {
		try {
			await withRetry(
				async () => {
					const response = await this.makeRequest(event);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}
					return response;
				},
				{
					...RetryPresets.api,
					maxAttempts: this.config.retries || 3,
					onRetry: (attempt: number, error: Error) => {
						console.error(`Retry ${attempt} failed:`, error);
					},
				},
			);

			this.emit("success", event);
			// Remove from retry queue
			this.retryQueue = this.retryQueue.filter((e) => e.id !== event.id);
			return true;
		} catch (_error) {
			this.emit("failure", event);
			return false;
		}
	}

	// Process the retry queue
	async processRetryQueue(): Promise<void> {
		const queue = [...this.retryQueue];
		this.retryQueue = [];

		for (const event of queue) {
			await this.retryWithBackoff(event);
		}
	}
}

// Export a singleton instance for easy use
let webhookService: WebhookService | null = null;

export function getWebhookService(config?: WebhookConfig): WebhookService {
	if (!webhookService && config) {
		webhookService = new WebhookService(config);
	}

	if (!webhookService) {
		throw new Error("Webhook service not initialized. Call getWebhookService with config first.");
	}

	return webhookService;
}
