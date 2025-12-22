/**
 * POST /api/pioneer/signup
 * Create a new pioneer profile on first GitHub login
 *
 * Request:
 * - githubId: string (from session)
 * - username: string (from session)
 *
 * Response:
 * - PioneerProfile with default seedling tier and referralCode
 */

import { logger } from "@snapback/infrastructure";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import {
	calculateTierFromPoints,
	createPioneerProfile,
	findPioneerByGithubId,
	generateReferralCode,
	mapDbProfileToApiProfile,
	POINT_VALUES,
} from "@/src/services/pioneer-service";

const signupSchema = z.object({
	githubId: z.string().min(1),
	username: z.string().min(1),
	githubStarred: z.boolean().optional().default(false),
	isFromWaitlist: z.boolean().optional().default(false),
});

export const signup = publicProcedure
	.route({
		method: "POST",
		path: "/pioneer/signup",
		tags: ["Pioneer Program"],
		summary: "Create pioneer profile on first GitHub login",
	})
	.input(signupSchema)
	.handler(async ({ input }) => {
		const { githubId, username, githubStarred, isFromWaitlist } = input;

		// Check for existing pioneer profile with this GitHub ID (via service layer)
		const existingProfile = await findPioneerByGithubId(githubId);

		if (existingProfile) {
			logger.info("Pioneer signup: profile already exists", {
				githubId,
				userid: existingProfile.userId,
			});
			return {
				success: true,
				profile: mapDbProfileToApiProfile(existingProfile),
				message: "Welcome back!",
			};
		}

		// Determine initial points: waitlist bonus + optional star bonus
		let initialPoints = 0;
		if (isFromWaitlist) {
			initialPoints += POINT_VALUES.waitlist_early; // 50 points
		}
		if (githubStarred) {
			initialPoints += POINT_VALUES.github_star; // 100 points
		}

		const now = new Date();

		// Generate referral code (via service layer)
		const referralCode = generateReferralCode(username);

		// Create pioneer profile in database (via service layer)
		const newPioneer = await createPioneerProfile({
			userId: githubId, // GitHub user ID from OAuth (this is the actual user ID)
			username,
			githubId,
			tier: calculateTierFromPoints(initialPoints),
			totalPoints: initialPoints,
			joinedAt: now,
			referralCode,
			githubStarred,
			lastSyncedAt: now,
			createdAt: now,
			updatedAt: now,
		});

		if (!newPioneer) {
			throw new Error("FAILED_TO_CREATE_PIONEER");
		}

		logger.info("Pioneer signup: profile created", {
			pioneerId: newPioneer.id,
			githubId,
			tier: newPioneer.tier,
			totalPoints: initialPoints,
			referralCode,
		});

		return {
			success: true,
			profile: mapDbProfileToApiProfile(newPioneer),
			message: `Welcome to Pioneer Program, ${username}! Your referral code: ${referralCode}`,
		};
	});
