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
import { pioneers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { mapDbProfileToApiProfile } from "../services/pioneer-service";
import { calculateTierFromPoints, POINT_VALUES } from "../types";

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

		const db = getDb();
		if (!db) {
			throw new Error("DATABASE_UNAVAILABLE");
		}

		// Check for existing pioneer profile with this GitHub ID
		const existingProfile = await db.select().from(pioneers).where(eq(pioneers.githubId, githubId)).limit(1);

		if (existingProfile && existingProfile.length > 0) {
			logger.info("Pioneer signup: profile already exists", {
				githubId,
				userid: existingProfile[0].userId,
			});
			return {
				success: true,
				profile: mapDbProfileToApiProfile(existingProfile[0]),
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

		// Generate referral code (format: USERNAME_RANDOM)
		const referralCode = `${username.toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

		// Create pioneer profile in database
		// Note: userId is extracted from the GitHub OAuth session via Better Auth
		// The context.user.id is the authenticated user's ID from the session
		// For OAuth users, this is the GitHub ID from the OAuth provider
		const newPioneer = await db
			.insert(pioneers)
			.values({
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
			})
			.returning();

		if (!newPioneer || newPioneer.length === 0) {
			throw new Error("FAILED_TO_CREATE_PIONEER");
		}

		const profile = newPioneer[0];

		logger.info("Pioneer signup: profile created", {
			pioneerId: profile.id,
			githubId,
			tier: profile.tier,
			totalPoints: initialPoints,
			referralCode,
		});

		return {
			success: true,
			profile: mapDbProfileToApiProfile(profile),
			message: `Welcome to Pioneer Program, ${username}! Your referral code: ${referralCode}`,
		};
	});
