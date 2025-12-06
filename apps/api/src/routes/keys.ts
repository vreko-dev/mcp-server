import { zValidator } from "@hono/zod-validator";
import { auth } from "@snapback/auth";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "../../lib/logger";
import { requirePasskey } from "../middleware/passkey-policy";
import { requireStepUp } from "../middleware/stepup";
import { createApiKey, getApiKey, revokeApiKey } from "../services/keys";

const app = new Hono();

// Validation schemas
const createKeySchema = z.object({
	permissions: z.record(z.string(), z.any()).optional(),
	expiresAt: z.string().datetime().optional(),
});

const revokeKeySchema = z.object({
	id: z.string(),
});

// POST /keys - Create a new API key
// Protected with step-up + passkey enforcement
app.post(
	"/keys",
	requireStepUp,
	requirePasskey,
	zValidator("json", createKeySchema),
	async (c) => {
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

			// Create a new API key
			const apiKey = await createApiKey(
				user.id,
				requestData.permissions || {},
				requestData.expiresAt ? new Date(requestData.expiresAt) : undefined,
			);

			// Get the full key details
			const keyDetails = await getApiKey(apiKey.id);

			if (!keyDetails) {
				return c.json({ error: "Failed to retrieve API key" }, 500);
			}

			// Return the full key only once on creation
			return c.json(
				{
					id: keyDetails.id,
					key: apiKey.key, // This is the plaintext key returned only on creation
					createdAt: keyDetails.createdAt,
					expiresAt: keyDetails.expiresAt,
					permissions: keyDetails.permissions,
				},
				201,
			);
		} catch (error) {
			log.error(error as Error, { context: "Create API key" });
			return c.json({ error: "Failed to create API key" }, 500);
		}
	},
);

// POST /keys/revoke - Revoke an API key
// Protected with step-up and passkey (revocation is a sensitive operation)
app.post(
	"/keys/revoke",
	requireStepUp,
	requirePasskey,
	zValidator("json", revokeKeySchema),
	async (c) => {
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

			// Get the API key to verify ownership
			const apiKey = await getApiKey(requestData.id);
			if (!apiKey) {
				return c.json({ error: "API key not found" }, 404);
			}

			// Verify the key belongs to the user
			if (apiKey.userId !== user.id) {
				return c.json({ error: "Forbidden" }, 403);
			}

			// Revoke the API key
			const revoked = await revokeApiKey(requestData.id);
			if (!revoked) {
				return c.json({ error: "Failed to revoke API key" }, 500);
			}

			return c.json({ message: "API key revoked successfully" });
		} catch (error) {
			log.error(error as Error, { context: "Revoke API key" });
			return c.json({ error: "Failed to revoke API key" }, 500);
		}
	},
);

// GET /keys/:id - Get API key details (without the actual key value)
app.get("/keys/:id", async (c) => {
	try {
		// Get authenticated user
		const authResult = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!authResult || !authResult.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const user = authResult.user;
		const keyId = c.req.param("id");

		// Get the API key
		const apiKey = await getApiKey(keyId);
		if (!apiKey) {
			return c.json({ error: "API key not found" }, 404);
		}

		// Verify the key belongs to the user
		if (apiKey.userId !== user.id) {
			return c.json({ error: "Forbidden" }, 403);
		}

		return c.json(apiKey);
	} catch (error) {
		log.error(error as Error, { context: "Fetch API key" });
		return c.json({ error: "Failed to fetch API key" }, 500);
	}
});

export default app;
