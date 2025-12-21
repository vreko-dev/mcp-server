import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";
import { attemptAsync } from "es-toolkit";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { createPurchasesHelper } from "@/lib/auth/helpers";
import type { Organization } from "@/types/organization";
import type { SessionWithUser } from "@/types/session";

// TODO: Replace with actual config from environment/app settings
interface Purchase {
	id: string;
	type: string;
	status: string;
	productId?: string;
}

const config = {
	users: {
		enableOnboarding: true,
		enableBilling: true,
	},
	organizations: {
		enable: true,
		enableBilling: true,
		requireOrganization: false,
	},
	payments: {
		plans: {
			free: { isFree: true, name: "Free" },
			pro: { isFree: false, name: "Pro" },
			enterprise: { isFree: false, name: "Enterprise" },
		},
	},
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Layout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (config.users.enableOnboarding && !(session as SessionWithUser).user?.onboardingComplete) {
		redirect("/onboarding");
	}

	const organizations = await getOrganizationList();

	if (config.organizations.enable && config.organizations.requireOrganization) {
		const typedSession = session as SessionWithUser;
		const organization =
			organizations.find((org: { id: string }) => org.id === typedSession.session.activeOrganizationId) ||
			organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}
	}

	const hasFreePlan = Object.values(config.payments.plans).some((plan) => "isFree" in plan);

	if (
		((config.organizations.enable && config.organizations.enableBilling) || config.users.enableBilling) &&
		!hasFreePlan
	) {
		const typedSession = session as SessionWithUser;
		const organizationId = config.organizations.enable
			? typedSession.session.activeOrganizationId || (organizations as Organization[]).at(0)?.id
			: undefined;

		const [error, data] = await attemptAsync<{ purchases: Purchase[] }, Error>(() =>
			orpcClient.payments.listPurchases({
				organizationId,
			}),
		);

		if (error) {
			throw new Error("Failed to fetch purchases");
		}

		const purchases = data?.purchases ?? [];

		const { activePlan } = createPurchasesHelper(purchases);

		if (!activePlan) {
			redirect("/choose-plan");
		}
	}

	return children;
}
