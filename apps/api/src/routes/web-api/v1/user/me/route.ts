import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { db, snapbackSchema } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/user/me
 *
 * Returns user information including subscription plan and usage limits
 */

export async function GET(request: NextRequest) {
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

		if (authContext.type === "device") {
			// Handle device trial user
			return await handleDeviceTrialUser(authContext);
		}
		// Handle authenticated user
		return await handleAuthenticatedUser(authContext, request);
	} catch (error) {
		logger.error("User info endpoint error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function handleDeviceTrialUser(authContext: any) {
	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		const deviceTrialsResult = await db
			.select()
			.from(snapbackSchema.deviceTrials)
			.where(
				eq(snapbackSchema.deviceTrials.deviceFingerprint, authContext.deviceId),
			);

		if (deviceTrialsResult.length === 0) {
			return NextResponse.json(
				{ error: "Device trial not found" },
				{ status: 404 },
			);
		}

		const deviceTrial = deviceTrialsResult[0];
		if (!deviceTrial) {
			return NextResponse.json(
				{ error: "Device trial not found" },
				{ status: 404 },
			);
		}

		// Calculate usage percentages
		const snapshotPercentage =
			deviceTrial.snapshotLimit > 0
				? (deviceTrial.snapshotsUsed / deviceTrial.snapshotLimit) * 100
				: 0;

		const apiCallPercentage =
			deviceTrial.apiCallLimit > 0
				? (deviceTrial.apiCallsUsed / deviceTrial.apiCallLimit) * 100
				: 0;

		// Prepare response
		const response = {
			deviceId: deviceTrial.deviceFingerprint,
			plan: "free",
			limits: {
				snapshots: deviceTrial.snapshotLimit,
				requestsPerHour: deviceTrial.apiCallLimit,
				storage: 0, // Device trials have no cloud storage
			},
			usage: {
				snapshots: deviceTrial.snapshotsUsed,
				requestsThisHour: deviceTrial.apiCallsUsed,
				storage: 0,
			},
			// Add upgrade prompt if near limits
			...(snapshotPercentage > 80 || apiCallPercentage > 80
				? {
						upgradePrompt: {
							message: "Upgrade for unlimited snapshots and cloud backup",
							cta: "Upgrade to Pro",
							ctaUrl: "/pricing",
						},
					}
				: {}),
		};

		return NextResponse.json(response);
	} catch (error) {
		logger.error("Device trial user handling error", { error });
		return NextResponse.json(
			{ error: "Failed to retrieve device trial info" },
			{ status: 500 },
		);
	}
}

async function handleAuthenticatedUser(authContext: any, request: NextRequest) {
	try {
		// Get user data from Better Auth
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// In a real implementation, this would fetch user data and subscription info
		// For now, we'll return mock data based on the auth context

		const response = {
			userId: session.user.id,
			email: session.user.email,
			plan: authContext.plan,
			limits: authContext.permissions,
			usage: {
				checkpoints: 0, // Would be fetched from database
				requestsThisHour: 0, // Would be fetched from database
				storage: 0, // Would be fetched from database
			},
		};

		return NextResponse.json(response);
	} catch (error) {
		logger.error("Authenticated user handling error", { error });
		return NextResponse.json(
			{ error: "Failed to retrieve user info" },
			{ status: 500 },
		);
	}
}
