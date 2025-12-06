import { getSession } from "@saas/auth/lib/server";
import { ActivePlan } from "@saas/payments/components/ActivePlan";
import { ChangePlan } from "@saas/payments/components/ChangePlan";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { orpcClient } from "@shared/lib/orpc-client";
import { attemptAsync } from "es-toolkit";
import { createPurchasesHelper } from "@/lib/auth/helpers";

// TODO: Replace with actual Purchase type from @snapback/contracts
interface Purchase {
	id: string;
	type: string;
	status: string;
	productId?: string;
}

export async function generateMetadata() {
	return {
		title: "Billing",
	};
}

export default async function BillingSettingsPage() {
	const session = await getSession();
	const [error, data] = await attemptAsync<{ purchases: Purchase[] }, Error>(() =>
		orpcClient.payments.listPurchases({}),
	);

	if (error) {
		throw new Error("Failed to fetch purchases");
	}

	const purchases = data?.purchases ?? [];

	// TODO: Re-enable when payments API is available in ORPC
	// await queryClient.prefetchQuery({
	// 	queryKey: orpc.payments.listPurchases.queryKey({
	// 		input: {},
	// 	}),
	// 	queryFn: () => purchases,
	// });

	const { activePlan } = createPurchasesHelper(purchases);

	return (
		<SettingsList>
			{activePlan && <ActivePlan />}
			{activePlan?.id && typeof activePlan.id === "string" && (
				<ChangePlan userId={(session as any)?.user?.id} activePlanId={activePlan.id} />
			)}
		</SettingsList>
	);
}
