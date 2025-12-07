"use client";
import { useSession } from "@saas/auth/hooks/use-session";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { authClient } from "@snapback/auth/client";
import { Button } from "@ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

export function SetPasswordForm() {
	const { user } = useSession();
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async () => {
		if (!user) {
			return;
		}

		setSubmitting(true);

		try {
			await authClient.forgetPassword({
				email: user.email,
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});
			toast.success("Password reset email sent successfully");
		} catch (error) {
			toast.error("Failed to send password reset email. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SettingsItem title="Set Password" description="Set a password for your account to enable password-based login">
			<div className="flex justify-end">
				<Button type="submit" loading={submitting} onClick={onSubmit}>
					Send Password Reset Email
				</Button>
			</div>
		</SettingsItem>
	);
}
