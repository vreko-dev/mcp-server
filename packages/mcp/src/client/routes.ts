/**
 * MCP API Routes Registry
 *
 * Explicit route mapping to prevent path guessing errors.
 * All API endpoints are defined here with their HTTP methods.
 *
 * @module client/routes
 */

export const MCP_ROUTES = {
	// Session lifecycle
	"mcp.startSession": { method: "POST", path: "/v1/mcp/session/start" },
	"mcp.endSession": { method: "POST", path: "/v1/mcp/session/end" },
	"mcp.getSessionStats": { method: "GET", path: "/v1/mcp/session/stats" },

	// Recommendations & Learning
	"mcp.getRecommendations": { method: "POST", path: "/v1/mcp/recommendations" },
	"mcp.recordLearning": { method: "POST", path: "/v1/mcp/learning/record" },
	"mcp.recordActivity": { method: "POST", path: "/v1/mcp/activity/record" },

	// Analysis (API-backed)
	"mcp.analyzeRisk": { method: "POST", path: "/v1/analysis/risk" },
	"mcp.validatePackage": { method: "POST", path: "/v1/analysis/package" },

	// Snapshots (Pro tier)
	"mcp.createSnapshot": { method: "POST", path: "/v1/snapshots/create" },
	"mcp.listSnapshots": { method: "GET", path: "/v1/snapshots/list" },
	"mcp.restoreSnapshot": { method: "POST", path: "/v1/snapshots/restore" },

	// Tool execution (generic endpoint)
	"mcp.execute": { method: "POST", path: "/v1/mcp/execute" },
} as const;

export type McpRouteKey = keyof typeof MCP_ROUTES;
