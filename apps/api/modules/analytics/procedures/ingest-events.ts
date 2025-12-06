/**
 * Analytics Ingestion Procedure
 *
 * Receives batches of analytics events from the analytics client
 * Writes to analyticsEvents table and forwards to PostHog
 */

import type { AnalyticsIngestResponse } from "@snapback/contracts";
import { telemetryEvents } from "@snapback/platform";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

// PostHog client (lazy initialized)
// biome-ignore lint/suspicious/noExplicitAny: Lazy loaded optional dependency
let posthog: any = null;

function getPostHogClient() {
	if (!posthog && process.env.POSTHOG_KEY) {
		// Import PostHog only if needed
		try {
			const { PostHog } = require("posthog-node");
			posthog = new PostHog(process.env.POSTHOG_KEY, {
				host: process.env.POSTHOG_HOST || "https://app.posthog.com",
			});
		} catch (error) {
			console.warn("[Analytics] PostHog not available:", error);
		}
	}
	return posthog;
}

// Input validation schema
const ingestEventsInputSchema = z.object({
	events: z.array(
		z.object({
			name: z.string(),
			userId: z.string(),
			timestamp: z.number(),
			meta: z.record(z.string(), z.any()).optional(),
		}),
	),
	sentAt: z.number(),
	batchId: z.string(),
});

/**
 * Ingest analytics events
 * Writes to database and forwards to PostHog
 */
export const ingestEvents = protectedProcedure
	.input(ingestEventsInputSchema)
	.handler(async ({ input, context }): Promise<AnalyticsIngestResponse> => {
		const db = getDb();

		if (!db) {
			throw new Error("Database not available");
		}
		const errors: string[] = [];
		let successCount = 0;

		try {
			// Write events to database
			const dbInserts = input.events.map((event) => ({
				eventType: event.name,
				userId: event.userId,
				apiKeyId: context.auth?.apiKeyId,
				sessionId: context.auth?.sessionId,
				properties: event.meta || {},
				timestamp: new Date(event.timestamp),
			}));

			const insertResult = await db
				.insert(telemetryEvents)
				.values(dbInserts)
				.returning({ id: telemetryEvents.id });
			successCount = dbInserts.length;

			// Forward to PostHog (optional, non-blocking)
			const ph = getPostHogClient();
			if (ph) {
				try {
					for (const event of input.events) {
						ph.capture({
							distinctId: event.userId,
							event: event.name,
							properties: event.meta || {},
							timestamp: new Date(event.timestamp),
						});
					}
					await ph.flush();
				} catch (phError) {
					console.warn("[Analytics] PostHog forwarding failed:", phError);
					errors.push("PostHog forwarding failed");
				}
			}

			return {
				success: true,
				eventCount: successCount,
				eventIds: insertResult.map((r: { id: string }) => r.id),
				errors:
					errors.length > 0
						? errors.map((err, idx) => ({ index: idx, error: err }))
						: undefined,
			};
		} catch (error) {
			console.error("[Analytics] Ingestion error:", error);
			errors.push(error instanceof Error ? error.message : "Unknown error");

			return {
				success: false,
				eventCount: successCount,
				errors: errors.map((err, idx) => ({ index: idx, error: err })),
			};
		}
	});
