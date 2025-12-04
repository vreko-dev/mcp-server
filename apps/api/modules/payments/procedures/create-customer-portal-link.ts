import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { createCustomerPortalLink as createCustomerPortalLinkFn } from "@snapback/integrations/stripe/provider/stripe";
import { member, purchase } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { localeMiddleware } from "../../../orpc/middleware/locale-middleware";
import { protectedProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const createCustomerPortalLink = protectedProcedure
	.use(localeMiddleware)
	.route({
		method: "POST",
		path: "/payments/create-customer-portal-link",
		tags: ["Payments"],
		summary: "Create customer portal link",
		description:
			"Creates a customer portal link for the customer or team. If a purchase is provided, the link will be created for the customer of the purchase.",
	})
	.input(
		z.object({
			purchaseId: z.string(),
			redirectUrl: z.string().optional(),
		}),
	)
	.handler(
		async ({
			input: { purchaseId, redirectUrl },
			context: { user },
		}: {
			input: { purchaseId: string; redirectUrl?: string };
			context: { user: any };
		}): Promise<{ customerPortalLink: string }> => {
			// Check if database is available
			const db = getDb();
			if (!db) {
				throw new Error("Database not available");
			}

			// Get purchase by ID using Drizzle ORM
			const purchaseResult = await getDb()
				.select()
				.from(purchase)
				.where(eq(purchase.id, purchaseId))
				.limit(1);

			if (!purchaseResult || purchaseResult.length === 0) {
				throw new ORPCError("FORBIDDEN");
			}

			const purchaseData = purchaseResult[0];

			if (!purchaseData) {
				throw new ORPCError("FORBIDDEN");
			}

			if (purchaseData.organizationId) {
				// Check if user is owner of the organization
				const membershipResult = await getDb()
					.select()
					.from(member)
					.where(
						and(
							eq(member.organizationId, purchaseData.organizationId),
							eq(member.userId, user.id),
						),
					)
					.limit(1);

				const membership =
					membershipResult && membershipResult.length > 0
						? membershipResult[0]
						: null;

				if (membership?.role !== "owner") {
					throw new ORPCError("FORBIDDEN");
				}
			}

			if (purchaseData.userId && purchaseData.userId !== user.id) {
				throw new ORPCError("FORBIDDEN");
			}

			try {
				const customerPortalLink = await createCustomerPortalLinkFn({
					customerId: purchaseData.customerId,
					redirectUrl,
				});

				if (!customerPortalLink) {
					throw new ORPCError("INTERNAL_SERVER_ERROR");
				}

				return { customerPortalLink };
			} catch (e) {
				logger.error("Could not create customer portal link", { error: e });
				throw new ORPCError("INTERNAL_SERVER_ERROR");
			}
		},
	);
