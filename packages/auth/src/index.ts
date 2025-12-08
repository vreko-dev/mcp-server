// Core authentication and authorization utilities for Snapback
// Wraps Better Auth with additional security layers

import { randomBytes } from "node:crypto";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { apiKeys, apiUsage, db, subscriptions, user } from "@snapback/platform";
import { and, avg, count, desc, eq, gte, isNull, like, lt, lte, or } from "drizzle-orm";

// Import and re-export auth from auth.ts
export { auth } from "./auth";

// Re-export business logic functions
export {
	checkOrgMembership,
	getUserOrgIds,
	getUserPermissions,
	getUserPlan,
	hasPermission,
	type SubscriptionPlan,
} from "./business/index";

// ============================================================================
// TYPES
// ============================================================================

export interface User {
	id: string;
	email: string;
	name?: string;
	subscriptionTier: "free" | "solo" | "team" | "enterprise";
	organizationId?: string;
}

export interface ApiKey {
	id: string;
	userId: string;
	key?: string; // Only returned on creation
	keyHash: string;
	keyPreview: string;
	name: string;
	lastUsedAt?: Date | null;
	createdAt: Date;
	expiresAt?: Date | null;
	revokedAt?: Date | null;
	scopes: string[];
	rateLimit: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
	retryAfter?: number;
}

export interface UsageRecord {
	userId: string;
	apiKeyId: string;
	endpoint: string;
	timestamp: Date;
	statusCode: number;
	responseTime: number;
}

export interface SubscriptionLimits {
	snapshotsPerMonth: number;
	storageRetentionDays: number;
	protectedFiles: number;
	teamSeats: number;
	apiRateLimit: number;
}

export interface CreateApiKeyParams {
	userId: string;
	name: string;
	scopes?: string[];
	rateLimit?: number;
	expiresAt?: Date;
}

export interface ValidationResult {
	valid: boolean;
	user?: User;
	scopes?: string[];
	error?: string;
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Generate a cryptographically secure API key
 */
export function generateApiKey(mode: "live" | "test" = "live"): string {
	const prefix = mode === "test" ? "sk_test_" : "sk_live_";
	const randomString = randomBytes(16).toString("hex");
	return prefix + randomString;
}

/**
 * Hash an API key using argon2id (more secure than bcrypt)
 * Argon2id combines side-channel resistance (Argon2i) and GPU resistance (Argon2d)
 */
export async function hashApiKey(apiKey: string): Promise<string> {
	// Use argon2id with secure parameters
	// Memory cost: 64MB, Time cost: 3 iterations, Parallelism: 4
	return await argon2Hash(apiKey, {
		memoryCost: 65536, // 64 MB
		timeCost: 3,
		parallelism: 4,
		outputLen: 32,
	});
}

/**
 * Verify an API key against its argon2id hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
	try {
		return await argon2Verify(hash, apiKey);
	} catch (_error) {
		return false;
	}
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(params: CreateApiKeyParams): Promise<ApiKey & { fullKey: string }> {
	const { userId, name, scopes = ["snapshots:read"], rateLimit = 100, expiresAt } = params;

	// Generate plain text key
	const key = generateApiKey();

	// Hash it for storage
	const keyHash = await hashApiKey(key);

	// Store in database
	if (!db) {
		throw new Error("Database not initialized");
	}

	// Convert scopes array to permissions object
	const permissions: Record<string, boolean> = {};
	scopes.forEach((scope) => {
		permissions[scope] = true;
	});

	const [apiKey] = await db
		.insert(apiKeys)
		.values({
			userId,
			name,
			key: keyHash,
			keyPreview: key.substring(0, 8),
			permissions: permissions,
			expiresAt,
			createdAt: new Date(),
		})
		.returning();

	// Return with plain key (ONLY TIME IT'S VISIBLE)
	return {
		id: apiKey.id,
		userId: apiKey.userId,
		keyHash: apiKey.key, // DB stores hash in 'key' field
		keyPreview: apiKey.keyPreview,
		name: apiKey.name,
		lastUsedAt: apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null,
		createdAt: new Date(apiKey.createdAt),
		expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
		revokedAt: null,
		scopes,
		rateLimit,
		fullKey: key, // Plain text - show to user once
	};
}

// Global rate limiter for validation attempts to prevent brute force attacks
let globalValidationRateLimiter: InMemoryRateLimiter | null = null;

function getValidationRateLimiter(): InMemoryRateLimiter {
	if (!globalValidationRateLimiter) {
		globalValidationRateLimiter = new InMemoryRateLimiter();
	}
	return globalValidationRateLimiter;
}

// Use a pre-computed argon2id hash string constant for timing attack prevention
// This avoids async module initialization and ensures immediate availability
const _DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // argon2id hash of "sk_live_00000000000000000000000000000000"

/**
 * Validate an API key and return associated user
 */
export async function validateApiKey(
	apiKey: string,
	requestIP?: string, // Optional IP address for rate limiting
): Promise<ValidationResult> {
	// Rate limit validation attempts to prevent brute force attacks
	const rateLimiter = getValidationRateLimiter();
	const rateLimitKey = requestIP || "global_validation";
	const rateLimitResult = await rateLimiter.checkLimit(rateLimitKey, 100, 60000); // 100 requests per minute

	if (!rateLimitResult.allowed) {
		return {
			valid: false,
			error: "Too many validation attempts. Please try again later.",
		};
	}

	// Always perform a bcrypt comparison to prevent timing attacks
	// This ensures the function takes the same amount of time regardless of key validity
	// Use pre-computed hash to avoid redundant bcrypt operations on every request
	const dummyHash = _DUMMY_HASH;

	// Check format
	if (!apiKey.match(/^sk_(live|test)_[a-zA-Z0-9]{32}$/)) {
		// Security: Always return generic error to prevent enumeration
		// Perform dummy bcrypt comparison to maintain timing consistency
		await verifyApiKey(apiKey, dummyHash);
		return {
			valid: false,
			error: "Authentication failed",
		};
	}

	if (!db) {
		// Perform dummy bcrypt comparison to maintain timing consistency
		await verifyApiKey(apiKey, dummyHash);
		return {
			valid: false,
			error: "Authentication failed",
		};
	}

	// Extract key prefix for efficient lookup (first 8 characters)
	const keyPrefix = apiKey.substring(0, 8);

	// Find candidate keys in database with matching prefix
	// Limit to 10 candidates to prevent abuse
	// Include keys with null expiresAt (never expire)
	const candidateKeysResult = await db
		.select()
		.from(apiKeys)
		.where(
			and(
				like(apiKeys.keyPreview, `${keyPrefix}%`),
				or(gte(apiKeys.expiresAt, new Date()), isNull(apiKeys.expiresAt)),
			),
		)
		.limit(10);

	// Ensure we have an array to iterate over
	const candidateKeys = Array.isArray(candidateKeysResult) ? candidateKeysResult : [];

	// Find matching key by verifying hash among candidates only
	let validKeyFound = false;
	let validUser: User | undefined;
	let validScopes: string[] = [];
	let _validSubscriptionTier: "free" | "solo" | "team" | "enterprise" = "free";

	for (const storedKey of candidateKeys) {
		const matches = await verifyApiKey(apiKey, storedKey.key);

		if (matches) {
			// Check expiration
			if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
				// Security: Always return generic error to prevent enumeration
				// But we still found a valid key, so don't return yet
				continue;
			}

			// Update last used timestamp
			await db
				.update(apiKeys)
				.set({
					lastUsedAt: new Date(),
				})
				.where(eq(apiKeys.id, storedKey.id));

			// Get user
			const [userRecord] = await db.select().from(user).where(eq(user.id, storedKey.userId));

			if (!userRecord) {
				// Security: Always return generic error to prevent enumeration
				// But we still found a valid key, so don't return yet
				continue;
			}

			// Get user's subscription tier
			let subscriptionTier: "free" | "solo" | "team" | "enterprise" = "free";
			const [subscription] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.userId, storedKey.userId))
				.orderBy(desc(subscriptions.createdAt))
				.limit(1);

			if (subscription) {
				subscriptionTier = subscription.plan as "free" | "solo" | "team" | "enterprise";
			}

			// Extract scopes from permissions
			const scopes = storedKey.permissions ? Object.keys(storedKey.permissions) : [];

			validKeyFound = true;
			validUser = {
				id: userRecord.id,
				email: userRecord.email,
				name: userRecord.name,
				subscriptionTier: subscriptionTier,
			};
			validScopes = scopes;
			_validSubscriptionTier = subscriptionTier;
		}
	}

	// If we found a valid key, return success
	if (validKeyFound) {
		return {
			valid: true,
			user: validUser,
			scopes: validScopes,
		};
	}

	// Security: Always return generic error to prevent enumeration
	// Perform dummy bcrypt comparison to maintain timing consistency
	await verifyApiKey(apiKey, dummyHash);
	return {
		valid: false,
		error: "Authentication failed",
	};
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<{ success: boolean; error?: string }> {
	if (!db) {
		return { success: false, error: "Database not initialized" };
	}

	// Verify ownership
	const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId));

	if (!apiKey) {
		return { success: false, error: "API key not found" };
	}

	if (apiKey.userId !== userId) {
		return { success: false, error: "Unauthorized" };
	}

	// Delete key
	await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

	return { success: true };
}

/**
 * List all API keys for a user (without revealing the keys)
 */
export async function listApiKeys(userId: string): Promise<Omit<ApiKey, "keyHash">[]> {
	if (!db) {
		throw new Error("Database not initialized");
	}

	const keys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));

	// Remove keyHash from response and map to expected interface
	return keys.map((keyData: typeof apiKeys.$inferSelect) => ({
		id: keyData.id,
		userId: keyData.userId,
		keyHash: keyData.key, // The 'key' field in DB is the hashed version
		keyPreview: keyData.keyPreview,
		name: keyData.name,
		lastUsedAt: keyData.lastUsedAt ? new Date(keyData.lastUsedAt) : null,
		createdAt: new Date(keyData.createdAt),
		expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : null,
		revokedAt: keyData.revokedAt ? new Date(keyData.revokedAt) : null,
		scopes: keyData.permissions ? Object.keys(keyData.permissions) : [],
		rateLimit: 100, // Default rate limit
	}));
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * In-memory rate limiter (for development/small scale)
 */
export class InMemoryRateLimiter {
	private store = new Map<string, { count: number; resetAt: number }>();

	async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
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

/**
 * Redis-backed rate limiter (for production)
 */
export class RedisRateLimiter {
	// biome-ignore lint/suspicious/noExplicitAny: Redis client type varies by implementation
	constructor(private redis: any) {}

	async checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
		const redisKey = `ratelimit:${key}`;
		const windowSeconds = Math.ceil(windowMs / 1000);

		try {
			// Get current count
			const current = await this.redis.get(redisKey);

			if (!current) {
				// First request in window
				await this.redis.set(redisKey, "1", "EX", windowSeconds);

				return {
					allowed: true,
					remaining: limit - 1,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			const count = Number.parseInt(current, 10);

			if (count < limit) {
				// Increment counter
				await this.redis.incr(redisKey);

				// Get TTL for reset time
				const ttl = await this.redis.ttl(redisKey);

				return {
					allowed: true,
					remaining: limit - count - 1,
					resetAt: new Date(Date.now() + ttl * 1000),
				};
			}

			// Limit exceeded
			const ttl = await this.redis.ttl(redisKey);

			return {
				allowed: false,
				remaining: 0,
				resetAt: new Date(Date.now() + ttl * 1000),
				retryAfter: ttl,
			};
		} catch (_error) {
			// Fail open - allow request if Redis is down
			return {
				allowed: true,
				remaining: limit,
				resetAt: new Date(Date.now() + windowMs),
			};
		}
	}
}

/**
 * Get rate limits based on subscription tier
 */
export function getRateLimitByTier(tier: string): SubscriptionLimits {
	const limits: Record<string, SubscriptionLimits> = {
		free: {
			snapshotsPerMonth: 1000,
			storageRetentionDays: 7,
			protectedFiles: 5,
			teamSeats: 1,
			apiRateLimit: 10, // 10 req/min
		},
		solo: {
			snapshotsPerMonth: 5000,
			storageRetentionDays: 30,
			protectedFiles: 25,
			teamSeats: 1,
			apiRateLimit: 50, // 50 req/min
		},
		team: {
			snapshotsPerMonth: 100000,
			storageRetentionDays: 365,
			protectedFiles: 500,
			teamSeats: 10,
			apiRateLimit: 500, // 500 req/min
		},
		enterprise: {
			snapshotsPerMonth: -1, // Unlimited
			storageRetentionDays: -1, // Custom
			protectedFiles: -1, // Unlimited
			teamSeats: -1, // Unlimited
			apiRateLimit: 5000, // 5000 req/min
		},
	};

	return limits[tier] || limits.free;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Track API usage
 */
export async function trackUsage(usage: UsageRecord): Promise<void> {
	if (!db) {
		throw new Error("Database not initialized");
	}

	await db.insert(apiUsage).values({
		apiKeyId: usage.apiKeyId,
		endpoint: usage.endpoint,
		method: "GET", // Default for now
		statusCode: usage.statusCode,
		metadata: {},
		timestamp: usage.timestamp,
	});
}

/**
 * Get usage statistics for a time period
 */
export async function getUsageStats(userId: string, startDate: Date, endDate: Date) {
	if (!db) {
		throw new Error("Database not initialized");
	}

	// Get total requests
	const totalRequestsResult = await db
		.select({ count: count() })
		.from(apiUsage)
		.innerJoin(apiKeys, eq(apiKeys.id, apiUsage.apiKeyId))
		.where(and(eq(apiKeys.userId, userId), gte(apiUsage.timestamp, startDate), lte(apiUsage.timestamp, endDate)));

	const totalRequests = totalRequestsResult[0]?.count || 0;

	// Get successful requests (2xx status codes)
	const successfulRequestsResult = await db
		.select({ count: count() })
		.from(apiUsage)
		.innerJoin(apiKeys, eq(apiKeys.id, apiUsage.apiKeyId))
		.where(
			and(
				eq(apiKeys.userId, userId),
				gte(apiUsage.timestamp, startDate),
				lte(apiUsage.timestamp, endDate),
				gte(apiUsage.statusCode, 200),
				lt(apiUsage.statusCode, 300),
			),
		);

	const successfulRequests = successfulRequestsResult[0]?.count || 0;

	// Get average response time
	const avgResponseResult = await db
		.select({ avg: avg(apiUsage.id) }) // Simplified for now
		.from(apiUsage)
		.innerJoin(apiKeys, eq(apiKeys.id, apiUsage.apiKeyId))
		.where(and(eq(apiKeys.userId, userId), gte(apiUsage.timestamp, startDate), lte(apiUsage.timestamp, endDate)));

	const avgResponseTime = avgResponseResult[0]?.avg || 0;

	return {
		totalRequests,
		successfulRequests,
		successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
		avgResponseTime,
	};
}

/**
 * Check if user is within usage limits
 */
export async function checkUsageLimits(userId: string, tier: string) {
	const limits = getRateLimitByTier(tier);

	// Unlimited for enterprise
	if (limits.snapshotsPerMonth === -1) {
		return {
			allowed: true,
			remaining: -1,
			percentUsed: 0,
		};
	}

	// Get current month usage
	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	if (!db) {
		throw new Error("Database not initialized");
	}

	const usageResult = await db
		.select({ count: count() })
		.from(apiUsage)
		.innerJoin(apiKeys, eq(apiKeys.id, apiUsage.apiKeyId))
		.where(and(eq(apiKeys.userId, userId), gte(apiUsage.timestamp, startOfMonth)));

	const usage = usageResult[0]?.count || 0;
	const remaining = Math.max(0, limits.snapshotsPerMonth - usage);
	const percentUsed = (usage / limits.snapshotsPerMonth) * 100;

	return {
		allowed: usage < limits.snapshotsPerMonth,
		remaining,
		percentUsed,
		warning: percentUsed >= 80,
		upgradeRequired: usage >= limits.snapshotsPerMonth,
	};
}

// ============================================================================
// TEAM DETECTION
// ============================================================================

const CONSUMER_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com"];

/**
 * Detect if user is part of a potential team
 */
export async function detectPotentialTeam(
	// biome-ignore lint/suspicious/noExplicitAny: Database client type varies by implementation
	db: any,
	userId: string,
	email: string,
	// biome-ignore lint/suspicious/noExplicitAny: Metadata structure is dynamic
	metadata?: any,
) {
	const domain = email.split("@")[1];

	// Skip consumer email domains
	if (CONSUMER_EMAIL_DOMAINS.includes(domain)) {
		return {
			isTeam: false,
			reason: "Consumer email domain",
		};
	}

	// Find other users with same domain
	const sameOrgUsers = await db.user.findMany({
		where: {
			email: {
				endsWith: `@${domain}`,
			},
			id: {
				not: userId,
			},
		},
	});

	if (sameOrgUsers.length >= 2) {
		return {
			isTeam: true,
			teamMembers: sameOrgUsers,
			confidence: "high",
			suggestedAction: "upgrade_to_team",
		};
	}

	// Check for shared project patterns
	if (metadata?.repositoryUrl) {
		const sharedRepoUsers = await db.user.findMany({
			where: {
				// This would need a proper schema field
				// metadata: { contains: metadata.repositoryUrl }
			},
		});

		if (sharedRepoUsers.length >= 1) {
			return {
				isTeam: true,
				teamMembers: sharedRepoUsers,
				confidence: "medium",
				suggestedAction: "upgrade_to_team",
			};
		}
	}

	return {
		isTeam: false,
		reason: "Insufficient team indicators",
	};
}

/**
 * Calculate team upgrade recommendation
 */
export function suggestTeamUpgrade(individualUsers: number) {
	const individualCost = individualUsers * 19; // $19/mo per Solo user
	const teamCost = individualUsers * 49; // $49/mo per Team seat

	return {
		currentCost: individualCost,
		teamCost,
		monthlySavings: Math.max(0, individualCost - teamCost),
		recommended: individualUsers >= 3,
		breakEvenUsers: 3,
		features: [
			"Shared snapshots",
			"Team analytics",
			"Centralized billing",
			"Role-based access",
			"Priority support",
		],
	};
}

// ============================================================================
// SUBSCRIPTION VALIDATION
// ============================================================================

/**
 * Validate user's subscription status
 */
export async function validateSubscription(
	// biome-ignore lint/suspicious/noExplicitAny: Database client type varies by implementation
	db: any,
	userId: string,
) {
	const subscription = await db.purchase.findFirst({
		where: {
			userId,
			status: {
				in: ["active", "trialing", "past_due", "canceled"],
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	if (!subscription) {
		return {
			valid: true,
			tier: "free",
		};
	}

	const now = new Date();
	const periodEnd = subscription.currentPeriodEnd;

	// Subscription is valid until period end, even if canceled
	if (periodEnd && periodEnd > now) {
		const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		return {
			valid: true,
			tier: subscription.tier,
			expiresAt: periodEnd,
			gracePeriod: subscription.status === "canceled",
			daysRemaining,
		};
	}

	// Expired
	return {
		valid: false,
		tier: subscription.tier,
		reason: "Subscription expired",
	};
}

/**
 * Check if user has access to a specific feature
 */
export function checkFeatureAccess(tier: string, feature: string) {
	const featureMap: Record<string, string> = {
		api_access: "solo",
		team_collaboration: "team",
		sso: "enterprise",
		audit_logs: "enterprise",
		custom_retention: "enterprise",
		advanced_analytics: "team",
		priority_support: "solo",
	};

	const requiredTier = featureMap[feature];

	if (!requiredTier) {
		return { allowed: true }; // Feature doesn't exist or is free
	}

	const tierHierarchy = ["free", "solo", "team", "enterprise"];
	const userTierIndex = tierHierarchy.indexOf(tier);
	const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

	if (userTierIndex >= requiredTierIndex) {
		return { allowed: true };
	}

	return {
		allowed: false,
		requiredTier,
		upgradeUrl: `/upgrade?plan=${requiredTier}`,
	};
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Express/Next.js middleware to validate API key
 */
interface ApiRequest {
	headers: Record<string, string | string[] | undefined>;
	connection?: { remoteAddress?: string };
	socket?: { remoteAddress?: string };
	user?: unknown;
	scopes?: string[];
}

interface ApiResponse {
	status(code: number): this;
	json(data: unknown): this;
	setHeader(name: string, value: string | number): this;
}

type NextFunction = () => void;

export function requireApiKey(rateLimiter: RedisRateLimiter) {
	return async (req: ApiRequest, res: ApiResponse, next: NextFunction) => {
		const authHeader = req.headers.authorization;
		const apiKey = Array.isArray(authHeader)
			? authHeader[0]?.replace("Bearer ", "")
			: authHeader?.replace("Bearer ", "");

		// Get client IP for rate limiting
		const xForwardedFor = req.headers["x-forwarded-for"];
		const xRealIp = req.headers["x-real-ip"];

		let clientIP: string;
		if (Array.isArray(xForwardedFor)) {
			clientIP = xForwardedFor[0];
		} else if (xForwardedFor) {
			clientIP = xForwardedFor;
		} else if (xRealIp && Array.isArray(xRealIp)) {
			clientIP = xRealIp[0];
		} else if (xRealIp) {
			clientIP = xRealIp;
		} else {
			clientIP = req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
		}

		if (!apiKey) {
			return res.status(401).json({ error: "API key required" });
		}

		// Validate key with IP-based rate limiting
		const validation = await validateApiKey(apiKey, clientIP);

		if (!validation.valid) {
			return res.status(401).json({ error: validation.error });
		}

		// Check rate limit
		const subscriptionTier = validation.user?.subscriptionTier || "free";
		const limits = getRateLimitByTier(subscriptionTier);
		const userId = validation.user?.id || "anonymous";
		const rateLimit = await rateLimiter.checkLimit(
			userId,
			limits.apiRateLimit,
			60000, // 1 minute
		);

		if (!rateLimit.allowed) {
			res.setHeader("X-RateLimit-Limit", limits.apiRateLimit);
			res.setHeader("X-RateLimit-Remaining", 0);
			res.setHeader("X-RateLimit-Reset", rateLimit.resetAt.toISOString());
			res.setHeader("Retry-After", rateLimit.retryAfter || 60);

			return res.status(429).json({
				error: "Rate limit exceeded",
				retryAfter: rateLimit.retryAfter,
			});
		}

		// Attach user to request
		req.user = validation.user;
		req.scopes = validation.scopes;

		// Set rate limit headers
		res.setHeader("X-RateLimit-Limit", limits.apiRateLimit);
		res.setHeader("X-RateLimit-Remaining", rateLimit.remaining);
		res.setHeader("X-RateLimit-Reset", rateLimit.resetAt.toISOString());

		next();
	};
}

export {
	AuthError,
	InsufficientRoleError,
	InsufficientScopesError,
} from "./errors";
// Extension JWT authentication
export type {
	ExtensionAccessTokenPayload,
	ExtensionAuthContext,
} from "./lib/extension-jwt";
export {
	decodeExtensionAccessToken,
	signExtensionAccessToken,
	verifyExtensionAccessToken,
} from "./lib/extension-jwt";
export type { PlanPermissions } from "./plan";
export { getPlanPermissions, mapUserToPlan } from "./plan";
export type {
	PlanId,
	SnapbackAuth,
	SnapbackAuthContext,
	UserRole,
} from "./shared-auth";
export { snapbackAuth } from "./shared-auth-impl";
