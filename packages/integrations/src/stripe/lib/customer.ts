import { createLogger, LogLevel } from "@snapback/contracts";
import { getOrganizationById, getUserById, updateOrganization, updateUser } from "@snapback/platform";
import { getStripeClient } from "../provider/stripe/index.js";

const logger = createLogger({ name: "payments", level: LogLevel.INFO });

export async function setCustomerIdToEntity(
	customerId: string,
	{ organizationId, userId }: { organizationId?: string; userId?: string },
) {
	if (organizationId) {
		await updateOrganization({
			id: organizationId,
			paymentsCustomerId: customerId,
		});
	} else if (userId) {
		await updateUser({
			id: userId,
			paymentsCustomerId: customerId,
		});
	}
}

export const getCustomerIdFromEntity = async (props: { organizationId: string } | { userId: string }) => {
	if ("organizationId" in props) {
		const org = await getOrganizationById(props.organizationId);
		return org?.paymentsCustomerId ?? null;
	}

	const user = await getUserById(props.userId);
	return user?.paymentsCustomerId ?? null;
};

export const getOrCreateCustomer = async (props: { organizationId: string } | { userId: string }) => {
	// First try to get existing customer ID
	const existingCustomerId = await getCustomerIdFromEntity(props);
	if (existingCustomerId) {
		return existingCustomerId;
	}

	// If no existing customer ID, create a new customer
	const stripe = getStripeClient();

	try {
		const customer = await stripe.customers.create({
			// Add metadata to identify the entity
			metadata: {
				...(props as any),
			},
		});

		// Store the new customer ID
		await setCustomerIdToEntity(customer.id, props);

		return customer.id;
	} catch (error) {
		logger.error("Error creating Stripe customer:", { error });
		// Re-throw to trigger retry mechanism
		throw error;
	}
};
