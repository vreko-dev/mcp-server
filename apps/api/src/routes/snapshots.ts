import { randomUUID } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { log } from "../../lib/logger";

// In-memory store for snapshots (for development/testing)
const snapshotStore = new Map<string, { metadata: any; content: string }>();

const app = new Hono();

// Input validation schemas
const createSnapshotSchema = z.object({
	filePath: z.string(),
	content: z.string(),
	reason: z.string().optional(),
	source: z.string(),
	context: z
		.object({
			sessionId: z.string(),
			requestId: z.string(),
			workspaceId: z.string().optional(),
			client: z.enum(["vscode", "mcp", "cli", "web"]),
		})
		.optional(),
});

const listSnapshotsSchema = z.object({
	filePath: z.string().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
	context: z
		.object({
			sessionId: z.string(),
			requestId: z.string(),
			workspaceId: z.string().optional(),
			client: z.enum(["vscode", "mcp", "cli", "web"]),
		})
		.optional(),
});

const restoreSnapshotSchema = z.object({
	snapshotId: z.string(),
	targetPath: z.string().optional(),
	context: z
		.object({
			sessionId: z.string(),
			requestId: z.string(),
			workspaceId: z.string().optional(),
			client: z.enum(["vscode", "mcp", "cli", "web"]),
		})
		.optional(),
});

// POST /snapshots/create
app.post(
	"/snapshots/create",
	zValidator("json", createSnapshotSchema),
	async (c) => {
		try {
			const requestData = c.req.valid("json");

			// Generate snapshot ID (cryptographically secure)
			const snapshotId = `snap-${randomUUID()}`;

			// Create metadata
			const metadata = {
				id: snapshotId,
				timestamp: Date.now(),
				filePath: requestData.filePath,
				reason: requestData.reason,
				source: requestData.source,
				size: requestData.content.length,
				hash: calculateHash(requestData.content),
			};

			// Store snapshot
			snapshotStore.set(snapshotId, {
				metadata,
				content: requestData.content,
			});

			return c.json(metadata, 201);
		} catch (error) {
			log.error(error as Error, { context: "Create snapshot" });
			return c.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Failed to create snapshot",
				},
				500,
			);
		}
	},
);

// GET /snapshots/list
app.get(
	"/snapshots/list",
	zValidator("query", listSnapshotsSchema),
	async (c) => {
		try {
			const { filePath, limit = 100, offset = 0 } = c.req.valid("query");

			// Filter snapshots
			let snapshots = Array.from(snapshotStore.values()).map(
				(item) => item.metadata,
			);

			if (filePath) {
				snapshots = snapshots.filter(
					(snapshot) => snapshot.filePath === filePath,
				);
			}

			// Apply pagination
			snapshots = snapshots.slice(offset, offset + limit);

			return c.json(snapshots, 200);
		} catch (error) {
			log.error(error as Error, { context: "List snapshots" });
			return c.json(
				{
					error:
						error instanceof Error ? error.message : "Failed to list snapshots",
				},
				500,
			);
		}
	},
);

// GET /snapshots/:id
app.get("/snapshots/:id", async (c) => {
	try {
		const snapshotId = c.req.param("id");

		const snapshot = snapshotStore.get(snapshotId);
		if (!snapshot) {
			return c.json({ error: "Snapshot not found" }, 404);
		}

		return c.json(snapshot.metadata, 200);
	} catch (error) {
		log.error(error as Error, { context: "Get snapshot" });
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to get snapshot",
			},
			500,
		);
	}
});

// GET /snapshots/:id/content
app.get("/snapshots/:id/content", async (c) => {
	try {
		const snapshotId = c.req.param("id");

		const snapshot = snapshotStore.get(snapshotId);
		if (!snapshot) {
			return c.json({ error: "Snapshot not found" }, 404);
		}

		return c.text(snapshot.content, 200);
	} catch (error) {
		log.error(error as Error, { context: "Get snapshot content" });
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to get snapshot content",
			},
			500,
		);
	}
});

// POST /snapshots/restore
app.post(
	"/snapshots/restore",
	zValidator("json", restoreSnapshotSchema),
	async (c) => {
		try {
			const requestData = c.req.valid("json");

			const snapshot = snapshotStore.get(requestData.snapshotId);
			if (!snapshot) {
				return c.json({ error: "Snapshot not found" }, 404);
			}

			return c.text(snapshot.content, 200);
		} catch (error) {
			log.error(error as Error, { context: "Restore snapshot" });
			return c.json(
				{
					error:
						error instanceof Error
							? error.message
							: "Failed to restore snapshot",
				},
				500,
			);
		}
	},
);

// DELETE /snapshots/:id
app.delete("/snapshots/:id", async (c) => {
	try {
		const snapshotId = c.req.param("id");

		if (!snapshotStore.has(snapshotId)) {
			return c.json({ error: "Snapshot not found" }, 404);
		}

		snapshotStore.delete(snapshotId);

		return c.json({ message: "Snapshot deleted" }, 200);
	} catch (error) {
		log.error(error as Error, { context: "Delete snapshot" });
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to delete snapshot",
			},
			500,
		);
	}
});

// Helper function to calculate hash
function calculateHash(content: string): string {
	let hash = 0;
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash.toString();
}

export default app;
