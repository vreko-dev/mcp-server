/**
 * Payments Service - Handles payment-related database operations
 *
 * Per C-002: All database queries go through service layer
 * Financial operations: User lookup, purchases, organization billing
 */

import { member, organization, purchase, user } from "@snapback/platform";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/src/services/database";

// ============================================================================
// Types
// ============================================================================

export interface UserRecord {
	id: string;
	email: string;
	name: string;
	paymentsCustomerId: string | null;
}

export interface OrganizationBillingInfo {
	organization: typeof organization.$inferSelect | null;
	memberCount: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get full user record for payment operations
 */
export async function getUserForPayments(userId: string): Promise<UserRecord | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const users = await db.select().from(user).where(eq(user.id, userId)).limit(1);

	if (!users || users.length === 0) {
		return null;
	}

	return users[0] as UserRecord;
}

/**
 * Get organization billing information including member count
 */
export async function getOrganizationBillingInfo(organizationId: string): Promise<OrganizationBillingInfo> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const [organizations, memberResult] = await Promise.all([
		db.select().from(organization).where(eq(organization.id, organizationId)).limit(1),
		db
			.select({
				count: sql<number>`count(*)`.mapWith(Number),
			})
			.from(member)
			.where(eq(member.organizationId, organizationId)),
	]);

	return {
		organization: organizations?.[0] ?? null,
		memberCount: memberResult?.[0]?.count ?? 0,
	};
}

/**
 * Get purchases for a user
 */
export async function getUserPurchases(userId: string) {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.select().from(purchase).where(eq(purchase.userId, userId));
}

/**
 * Get purchases for an organization
 */
export async function getOrganizationPurchases(organizationId: string) {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	return await db.select().from(purchase).where(eq(purchase.organizationId, organizationId));
}

// ============================================================================
// Customer Portal Functions
// ============================================================================

export interface PurchaseRecord {
	id: string;
	userId: string | null;
	organizationId: string | null;
	customerId: string;
	productId: string | null;
	status: string | null;
}

/**
 * Get purchase by ID
 */
export async function getPurchaseById(purchaseId: string): Promise<PurchaseRecord | null> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.select().from(purchase).where(eq(purchase.id, purchaseId)).limit(1);

	if (!result?.[0]) {
		return null;
	}

	return result[0] as PurchaseRecord;
}

/**
 * Check if user is owner of an organization
 */
export async function checkUserOrganizationOwnership(
	organizationId: string,
	userId: string,
): Promise<{ isOwner: boolean }> {
	const db = getDb();
	if (!db) {
		throw new Error("Database not available");
	}

	const membershipResult = await db
		.select()
		.from(member)
		.where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
		.limit(1);

	const membership = membershipResult?.[0] ?? null;

	return { isOwner: membership?.role === "owner" };
}
