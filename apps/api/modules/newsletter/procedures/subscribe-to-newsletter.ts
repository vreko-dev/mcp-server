import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { sendEmail } from "@snapback/integrations";
import { newsletterSubscribers } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";
import { createOrUpdateHubSpotContact } from "../services/hubspot-service";

const subscribeToNewsletterSchema = z.object({
	email: z.string().email(),
	locale: z.enum(["en", "de"]).optional(),
	metadata: z
		.object({
			utmSource: z.string().optional(),
			utmMedium: z.string().optional(),
			utmCampaign: z.string().optional(),
			referrer: z.string().optional(),
		})
		.optional(),
});

export const subscribeToNewsletter = protectedProcedure
	.input(subscribeToNewsletterSchema)
	.handler(async ({ input }) => {
		try {
			const { email, metadata } = input;

			const db = getDb();
			if (!db) {
				throw new ORPCError("INTERNAL_SERVER_ERROR");
			}

			// Check if subscriber already exists
			const existingSubscriber = await db
				.select()
				.from(newsletterSubscribers)
				.where(eq(newsletterSubscribers.email, email))
				.limit(1);

			if (existingSubscriber && existingSubscriber.length > 0) {
				// If previously unsubscribed, resubscribe
				if (existingSubscriber[0]?.unsubscribedAt) {
					await db
						.update(newsletterSubscribers)
						.set({
							unsubscribedAt: null,
							subscribedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(newsletterSubscribers.email, email));

					logger.info(`Newsletter resubscription: ${email}`);
				} else {
					// Already subscribed
					return { success: true, message: "Already subscribed" };
				}
			} else {
				// Create new subscriber
				await db.insert(newsletterSubscribers).values({
					email,
					source: "website",
					metadata,
					subscribedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				logger.info(`New newsletter subscription: ${email}`);
			}

			// Sync to HubSpot (non-blocking)
			createOrUpdateHubSpotContact({
				email,
				source: "website",
				utm_source: metadata?.utmSource,
				utm_medium: metadata?.utmMedium,
				utm_campaign: metadata?.utmCampaign,
			})
				.then(async (hubspotContactId) => {
					if (hubspotContactId && db) {
						// Update subscriber with HubSpot contact ID
						try {
							await db
								.update(newsletterSubscribers)
								.set({
									hubspotContactId,
									hubspotSyncedAt: new Date(),
									updatedAt: new Date(),
								})
								.where(eq(newsletterSubscribers.email, email));
						} catch (error) {
							logger.error("Failed to update HubSpot contact ID", {
								error: error instanceof Error ? error.message : String(error),
							});
						}
					}
				})
				.catch((error) => {
					logger.error("HubSpot sync failed (non-critical)", {
						error: error instanceof Error ? error.message : String(error),
					});
				});

			// Send confirmation email
			await sendEmail({
				to: email,
				templateId: "newsletterSignup",
				context: {
					url: "https://snapback.dev",
					name: "there",
				},
			});

			return {
				success: true,
				message: "Subscribed successfully",
			} as const;
		} catch (error) {
			logger.error("Newsletter subscription failed", { error });
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	});
