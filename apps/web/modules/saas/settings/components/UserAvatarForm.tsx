"use client";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { toast } from "sonner";
import { UserAvatarUpload } from "./UserAvatarUpload";

export function UserAvatarForm() {
	return (
		<SettingsItem title="Profile Picture" description="Upload a profile picture to personalize your account">
			<UserAvatarUpload
				onSuccess={() => {
					toast.success("Profile picture updated successfully");
				}}
				onError={() => {
					toast.error("Failed to update profile picture");
				}}
			/>
		</SettingsItem>
	);
}
