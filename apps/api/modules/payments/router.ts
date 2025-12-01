import { createCheckoutLinkProcedure } from "./procedures/create-checkout-link.js";
import { createCustomerPortalLink } from "./procedures/create-customer-portal-link.js";
import { listPurchases } from "./procedures/list-purchases.js";

export const paymentsRouter = {
	createCheckoutLink: createCheckoutLinkProcedure,
	createCustomerPortalLink,
	listPurchases,
};
