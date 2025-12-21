import { ORPCError } from "@orpc/server";
import { logger } from "@snapback/infrastructure";
import { createCustomerPortalLink as createCustomerPortalLinkFn } from "@snapback/integrations/stripe/provider/stripe";
import { z } from "zod";
import { localeMiddleware } from "@/orpc/middleware/locale-middleware";
import { protectedProcedure } from "@/orpc/procedures";
import { checkUserOrganizationOwnership, getPurchaseById } from "../services/payments-service";

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
			context: { user: { id: string } };
		}): Promise<{ customerPortalLink: string }> => {
			// Get purchase via service
			const purchaseData = await getPurchaseById(purchaseId);

			if (!purchaseData) {
				throw new ORPCError("FORBIDDEN");
			}

			if (purchaseData.organizationId) {
				// Check if user is owner of the organization via service
				const { isOwner } = await checkUserOrganizationOwnership(purchaseData.organizationId, user.id);

				if (!isOwner) {
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
