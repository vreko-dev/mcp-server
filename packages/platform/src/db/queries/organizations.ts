import slugify from "@sindresorhus/slugify";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { z } from "zod";
import { combinedSchema, db } from "../client.js";
import type { OrganizationUpdateSchema } from "../zod.js";

const { organization, member } = combinedSchema;

export async function getOrganizations({ limit, offset, query }: { limit: number; offset: number; query?: string }) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.organization.findMany({
		where: query ? (org: any, { like }: any) => like(org.name, `%${query}%`) : undefined,
		limit,
		offset,
		extras: {
			membersCount:
				sql<number>`(SELECT COUNT(*) FROM ${member} WHERE ${member.organizationId} = ${organization.id})`.as(
					"membersCount",
				),
		},
	});
}

export async function countAllOrganizations() {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.$count(organization);
}

export async function getOrganizationById(id: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.organization.findFirst({
		where: (org: any, { eq }: any) => eq(org.id, id),
		with: {
			members: true,
			invitations: true,
		},
	});
}

// Optimized function to get organizations with members in a single query
export async function getOrganizationsWithMembers(userId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	// ✅ Single query with JOIN to avoid N+1
	// Fix: Use member table to find organizations for a user
	return await db.query.organization.findMany({
		with: {
			members: {
				where: (member: any, { eq }: any) => eq(member.userId, userId),
				with: {
					user: true, // Nested relation
				},
			},
		},
	});
}

export async function getInvitationById(id: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.invitation.findFirst({
		where: (invitation: any, { eq }: any) => eq(invitation.id, id),
		with: {
			organization: true,
		},
	});
}

export async function getOrganizationBySlug(slug: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.organization.findFirst({
		where: (org: any, { eq }: any) => eq(org.slug, slug),
	});
}

export async function getOrganizationMembership(organizationId: string, userId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.member.findFirst({
		where: (member: any, { and, eq }: any) =>
			and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
		with: {
			organization: true,
		},
	});
}

export async function getOrganizationWithPurchasesAndMembersCount(organizationId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.organization.findFirst({
		where: (org: any, { eq }: any) => eq(org.id, organizationId),
		with: {
			purchases: true,
		},
		extras: {
			membersCount:
				sql<number>`(SELECT COUNT(*) FROM ${member} WHERE ${member.organizationId} = ${organization.id})`.as(
					"membersCount",
				),
		},
	});
}

export async function getPendingInvitationByEmail(email: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.query.invitation.findFirst({
		where: (invitation: any, { and, eq }: any) =>
			and(eq(invitation.email, email), eq(invitation.status, "pending")),
	});
}

export async function updateOrganization(updatedOrganization: z.infer<typeof OrganizationUpdateSchema>) {
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.update(organization).set(updatedOrganization).where(eq(organization.id, updatedOrganization.id));
}

export async function generateOrganizationSlug(name: string) {
	const baseSlug = slugify(name, {
		lowercase: true,
	});

	let slug = baseSlug;
	let hasAvailableSlug = false;

	for (let i = 0; i < 3; i++) {
		const existing = await getOrganizationBySlug(slug);

		if (!existing) {
			hasAvailableSlug = true;
			break;
		}

		slug = `${baseSlug}-${nanoid(5)}`;
	}

	if (!hasAvailableSlug) {
		throw new Error("Could not generate unique slug");
	}

	return slug;
}
