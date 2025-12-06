import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { InviteMemberForm } from "@saas/organizations/components/InviteMemberForm";
import { OrganizationMembersBlock } from "@saas/organizations/components/OrganizationMembersBlock";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { notFound } from "next/navigation";
import { isOrganizationAdmin } from "@/lib/auth/helpers";
export async function generateMetadata() {
	return {
		title: "Members",
	};
}

export default async function OrganizationSettingsPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
	const session = await getSession();
	const { organizationSlug } = await params;
	const organization = (await getActiveOrganization(organizationSlug)) as any;

	if (!organization) {
		return notFound();
	}

	return (
		<SettingsList>
			{isOrganizationAdmin(organization, (session as any)?.user) && (
				<InviteMemberForm organizationId={organization.id} />
			)}
			<OrganizationMembersBlock organizationId={organization.id} />
		</SettingsList>
	);
}
