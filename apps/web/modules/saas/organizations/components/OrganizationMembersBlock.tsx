"use client";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useState } from "react";
import { OrganizationInvitationsList } from "./OrganizationInvitationsList";
import { OrganizationMembersList } from "./OrganizationMembersList";

export function OrganizationMembersBlock({ organizationId }: { organizationId: string }) {
	const [activeTab, setActiveTab] = useState("members");

	return (
		<SettingsItem title="Members" description="Manage organization members and invitations">
			<Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab)}>
				<TabsList className="mb-4">
					<TabsTrigger value="members">Active Members</TabsTrigger>
					<TabsTrigger value="invitations">Pending Invitations</TabsTrigger>
				</TabsList>
				<TabsContent value="members">
					<OrganizationMembersList organizationId={organizationId} />
				</TabsContent>
				<TabsContent value="invitations">
					<OrganizationInvitationsList organizationId={organizationId} />
				</TabsContent>
			</Tabs>
		</SettingsItem>
	);
}
