import { zValidator } from "@hono/zod-validator";
import { auth } from "@snapback/auth";
import { apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getDb } from "../../services/database";
import { SecretDetectionService } from "../../services/secret-detection";

const app = new Hono();

// Input validation schema
const detectSecretsSchema = z.object({
	files: z.array(
		z.object({
			path: z.string(),
			content: z.string(),
			changeType: z.enum(["added", "modified", "deleted"]).optional(),
			linesAdded: z.number().optional(),
			linesDeleted: z.number().optional(),
			totalLines: z.number().optional(),
		}),
	),
	workspaceId: z.string().optional(),
	commitMessage: z.string().optional(),
	branchName: z.string().optional(),
});

// Initialize Secret Detection service
const secretDetectionService = new SecretDetectionService();

// POST /api/v1/detect-secrets
app.post(
	"/detect-secrets",
	zValidator("json", detectSecretsSchema),
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

			// Check if secret detection is enabled for this API key
			const permissions = apiKey.permissions as {
				secretDetection?: boolean;
			};

			if (!permissions.secretDetection) {
				return c.json(
					{
						error: "Secret detection not available on your plan",
						upgradeUrl: "/pricing",
						feature: "secretDetection",
						requiredPlan: "team",
					},
					402,
				);
			}

			// Perform secret detection
			const detectionRequest = {
				files: requestData.files,
				userId: user.id,
				apiKeyId: apiKey.id,
				workspaceId: requestData.workspaceId,
				commitMessage: requestData.commitMessage,
				branchName: requestData.branchName,
			};

			const result =
				await secretDetectionService.detectSecrets(detectionRequest);

			// Update API key last used timestamp
			await db
				.update(apiKeys)
				.set({ lastUsedAt: new Date() })
				.where(eq(apiKeys.id, apiKey.id));

			return c.json(result);
		} catch (error) {
			log.error(error as Error, { context: "Secret detection" });

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
					error: "Secret detection failed",
				},
				500,
			);
		}
	},
);

export default app;
