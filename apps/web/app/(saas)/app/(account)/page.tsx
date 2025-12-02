import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import UserStart from "@saas/start/UserStart";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	// STUB: In frontend-only mode, session is null
	// Allow access without authentication (in production, require real auth)
	if (!session) {
		console.warn("[AppStart] Accessing without backend auth - stubbed");
		// Don't redirect - allow frontend-only access
	}

	const organizations = await getOrganizationList();

	// Hardcoded values since we're removing legacy config
	const organizationsEnable = true;
	const organizationsRequireOrganization = true;

	if (organizationsEnable && organizationsRequireOrganization && session) {
		const organization =
			organizations.find(
				(org: any) =>
					org.id === (session as any)?.session?.activeOrganizationId,
			) || organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}

		redirect(`/app/${(organization as any)?.slug}`);
	}

	return (
		<div className="">
			<PageHeader
				title={`Welcome, ${(session as any)?.user?.name || "User"}`}
				subtitle="Get started with your account"
			/>

			<UserStart />
		</div>
	);
}
