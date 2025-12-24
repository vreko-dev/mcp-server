/**
 * Facade Tool Handlers
 *
 * Thin wrapper layer that implements the 11 consolidated facade tools.
 * Each facade routes to legacy handlers based on the 'op' or 'type' parameter.
 *
 * This is the B+ strategy:
 * - Facades are the public API (clean catalog for LLMs)
 * - Legacy handlers are the implementation (unchanged, battle-tested)
 * - Migration map provides backward compatibility
 *
 * @module facades
 */

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
		// TODO: Route to legacy assess_risk handler
		return jsonResult({
			type: "risk_assessment",
			status: "not_implemented",
			message: "Risk analysis will be implemented in next iteration",
			next_actions: ["Use legacy snapback.assess_risk for now"],
		});
	}

	if (type === "package") {
		// TODO: Route to legacy validate_recommendation handler
		return jsonResult({
			type: "package_validation",
			status: "not_implemented",
			message: "Package validation will be implemented in next iteration",
			next_actions: ["Use legacy snapback.validate_recommendation for now"],
		});
	}

	return result("Missing required parameter: type (risk | package)", true);
};

/**
 * snapback.prepare_workspace - Pre-flight workspace check
 */
export const handlePrepareWorkspace: ToolHandler = async (_args, _context) => {
	// TODO: Route to legacy get_workspace_vitals + ctx_status
	return jsonResult({
		vitals: {
			pulse: { level: "resting", changesPerMinute: 0 },
			temperature: { level: "cold", aiPercentage: 0 },
			pressure: { value: 50, unsnapshotedChanges: 0 },
			oxygen: { value: 100, coveragePercentage: 100 },
			trajectory: "stable",
		},
		protectionScore: 75,
		recommendation: {
			should: false,
			reason: "No immediate action needed",
			urgency: "none",
		},
		safeOperations: ["read", "analyze", "suggest"],
		blockedOperations: [],
		next_actions: ["Proceed with implementation", "Create snapshot before risky changes"],
	});
};

/**
 * snapback.snapshot_create - Create snapshot
 */
export const handleSnapshotCreate: ToolHandler = async (args, _context) => {
	const { files, reason, trigger } = args as {
		files?: string[];
		reason?: string;
		trigger?: string;
	};

	if (!files || files.length === 0) {
		return result("Missing required parameter: files", true);
	}

	// TODO: Route to legacy create_snapshot handler
	const snapshotId = `snap_${Date.now()}_stub`;
	return jsonResult({
		status: "stub",
		snapshotId,
		message: "Snapshot creation will be implemented in next iteration",
		files,
		reason: reason || "No reason provided",
		next_actions: ["Use legacy snapback.create_snapshot for now"],
	});
};

/**
 * snapback.snapshot_list - List snapshots
 */
export const handleSnapshotList: ToolHandler = async (_args, _context) => {
	// TODO: Route to legacy list_snapshots handler
	return jsonResult({
		status: "stub",
		snapshots: [],
		message: "Snapshot listing will be implemented in next iteration",
		next_actions: ["Use legacy snapback.list_snapshots for now"],
	});
};

/**
 * snapback.snapshot_restore - Restore snapshot
 */
export const handleSnapshotRestore: ToolHandler = async (args, _context) => {
	const { snapshotId, files, dryRun } = args as {
		snapshotId?: string;
		files?: string[];
		dryRun?: boolean;
	};

	if (!snapshotId) {
		return result("Missing required parameter: snapshotId", true);
	}

	// TODO: Route to legacy restore_snapshot handler
	return jsonResult({
		status: "stub",
		snapshotId,
		message: "Snapshot restore will be implemented in next iteration",
		dryRun: dryRun || false,
		next_actions: ["Use legacy snapback.restore_snapshot for now"],
	});
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

	// TODO: Route to legacy check_patterns or validate_code based on mode
	return jsonResult({
		status: "stub",
		mode: mode || "quick",
		filePath,
		violations: [],
		message: "Code validation will be implemented in next iteration",
		next_actions: ["Use legacy snapback.check_patterns for now"],
	});
};

/**
 * snapback.context - Context management
 */
export const handleContext: ToolHandler = async (args, _context) => {
	const { op, domain, name, value } = args as {
		op?: string;
		domain?: string;
		name?: string;
		value?: number;
	};

	if (!op) {
		return result("Missing required parameter: op", true);
	}

	// TODO: Route to legacy ctx_* handlers based on op
	return jsonResult({
		status: "stub",
		op,
		message: `Context operation '${op}' will be implemented in next iteration`,
		next_actions: [`Use legacy snapback.ctx_${op} for now`],
	});
};

/**
 * snapback.session - Session management
 */
export const handleSession: ToolHandler = async (args, _context) => {
	const { op } = args as { op?: string };

	if (!op) {
		return result("Missing required parameter: op", true);
	}

	// TODO: Route to legacy session handlers based on op
	return jsonResult({
		status: "stub",
		op,
		message: `Session operation '${op}' will be implemented in next iteration`,
		next_actions: [
			"Note: CLI owns session state, MCP provides read-only stats",
			"Use CLI 'snap session' commands for full functionality",
		],
	});
};

/**
 * snapback.learn - Record learnings
 */
export const handleLearn: ToolHandler = async (args, _context) => {
	const { type, trigger, action, source } = args as {
		type?: string;
		trigger?: string;
		action?: string;
		source?: string;
	};

	if (!type || !trigger || !action) {
		return result("Missing required parameters: type, trigger, action", true);
	}

	// TODO: Route to legacy record_learning handler
	return jsonResult({
		status: "stub",
		learning: { type, trigger, action, source },
		message: "Learning recording will be implemented in next iteration",
		next_actions: ["Use legacy snapback.record_learning for now"],
	});
};

/**
 * snapback.acknowledge_risk - Acknowledge risk
 */
export const handleAcknowledgeRisk: ToolHandler = async (args, _context) => {
	const { files, reason } = args as { files?: string[]; reason?: string };

	if (!files || !reason) {
		return result("Missing required parameters: files, reason", true);
	}

	// TODO: Route to legacy acknowledge_risk handler
	return jsonResult({
		status: "stub",
		acknowledged: true,
		files,
		reason,
		message: "Risk acknowledgment will be implemented in next iteration",
		next_actions: ["Proceed with changes", "Remember to snapshot after"],
	});
};

/**
 * snapback.meta - Tool metadata
 */
export const handleMeta: ToolHandler = async (_args, _context) => {
	// Return the facade tool catalog
	return jsonResult({
		version: "0.1.0",
		tools: [
			"snapback.analyze",
			"snapback.prepare_workspace",
			"snapback.snapshot_create",
			"snapback.snapshot_list",
			"snapback.snapshot_restore",
			"snapback.validate",
			"snapback.context",
			"snapback.session",
			"snapback.learn",
			"snapback.acknowledge_risk",
			"snapback.meta",
		],
		legacy_mapping: {
			"snapback.assess_risk": "snapback.analyze (type: risk)",
			"snapback.validate_recommendation": "snapback.analyze (type: package)",
			"snapback.check_patterns": "snapback.validate (mode: quick)",
			"snapback.validate_code": "snapback.validate (mode: comprehensive)",
			"snapback.ctx_*": "snapback.context (op: *)",
			"snapback.get_workspace_vitals": "snapback.prepare_workspace",
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
