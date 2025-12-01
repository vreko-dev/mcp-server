import { getSession } from "@saas/auth/lib/server";
import { ChangeEmailForm } from "@saas/settings/components/ChangeEmailForm";
import { ChangeNameForm } from "@saas/settings/components/ChangeNameForm";
import { UserAvatarForm } from "@saas/settings/components/UserAvatarForm";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { redirect } from "next/navigation";

export async function generateMetadata() {
	return {
		title: "General Settings",
	};
}

export default async function AccountSettingsPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	return (
		<SettingsList>
			<UserAvatarForm />
			<ChangeNameForm />
			<ChangeEmailForm />
		</SettingsList>
	);
}
