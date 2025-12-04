import { auth } from "@snapback/auth";
import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { log } from "../../../lib/logger";
import { getDb } from "../../services/database";

const app = new Hono();

// GET /api/v1/policy/current
app.get("/policy/current", async (c) => {
	try {
		// Get authenticated user
		const authResult = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!authResult || !authResult.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const user = authResult.user;

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

		const apiKeyResult = await db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.key, apiKeyHeader))
			.limit(1);

		if (!apiKeyResult || apiKeyResult.length === 0) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		const apiKey = apiKeyResult[0];

		// Check if API key belongs to the user
		if (apiKey.userId !== user.id) {
			return c.json({ error: "Invalid API key" }, 401);
		}

		// Check if API key is revoked
		if (apiKey.revokedAt) {
			return c.json({ error: "API key has been revoked" }, 401);
		}

		// Check if API key has expired
		if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
			return c.json({ error: "API key expired" }, 401);
		}

		// Return current policy version information
		// In a real implementation, this would fetch from a policy service
		const policyInfo = {
			version: "1.0.0",
			lastUpdated: new Date().toISOString(),
			checksum: "abc123def456",
			rulesCount: 42,
		};

		// Set cache headers
		c.header("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
		c.header("ETag", `"${policyInfo.checksum}"`);

		// Update API key last used timestamp
		await db
			.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, apiKey.id));

		return c.json(policyInfo);
	} catch (error) {
		log.error(error as Error, { context: "Policy current" });
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to get policy version",
			},
			500,
		);
	}
});

export default app;
