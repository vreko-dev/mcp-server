import { getActiveOrganization } from "@saas/auth/lib/server";
import OrganizationStart from "@saas/organizations/components/OrganizationStart";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ organizationSlug: string }> }) {
	const { organizationSlug } = await params;

	const activeOrganization = (await getActiveOrganization(organizationSlug as string)) as any;

	return {
		title: activeOrganization?.name,
	};
}

export default async function OrganizationPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
	const { organizationSlug } = await params;

	const activeOrganization = (await getActiveOrganization(organizationSlug as string)) as any;

	if (!activeOrganization) {
		return notFound();
	}

	return (
		<div>
			<PageHeader title={activeOrganization?.name} subtitle="Get started with your organization" />

			<OrganizationStart />
		</div>
	);
}
