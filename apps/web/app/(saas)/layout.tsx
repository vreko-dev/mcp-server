import { PostHogAuthTracker } from "@saas/auth/components/PostHogAuthTracker";
import { SessionProvider } from "@saas/auth/components/SessionProvider";
import { sessionQueryKey } from "@saas/auth/lib/api";
import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { ActiveOrganizationProvider } from "@saas/organizations/components/ActiveOrganizationProvider";
import { organizationListQueryKey } from "@saas/organizations/lib/api";
import { ConfirmationAlertProvider } from "@saas/shared/components/ConfirmationAlertProvider";
import { Document } from "@shared/components/Document";
import { getServerQueryClient } from "@shared/lib/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

// TODO: Replace with actual config from environment/app settings
const config = {
	organizations: {
		enable: true,
	},
	users: {
		enableBilling: true,
	},
};

export default async function SaaSLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const queryClient = getServerQueryClient();

	await queryClient.prefetchQuery({
		queryKey: sessionQueryKey,
		queryFn: () => session,
	});

	if (config.organizations.enable) {
		await queryClient.prefetchQuery({
			queryKey: organizationListQueryKey,
			queryFn: getOrganizationList,
		});
	}

	// TODO: Re-enable when payments API is available in ORPC
	// if (config.users.enableBilling) {
	// 	await queryClient.prefetchQuery(
	// 		orpc.payments.listPurchases.queryOptions({
	// 			input: {},
	// 		}),
	// 	);
	// }

	return (
		<Document>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<SessionProvider>
					<PostHogAuthTracker>
						<ActiveOrganizationProvider>
							<ConfirmationAlertProvider>{children}</ConfirmationAlertProvider>
						</ActiveOrganizationProvider>
					</PostHogAuthTracker>
				</SessionProvider>
			</HydrationBoundary>
		</Document>
	);
}
