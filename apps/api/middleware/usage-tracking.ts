import { logger } from "@snapback/infrastructure";
import { db, snapbackSchema } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

/**
 * Usage Tracking Middleware
 *
 * Tracks API usage and enforces limits for snapshots and API calls
 */

export interface UsageLimitResult {
	allowed: boolean;
	limitType?: "snapshot" | "api_call";
	message?: string;
	upgradePrompt?: {
		message: string;
		cta: string;
		ctaUrl: string;
	};
}

export async function usageTrackingMiddleware(request: NextRequest) {
	try {
		// Extract auth context from request headers
		const authContextHeader = request.headers.get("x-auth-context");
		if (!authContextHeader) {
			// If no auth context, allow request to proceed
			return { allowed: true };
		}

		const authContext = JSON.parse(authContextHeader);

		// Check if this is a snapshot-related endpoint
		const isSnapshotEndpoint = request.nextUrl.pathname.includes("/snapshots");

		if (isSnapshotEndpoint) {
			// Check snapshot limits
			return await checkSnapshotLimit(authContext);
		}

		// For all endpoints, track API calls
		await trackApiCall(authContext);

		return { allowed: true };
	} catch (error) {
		logger.error("Usage tracking middleware error", { error });
		// In case of error, allow the request to proceed
		return { allowed: true };
	}
}

async function checkSnapshotLimit(authContext: any): Promise<UsageLimitResult> {
	try {
		if (!db) {
			return { allowed: true }; // Allow if database not available
		}

		if (authContext.type === "device") {
			// Check device trial snapshot limit
			const deviceTrialsResult = await db
				.select()
				.from(snapbackSchema.deviceTrials)
				.where(
					eq(
						snapbackSchema.deviceTrials.deviceFingerprint,
						authContext.deviceId,
					),
				);

			if (deviceTrialsResult.length > 0) {
				const deviceTrial = deviceTrialsResult[0];

				// Check if snapshot limit reached
				if (
					deviceTrial &&
					deviceTrial.snapshotsUsed >= deviceTrial.snapshotLimit
				) {
					return {
						allowed: false,
						limitType: "snapshot",
						message: "Snapshot limit reached",
						upgradePrompt: {
							message: "Upgrade to create unlimited snapshots",
							cta: "Upgrade to Pro",
							ctaUrl: "/pricing",
						},
					};
				}
			}
		} else if (authContext.type === "user") {
			// For authenticated users, we would check their subscription limits
			// This is a simplified implementation
			// In a real implementation, this would check against user's plan limits
		}

		// If under limit, allow request and increment counter
		await incrementSnapshotCounter(authContext);
		return { allowed: true };
	} catch (error) {
		logger.error("Snapshot limit check error", { error });
		// In case of error, allow the request to proceed
		return { allowed: true };
	}
}

async function incrementSnapshotCounter(authContext: any) {
	try {
		if (!db) {
			return;
		}

		if (authContext.type === "device") {
			// Increment snapshot counter for device trial
			await db
				.update(snapbackSchema.deviceTrials)
				.set({
					snapshotsUsed: sql`${snapbackSchema.deviceTrials.snapshotsUsed} + 1`,
				})
				.where(
					eq(
						snapbackSchema.deviceTrials.deviceFingerprint,
						authContext.deviceId,
					),
				);
		} else if (authContext.type === "user") {
			// For authenticated users, we would update their usage stats
			// This is a simplified implementation
		}
	} catch (error) {
		logger.error("Snapshot counter increment error", { error });
	}
}

async function trackApiCall(authContext: any) {
	try {
		if (!db) {
			return;
		}

		if (authContext.type === "device") {
			// Increment API call counter for device trial
			await db
				.update(snapbackSchema.deviceTrials)
				.set({
					apiCallsUsed: sql`${snapbackSchema.deviceTrials.apiCallsUsed} + 1`,
				})
				.where(
					eq(
						snapbackSchema.deviceTrials.deviceFingerprint,
						authContext.deviceId,
					),
				);
		} else if (authContext.type === "user") {
			// For authenticated users, we would update their usage stats
			// This is a simplified implementation
		}
	} catch (error) {
		logger.error("API call tracking error", { error });
	}
}
