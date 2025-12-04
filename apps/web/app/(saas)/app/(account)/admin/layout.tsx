import { getSession } from "@saas/auth/lib/server";
import { SettingsMenu } from "@saas/settings/components/SettingsMenu";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { SidebarContentLayout } from "@saas/shared/components/SidebarContentLayout";
import { Logo } from "@shared/components/Logo";
import { Building2Icon, UsersIcon } from "lucide-react";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

// TODO: Replace with actual config from environment/app settings
const config = {
	organizations: {
		enable: true, // Enable organizations management in admin panel
	},
};

export default async function AdminLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	// STUB: In frontend-only mode, session is null
	// Allow access to admin panel (in production, connect to real API for auth)
	if (!session) {
		console.warn(
			"[Admin] Accessing admin panel without backend auth - stubbed",
		);
		// For now, allow access - in production, redirect to auth/login
	} else if ((session as any).user?.role !== "admin") {
		redirect("/app");
	}

	return (
		<>
			<PageHeader title="Admin" subtitle="Manage users and organizations" />
			<SidebarContentLayout
				sidebar={
					<SettingsMenu
						menuItems={[
							{
								avatar: <Logo className="size-8" withLabel={false} />,
								title: "Admin",
								items: [
									{
										title: "Users",
										href: "/app/admin/users",
										icon: <UsersIcon className="size-4 opacity-50" />,
									},
									...(config.organizations.enable
										? [
												{
													title: "Organizations",
													href: "/app/admin/organizations",
													icon: <Building2Icon className="size-4 opacity-50" />,
												},
											]
										: []),
								],
							},
						]}
					/>
				}
			>
				{children}
			</SidebarContentLayout>
		</>
	);
}
