import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "@/lib/logger";
import type { TelemetrySink } from "../../ports/TelemetrySink";

// In-memory telemetry sink for development/testing
class InMemoryTelemetrySink implements TelemetrySink {
	private events: Map<string, any> = new Map();
	private requestIds: Set<string> = new Set();

	async storeEvents(events: any[]): Promise<void> {
		for (const event of events) {
			this.events.set(event.id, event);
		}
	}

	async getEvents(filter?: {
		eventType?: string;
		sessionId?: string;
		startTime?: number;
		endTime?: number;
	}): Promise<any[]> {
		let events = Array.from(this.events.values());

		if (filter?.eventType) {
			events = events.filter((event) => event.eventType === filter.eventType);
		}

		if (filter?.sessionId) {
			events = events.filter((event) => event.context?.sessionId === filter.sessionId);
		}

		if (filter?.startTime !== undefined) {
			events = events.filter((event) => event.timestamp >= (filter.startTime || 0));
		}

		if (filter?.endTime !== undefined) {
			events = events.filter((event) => event.timestamp <= (filter.endTime || Number.MAX_SAFE_INTEGER));
		}

		return events;
	}

	async hasRequestId(requestId: string): Promise<boolean> {
		return this.requestIds.has(requestId);
	}

	async recordRequestId(requestId: string): Promise<void> {
		this.requestIds.add(requestId);
	}
}

// Initialize telemetry sink
const telemetrySink: TelemetrySink = new InMemoryTelemetrySink();

const app = new Hono();

// Input validation schema
const telemetryIngestSchema = z.object({
	events: z.array(
		z.object({
			id: z.string().optional(),
			eventType: z.string(),
			payload: z.record(z.string(), z.any()),
			timestamp: z.number(),
			context: z
				.object({
					sessionId: z.string(),
					requestId: z.string(),
					workspaceId: z.string().optional(),
					client: z.enum(["vscode", "mcp", "cli", "web"]),
				})
				.optional(),
		}),
	),
	context: z
		.object({
			sessionId: z.string(),
			requestId: z.string(),
			workspaceId: z.string().optional(),
			client: z.enum(["vscode", "mcp", "cli", "web"]),
		})
		.optional(),
});

// POST /api/v1/telemetry/ingest
app.post("/telemetry/ingest", zValidator("json", telemetryIngestSchema), async (c) => {
	try {
		const requestData = c.req.valid("json");

		// Check for idempotency
		const requestId =
			requestData.context?.requestId || requestData.events[0]?.context?.requestId || `req-${Date.now()}`;

		if (await telemetrySink.hasRequestId(requestId)) {
			return c.json(
				{
					received: true,
					requestId,
					message: "Request already processed (idempotent)",
				},
				202,
			);
		}

		// Add IDs to events if not provided
		const eventsWithIds = requestData.events.map((event) => ({
			...event,
			id: event.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			timestamp: event.timestamp || Date.now(),
		}));

		// Store events
		await telemetrySink.storeEvents(eventsWithIds);

		// Record request ID for idempotency
		await telemetrySink.recordRequestId(requestId);

		return c.json(
			{
				received: true,
				requestId,
				count: eventsWithIds.length,
			},
			202,
		);
	} catch (error) {
		log.error(error as Error, { context: "Telemetry ingest" });
		return c.json(
			{
				error: error instanceof Error ? error.message : "Failed to ingest telemetry",
			},
			500,
		);
	}
});

export default app;
