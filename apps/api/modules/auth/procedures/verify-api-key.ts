import { ORPCError } from "@orpc/server";
import { apiKeys, subscriptions } from "@snapback/platform";
import { and, eq, gte, isNull, like } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure } from "../../../orpc/procedures";
import { getDb } from "../../../src/services/database";

export const verifyApiKeyProcedure = publicProcedure
	.input(
		z.object({
			apiKey: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		// Check if database is available
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		// Dynamically import verifyApiKey only when needed
		const { verifyApiKey, hashApiKey } = await import("../../../lib/crypto");

		// Rate limit validation attempts to prevent brute force attacks
		// Note: In production, use Redis-based rate limiting
		const rateLimiter = getValidationRateLimiter();
		const rateLimitResult = await rateLimiter.checkLimit(
			"global_validation",
			100,
			60000,
		); // 100 requests per minute

		if (!rateLimitResult.allowed) {
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: "Too many validation attempts. Please try again later.",
			});
		}

		// Always perform a hash comparison to prevent timing attacks
		// This ensures the function takes the same amount of time regardless of key validity
		const dummyHash = await hashApiKey(
			"sk_live_00000000000000000000000000000000",
		);

		// Check format
		if (!input.apiKey.match(/^sk_(live|test)_[a-zA-Z0-9]{32}$/)) {
			// Security: Always return generic error to prevent enumeration
			// Perform dummy hash comparison to maintain timing consistency
			await verifyApiKey(input.apiKey, dummyHash);
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication failed",
			});
		}

		// Extract key prefix for efficient lookup (first 8 characters)
		const keyPrefix = input.apiKey.substring(0, 8);

		// Find candidate keys in database with matching prefix
		// Limit to 10 candidates to prevent abuse
		const candidateKeysResult = await getDb()
			?.select()
			.from(apiKeys)
			.where(
				and(
					like(apiKeys.keyPreview, `${keyPrefix}%`),
					isNull(apiKeys.revokedAt),
					gte(apiKeys.expiresAt, new Date()),
				),
			)
			.limit(10);

		// Ensure we have an array to iterate over
		const candidateKeys = Array.isArray(candidateKeysResult)
			? candidateKeysResult
			: [];

		// Find matching key by verifying hash among candidates only
		let validKey = null;
		for (const storedKey of candidateKeys) {
			const matches = await verifyApiKey(input.apiKey, storedKey.key);
			if (matches) {
				validKey = storedKey;
				break;
			}
		}

		// If no valid key found, perform dummy comparison and return error
		if (!validKey) {
			// Security: Always return generic error to prevent enumeration
			// Perform dummy hash comparison to maintain timing consistency
			await verifyApiKey(input.apiKey, dummyHash);
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication failed",
			});
		}

		// Check if key is expired
		if (validKey.expiresAt && validKey.expiresAt < new Date()) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "API key expired",
			});
		}

		// Get user's subscription
		const subs = await getDb()
			?.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, validKey.userId))
			.limit(1);

		const subscription = subs && subs.length > 0 ? subs[0] : null;

		// Update last used
		await getDb()
			.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, validKey.id));

		// Determine tier
		const tier = subscription?.plan || "free";

		// Check rate limits based on tier
		const limits = getRateLimitByTier(tier);

		return {
			valid: true,
			permissions: validKey.permissions,
			subscription: {
				plan: subscription?.plan || "free",
				status: subscription?.status || "active",
				tier,
				limits,
			},
			userId: validKey.userId,
			organizationId: validKey.organizationId,
		};
	});

// Add this helper
function getRateLimitByTier(tier: string) {
	const limits: Record<
		string,
		{ requestsPerMinute: number; snapshotsPerMonth: number }
	> = {
		free: { requestsPerMinute: 10, snapshotsPerMonth: 1000 },
		solo: { requestsPerMinute: 100, snapshotsPerMonth: 10000 },
		team: { requestsPerMinute: 500, snapshotsPerMonth: 100000 },
		enterprise: { requestsPerMinute: 5000, snapshotsPerMonth: -1 },
	};
	return limits[tier] || limits.free;
}

// Global rate limiter for validation attempts to prevent brute force attacks
class InMemoryRateLimiter {
	private store = new Map<string, { count: number; resetAt: number }>();

	async checkLimit(
		key: string,
		limit: number,
		windowMs: number,
	): Promise<{
		allowed: boolean;
		remaining: number;
		resetAt: Date;
		retryAfter?: number;
	}> {
		const now = Date.now();
		const record = this.store.get(key);

		// No previous record or window expired
		if (!record || record.resetAt < now) {
			const resetAt = new Date(now + windowMs);
			this.store.set(key, {
				count: 1,
				resetAt: resetAt.getTime(),
			});

			return {
				allowed: true,
				remaining: limit - 1,
				resetAt,
			};
		}

		// Within window
		if (record.count < limit) {
			record.count++;
			this.store.set(key, record);

			return {
				allowed: true,
				remaining: limit - record.count,
				resetAt: new Date(record.resetAt),
			};
		}

		// Limit exceeded
		const retryAfter = Math.ceil((record.resetAt - now) / 1000);
		return {
			allowed: false,
			remaining: 0,
			resetAt: new Date(record.resetAt),
			retryAfter,
		};
	}

	clear() {
		this.store.clear();
	}

	// Cleanup expired entries (call periodically)
	cleanup() {
		const now = Date.now();
		for (const [key, record] of this.store.entries()) {
			if (record.resetAt < now) {
				this.store.delete(key);
			}
		}
	}
}

// Global rate limiter instance
let globalValidationRateLimiter: InMemoryRateLimiter | null = null;

function getValidationRateLimiter(): InMemoryRateLimiter {
	if (!globalValidationRateLimiter) {
		globalValidationRateLimiter = new InMemoryRateLimiter();
	}
	return globalValidationRateLimiter;
}
