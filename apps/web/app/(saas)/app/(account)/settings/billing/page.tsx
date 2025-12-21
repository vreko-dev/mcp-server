import { getSession } from "@saas/auth/lib/server";
import { ActivePlan } from "@saas/payments/components/ActivePlan";
import { ChangePlan } from "@saas/payments/components/ChangePlan";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { orpcClient } from "@shared/lib/orpc-client";
import { attemptAsync } from "es-toolkit";
import { createPurchasesHelper } from "@/lib/auth/helpers";
import type { SessionWithUser } from "@/types/session";

// TODO: Import from @snapback/platform/db/zod when properly exported
interface Purchase {
	id: string;
	userId: string;
	productId: string;
	type: string;
	status: string;
	purchasedAt: Date;
	expiresAt?: Date | null;
	cancelledAt?: Date | null;
	amount?: number | null;
	currency?: string | null;
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
	const { activePlan } = createPurchasesHelper(purchases);

	return (
		<SettingsList>
			{activePlan && <ActivePlan />}
			{activePlan?.id && typeof activePlan.id === "string" && (
				<ChangePlan userId={(session as SessionWithUser | null)?.user?.id} activePlanId={activePlan.id} />
			)}
		</SettingsList>
	);
}
