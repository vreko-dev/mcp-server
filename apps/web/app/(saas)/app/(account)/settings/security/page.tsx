"use client";

import { SettingsList } from "@saas/shared/components/SettingsList";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { authConfig } from "@saas/auth/config";

// Dynamically import security components
const ActiveSessionsBlock = dynamic(
	() =>
		import("@saas/settings/components/ActiveSessionsBlock").then(
			(mod) => mod.ActiveSessionsBlock as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

const ChangePasswordForm = dynamic(
	() =>
		import("@saas/settings/components/ChangePassword").then(
			(mod) => mod.ChangePasswordForm as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

const ConnectedAccountsBlock = dynamic(
	() =>
		import("@saas/settings/components/ConnectedAccountsBlock").then(
			(mod) =>
				mod.ConnectedAccountsBlock as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

const PasskeysBlock = dynamic(
	() =>
		import("@saas/settings/components/PasskeysBlock").then(
			(mod) => mod.PasskeysBlock as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

const SetPasswordForm = dynamic(
	() =>
		import("@saas/settings/components/SetPassword").then(
			(mod) => mod.SetPasswordForm as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

const TwoFactorBlock = dynamic(
	() =>
		import("@saas/settings/components/TwoFactorBlock").then(
			(mod) => mod.TwoFactorBlock as ComponentType<Record<string, never>>,
		),
	{
		ssr: false,
	},
);

export default function AccountSettingsPage() {
	return (
		<SettingsList>
			{authConfig.enablePasswordLogin && <ChangePasswordForm />}
			{authConfig.enablePasswordLogin && <SetPasswordForm />}
			{authConfig.enableSocialLogin && <ConnectedAccountsBlock />}
			{authConfig.enablePasskeys && <PasskeysBlock />}
			{authConfig.enableTwoFactor && <TwoFactorBlock />}
			<ActiveSessionsBlock />
		</SettingsList>
	);
}
