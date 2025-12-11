/**
 * GET /api/pioneer/me
 * Fetch authenticated user's pioneer profile
 *
 * Requirements from tests:
 * - Return full profile with all fields
 * - Tier must match point thresholds
 * - Require authentication
 * - Include referral code
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getPioneerProfile } from "../services/pioneer-service";

export const me = protectedProcedure
	.route({
		method: "GET",
		path: "/pioneer/me",
		tags: ["Pioneer Program"],
		summary: "Get authenticated pioneer profile",
	})
	.input(z.void())
	.handler(async ({ context }) => {
		const user = context.user;

		if (!user) {
			throw new Error("UNAUTHORIZED");
		}

		// Use consolidated service
		const profile = await getPioneerProfile(user.id);

		logger.info("Pioneer profile fetched", {
			pioneerId: profile.id,
			githubId: profile.githubId,
			tier: profile.tier,
			totalPoints: profile.totalPoints,
		});

		return {
			success: true,
			profile,
		};
	});
