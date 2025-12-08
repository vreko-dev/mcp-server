import { ORPCError } from "@orpc/server";
import type { Config } from "@snapback/config";
import { config } from "@snapback/config";
import { logger } from "@snapback/infrastructure";
import { getOrCreateCustomer } from "@snapback/integrations/stripe/lib/customer";
import { createCheckoutLink } from "@snapback/integrations/stripe/provider/stripe";
import { member, organization, user } from "@snapback/platform";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getDb } from "@/src/services/database";

interface CheckoutInput {
	productId: string;
	redirectUrl?: string;
	type: "one-time" | "subscription";
	organizationId?: string;
}

export const createCheckoutLinkProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/payments/create-snapshot-link",
		tags: ["Payments"],
		summary: "Create checkout link",
		description: "Creates a checkout link for a one-time or subscription product",
	})
	.input(
		z.object({
			type: z.enum(["one-time", "subscription"]),
			productId: z.string(),
			redirectUrl: z.string().optional(),
			organizationId: z.string().optional(),
		}),
	)
	.handler(
		async ({
			input: { productId, redirectUrl, type, organizationId },
			context: { user: sessionUser },
		}: {
			input: CheckoutInput;
			context: { user: { id: string; email: string; name?: string } };
		}) => {
			// Fetch the full user record from the database to get all fields including subscriptionTier
			const db = getDb();
			if (!db) {
				throw new Error("Database not available");
			}

			const users = await db.select().from(user).where(eq(user.id, sessionUser.id)).limit(1);

			if (!users || users.length === 0) {
				throw new ORPCError("UNAUTHORIZED");
			}

			const fullUser = users[0];

			const customerId = await getOrCreateCustomer(
				organizationId
					? {
							organizationId,
						}
					: {
							userId: fullUser.id,
						},
			);

			const plans = config.payments.plans as Config["payments"]["plans"];

			const plan = Object.entries(plans).find(([_planId, plan]) =>
				plan.prices?.find((price) => price.productId === productId),
			);
			const price = plan?.[1].prices?.find((price) => price.productId === productId);
			const trialPeriodDays = price && "trialPeriodDays" in price ? price.trialPeriodDays : undefined;

			// The query below correctly uses organizationTable which is the correct table name
			let organizationData: typeof organization.$inferSelect | null = null;
			let memberCount = 0;

			if (organizationId) {
				// Check if database is available
				const db = getDb();
				if (!db) {
					throw new Error("Database not available");
				}

				const organizations = await db
					.select()
					.from(organization)
					.where(eq(organization.id, organizationId))
					.limit(1);

				organizationData = organizations && organizations.length > 0 ? organizations[0] : null;

				// Count members for this organization
				const memberResult = await db
					.select({
						count: sql<number>`count(*)`.mapWith(Number),
					})
					.from(member)
					.where(eq(member.organizationId, organizationId));

				memberCount = memberResult && memberResult.length > 0 ? memberResult[0]?.count || 0 : 0;
			}

			if (organizationData === null && organizationId) {
				throw new ORPCError("NOT_FOUND");
			}

			const seats =
				organizationData && price && "seatBased" in price && price.seatBased ? memberCount : undefined;

			try {
				const checkoutLink = await createCheckoutLink({
					type,
					productId,
					email: fullUser.email,
					redirectUrl,
					...(organizationId ? { organizationId } : { userId: fullUser.id }),
					trialPeriodDays,
					seats,
					customerId: customerId ?? undefined,
				});

				if (!checkoutLink) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				return { checkoutLink };
			} catch (e) {
				logger.error("Error creating checkout link", { error: e });
				throw new ORPCError("INTERNAL_SERVER_ERROR");
			}
		},
	);
