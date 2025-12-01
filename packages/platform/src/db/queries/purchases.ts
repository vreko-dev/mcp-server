import { eq } from "drizzle-orm";
import type { z } from "zod";
import { combinedSchema, db } from "../client.js";
import type { PurchaseInsertSchema, PurchaseUpdateSchema } from "../zod.js";

const { purchase } = combinedSchema;

export async function getPurchasesByOrganizationId(organizationId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.query.purchase.findMany({
		where: (purchase: any, { eq }: any) => eq(purchase.organizationId, organizationId),
	});
}

export async function getPurchasesByUserId(userId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.query.purchase.findMany({
		where: (purchase: any, { eq }: any) => eq(purchase.userId, userId),
	});
}

export async function getPurchaseById(id: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.query.purchase.findFirst({
		where: (purchase: any, { eq }: any) => eq(purchase.id, id),
	});
}

export async function getPurchaseBySubscriptionId(subscriptionId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	return db.query.purchase.findFirst({
		where: (purchase: any, { eq }: any) => eq(purchase.subscriptionId, subscriptionId),
	});
}

export async function createPurchase(insertedPurchase: z.infer<typeof PurchaseInsertSchema>) {
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.insert(purchase).values(insertedPurchase).returning({ id: purchase.id });
	const firstResult = result[0];
	if (!firstResult) {
		throw new Error("Failed to create purchase");
	}
	const { id } = firstResult;

	return getPurchaseById(id);
}

export async function updatePurchase(updatedPurchase: z.infer<typeof PurchaseUpdateSchema>) {
	if (!db) {
		throw new Error("Database not available");
	}

	const result = await db.update(purchase).set(updatedPurchase).returning({ id: purchase.id });
	const firstResult = result[0];
	if (!firstResult) {
		throw new Error("Failed to update purchase");
	}
	const { id } = firstResult;

	return getPurchaseById(id);
}

export async function deletePurchaseBySubscriptionId(subscriptionId: string) {
	if (!db) {
		throw new Error("Database not available");
	}

	await db.delete(purchase).where(eq(purchase.subscriptionId, subscriptionId));
}
