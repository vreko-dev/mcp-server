import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { db, deviceTrials, snapshots } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/checkpoints/metadata
 *
 * Creates and stores checkpoint metadata
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

		// Validate request body
		if (!body.name && !body.description && !body.projectPath) {
			return NextResponse.json(
				{
					error:
						"At least one of name, description, or projectPath is required",
				},
				{ status: 400 },
			);
		}

		if (authContext.type === "device") {
			// Handle device trial user
			return await handleDeviceTrialCheckpoint(authContext, body);
		}
		// Handle authenticated user
		return await handleAuthenticatedUserCheckpoint(authContext, body, request);
	} catch (error) {
		logger.error("Checkpoint creation error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function handleDeviceTrialCheckpoint(authContext: any, body: any) {
	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		// Check if device trial exists and is not blocked
		const deviceTrialsResult = await db
			.select()
			.from(deviceTrials)
			.where(eq(deviceTrials.deviceFingerprint, authContext.deviceId));

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

		// Check if device is blocked
		const now = new Date();
		if (deviceTrial.blockedUntil && deviceTrial.blockedUntil > now) {
			return NextResponse.json(
				{ error: "Device trial has been blocked" },
				{ status: 403 },
			);
		}

		// Check if snapshot limit reached
		if (deviceTrial.snapshotsUsed >= deviceTrial.snapshotLimit) {
			return NextResponse.json(
				{
					error: "Snapshot limit reached",
					upgradePrompt: {
						message: "Upgrade to create unlimited snapshots",
						cta: "Upgrade to Pro",
						ctaUrl: "/pricing",
					},
				},
				{ status: 402 },
			);
		}

		// Create snapshot
		const snapshotResult = await db
			.insert(snapshots)
			.values({
				userId: `device_${authContext.deviceId}`,
				apiKeyId: authContext.apiKeyId,
				trigger: "manual",
				name: body.name || "",
				description: body.description || "",
				projectPath: body.projectPath || "",
				metadata: {
					tags: body.tags || [],
					clientVersion: body.clientVersion || "",
					ideVersion: body.ideVersion || "",
					platform: body.platform || "",
				},
			})
			.returning();

		const newSnapshot = snapshotResult[0];
		if (!newSnapshot) {
			return NextResponse.json(
				{ error: "Failed to create snapshot" },
				{ status: 500 },
			);
		}

		// Increment snapshot counter for device trial
		await db
			.update(deviceTrials)
			.set({
				snapshotsUsed: sql`${deviceTrials.snapshotsUsed} + 1`,
			})
			.where(eq(deviceTrials.deviceFingerprint, authContext.deviceId));

		// Return success response
		return NextResponse.json(
			{
				checkpointId: newSnapshot.id,
				createdAt: newSnapshot.createdAt.toISOString(),
				metadata: {
					name: newSnapshot.name || "",
					description: newSnapshot.description || "",
					tags: newSnapshot.metadata?.tags || [],
					projectPath: newSnapshot.projectPath || "",
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		logger.error("Device trial checkpoint creation error", { error });
		return NextResponse.json(
			{ error: "Failed to create checkpoint" },
			{ status: 500 },
		);
	}
}

async function handleAuthenticatedUserCheckpoint(
	authContext: any,
	body: any,
	request: NextRequest,
) {
	try {
		if (!db) {
			return NextResponse.json(
				{ error: "Database not available" },
				{ status: 500 },
			);
		}

		// Get user session
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Invalid authorization header" },
				{ status: 401 },
			);
		}

		const token = authHeader.substring(7);
		const session = await auth.api.getSession({
			headers: new Headers({
				Authorization: `Bearer ${token}`,
			}),
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid session" }, { status: 401 });
		}

		// In a real implementation, this would check user's subscription limits
		// For now, we'll allow the snapshot creation

		// Create snapshot
		const snapshotResult = await db
			.insert(snapshots)
			.values({
				userId: session.user.id,
				apiKeyId: authContext.apiKeyId,
				trigger: "manual",
				name: body.name || "",
				description: body.description || "",
				projectPath: body.projectPath || "",
				metadata: {
					tags: body.tags || [],
					clientVersion: body.clientVersion || "",
					ideVersion: body.ideVersion || "",
					platform: body.platform || "",
				},
			})
			.returning();

		const newSnapshot = snapshotResult[0];
		if (!newSnapshot) {
			return NextResponse.json(
				{ error: "Failed to create snapshot" },
				{ status: 500 },
			);
		}

		// Return success response
		return NextResponse.json(
			{
				checkpointId: newSnapshot.id,
				createdAt: newSnapshot.createdAt.toISOString(),
				metadata: {
					name: newSnapshot.name || "",
					description: newSnapshot.description || "",
					tags: newSnapshot.metadata?.tags || [],
					projectPath: newSnapshot.projectPath || "",
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		logger.error("Authenticated user checkpoint creation error", { error });
		return NextResponse.json(
			{ error: "Failed to create checkpoint" },
			{ status: 500 },
		);
	}
}
