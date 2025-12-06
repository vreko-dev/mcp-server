#!/usr/bin/env tsx

/**
 * Quarantine Replay CLI
 *
 * Replays a quarantined telemetry event by fetching it from quarantine_events
 * and attempting to re-insert it using the appropriate TelemetrySinkDb method.
 *
 * Usage:
 *   pnpm quarantine:replay --event-id <quarantine-event-id>
 *
 * Example:
 *   pnpm quarantine:replay --event-id 550e8400-e29b-41d4-a716-446655440000
 */

import { eq } from "drizzle-orm";
import {
	type AgentSuggestionEvent,
	type FeedbackEvent,
	type LoopEvent,
	type PolicyEvaluationEvent,
	type PostAcceptOutcomeEvent,
	TelemetrySinkDb,
} from "../packages/platform/src/db/adapters/TelemetrySinkDb";
import { db } from "../packages/platform/src/db/client";
import { quarantineEvents } from "../packages/platform/src/db/schema/snapback/quarantine-events";

interface QuarantinedEvent {
	id: string;
	userId: string;
	apiKeyId: string;
	originalEvent: any;
	errorReason: string;
	errorStack: string | null;
	attemptedAt: Date;
	createdAt: Date;
}

/**
 * Determine event type from originalEvent structure
 */
function detectEventType(
	event: any,
): "agent_suggestion" | "post_accept_outcome" | "policy_evaluation" | "loop" | "feedback" | "unknown" {
	// Agent suggestion event has suggestionId and suggestionText
	if ("suggestionId" in event && "suggestionText" in event && !("editsMade" in event)) {
		return "agent_suggestion";
	}

	// Post-accept outcome has suggestionId and editsMade
	if ("suggestionId" in event && "editsMade" in event) {
		return "post_accept_outcome";
	}

	// Policy evaluation has policyName
	if ("policyName" in event) {
		return "policy_evaluation";
	}

	// Loop event has loopType
	if ("loopType" in event) {
		return "loop";
	}

	// Feedback event has feedbackType
	if ("feedbackType" in event) {
		return "feedback";
	}

	return "unknown";
}

/**
 * Replay a quarantined event
 */
async function replayQuarantinedEvent(eventId: string): Promise<void> {
	console.log(`\n🔄 Fetching quarantined event: ${eventId}`);

	if (!db) {
		console.error("❌ Database connection not available");
		process.exit(1);
	}

	// Fetch quarantined event
	const results = await db.select().from(quarantineEvents).where(eq(quarantineEvents.id, eventId)).limit(1);

	if (results.length === 0) {
		console.error(`❌ Quarantined event not found: ${eventId}`);
		process.exit(1);
	}

	const quarantinedEvent = results[0] as QuarantinedEvent;

	console.log(`📦 Original error: ${quarantinedEvent.errorReason}`);
	console.log(`📅 Attempted at: ${quarantinedEvent.attemptedAt.toISOString()}`);

	// Detect event type
	const eventType = detectEventType(quarantinedEvent.originalEvent);
	console.log(`🔍 Detected event type: ${eventType}`);

	if (eventType === "unknown") {
		console.error("❌ Unknown event type - cannot replay");
		console.error("Event structure:", JSON.stringify(quarantinedEvent.originalEvent, null, 2));
		process.exit(1);
	}

	// Create telemetry sink
	const telemetrySink = new TelemetrySinkDb(db);

	try {
		console.log("🚀 Replaying event...");

		switch (eventType) {
			case "agent_suggestion":
				await telemetrySink.insertAgentSuggestion(quarantinedEvent.originalEvent as AgentSuggestionEvent);
				break;

			case "post_accept_outcome":
				await telemetrySink.insertPostAcceptOutcome(quarantinedEvent.originalEvent as PostAcceptOutcomeEvent);
				break;

			case "policy_evaluation":
				await telemetrySink.insertPolicyEvaluation(quarantinedEvent.originalEvent as PolicyEvaluationEvent);
				break;

			case "loop":
				await telemetrySink.insertLoop(quarantinedEvent.originalEvent as LoopEvent);
				break;

			case "feedback":
				await telemetrySink.insertFeedback(quarantinedEvent.originalEvent as FeedbackEvent);
				break;

			default:
				throw new Error(`Unhandled event type: ${eventType}`);
		}

		console.log("✅ Replay successful!");
		console.log(`Event ID: ${eventId}`);
		console.log(`Event type: ${eventType}`);
		console.log(`Request ID: ${quarantinedEvent.originalEvent.requestId}`);
		process.exit(0);
	} catch (error) {
		console.error("❌ Replay failed!");
		console.error(`Event ID: ${eventId}`);
		console.error(`Event type: ${eventType}`);
		console.error("Error:", error instanceof Error ? error.message : String(error));

		if (error instanceof Error && error.stack) {
			console.error("\nStack trace:");
			console.error(error.stack);
		}

		process.exit(1);
	}
}

/**
 * Main CLI entrypoint
 */
async function main() {
	const args = process.argv.slice(2);

	// Parse --event-id flag
	const eventIdIndex = args.indexOf("--event-id");
	if (eventIdIndex === -1 || eventIdIndex === args.length - 1) {
		console.error("❌ Missing required flag: --event-id");
		console.error("\nUsage: pnpm quarantine:replay --event-id <quarantine-event-id>");
		process.exit(1);
	}

	const eventId = args[eventIdIndex + 1];

	if (!eventId) {
		console.error("❌ Invalid event ID");
		process.exit(1);
	}

	await replayQuarantinedEvent(eventId);
}

// Run CLI
main().catch((error) => {
	console.error("💥 Unexpected error:", error);
	process.exit(1);
});
