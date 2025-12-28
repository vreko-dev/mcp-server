/**
 * Organization Type Definitions for SnapBack Web App
 *
 * Proper types for organization data to replace (organization as any) casts.
 * Based on Better Auth organization plugin schema.
 */

/**
 * Organization member role
 */
export type OrganizationRole = "owner" | "admin" | "member";

/**
 * Organization member
 */
export interface OrganizationMember {
	id: string;
	organizationId: string;
	userId: string;
	role: OrganizationRole;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Organization entity
 *
 * From Better Auth organization plugin
 */
export interface Organization {
	id: string;
	name: string;
	slug: string;
	logo?: string | null;
	createdAt: Date;
	updatedAt: Date;
	metadata?: Record<string, unknown>;
}

/**
 * Organization with member data
 */
export interface OrganizationWithMembers extends Organization {
	members: OrganizationMember[];
}

/**
 * Type guard to check if user is organization owner
 */
export function isOrganizationOwner(organization: Organization | null, user: { id: string } | null): boolean {
	if (!organization || !user) {
		return false;
	}

	// Check if organization has members list
	if ("members" in organization && Array.isArray((organization as OrganizationWithMembers).members)) {
		const member = (organization as OrganizationWithMembers).members.find((m) => m.userId === user.id);
		return member?.role === "owner";
	}

	return false;
}

/**
 * Type guard to check if user is organization admin (owner or admin role)
 */
export function isOrganizationAdmin(organization: Organization | null, user: { id: string } | null): boolean {
	if (!organization || !user) {
		return false;
	}

	// Check if organization has members list
	if ("members" in organization && Array.isArray((organization as OrganizationWithMembers).members)) {
		const member = (organization as OrganizationWithMembers).members.find((m) => m.userId === user.id);
		return member?.role === "owner" || member?.role === "admin";
	}

	return false;
}

/**
 * Type guard to check if user is organization member
 */
export function isOrganizationMember(organization: Organization | null, user: { id: string } | null): boolean {
	if (!organization || !user) {
		return false;
	}

	// Check if organization has members list
	if ("members" in organization && Array.isArray((organization as OrganizationWithMembers).members)) {
		return (organization as OrganizationWithMembers).members.some((m) => m.userId === user.id);
	}

	return false;
}
