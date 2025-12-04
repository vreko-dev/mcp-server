import { useQuery } from "@tanstack/react-query";
import { createPurchasesHelper } from "@/lib/auth/helpers";

export const usePurchases = (organizationId?: string) => {
	// TODO: Re-enable when payments API is available
	const { data } = useQuery({
		queryKey: ["purchases", organizationId],
		queryFn: async () => ({ purchases: [] }),
	});

	const purchases = data?.purchases ?? [];

	const { activePlan, hasSubscription, hasPurchase } =
		createPurchasesHelper(purchases);

	return { purchases, activePlan, hasSubscription, hasPurchase };
};

export const useUserPurchases = () => usePurchases();

export const useOrganizationPurchases = (organizationId: string) =>
	usePurchases(organizationId);
