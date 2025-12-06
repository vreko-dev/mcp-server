import { getSession } from "@saas/auth/lib/server";
import { SettingsMenu } from "@saas/settings/components/SettingsMenu";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { SidebarContentLayout } from "@saas/shared/components/SidebarContentLayout";
import { UserAvatar } from "@shared/components/UserAvatar";
import { CreditCardIcon, LockKeyholeIcon, SettingsIcon, TriangleAlertIcon } from "lucide-react";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

// TODO: Replace with actual config from environment/app settings
const config = {
	users: {
		enableBilling: true, // Enable billing in user settings
	},
};

export default async function SettingsLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const menuItems = [
		{
			title: "Account",
			avatar: <UserAvatar name={(session as any)?.user?.name ?? ""} avatarUrl={(session as any)?.user?.image} />,
			items: [
				{
					title: "General",
					href: "/app/settings/general",
					icon: <SettingsIcon className="size-4 opacity-50" />,
				},
				{
					title: "Security",
					href: "/app/settings/security",
					icon: <LockKeyholeIcon className="size-4 opacity-50" />,
				},
				...(config.users.enableBilling
					? [
							{
								title: "Billing",
								href: "/app/settings/billing",
								icon: <CreditCardIcon className="size-4 opacity-50" />,
							},
						]
					: []),
				{
					title: "Danger Zone",
					href: "/app/settings/danger-zone",
					icon: <TriangleAlertIcon className="size-4 opacity-50" />,
				},
			],
		},
	];

	return (
		<>
			<PageHeader title="Account Settings" subtitle="Manage your account settings and preferences" />
			<SidebarContentLayout sidebar={<SettingsMenu menuItems={menuItems} />}>{children}</SidebarContentLayout>
		</>
	);
}
