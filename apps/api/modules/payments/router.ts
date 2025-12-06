import { createCheckoutLinkProcedure } from "./procedures/create-checkout-link";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link";
import { listPurchases } from "./procedures/list-purchases";

export const paymentsRouter = {
	createCheckoutLink: createCheckoutLinkProcedure,
	createCustomerPortalLink,
	listPurchases,
};
