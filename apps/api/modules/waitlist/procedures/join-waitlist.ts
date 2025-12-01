import { ORPCError } from "@orpc/client";
import { logger } from "@snapback/infrastructure";
import { waitlist, waitlistReferrals } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { captureWaitlistEvent } from "../../../lib/posthog-server";
import { setCachedWaitlistPosition } from "../../../lib/upstash-client";
import { publicProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";
import { createAuditLog, hashEmail, sanitizeMetadata, sanitizeString, verifyTurnstileToken } from "./helpers";

// Zod schema for validation
const joinWaitlistSchema = z.object({
	email: z.string().email().max(255),
	githubUsername: z.string().max(100).optional(),
	editor: z.string().max(50).optional(),
	language: z.string().max(50).optional(),
	teamSize: z.string().max(20).optional(),
	referralCode: z.string().max(50).optional(),
	turnstileToken: z.string().min(1, "Security verification required"),
	metadata: z
		.object({
			referrer: z.string().max(500).optional(),
			utmSource: z.string().max(100).optional(),
			utmMedium: z.string().max(100).optional(),
			utmCampaign: z.string().max(100).optional(),
			userAgent: z.string().max(500).optional(),
		})
		.optional(),
});

export const joinWaitlist = publicProcedure
	.route({
		method: "POST",
		path: "/waitlist/join",
		tags: ["Waitlist"],
		summary: "Join the waitlist",
		description: "Add a user to the waitlist with optional referral tracking",
	})
	.input(joinWaitlistSchema)
	.handler(async ({ input, context }) => {
		const db = getDb();
		if (!db) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Database not available",
			});
		}

		const { email, githubUsername, editor, language, teamSize, referralCode, turnstileToken, metadata } = input;

		// Verify Turnstile token first (bot protection)
		const remoteIP =
			(context as any).request?.headers?.get("x-forwarded-for") ||
			(context as any).request?.headers?.get("x-real-ip");
		const isTurnstileValid = await verifyTurnstileToken(turnstileToken, remoteIP || undefined);

		if (!isTurnstileValid) {
			logger.warn("Turnstile verification failed for waitlist join", {
				email: hashEmail(email),
			});
			return {
				success: false,
				error: "Security verification failed. Please try again or refresh the page.",
			};
		}

		try {
			// Check if already exists - but don't leak position info
			const existing = await getDb().query.waitlist.findFirst({
				where: eq(waitlist.email, email),
				columns: { id: true },
			});

			if (existing) {
				// Generic error - don't confirm email exists
				return {
					success: false,
					error: "Unable to join waitlist at this time. Please try again later or contact support.",
				};
			}

			// Sanitize all inputs
			const sanitizedMetadata = sanitizeMetadata(metadata);
			const sanitizedGithub = sanitizeString(githubUsername);
			const sanitizedEditor = sanitizeString(editor);
			const sanitizedLanguage = sanitizeString(language);
			const sanitizedTeamSize = sanitizeString(teamSize);

			// Generate cryptographically secure referral code
			const newReferralCode = nanoid(16);

			// Create waitlist entry with ATOMIC queue position assignment
			// This prevents race conditions by using a single SQL query
			const [entry] = await getDb()
				.insert(waitlist)
				.values({
					email,
					githubUsername: sanitizedGithub,
					editor: sanitizedEditor,
					language: sanitizedLanguage,
					teamSize: sanitizedTeamSize,
					// ATOMIC: Calculate position in same query to prevent race condition
					queuePosition: sql`COALESCE((SELECT MAX(queue_position) FROM ${waitlist}), 0) + 1`,
					status: "pending",
					metadata: sanitizedMetadata,
					referralCode: newReferralCode,
				})
				.returning();

			if (!entry) {
				throw new Error("Database insert failed");
			}

			// Create audit log
			await createAuditLog({
				waitlistId: entry.id,
				action: "joined",
				metadata: sanitizedMetadata,
			});

			// Handle referral if provided
			if (referralCode) {
				// Use referralCode field instead of ID
				const referrer = await getDb().query.waitlist.findFirst({
					where: eq(waitlist.referralCode, referralCode),
					columns: { id: true, email: true },
				});

				if (referrer) {
					// ATOMIC: Use ON CONFLICT to prevent duplicate referrals
					await getDb()
						.insert(waitlistReferrals)
						.values({
							referrerId: referrer.id,
							referredEmail: email,
							referredId: entry.id,
							pointsAwarded: 10,
						})
						.onConflictDoNothing();

					await createAuditLog({
						waitlistId: referrer.id,
						action: "referral_earned",
						metadata: { pointsEarned: 10 },
					});

					logger.info("Referral processed", {
						referrerId: hashEmail(referrer.email),
						referredId: hashEmail(email),
					});
				}
			}

			// Cache the position
			await setCachedWaitlistPosition(email, entry.queuePosition).catch((err) => {
				logger.warn("Failed to cache position", { error: err });
			});

			// Capture PostHog event with hashed email for PII protection
			await captureWaitlistEvent(hashEmail(email), "waitlist_joined", {
				position: entry.queuePosition,
				hasReferral: !!referralCode,
				editor: sanitizedEditor,
				language: sanitizedLanguage,
				teamSize: sanitizedTeamSize,
			}).catch((err) => {
				logger.warn("Failed to capture PostHog event", { error: err });
			});

			logger.info("User joined waitlist", {
				emailHash: hashEmail(email),
				position: entry.queuePosition,
			});

			return {
				success: true,
				position: entry.queuePosition,
				referralCode: newReferralCode,
			};
		} catch (error) {
			logger.error("Failed to join waitlist", {
				error,
				emailHash: hashEmail(email),
			});
			// Generic error - don't leak internal details
			return {
				success: false,
				error: "An error occurred while joining the waitlist. Please try again later.",
			};
		}
	});
