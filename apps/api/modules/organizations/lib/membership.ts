import { member, organization } from "@snapback/platform";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../src/services/database";

export async function getOrganizationMembership(userId: string, organizationId: string) {
	// Check if database is available and capture reference
	const db = getDb();
	if (!db) {
		return null;
	}

	const memberships = await db
		.select({
			organization: organization,
			member: member,
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
		.limit(1);

	if (!memberships || memberships.length === 0) {
		return null;
	}

	const membership = memberships[0];

	return {
		organization: membership.organization,
		role: membership.member.role,
	};
}

export async function verifyOrganizationMembership(organizationId: string, userId: string) {
	const membership = await getOrganizationMembership(organizationId, userId);
	return membership !== null;
}
