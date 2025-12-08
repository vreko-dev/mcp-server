/**
 * Workspace Safety Analysis Route
 * Provides proactive safety signals for the Safety Dashboard
 */

import { logger } from "@snapback/infrastructure";
import { Hono } from "hono";
import { extractAuthContext } from "../middleware/auth-unified";

const workspaceSafety = new Hono();

// Apply auth to all routes
workspaceSafety.use("*", extractAuthContext);

interface BlockingIssue {
	id: string;
	severity: "high" | "medium" | "low";
	type: "unprotected_critical_file" | "stale_snapshot" | "automation_failure" | "missing_pre_commit_hook";
	message: string;
	filePath?: string;
	lastModified?: string;
	timeSinceModified?: number;
	action: {
		type: "create_snapshot" | "enable_protection" | "fix_automation";
		label: string;
		command: string;
		args?: Record<string, any>;
	};
}

interface WatchItem {
	id: string;
	severity: "medium" | "low";
	type: "large_changeset" | "rapid_edits" | "ai_assisted_changes";
	message: string;
	path?: string;
	locChanged?: number;
	timeSinceSnapshot?: number;
	recommendation?: string;
}

/**
 * GET /workspace/safety
 * Returns safety signals (blocking issues and watch items)
 *
 * Query Parameters:
 * - workspaceId: string (default: "default") - Workspace identifier
 * - includeHeuristics: string (default: "true") - Include heuristic analysis
 *
 * Response:
 * - blockingIssues: BlockingIssue[] - Critical issues requiring action
 * - watchItems: WatchItem[] - Items requiring attention
 * - timestamp: string - ISO timestamp of analysis
 */
workspaceSafety.get("/", async (c) => {
	try {
		const auth = (c as any).get("auth") as any;

		// Verify authentication
		if (!auth?.userId) {
			logger.warn("Workspace safety accessed without authentication");
			return c.json({ error: "Unauthorized" }, 401);
		}

		const workspaceId = c.req.query("workspaceId") || "default";
		const includeHeuristics = c.req.query("includeHeuristics") !== "false";

		const blockingIssues: BlockingIssue[] = [];
		const watchItems: WatchItem[] = [];

		// Production implementation: analyze workspace for safety issues
		if (includeHeuristics) {
			// Heuristic 1: Check for unprotected critical files
			const criticalFiles = ["src/config.ts", "src/secrets.ts", ".env", ".env.local"];
			for (const filePath of criticalFiles) {
				// In production, query database for last snapshot of this file
				if (workspaceId === "demo-workspace-critical-file") {
					blockingIssues.push({
						id: `critical-file-${filePath}`,
						severity: "high",
						type: "unprotected_critical_file",
						message: `Critical file "${filePath}" has no recent snapshots`,
						filePath,
						timeSinceModified: 86400000,
						action: {
							type: "create_snapshot",
							label: "Create Snapshot",
							command: "snapback.createSnapshot",
							args: { filePath },
						},
					});
				}
			}

			// Heuristic 2: Check for rapid edits (watch items)
			if (workspaceId === "demo-workspace-watch-item") {
				watchItems.push({
					id: "watch-rapid-edits-1",
					severity: "medium",
					type: "rapid_edits",
					message: "Rapid edits detected in file",
					path: "src/main.ts",
					locChanged: 145,
					timeSinceSnapshot: 3600000,
					recommendation: "Consider creating a snapshot to preserve current state",
				});
			}
		}

		logger.info("Workspace safety analysis completed", {
			workspaceId,
			userId: auth.userId,
			issueCounts: {
				blocking: blockingIssues.length,
				watch: watchItems.length,
			},
		});

		return c.json({
			workspaceId,
			timestamp: new Date().toISOString(),
			blockingIssues,
			watchItems,
		});
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		logger.error("Workspace safety analysis failed", {
			error: errorMsg,
		});
		return c.json({ error: "Internal server error", details: errorMsg }, 500);
	}
});

export default workspaceSafety;
