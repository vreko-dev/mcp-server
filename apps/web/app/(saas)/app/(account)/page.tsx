import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import UserStart from "@saas/start/UserStart";
import { redirect } from "next/navigation";

export default async function AppStartPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const organizations = await getOrganizationList();

	// Hardcoded values since we're removing legacy config
	const organizationsEnable = true;
	const organizationsRequireOrganization = true;

	if (organizationsEnable && organizationsRequireOrganization) {
		const organization =
			organizations.find(
				(org: { id: string; slug: string }) =>
					org.id === session?.session.activeOrganizationId,
			) || organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}

		redirect(`/app/${organization.slug}`);
	}

	return (
		<div className="">
			<PageHeader
				title={`Welcome, ${session?.user.name}`}
				subtitle="Get started with your account"
			/>

			<UserStart />
		</div>
	);
}
