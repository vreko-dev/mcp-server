import { getActiveOrganization } from "@saas/auth/lib/server";
import { ActivePlan } from "@saas/payments/components/ActivePlan";
import { ChangePlan } from "@saas/payments/components/ChangePlan";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { orpcClient } from "@shared/lib/orpc-client";
import { createPurchasesHelper } from "@/lib/auth/helpers";
import { attemptAsync } from "es-toolkit";
import { notFound } from "next/navigation";

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

export default async function BillingSettingsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = (await getActiveOrganization(organizationSlug)) as any;

	if (!organization) {
		return notFound();
	}

	const [error, purchasesData] = await attemptAsync<
		{ purchases: Purchase[] },
		Error
	>(() =>
		orpcClient.payments.listPurchases({
			organizationId: organization?.id,
		}),
	);

	if (error) {
		throw new Error("Failed to fetch purchases");
	}

	const purchases = purchasesData?.purchases ?? [];

	// TODO: Re-enable when payments API is available in ORPC
	// await queryClient.prefetchQuery({
	// 	queryKey: orpc.payments.listPurchases.queryKey({
	// 		input: {
	// 			organizationId: organization.id,
	// 		},
	// 	}),
	// 	queryFn: () => purchasesData,
	// });

	const { activePlan } = createPurchasesHelper(purchases);

	return (
		<SettingsList>
			{activePlan && <ActivePlan organizationId={organization?.id} />}
			{activePlan?.id && typeof activePlan.id === "string" && (
				<ChangePlan
					organizationId={organization?.id}
					activePlanId={activePlan.id}
				/>
			)}
		</SettingsList>
	);
}
