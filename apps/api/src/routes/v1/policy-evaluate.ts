import { zValidator } from "@hono/zod-validator";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/infrastructure";
import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "../../../lib/logger";
import { getDb } from "../../services/database";

// In-memory cache for revocation status with TTL
const revocationCache = new Map<string, { revoked: boolean; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

// We'll use a dynamic import to avoid TypeScript compilation issues
let evaluate: any;

// Lazy load the policy engine
const loadPolicyEngine = async () => {
	if (!evaluate) {
		// Fix: Use a more specific import approach to avoid TypeScript issues
		try {
			// Try to import the module directly
			const policyEngineModule = await import("@snapback/policy-engine");
			evaluate = policyEngineModule.evaluate;
		} catch (error) {
			logger.error("Failed to load policy engine", { error });
			// Instead of throwing an error, we'll set evaluate to a mock function
			// This allows the service to start even if the policy engine is not available
			evaluate = () => {
				throw new Error("Policy engine not available");
			};
		}
	}
};

// Check if API key is revoked with caching
async function isApiKeyRevoked(apiKeyId: string, apiKeyValue: string): Promise<boolean> {
	// Check cache first
	const cached = revocationCache.get(apiKeyId);
	const now = Date.now();

	if (cached && now - cached.timestamp < CACHE_TTL) {
		return cached.revoked;
	}

	// Cache miss or expired, check database
	try {
		const db = getDb();
		if (!db) {
			throw new Error("Database not available");
		}

		const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.key, apiKeyValue)).limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			// Cache the result as revoked (invalid key)
			revocationCache.set(apiKeyId, { revoked: true, timestamp: now });
			return true;
		}

		const apiKey = apiKeyResult[0];
		const revoked = !!apiKey.revokedAt;

		// Cache the result
		revocationCache.set(apiKeyId, { revoked, timestamp: now });
		return revoked;
	} catch (error) {
		log.error(error as Error, { context: "API key revocation check" });
		// On error, assume not revoked to avoid blocking valid requests
		return false;
	}
}

// Periodically clean up expired cache entries
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of revocationCache.entries()) {
		if (now - value.timestamp >= CACHE_TTL) {
			revocationCache.delete(key);
		}
	}
}, 30000); // Clean up every 30 seconds

const app = new Hono();

// Input validation schema
const policyEvaluateSchema = z.object({
	sarif: z.any(), // SARIF data to evaluate
	policy: z.any().optional(), // Custom policy configuration
	filePath: z.string().optional(), // Optional file path for path-based rules
	workspaceId: z.string().optional(),
});

// POST /api/v1/policy/evaluate
app.post("/policy/evaluate", zValidator("json", policyEvaluateSchema), async (c) => {
	try {
		// Get authenticated user
		const authResult = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!authResult || !authResult.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const user = authResult.user;
		const requestData = c.req.valid("json");

		// Get user's API key
		const apiKeyHeader = c.req.header("x-api-key");
		if (!apiKeyHeader) {
			return c.json({ error: "API key required" }, 401);
		}

		// Validate API key
		const db = getDb();
		if (!db) {
			return c.json({ error: "Database not available" }, 500);
		}

		const apiKeyResult = await db.select().from(apiKeys).where(eq(apiKeys.key, apiKeyHeader)).limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		const apiKey = apiKeyResult[0];

		// Check if API key belongs to the user
		if (apiKey.userId !== user.id) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		// Check if API key is revoked (with caching)
		const isRevoked = await isApiKeyRevoked(apiKey.id, apiKeyHeader);
		if (isRevoked) {
			return c.json({ error: "API key has been revoked" }, 401);
		}

		// Check if API key has expired
		if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
			return c.json({ error: "API key expired" }, 401);
		}

		// Check if policy evaluation is enabled for this API key
		const permissions = apiKey.permissions as {
			policyEvaluation?: boolean;
		};

		if (!permissions.policyEvaluation) {
			return c.json(
				{
					error: "Policy evaluation not available on your plan",
					upgradeUrl: "/pricing",
					feature: "policyEvaluation",
					requiredPlan: "team",
				},
				402,
			);
		}

		// Load policy engine
		await loadPolicyEngine();

		// Perform policy evaluation
		const policyConfig = requestData.policy
			? {
					thresholds: requestData.policy.thresholds || {},
					blockOn: requestData.policy.blockOn || {},
					pathRules: requestData.policy.pathRules || [],
				}
			: undefined;

		const result = evaluate(requestData.sarif, policyConfig, requestData.filePath);

		// Update API key last used timestamp
		await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));

		return c.json(result);
	} catch (error) {
		log.error(error as Error, { context: "Policy evaluation" });

		// Handle structured error responses
		if (error instanceof Error) {
			try {
				const errorData = JSON.parse(error.message);
				if (errorData.feature && errorData.upgradeUrl) {
					return c.json(errorData, 402);
				}
			} catch (_parseError) {
				// Not a structured error, continue with generic error handling
			}

			return c.json(
				{
					error: error.message,
				},
				500,
			);
		}

		return c.json(
			{
				error: "Policy evaluation failed",
			},
			500,
		);
	}
});

export default app;
