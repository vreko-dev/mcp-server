/**
 * Organization Helper Functions
 *
 * These functions replace the missing `@snapback/auth/lib/helper` import.
 * They provide role checking and authorization logic for organization features.
 */

/**
 * Organization member shape (minimal interface needed for helpers)
 */
export interface OrganizationMember {
	userId: string;
	role: string;
}

export interface OrganizationWithMembers {
	id: string;
	members: OrganizationMember[];
}

/**
 * Check if a user is an admin or owner of an organization
 *
 * @param organization - Organization object with members array
 * @param user - Current authenticated user
 * @returns true if user is admin or owner
 */
export function isOrganizationAdmin(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): boolean {
	if (!organization || !user) {
		return false;
	}

	const member = organization.members.find((m) => m.userId === user.id);

	if (!member) {
		return false;
	}

	return member.role === "admin" || member.role === "owner";
}

/**
 * Check if a user is the owner of an organization
 *
 * @param organization - Organization object with members array
 * @param user - Current authenticated user
 * @returns true if user is the owner
 */
export function isOrganizationOwner(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): boolean {
	if (!organization || !user) {
		return false;
	}

	const member = organization.members.find((m) => m.userId === user.id);

	if (!member) {
		return false;
	}

	return member.role === "owner";
}

/**
 * Check if a user is a member of an organization (any role)
 *
 * @param organization - Organization object with members array
 * @param user - Current authenticated user
 * @returns true if user has any role in the organization
 */
export function isOrganizationMember(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): boolean {
	if (!organization || !user) {
		return false;
	}

	return organization.members.some((m) => m.userId === user.id);
}

/**
 * Get the user's role in an organization
 *
 * @param organization - Organization object with members array
 * @param user - Current authenticated user
 * @returns user's role string, or null if not a member
 */
export function getUserOrganizationRole(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): string | null {
	if (!organization || !user) {
		return null;
	}

	const member = organization.members.find((m) => m.userId === user.id);

	return member?.role || null;
}

/**
 * Check if a user can perform admin actions in an organization
 * Alias for isOrganizationAdmin for backwards compatibility
 */
export const canManageOrganization = isOrganizationAdmin;

/**
 * Check if a user can invite members to an organization
 * Currently, admins and owners can invite
 */
export function canInviteMembers(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): boolean {
	return isOrganizationAdmin(organization, user);
}

/**
 * Check if a user can remove a specific member from an organization
 * Owners can remove anyone, admins can remove non-admin members
 */
export function canRemoveMember(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
	targetMember: OrganizationMember,
): boolean {
	if (!organization || !user) {
		return false;
	}

	const currentUserMember = organization.members.find((m) => m.userId === user.id);

	if (!currentUserMember) {
		return false;
	}

	// Owners can remove anyone except themselves
	if (currentUserMember.role === "owner") {
		return targetMember.userId !== user.id;
	}

	// Admins can remove regular members (not other admins or owners)
	if (currentUserMember.role === "admin") {
		return targetMember.role !== "admin" && targetMember.role !== "owner";
	}

	// Regular members can't remove anyone
	return false;
}

/**
 * Check if a user can update a member's role
 * Only owners can change roles
 */
export function canUpdateMemberRole(
	organization: OrganizationWithMembers | null | undefined,
	user: { id: string } | null | undefined,
): boolean {
	return isOrganizationOwner(organization, user);
}
