// Import the new core event schemas and validation from contracts
import { CoreEventSchema } from "@snapback/contracts/events";
import { logger } from "@snapback/infrastructure";
import { db, snapbackSchema } from "@snapback/platform";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/telemetry/event
 *
 * Collects telemetry data from the VS Code extension and stores in time-series database
 * Now using the new core event schemas from @snapback/contracts
 */

export async function POST(request: NextRequest) {
	try {
		// Extract auth context from request headers
		const authContextHeader = request.headers.get("x-auth-context");
		if (!authContextHeader) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const authContext = JSON.parse(authContextHeader);

		// Parse request body
		const body = await request.json();

		// Validate request body using new core event schema
		const eventValidation = CoreEventSchema.safeParse(body);

		if (!eventValidation.success) {
			// Log validation errors for debugging
			logger.warn("Invalid core telemetry event received", {
				errors: eventValidation.error.format(),
				body: body,
			});

			// Return 400 for invalid events
			return NextResponse.json(
				{
					error: "Invalid event format",
					details: eventValidation.error.format(),
				},
				{ status: 400 },
			);
		}

		const validatedEvent = eventValidation.data;

		// Store event in time-series database
		if (db) {
			try {
				await db.insert(snapbackSchema.telemetryEvents).values({
					id: `te_${nanoid()}`,
					userId: authContext.userId,
					apiKeyId: authContext.apiKeyId,
					eventType: validatedEvent.event,
					eventCategory: "core", // All new events are core events
					properties: validatedEvent.properties || {},
					platform: body.platform || "unknown",
					clientVersion: body.clientVersion || "unknown",
					ideVersion: body.ideVersion || "unknown",
					deviceFingerprint: authContext.deviceId,
					sessionId:
						("session_id" in validatedEvent.properties &&
							validatedEvent.properties.session_id) ||
						body.sessionId ||
						"unknown",
					timestamp: new Date(validatedEvent.timestamp),
				});
			} catch (dbError) {
				logger.error("Failed to store telemetry event in database", {
					dbError,
				});
				// Don't fail the request if database storage fails
			}
		}

		// Log event to analytics (PostHog)
		logger.info("Core telemetry event received and stored", {
			eventType: validatedEvent.event,
			timestamp: validatedEvent.timestamp,
			userId: authContext.userId,
			deviceId: authContext.deviceId,
			properties: validatedEvent.properties,
		});

		// Return success response quickly (no heavy processing)
		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error("Telemetry event error", { error });
		// Don't fail the request for telemetry errors
		return NextResponse.json({ success: true });
	}
}
