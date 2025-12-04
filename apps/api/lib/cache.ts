import crypto from "node:crypto";
import { logger } from "@snapback/infrastructure";
import { snapbackSchema } from "@snapback/platform";
import { and, eq, gt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "../src/services/database";

const { responseCache } = snapbackSchema;

export function getCacheKey(req: NextRequest, userId: string): string {
	const url = new URL(req.url);

	// Normalize request for caching - include userId and method to prevent cross-user leaks
	const normalized = {
		userId,
		method: req.method,
		endpoint: url.pathname,
		params: Object.fromEntries(url.searchParams.entries()),
		// Note: We don't include the body in the cache key for GET requests
		// For POST requests, you might want to include a hash of the body
	};

	// Create deterministic hash
	return crypto
		.createHash("sha256")
		.update(JSON.stringify(normalized))
		.digest("hex");
}

export async function getOrCreateCache(
	cacheKey: string,
	userId: string,
): Promise<typeof responseCache.$inferSelect | null> {
	try {
		const db = getDb();
		if (!db) {
			return null;
		}

		// Check cache
		const cached = await getDb()
			.select()
			.from(responseCache)
			.where(
				and(
					eq(responseCache.cacheKey, cacheKey),
					eq(responseCache.userId, userId),
					gt(responseCache.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (!cached || cached.length === 0) {
			return null;
		}

		const cachedItem = cached[0];
		if (cachedItem) {
			// Update hit count
			await db
				.update(responseCache)
				.set({
					hitCount: (cachedItem.hitCount || 0) + 1,
					lastHitAt: new Date(),
				})
				.where(eq(responseCache.cacheKey, cacheKey));

			return cachedItem;
		}

		return null;
	} catch (error) {
		logger.error("Error getting cache", { error });
		return null;
	}
}

export async function setCache(
	cacheKey: string,
	userId: string,
	endpoint: string,
	response: any,
	tokensUsed: number,
	ttl = 3600, // 1 hour default
) {
	try {
		const db = getDb();
		if (!db) {
			return;
		}

		const expiresAt = new Date(Date.now() + ttl * 1000);

		await getDb()
			.insert(responseCache)
			.values({
				cacheKey,
				userId,
				endpoint,
				response,
				tokensUsed,
				expiresAt,
			})
			.onConflictDoUpdate({
				target: responseCache.cacheKey,
				set: {
					userId,
					response,
					tokensUsed,
					expiresAt,
				},
			});
	} catch (error) {
		logger.error("Error setting cache", { error });
	}
}
