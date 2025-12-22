import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { sendEmail } from "@snapback/integrations";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { createOrUpdateHubSpotContact } from "../services/hubspot-service";
import {
	createSubscriber,
	findSubscriberByEmail,
	resubscribeUser,
	updateHubSpotContactId,
} from "../services/newsletter-service";

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

			// Check if subscriber already exists (via service layer)
			const existingSubscriber = await findSubscriberByEmail(email);

			if (existingSubscriber) {
				// If previously unsubscribed, resubscribe
				if (existingSubscriber.unsubscribedAt) {
					await resubscribeUser(email);
					logger.info(`Newsletter resubscription: ${email}`);
				} else {
					// Already subscribed
					return { success: true, message: "Already subscribed" };
				}
			} else {
				// Create new subscriber (via service layer)
				await createSubscriber(email, "website", metadata);
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
					if (hubspotContactId) {
						// Update subscriber with HubSpot contact ID (via service layer)
						try {
							await updateHubSpotContactId(email, hubspotContactId);
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
