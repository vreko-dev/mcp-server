#!/usr/bin/env tsx
/**
 * Dashboard API Verification Script
 *
 * Smoke tests for all dashboard API endpoints to verify wiring and data flow.
 * Run after deployment or API changes to catch integration issues early.
 *
 * Usage:
 *   pnpm verify:dashboard              # Runs against localhost:3001
 *   API_URL=https://api.snapback.dev pnpm verify:dashboard  # Runs against production
 *
 * Prerequisites:
 *   - API server running (pnpm dev:api or deployed)
 *   - Valid session cookie or API key for authenticated endpoints
 *
 * @see apps/api/modules/dashboard/router.ts - Dashboard procedures
 * @see apps/web/lib/dashboard/api.ts - Client-side fetchers
 */

const API_BASE = process.env.API_URL || "http://localhost:3001";
const TIMEOUT_MS = 10000;

interface CheckResult {
	name: string;
	status: "pass" | "fail" | "skip";
	responseTime?: number;
	error?: string;
	data?: unknown;
}

interface VerificationSummary {
	passed: number;
	failed: number;
	skipped: number;
	results: CheckResult[];
	totalTime: number;
}

// ANSI colors for terminal output
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
};

function log(message: string, color: keyof typeof colors = "reset"): void {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatMs(ms: number): string {
	return `${ms.toFixed(0)}ms`;
}

/**
 * Make a request with timeout
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		return response;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Health check - verifies API is running
 */
async function checkHealth(): Promise<CheckResult> {
	const start = Date.now();
	const name = "Health Check";

	try {
		const response = await fetchWithTimeout(`${API_BASE}/api/health`);
		const responseTime = Date.now() - start;

		if (!response.ok) {
			return {
				name,
				status: "fail",
				responseTime,
				error: `HTTP ${response.status}: ${response.statusText}`,
			};
		}

		const data = await response.json();
		return {
			name,
			status: data.status === "healthy" ? "pass" : "fail",
			responseTime,
			data: { status: data.status, checks: data.checks },
		};
	} catch (error) {
		return {
			name,
			status: "fail",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Dashboard RPC endpoint check (unauthenticated - expects 401)
 */
async function checkDashboardRpcEndpoint(): Promise<CheckResult> {
	const start = Date.now();
	const name = "Dashboard RPC Endpoint";

	try {
		const response = await fetchWithTimeout(`${API_BASE}/api/rpc`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				method: "dashboard.getMetrics",
				params: {},
			}),
		});
		const responseTime = Date.now() - start;

		// We expect 401 Unauthorized since we're not authenticated
		// This confirms the endpoint exists and auth middleware is working
		if (response.status === 401) {
			return {
				name,
				status: "pass",
				responseTime,
				data: { message: "Endpoint exists, auth required (expected)" },
			};
		}

		// If we get 200, it means auth might be misconfigured
		if (response.ok) {
			return {
				name,
				status: "pass",
				responseTime,
				data: { message: "Endpoint accessible (check auth config)" },
			};
		}

		// 404 means endpoint doesn't exist
		if (response.status === 404) {
			return {
				name,
				status: "fail",
				responseTime,
				error: "RPC endpoint not found - check API routes",
			};
		}

		return {
			name,
			status: "fail",
			responseTime,
			error: `Unexpected status: ${response.status}`,
		};
	} catch (error) {
		return {
			name,
			status: "fail",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Pioneer API endpoint check
 */
async function checkPioneerEndpoint(): Promise<CheckResult> {
	const start = Date.now();
	const name = "Pioneer API Endpoint";

	try {
		const response = await fetchWithTimeout(`${API_BASE}/api/rpc`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				method: "pioneer.me",
				params: {},
			}),
		});
		const responseTime = Date.now() - start;

		// 401 is expected without auth
		if (response.status === 401) {
			return {
				name,
				status: "pass",
				responseTime,
				data: { message: "Endpoint exists, auth required (expected)" },
			};
		}

		if (response.ok) {
			return {
				name,
				status: "pass",
				responseTime,
				data: { message: "Endpoint accessible" },
			};
		}

		if (response.status === 404) {
			return {
				name,
				status: "fail",
				responseTime,
				error: "Pioneer endpoint not found",
			};
		}

		return {
			name,
			status: "fail",
			responseTime,
			error: `Unexpected status: ${response.status}`,
		};
	} catch (error) {
		return {
			name,
			status: "fail",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Pioneer Leaderboard check (public endpoint)
 */
async function checkLeaderboardEndpoint(): Promise<CheckResult> {
	const start = Date.now();
	const name = "Pioneer Leaderboard";

	try {
		const response = await fetchWithTimeout(`${API_BASE}/api/rpc`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				method: "pioneer.leaderboard",
				params: { limit: 10 },
			}),
		});
		const responseTime = Date.now() - start;

		// Leaderboard might be public or protected
		if (response.ok) {
			const data = await response.json();
			return {
				name,
				status: "pass",
				responseTime,
				data: { count: Array.isArray(data) ? data.length : "unknown" },
			};
		}

		if (response.status === 401) {
			return {
				name,
				status: "pass",
				responseTime,
				data: { message: "Endpoint exists, auth required" },
			};
		}

		return {
			name,
			status: "fail",
			responseTime,
			error: `HTTP ${response.status}`,
		};
	} catch (error) {
		return {
			name,
			status: "fail",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Check all dashboard procedure endpoints exist
 */
async function checkDashboardProcedures(): Promise<CheckResult[]> {
	const procedures = [
		"dashboard.getMetrics",
		"dashboard.getAIDetectionStats",
		"dashboard.getRecentActivity",
		"dashboard.getSubscriptionData",
		"dashboard.getSessionMetrics",
	];

	const results: CheckResult[] = [];

	for (const procedure of procedures) {
		const start = Date.now();
		const name = `Procedure: ${procedure}`;

		try {
			const response = await fetchWithTimeout(`${API_BASE}/api/rpc`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: procedure,
					params: {},
				}),
			});
			const responseTime = Date.now() - start;

			// 401 means endpoint exists but needs auth
			if (response.status === 401) {
				results.push({
					name,
					status: "pass",
					responseTime,
					data: { message: "Exists, auth required" },
				});
			} else if (response.ok) {
				results.push({
					name,
					status: "pass",
					responseTime,
					data: { message: "Accessible" },
				});
			} else if (response.status === 404) {
				results.push({
					name,
					status: "fail",
					responseTime,
					error: "Procedure not found",
				});
			} else {
				results.push({
					name,
					status: "fail",
					responseTime,
					error: `HTTP ${response.status}`,
				});
			}
		} catch (error) {
			results.push({
				name,
				status: "fail",
				responseTime: Date.now() - start,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return results;
}

/**
 * Print results summary
 */
function printSummary(summary: VerificationSummary): void {
	console.log("\n" + "=".repeat(60));
	log("Dashboard API Verification Summary", "cyan");
	console.log("=".repeat(60));

	for (const result of summary.results) {
		const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⏭️";
		const timeStr = result.responseTime ? ` (${formatMs(result.responseTime)})` : "";
		const statusColor = result.status === "pass" ? "green" : result.status === "fail" ? "red" : "yellow";

		log(`${icon} ${result.name}${timeStr}`, statusColor);

		if (result.error) {
			log(`   Error: ${result.error}`, "dim");
		}
		if (result.data && result.status === "pass") {
			log(`   ${JSON.stringify(result.data)}`, "dim");
		}
	}

	console.log("\n" + "-".repeat(60));
	log(`Total: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`, "cyan");
	log(`Time: ${formatMs(summary.totalTime)}`, "dim");
	console.log("-".repeat(60) + "\n");
}

/**
 * Main verification runner
 */
async function main(): Promise<void> {
	const startTime = Date.now();

	log("\n🔍 Dashboard API Verification", "cyan");
	log(`Target: ${API_BASE}`, "dim");
	log(`Timeout: ${TIMEOUT_MS}ms per check\n`, "dim");

	const results: CheckResult[] = [];

	// Run checks
	log("Running health check...", "dim");
	results.push(await checkHealth());

	log("Checking RPC endpoint...", "dim");
	results.push(await checkDashboardRpcEndpoint());

	log("Checking Pioneer endpoint...", "dim");
	results.push(await checkPioneerEndpoint());

	log("Checking Leaderboard endpoint...", "dim");
	results.push(await checkLeaderboardEndpoint());

	log("Checking dashboard procedures...", "dim");
	results.push(...(await checkDashboardProcedures()));

	// Calculate summary
	const summary: VerificationSummary = {
		passed: results.filter((r) => r.status === "pass").length,
		failed: results.filter((r) => r.status === "fail").length,
		skipped: results.filter((r) => r.status === "skip").length,
		results,
		totalTime: Date.now() - startTime,
	};

	printSummary(summary);

	// Exit with appropriate code
	if (summary.failed > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Verification failed:", error);
	process.exit(1);
});
