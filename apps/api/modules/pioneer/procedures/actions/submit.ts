/**
 * POST /api/pioneer/actions/submit
 * Submit a pioneer action (star, Discord, feedback, bug report, tutorial)
 */

import { logger } from "@snapback/infrastructure";
import { pioneerActions, pioneers, pioneerTierHistory } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { ensureDatabase, getPioneerProfile, mapDbProfileToApiProfile } from "../../services/pioneer-service";
import type { PioneerAction } from "../../types";
import { calculateTierFromPoints, POINT_VALUES } from "../../types";

const submitActionSchema = z.object({
	actionType: z.enum(["github_star", "discord_join", "referral", "feedback", "bug_report", "tutorial_complete"]),
	metadata: z.record(z.unknown()).optional(),
});

export const submitAction = protectedProcedure
	.route({
		method: "POST",
		path: "/pioneer/actions/submit",
		tags: ["Pioneer Program"],
		summary: "Submit a pioneer action",
	})
	.input(submitActionSchema)
	.handler(async ({ input, context }) => {
		const user = context.user;

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		const db = ensureDatabase();
		const { actionType, metadata } = input;

		// Get points for this action
		const points = POINT_VALUES[actionType] || 0;

		if (points <= 0) {
			throw new Error(`Invalid action type: ${actionType}`);
		}

		const now = new Date();

		// Fetch pioneer profile (consolidated)
		const pioneer = await getPioneerProfile(user.id);
		const previousTier = pioneer.tier;

		// Create action record in database
		const newAction = await db
			.insert(pioneerActions)
			.values({
				pioneerId: pioneer.id,
				actionType: actionType as any,
				points,
				verified: actionType === "tutorial_complete",
				metadata: metadata,
				createdAt: now,
			})
			.returning();

		if (!newAction || newAction.length === 0) {
			throw new Error("FAILED_TO_CREATE_ACTION");
		}

		const action = newAction[0];

		// Update pioneer points and tier
		const newTotalPoints = pioneer.totalPoints + points;
		const newTier = calculateTierFromPoints(newTotalPoints);

		// Update pioneer profile
		const updatedPioneer = await db
			.update(pioneers)
			.set({
				totalPoints: newTotalPoints,
				tier: newTier,
				lastSyncedAt: now,
				updatedAt: now,
			})
			.where(eq(pioneers.id, pioneer.id))
			.returning();

		if (!updatedPioneer || updatedPioneer.length === 0) {
			throw new Error("FAILED_TO_UPDATE_PIONEER");
		}

		const updatedProfile = updatedPioneer[0];

		// If tier changed, record it in tier history
		if (previousTier !== newTier) {
			await db.insert(pioneerTierHistory).values({
				pioneerId: pioneer.id,
				previousTier: previousTier,
				newTier,
				pointsAtTransition: newTotalPoints,
				createdAt: now,
			});
		}

		logger.info("Pioneer action submitted", {
			pioneerId: pioneer.id,
			actionType,
			points,
			tierChanged: previousTier !== newTier,
			tierBefore: previousTier,
			tierAfter: newTier,
			newTotalPoints,
		});

		return {
			success: true,
			action: {
				id: action.id,
				pioneerId: action.pioneerId,
				actionType: action.actionType as PioneerAction["actionType"],
				points: action.points,
				verified: action.verified,
				metadata: action.metadata,
				createdAt: action.createdAt instanceof Date ? action.createdAt.toISOString() : action.createdAt,
			},
			profile: mapDbProfileToApiProfile(updatedProfile),
		};
	});
