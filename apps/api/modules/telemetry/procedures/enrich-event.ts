import { logger } from "@snapback/infrastructure";
import { apiKeys, snapbackSchema, subscriptions } from "@snapback/platform";
import { and, eq, gt } from "drizzle-orm";
import { PostHog } from "posthog-node";
import { z } from "zod";
import { trackUsage } from "../../../lib/usage.js";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

// Initialize PostHog client for marketing analytics
let posthogClient: PostHog | null = null;

function getPostHog(): PostHog {
	if (!posthogClient) {
		const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
		if (!posthogKey) {
			throw new Error("NEXT_PUBLIC_POSTHOG_KEY is required");
		}
		posthogClient = new PostHog(posthogKey, {
			host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
		});
	}
	return posthogClient;
}

// Simplified telemetry event types for MVP
const DecisionEventSchema = z.object({
	type: z.literal("decision"),
	timestamp: z.number(),
	filePath: z.string(),
	protectionLevel: z.enum(["watch", "warn", "block"]),
	riskScore: z.number().min(0).max(100),
	factors: z.array(z.string()),
	userId: z.string(),
	sessionId: z.string().optional(),
	idempotencyKey: z.string().optional(), // MVP Note: Added for idempotency support
});

const OutcomeEventSchema = z.object({
	type: z.literal("outcome"),
	timestamp: z.number(),
	filePath: z.string(),
	action: z.enum(["snapshot_created", "snapshot_restored", "save_blocked", "save_allowed"]),
	duration: z.number().optional(),
	userId: z.string(),
	sessionId: z.string().optional(),
	idempotencyKey: z.string().optional(), // MVP Note: Added for idempotency support
});

const EnrichEventSchema = z.discriminatedUnion("type", [DecisionEventSchema, OutcomeEventSchema]);

export const enrichEvent = protectedProcedure.input(EnrichEventSchema).handler(async ({ input, context }) => {
	const user = context.user;
	if (!user) {
		throw new Error("Unauthorized");
	}

	// MVP Note: Check for existing idempotency key to prevent duplicate processing
	// This prevents inflated analytics and billing issues from client retries
	if (input.idempotencyKey) {
		const db = getDb();
		if (db) {
			try {
				const existing = await db
					.select()
					.from(snapbackSchema.telemetryIdempotencyKeys)
					.where(
						and(
							eq(snapbackSchema.telemetryIdempotencyKeys.idempotencyKey, input.idempotencyKey),
							gt(snapbackSchema.telemetryIdempotencyKeys.expiresAt, new Date()),
						),
					)
					.limit(1);

				if (existing && existing.length > 0) {
					// Return cached response for idempotent requests
					logger.info("Returning cached response for idempotency key", {
						idempotencyKey: input.idempotencyKey,
					});
					return existing[0].responseData;
				}
			} catch (error) {
				logger.error("Failed to check idempotency key", { error });
				// Continue processing if idempotency check fails
			}
		}
	}

	// Get user's API key
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)).limit(1);

	if (!apiKeyResult || apiKeyResult.length === 0) {
		throw new Error("No API key found");
	}

	const apiKey = apiKeyResult[0];

	// Get user's subscription for feature flags
	const subscriptionResult = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

	const subscription = subscriptionResult && subscriptionResult.length > 0 ? subscriptionResult[0] : null;

	// Create enriched event data for Postgres storage (product telemetry)
	const enrichedEvent = {
		userId: user.id,
		apiKeyId: apiKey.id,
		eventType: input.type,
		eventCategory: input.type === "decision" ? "risk_analysis" : "user_action",
		properties: input,
		platform: "vscode",
		clientVersion: "mvp", // Will be updated by client
		timestamp: new Date(input.timestamp),
		sessionId: input.sessionId,
	};

	// Store product events in Postgres for detailed analysis and reporting
	// MVP Note: Product telemetry is stored in Postgres for better control and analysis
	// while PostHog is retained for marketing/analytics purposes only
	try {
		if (db) {
			await db.insert(snapbackSchema.telemetryEvents).values({
				...enrichedEvent,
				id: `te_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			});
		}
	} catch (error) {
		logger.error("Failed to store telemetry event in database", {
			error,
		});
		// Don't fail the request if database storage fails
	}

	// Track usage for billing
	trackUsage({
		requestId: crypto.randomUUID(),
		apiKeyId: apiKey.id,
		userId: user.id,
		endpoint: "/api/telemetry/enrich",
		method: "POST",
		tokensUsed: 0,
		responseTime: 0,
		responseStatus: 200,
		cached: false,
		metadata: {
			eventType: input.type,
		},
	}).catch(console.error);

	// Send to PostHog for marketing analytics (not product telemetry)
	// MVP Note: PostHog is retained for marketing/analytics purposes only
	// Product telemetry is stored in Postgres for better control and analysis
	try {
		const posthog = getPostHog();
		posthog.capture({
			distinctId: user.id,
			event: `telemetry_${input.type}`,
			properties: {
				...input,
				plan: subscription?.plan || "free",
				timestamp: new Date(input.timestamp).toISOString(),
				// Only send minimal data to PostHog for marketing purposes
				// Detailed product telemetry stays in our database
			},
		});
	} catch (error) {
		logger.error("PostHog error", { error });
	}

	// Prepare response
	const response = {
		success: true,
		timestamp: new Date().toISOString(),
	};

	// MVP Note: Store idempotency key with response for future duplicate requests
	// Keys expire after 24 hours to prevent unbounded growth
	if (input.idempotencyKey && db) {
		try {
			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

			await db
				.insert(snapbackSchema.telemetryIdempotencyKeys)
				.values({
					idempotencyKey: input.idempotencyKey,
					responseData: response,
					createdAt: new Date(),
					expiresAt: expiresAt,
				})
				.onConflictDoNothing(); // Ignore if key already exists (race condition protection)
		} catch (error) {
			logger.error("Failed to store idempotency key", { error });
			// Don't fail the request if idempotency storage fails
		}
	}

	return response;
});
