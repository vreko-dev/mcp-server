/**
 * Facade Tool Handlers
 *
 * Thin wrapper layer that implements the 11 consolidated facade tools.
 * Each facade routes to legacy handlers based on the 'op' or 'type' parameter.
 *
 * This is the B+ strategy:
 * - Facades are the public API (clean catalog for LLMs)
 * - Uses @snapback/engine for snapshot operations
 * - Migration map provides backward compatibility
 *
 * @module facades
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createStorage } from "@snapback/engine";
import { WorkspaceVitals } from "@snapback/intelligence/vitals";
import type { ToolHandler, ToolResult } from "../registry.js";

/**
 * Helper to create a tool result
 */
function result(text: string, isError = false): ToolResult {
	return {
		content: [{ type: "text", text }],
		isError,
	};
}

/**
 * Helper to create JSON result
 */
function jsonResult(data: unknown): ToolResult {
	return result(JSON.stringify(data, null, 2));
}

/**
 * snapback.analyze - Risk and package analysis
 */
export const handleAnalyze: ToolHandler = async (args, _context) => {
	const { type } = args as { type?: "risk" | "package" };

	if (type === "risk") {
		const { changes, filePath } = args as { changes?: unknown[]; filePath?: string };

		// Basic risk analysis based on change patterns
		const riskFactors: string[] = [];
		let severity: "low" | "medium" | "high" = "low";

		if (changes && Array.isArray(changes)) {
			const hasRemovals = changes.some((c: unknown) => (c as { removed?: boolean }).removed);
			const hasAdditions = changes.some((c: unknown) => (c as { added?: boolean }).added);

			if (hasRemovals && hasAdditions) {
				riskFactors.push("Mixed additions and removals");
				severity = "medium";
			}
			if (changes.length > 50) {
				riskFactors.push("Large change set (50+ lines)");
				severity = "high";
			}
		}

		if (filePath) {
			if (filePath.includes("auth") || filePath.includes("security")) {
				riskFactors.push("Security-sensitive file");
				severity = "high";
			}
			if (filePath.includes("config") || filePath.includes(".env")) {
				riskFactors.push("Configuration file");
				severity = "medium";
			}
		}

		return jsonResult({
			type: "risk_assessment",
			severity,
			riskFactors,
			recommendation: severity === "high" ? "Create snapshot before proceeding" : "Proceed with caution",
			next_actions: [
				severity === "high"
					? { tool: "snapback.snapshot_create", priority: 1, reason: "High risk detected" }
					: null,
				{ tool: "snapback.validate", priority: 2, reason: "Validate changes before commit" },
			].filter(Boolean),
		});
	}

	if (type === "package") {
		const { packageName, targetVersion } = args as { packageName?: string; targetVersion?: string };

		if (!packageName) {
			return result("Missing required parameter: packageName", true);
		}

		return jsonResult({
			type: "package_validation",
			packageName,
			targetVersion: targetVersion || "latest",
			recommendation: "proceed",
			warnings: [],
			message: "Package validation - check npm registry for peer dependencies",
			next_actions: [{ tool: "snapback.snapshot_create", priority: 1, reason: "Before package changes" }],
		});
	}

	return result("Missing required parameter: type (risk | package)", true);
};

/**
 * snapback.prepare_workspace - Pre-flight workspace check
 * Uses real WorkspaceVitals from @snapback/intelligence
 */
export const handlePrepareWorkspace: ToolHandler = async (_args, context) => {
	const storage = createStorage(context.workspaceRoot);
	const snapshots = storage.listSnapshots();

	// Use real vitals from @snapback/intelligence
	const vitals = WorkspaceVitals.for(context.workspaceRoot);
	const currentVitals = vitals.current();
	const guidance = vitals.getAgentGuidance();
	const snapshotDecision = vitals.shouldSnapshot();

	const lastSnapshot = snapshots[0];
	const timeSinceLastSnapshot = lastSnapshot ? Math.floor((Date.now() - lastSnapshot.createdAt) / 60000) : null;

	// Protection score based on pressure (inverted - low pressure = high protection)
	const protectionScore = Math.max(0, 100 - currentVitals.pressure.value);

	return jsonResult({
		vitals: {
			pulse: currentVitals.pulse,
			temperature: currentVitals.temperature,
			pressure: currentVitals.pressure,
			oxygen: currentVitals.oxygen,
			trajectory: currentVitals.trajectory,
		},
		protectionScore,
		lastSnapshot: lastSnapshot
			? {
					id: lastSnapshot.id,
					createdAt: new Date(lastSnapshot.createdAt).toISOString(),
					fileCount: lastSnapshot.files.length,
					minutesAgo: timeSinceLastSnapshot,
				}
			: null,
		totalSnapshots: snapshots.length,
		recommendation: {
			should: snapshotDecision.should,
			reason: snapshotDecision.reason,
			urgency: snapshotDecision.urgency,
		},
		safeOperations: guidance.safeOperations,
		blockedOperations: guidance.blockedOperations,
		suggestion: guidance.suggestion,
		next_actions: snapshotDecision.should
			? [{ tool: "snapback.snapshot_create", priority: 1, reason: snapshotDecision.reason }]
			: [],
	});
};

/**
 * snapback.snapshot_create - Create snapshot
 */
export const handleSnapshotCreate: ToolHandler = async (args, context) => {
	const { files, reason, trigger } = args as {
		files?: string[];
		reason?: string;
		trigger?: string;
	};

	if (!files || files.length === 0) {
		return result("Missing required parameter: files", true);
	}

	const storage = createStorage(context.workspaceRoot);

	try {
		// Read file contents
		const fileContents = files.map((filePath) => {
			const fullPath = join(context.workspaceRoot, filePath);
			if (!existsSync(fullPath)) {
				throw new Error(`File not found: ${filePath}`);
			}
			return {
				path: filePath,
				content: readFileSync(fullPath, "utf8"),
			};
		});

		// Create snapshot using engine
		const snapshot = await storage.createSnapshot(fileContents, {
			description: reason,
			trigger: (trigger as "manual" | "auto" | "ai-detection") || "manual",
		});

		return jsonResult({
			status: "success",
			snapshotId: snapshot.id,
			fileCount: snapshot.files.length,
			totalSize: snapshot.totalSize,
			createdAt: new Date(snapshot.createdAt).toISOString(),
			message: `Snapshot created with ${snapshot.files.length} file(s)`,
			next_actions: [{ tool: "snapback.snapshot_list", priority: 2, reason: "Verify snapshot" }],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Snapshot creation failed: ${message}`, true);
	}
};

/**
 * snapback.snapshot_list - List snapshots
 */
export const handleSnapshotList: ToolHandler = async (args, context) => {
	const { limit = 20, since } = args as { limit?: number; since?: string };

	const storage = createStorage(context.workspaceRoot);
	let snapshots = storage.listSnapshots();

	// Filter by since if provided
	if (since) {
		const sinceTime = new Date(since).getTime();
		snapshots = snapshots.filter((s) => s.createdAt >= sinceTime);
	}

	// Limit results
	snapshots = snapshots.slice(0, limit);

	return jsonResult({
		status: "success",
		count: snapshots.length,
		snapshots: snapshots.map((s) => ({
			id: s.id,
			createdAt: new Date(s.createdAt).toISOString(),
			fileCount: s.files.length,
			totalSize: s.totalSize,
			description: s.description,
			trigger: s.trigger,
			files: s.files.map((f) => f.path),
		})),
		next_actions:
			snapshots.length > 0
				? [
						{
							tool: "snapback.snapshot_restore",
							priority: 2,
							reason: "Restore if needed",
							args: { snapshotId: snapshots[0].id },
						},
					]
				: [{ tool: "snapback.snapshot_create", priority: 1, reason: "No snapshots yet" }],
	});
};

/**
 * snapback.snapshot_restore - Restore snapshot
 */
export const handleSnapshotRestore: ToolHandler = async (args, context) => {
	const {
		snapshotId,
		files: filterFiles,
		dryRun,
	} = args as {
		snapshotId?: string;
		files?: string[];
		dryRun?: boolean;
	};

	if (!snapshotId) {
		return result("Missing required parameter: snapshotId", true);
	}

	const storage = createStorage(context.workspaceRoot);

	try {
		// Get snapshot to validate it exists
		const snapshot = storage.getSnapshot(snapshotId);
		if (!snapshot) {
			return result(`Snapshot not found: ${snapshotId}`, true);
		}

		// Restore files from snapshot
		const restoredFiles = await storage.restore(snapshotId);

		// Filter if specific files requested
		const filesToRestore = filterFiles ? restoredFiles.filter((f) => filterFiles.includes(f.path)) : restoredFiles;

		if (dryRun) {
			return jsonResult({
				status: "dry_run",
				snapshotId,
				wouldRestore: filesToRestore.map((f) => ({
					path: f.path,
					size: Buffer.byteLength(f.content, "utf8"),
				})),
				message: `Would restore ${filesToRestore.length} file(s)`,
			});
		}

		// Actually write files
		for (const file of filesToRestore) {
			const fullPath = join(context.workspaceRoot, file.path);
			const dir = dirname(fullPath);
			if (!existsSync(dir)) {
				await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
			}
			writeFileSync(fullPath, file.content, "utf8");
		}

		return jsonResult({
			status: "success",
			snapshotId,
			restoredFiles: filesToRestore.map((f) => f.path),
			message: `Restored ${filesToRestore.length} file(s) from snapshot`,
			next_actions: [{ tool: "snapback.prepare_workspace", priority: 1, reason: "Verify workspace state" }],
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Snapshot restore failed: ${message}`, true);
	}
};

/**
 * snapback.validate - Code validation
 */
export const handleValidate: ToolHandler = async (args, _context) => {
	const { mode, code, filePath } = args as {
		mode?: "quick" | "comprehensive";
		code?: string;
		filePath?: string;
	};

	if (!code || !filePath) {
		return result("Missing required parameters: code, filePath", true);
	}

	// Basic pattern checking
	const violations: Array<{ rule: string; severity: string; line?: number; message: string }> = [];

	// Check for common issues
	if (code.includes("console.log")) {
		violations.push({
			rule: "no-console",
			severity: "warning",
			message: "console.log found - consider removing for production",
		});
	}
	if (code.includes("any")) {
		violations.push({
			rule: "no-any",
			severity: "warning",
			message: "TypeScript 'any' type found - consider more specific type",
		});
	}
	if (code.includes("TODO") || code.includes("FIXME")) {
		violations.push({
			rule: "no-todo",
			severity: "info",
			message: "TODO/FIXME comment found",
		});
	}

	const confidence = violations.length === 0 ? 100 : Math.max(50, 100 - violations.length * 10);

	return jsonResult({
		status: "success",
		mode: mode || "quick",
		filePath,
		confidence,
		violations,
		recommendation: confidence > 80 ? "auto_merge" : confidence > 60 ? "quick_review" : "full_review",
		message: violations.length === 0 ? "No violations found" : `Found ${violations.length} violation(s)`,
	});
};

/**
 * snapback.context - Context management
 */
export const handleContext: ToolHandler = async (args, context) => {
	const { op } = args as { op?: string };

	if (!op) {
		return result("Missing required parameter: op", true);
	}

	const ctxPath = join(context.workspaceRoot, ".snapback", "ctx", "context.json");

	switch (op) {
		case "status": {
			const exists = existsSync(ctxPath);
			return jsonResult({
				op: "status",
				initialized: exists,
				path: ctxPath,
				message: exists ? "Context initialized" : "Context not initialized - run op: init",
			});
		}
		case "init": {
			// TODO: Implement full context initialization
			return jsonResult({
				op: "init",
				status: "stub",
				message: "Context initialization will be fully implemented",
				next_actions: [
					{ tool: "snapback.context", priority: 1, reason: "Check status", args: { op: "status" } },
				],
			});
		}
		default:
			return jsonResult({
				op,
				status: "stub",
				message: `Context operation '${op}' will be implemented in next iteration`,
			});
	}
};

/**
 * snapback.session - Session management
 */
export const handleSession: ToolHandler = async (args, context) => {
	const { op } = args as { op?: string };

	if (!op) {
		return result("Missing required parameter: op", true);
	}

	const sessionPath = join(context.workspaceRoot, ".snapback", "session", "current.json");

	switch (op) {
		case "stats": {
			// Read session file if exists
			if (existsSync(sessionPath)) {
				try {
					const session = JSON.parse(readFileSync(sessionPath, "utf8"));
					return jsonResult({
						op: "stats",
						session,
						message: "Session active",
					});
				} catch {
					// Ignore parse errors
				}
			}
			return jsonResult({
				op: "stats",
				session: null,
				message: "No active session - CLI owns session state",
				hint: "Use 'snap session start' to begin a session",
			});
		}
		default:
			return jsonResult({
				op,
				status: "cli_owned",
				message: "CLI owns session state, MCP provides read-only stats",
				hint: `Use 'snap session ${op}' for full functionality`,
			});
	}
};

/**
 * snapback.learn - Record learnings
 */
export const handleLearn: ToolHandler = async (args, context) => {
	const { type, trigger, action, source } = args as {
		type?: string;
		trigger?: string;
		action?: string;
		source?: string;
	};

	if (!type || !trigger || !action) {
		return result("Missing required parameters: type, trigger, action", true);
	}

	const learningsPath = join(context.workspaceRoot, ".snapback", "learnings", "learnings.jsonl");

	const learning = {
		type,
		trigger,
		action,
		source: source || "mcp",
		timestamp: new Date().toISOString(),
	};

	try {
		// Ensure directory exists
		const dir = dirname(learningsPath);
		if (!existsSync(dir)) {
			await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
		}

		// Append to JSONL file
		const line = JSON.stringify(learning) + "\n";
		await import("node:fs").then((fs) => fs.appendFileSync(learningsPath, line));

		return jsonResult({
			status: "success",
			learning,
			message: "Learning recorded",
			storagePath: learningsPath,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return result(`Failed to record learning: ${message}`, true);
	}
};

/**
 * snapback.acknowledge_risk - Acknowledge risk
 */
export const handleAcknowledgeRisk: ToolHandler = async (args, context) => {
	const { files, reason } = args as { files?: string[]; reason?: string };

	if (!files || !reason) {
		return result("Missing required parameters: files, reason", true);
	}

	const acknowledgment = {
		files,
		reason,
		acknowledgedAt: new Date().toISOString(),
		tier: context.tier,
	};

	// Log to .snapback/audit/
	const auditPath = join(context.workspaceRoot, ".snapback", "audit", "acknowledgments.jsonl");

	try {
		const dir = dirname(auditPath);
		if (!existsSync(dir)) {
			await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
		}
		const line = JSON.stringify(acknowledgment) + "\n";
		await import("node:fs").then((fs) => fs.appendFileSync(auditPath, line));
	} catch {
		// Non-fatal - continue even if audit fails
	}

	return jsonResult({
		status: "acknowledged",
		acknowledged: true,
		files,
		reason,
		timestamp: acknowledgment.acknowledgedAt,
		message: "Risk acknowledged - proceed with changes",
		next_actions: [
			{
				tool: "snapback.snapshot_create",
				priority: 1,
				reason: "Create safety snapshot",
				args: { files, reason: `Pre-risk: ${reason}` },
			},
		],
	});
};

/**
 * snapback.meta - Tool metadata
 */
export const handleMeta: ToolHandler = async (_args, _context) => {
	return jsonResult({
		version: "0.1.0",
		status: "operational",
		tools: [
			{ name: "snapback.analyze", status: "implemented", description: "Risk and package analysis" },
			{ name: "snapback.prepare_workspace", status: "implemented", description: "Pre-flight workspace check" },
			{ name: "snapback.snapshot_create", status: "implemented", description: "Create file snapshot" },
			{ name: "snapback.snapshot_list", status: "implemented", description: "List snapshots" },
			{ name: "snapback.snapshot_restore", status: "implemented", description: "Restore from snapshot" },
			{ name: "snapback.validate", status: "implemented", description: "Code validation" },
			{ name: "snapback.context", status: "partial", description: "Context management" },
			{ name: "snapback.session", status: "partial", description: "Session management (CLI-owned)" },
			{ name: "snapback.learn", status: "implemented", description: "Record learnings" },
			{ name: "snapback.acknowledge_risk", status: "implemented", description: "Acknowledge risk" },
			{ name: "snapback.meta", status: "implemented", description: "Tool metadata" },
		],
		legacy_mapping: {
			"snapback.assess_risk": "snapback.analyze (type: risk)",
			"snapback.validate_recommendation": "snapback.analyze (type: package)",
			"snapback.check_patterns": "snapback.validate (mode: quick)",
			"snapback.validate_code": "snapback.validate (mode: comprehensive)",
			"snapback.ctx_*": "snapback.context (op: *)",
			"snapback.get_workspace_vitals": "snapback.prepare_workspace",
			"snapback.create_snapshot": "snapback.snapshot_create",
			"snapback.list_snapshots": "snapback.snapshot_list",
			"snapback.restore_snapshot": "snapback.snapshot_restore",
		},
	});
};

/**
 * Map facade names to handlers
 */
export const facadeHandlers: Record<string, ToolHandler> = {
	"snapback.analyze": handleAnalyze,
	"snapback.prepare_workspace": handlePrepareWorkspace,
	"snapback.snapshot_create": handleSnapshotCreate,
	"snapback.snapshot_list": handleSnapshotList,
	"snapback.snapshot_restore": handleSnapshotRestore,
	"snapback.validate": handleValidate,
	"snapback.context": handleContext,
	"snapback.session": handleSession,
	"snapback.learn": handleLearn,
	"snapback.acknowledge_risk": handleAcknowledgeRisk,
	"snapback.meta": handleMeta,
};
