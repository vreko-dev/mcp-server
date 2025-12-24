/**
 * Tool Name Migrations
 *
 * Maps old tool names to new facade names for backward compatibility.
 * Legacy tools remain callable via alias map.
 *
 * Strategy:
 * - Facades are the primary tools listed in ListTools
 * - Legacy names resolve to facade handlers via this map
 * - Deprecated tools emit console warnings
 *
 * @module migrations
 */

/**
 * Maps legacy tool names → facade tool names
 *
 * 19 legacy tools → 11 facades
 */
export const TOOL_MIGRATIONS: Record<string, string> = {
	// Analysis facade
	"snapback.assess_risk": "snapback.analyze",
	"snapback.validate_recommendation": "snapback.analyze",

	// Validate facade
	"snapback.check_patterns": "snapback.validate",
	"snapback.validate_code": "snapback.validate",

	// Context facade
	"snapback.ctx_init": "snapback.context",
	"snapback.ctx_build": "snapback.context",
	"snapback.ctx_validate": "snapback.context",
	"snapback.ctx_constraint": "snapback.context",
	"snapback.ctx_blockers": "snapback.context",
	"snapback.ctx_check": "snapback.context",
	"snapback.ctx_status": "snapback.context",

	// Session facade
	"snapback.start_session": "snapback.session",
	"snapback.end_session": "snapback.session",
	"snapback.session_stats": "snapback.session",
	"snapback.get_recommendations": "snapback.session",

	// Learning facade
	"snapback.record_learning": "snapback.learn",
	"snapback.get_context": "snapback.learn",

	// Meta facade
	"snapback.meta_list_tools": "snapback.meta",

	// Workspace facade (vitals + acknowledge)
	"snapback.get_workspace_vitals": "snapback.prepare_workspace",
	"snapback.acknowledge_risk": "snapback.acknowledge_risk", // Kept as-is

	// Snapshot tools - kept as-is (already ideal names)
	"snapback.create_snapshot": "snapback.snapshot_create",
	"snapback.list_snapshots": "snapback.snapshot_list",
	"snapback.restore_snapshot": "snapback.snapshot_restore",
};

/**
 * Reverse map: facade name → legacy tools it replaces
 */
export const FACADE_TO_LEGACY: Record<string, string[]> = {
	"snapback.analyze": ["snapback.assess_risk", "snapback.validate_recommendation"],
	"snapback.validate": ["snapback.check_patterns", "snapback.validate_code"],
	"snapback.context": [
		"snapback.ctx_init",
		"snapback.ctx_build",
		"snapback.ctx_validate",
		"snapback.ctx_constraint",
		"snapback.ctx_blockers",
		"snapback.ctx_check",
		"snapback.ctx_status",
	],
	"snapback.session": [
		"snapback.start_session",
		"snapback.end_session",
		"snapback.session_stats",
		"snapback.get_recommendations",
	],
	"snapback.learn": ["snapback.record_learning", "snapback.get_context"],
	"snapback.meta": ["snapback.meta_list_tools"],
	"snapback.prepare_workspace": ["snapback.get_workspace_vitals"],
	"snapback.acknowledge_risk": ["snapback.acknowledge_risk"],
	"snapback.snapshot_create": ["snapback.create_snapshot"],
	"snapback.snapshot_list": ["snapback.list_snapshots"],
	"snapback.snapshot_restore": ["snapback.restore_snapshot"],
};

/**
 * Check if a tool name is a legacy name
 */
export function isLegacyTool(name: string): boolean {
	return name in TOOL_MIGRATIONS && TOOL_MIGRATIONS[name] !== name;
}

/**
 * Resolve legacy tool name to facade name
 */
export function resolveFacadeName(legacyName: string): string {
	return TOOL_MIGRATIONS[legacyName] || legacyName;
}

/**
 * Log deprecation warning for legacy tool usage
 */
export function warnLegacyUsage(legacyName: string): void {
	const facadeName = resolveFacadeName(legacyName);
	if (legacyName !== facadeName) {
		console.error(`[SnapBack MCP] Warning: '${legacyName}' is deprecated. Use '${facadeName}' instead.`);
	}
}
