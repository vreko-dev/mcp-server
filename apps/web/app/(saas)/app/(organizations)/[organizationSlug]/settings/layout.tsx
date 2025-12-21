import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { OrganizationLogo } from "@saas/organizations/components/OrganizationLogo";
import { SettingsMenu } from "@saas/settings/components/SettingsMenu";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { SidebarContentLayout } from "@saas/shared/components/SidebarContentLayout";
import { CreditCardIcon, Settings2Icon, TriangleAlertIcon, Users2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { config } from "@/lib/config";
import type { Organization } from "@/types/organization";
import type { SessionWithUser } from "@/types/session";

export default async function SettingsLayout({
	children,
	params,
}: PropsWithChildren<{
	params: Promise<{ organizationSlug: string }>;
}>) {
	const session = await getSession();
	const { organizationSlug } = await params;
	const organization = (await getActiveOrganization(organizationSlug)) as Organization | null;

	if (!organization) {
		redirect("/app");
	}

	// Check if user is admin by checking session role (Better Auth admin plugin)
	const userIsOrganizationAdmin = (session as SessionWithUser | null)?.user?.role === "admin";

	const organizationSettingsBasePath = `/app/${organizationSlug}/settings`;

	const menuItems = [
		{
			title: "Organization",
			avatar: <OrganizationLogo name={organization.name} logoUrl={organization.logo} />,
			items: [
				{
					title: "General",
					href: `${organizationSettingsBasePath}/general`,
					icon: <Settings2Icon className="size-4 opacity-50" />,
				},
				{
					title: "Members",
					href: `${organizationSettingsBasePath}/members`,
					icon: <Users2Icon className="size-4 opacity-50" />,
				},
				...(config.organizations.enable && config.organizations.enableBilling && userIsOrganizationAdmin
					? [
							{
								title: "Billing",
								href: `${organizationSettingsBasePath}/billing`,
								icon: <CreditCardIcon className="size-4 opacity-50" />,
							},
						]
					: []),
				...(userIsOrganizationAdmin
					? [
							{
								title: "Danger Zone",
								href: `${organizationSettingsBasePath}/danger-zone`,
								icon: <TriangleAlertIcon className="size-4 opacity-50" />,
							},
						]
					: []),
			],
		},
	];

	return (
		<>
			<PageHeader title="Organization Settings" subtitle="Manage your organization settings and members" />
			<SidebarContentLayout sidebar={<SettingsMenu menuItems={menuItems} />}>{children}</SidebarContentLayout>
		</>
	);
}
