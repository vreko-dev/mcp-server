import { zValidator } from "@hono/zod-validator";
import { auth } from "@snapback/auth";
import { HTTPEngineAdapter } from "@snapback/engine/transports/http";
import { analysisEvents, apiKeys } from "@snapback/platform";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getDb } from "../../services/database";

const app = new Hono();

// Input validation schema
const analyzeSchema = z.object({
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
	customRules: z
		.array(
			z.object({
				name: z.string(),
				pattern: z.string(), // Regex pattern as string
				severity: z.enum(["low", "medium", "high"]),
				filePattern: z.string().optional(),
			}),
		)
		.optional(),
	workspaceId: z.string().optional(),
	commitMessage: z.string().optional(),
	branchName: z.string().optional(),
});

// Initialize V2 Engine adapter (replaces deprecated GuardianService)
const engineAdapter = new HTTPEngineAdapter();

// POST /api/v1/analyze
app.post("/analyze", zValidator("json", analyzeSchema), async (c) => {
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

		// Check if API key is revoked
		if (apiKey.revokedAt) {
			return c.json({ error: "API key has been revoked" }, 401);
		}

		// Check if API key has expired
		if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
			return c.json({ error: "API key has expired" }, 401);
		}

		// Perform analysis using V2 Engine
		const startTime = Date.now();
		const result = await engineAdapter.analyzeFiles(
			requestData.files.map((f) => ({
				path: f.path,
				content: f.content,
				changeType: f.changeType,
				linesAdded: f.linesAdded,
				linesDeleted: f.linesDeleted,
				totalLines: f.totalLines,
			})),
		);

		// Log analysis event to database (business layer responsibility)
		try {
			await db.insert(analysisEvents).values({
				id: result.analysisId,
				userId: user.id,
				apiKeyId: apiKey.id,
				workspaceId: requestData.workspaceId,
				riskScore: result.riskScore,
				riskLevel:
					result.riskLevel === "safe" ? "low" : result.riskLevel === "critical" ? "high" : result.riskLevel,
				riskFactors: result.riskFactors,
				detectedPatterns: [],
				analysisTimeMs: Date.now() - startTime,
				clientType: "api",
				clientVersion: "2.0.0",
				gitBranch: requestData.branchName,
				projectId: requestData.workspaceId,
				requestId: result.analysisId,
				timestamp: new Date(),
				createdAt: new Date(),
			});
		} catch (dbError) {
			log.warn("Failed to log analysis event", {
				context: "Analysis event logging",
				error: dbError instanceof Error ? dbError.message : String(dbError),
			});
		}

		// Update API key last used timestamp
		await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));

		return c.json(result);
	} catch (error) {
		log.error(error as Error, { context: "Analysis" });
		return c.json(
			{
				error: error instanceof Error ? error.message : "Analysis failed",
			},
			500,
		);
	}
});

export default app;
