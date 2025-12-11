/**
 * OAuth Success Hook - Auto-populate Pioneer Profile
 *
 * This hook runs after successful OAuth signin/signup via Better Auth.
 * It ensures every OAuth user automatically gets a Pioneer profile.
 *
 * Flow:
 * 1. User completes OAuth with GitHub/Google
 * 2. Better Auth creates/updates user in database
 * 3. This hook runs to create Pioneer profile if needed
 * 4. User sees Pioneer tier + points on dashboard
 *
 * Security: Only runs for authenticated users with valid session
 */

import { logger } from "@snapback/infrastructure";
import { pioneers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/services/database";
import type { BetterAuthUser } from "@/src/types/context";

/**
 * Called after successful OAuth authentication
 *
 * Creates a Pioneer profile if user doesn't already have one.
 * Grants initial waitlist bonus (50 points) for new signups.
 *
 * @param user - Authenticated user from Better Auth
 * @returns Pioneer profile or null if creation failed
 */
export async function onOAuthSuccess(user: BetterAuthUser): Promise<void> {
	try {
		if (!user.id || !user.email) {
			logger.warn("OAuth user missing required fields", {
				userId: user.id,
				hasEmail: !!user.email,
			});
			return;
		}

		const db = getDb();
		if (!db) {
			logger.error("Database unavailable in onOAuthSuccess hook");
			return;
		}

		// Check if pioneer profile already exists
		const existingPioneer = await db.select().from(pioneers).where(eq(pioneers.userId, user.id)).limit(1);

		// Already a pioneer - nothing to do
		if (existingPioneer && existingPioneer.length > 0) {
			logger.info("Pioneer profile already exists", {
				userId: user.id,
				pioneerId: existingPioneer[0].id,
			});
			return;
		}

		// Extract GitHub username from email if not available
		// Format: username@github.com or fallback to email local part
		const githubUsername = user.name || user.email.split("@")[0] || "user";
		const githubId = user.id; // Better Auth user ID is the GitHub ID for OAuth

		// Generate referral code
		const referralCode = `${githubUsername.toUpperCase().replace(/\s+/g, "_")}_${Math.random()
			.toString(36)
			.substring(2, 8)
			.toUpperCase()}`;

		const now = new Date();

		// Create new pioneer profile
		// All OAuth users start as seedlings (0 points)
		// They can earn points through actions (star, Discord, referrals, etc.)
		const newPioneer = await db
			.insert(pioneers)
			.values({
				userId: user.id,
				username: githubUsername,
				githubId,
				tier: "seedling", // All new signups start as seedling
				totalPoints: 0, // No initial bonus for OAuth (only waitlist gets 50pt bonus)
				joinedAt: now,
				referralCode,
				githubStarred: false,
				lastSyncedAt: now,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		if (!newPioneer || newPioneer.length === 0) {
			logger.error("Failed to create pioneer profile after OAuth", { userId: user.id });
			return;
		}

		const pioneer = newPioneer[0];

		logger.info("Pioneer profile created from OAuth", {
			userId: user.id,
			pioneerId: pioneer.id,
			username: githubUsername,
			referralCode,
			tier: pioneer.tier,
		});

		// Track event for analytics
		// This helps us understand pioneer signup funnel
		// (Would integrate with PostHog/Segment here)
		logger.info("oauth_signup_completed", {
			userId: user.id,
			pioneerId: pioneer.id,
			provider: "github", // or 'google' depending on which OAuth was used
		});
	} catch (error) {
		// Don't fail OAuth flow if pioneer creation fails
		// User will still be signed in, just won't have pioneer profile yet
		logger.error("Error in onOAuthSuccess hook", {
			userId: user.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
