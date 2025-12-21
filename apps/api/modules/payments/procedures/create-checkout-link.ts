/**
 * Create Checkout Link Procedure
 *
 * Per C-002: Procedures delegate to service layer for DB operations
 */

import { ORPCError } from "@orpc/server";
import type { Config } from "@snapback/config/server";
import { config } from "@snapback/config/server";
import { logger } from "@snapback/infrastructure";
import { getOrCreateCustomer } from "@snapback/integrations/stripe/lib/customer";
import { createCheckoutLink } from "@snapback/integrations/stripe/provider/stripe";
import { z } from "zod";
import { protectedProcedure } from "@/orpc/procedures";
import { getOrganizationBillingInfo, getUserForPayments } from "../services/payments-service";

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
			// Fetch user via service layer per C-002
			const fullUser = await getUserForPayments(sessionUser.id);
			if (!fullUser) {
				throw new ORPCError("UNAUTHORIZED");
			}

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

			// Get organization billing info via service layer per C-002
			let organizationData = null;
			let memberCount = 0;

			if (organizationId) {
				const billingInfo = await getOrganizationBillingInfo(organizationId);
				organizationData = billingInfo.organization;
				memberCount = billingInfo.memberCount;
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
