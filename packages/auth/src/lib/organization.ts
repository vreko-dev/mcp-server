import { logger } from "@snapback/infrastructure";
import { setSubscriptionSeats } from "@snapback/integrations/stripe";
import * as drizzle from "@snapback/platform";

export async function updateSeatsInOrganizationSubscription(organizationId: string) {
	const organization = await drizzle.getOrganizationWithPurchasesAndMembersCount(organizationId);

	if (!organization?.purchases || !Array.isArray(organization.purchases) || organization.purchases.length === 0) {
		return;
	}

	const activeSubscription = organization.purchases.find((purchase: any) => purchase.type === "SUBSCRIPTION");

	if (!activeSubscription?.subscriptionId) {
		return;
	}

	try {
		await setSubscriptionSeats({
			id: activeSubscription.subscriptionId,
			seats: organization.membersCount,
		});
	} catch (error) {
		logger.error("Could not update seats in organization subscription", {
			organizationId,
			error,
		});
	}
}
