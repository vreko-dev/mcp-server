// Note: OrganizationMemberRole type is available from @snapback/auth if needed

export function useOrganizationMemberRoles() {
	return {
		member: "Member",
		owner: "Owner",
		admin: "Admin",
	} satisfies Record<string, string>;
}
