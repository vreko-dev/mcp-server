import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { InviteMemberForm } from "@saas/organizations/components/InviteMemberForm";
import { OrganizationMembersBlock } from "@saas/organizations/components/OrganizationMembersBlock";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { notFound } from "next/navigation";
import { isOrganizationAdmin } from "@/lib/auth/helpers";
import type { Organization } from "@/types/organization";
import type { SessionWithUser } from "@/types/session";
export async function generateMetadata() {
	return {
		title: "Members",
	};
}

export default async function OrganizationSettingsPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
	const session = await getSession();
	const { organizationSlug } = await params;
	const organization = (await getActiveOrganization(organizationSlug)) as Organization | null;

	if (!organization) {
		return notFound();
	}

	return (
		<SettingsList>
			{isOrganizationAdmin(organization, (session as SessionWithUser | null)?.user) && (
				<InviteMemberForm organizationId={organization.id} />
			)}
			<OrganizationMembersBlock organizationId={organization.id} />
		</SettingsList>
	);
}
