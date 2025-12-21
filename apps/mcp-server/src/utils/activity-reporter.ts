/**
 * Activity Reporter for Customer MCP Server
 *
 * Reports activity metadata to the SnapBack API for learning and analytics.
 * CRITICAL: Only metadata is sent, never code content.
 *
 * Per implementation_plan.md Section 2.2:
 * - Only aggregate metadata (counts, severity levels, triggers)
 * - Never file content, paths, or diffs
 * - Graceful degradation when server unavailable
 *
 * @module activity-reporter
 */

import type { SnapBackAPIClient } from "../client/snapback-api";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SnapshotMetadata {
	trigger: "manual" | "auto" | "ai-detected" | "protect";
	fileCount: number;
	totalBytes: number;
	// NEVER: file content, actual paths, diffs
}

export interface RiskMetadata {
	riskLevel: "safe" | "low" | "medium" | "high" | "critical";
	issueCount: number;
	categories?: string[];
	// NEVER: actual code, issue details, line numbers
}

export interface ToolUsageMetadata {
	toolName: string;
	durationMs: number;
	success: boolean;
	// NEVER: tool arguments, results
}

export interface SessionActivityMetadata {
	filesModified: number;
	snapshotsCreated: number;
	riskAnalyses: number;
	duration: number;
	// NEVER: file names, paths, content
}

// =============================================================================
// ACTIVITY REPORTER CLASS
// =============================================================================

/**
 * Report activity to server for learning (metadata only)
 *
 * @example
 * ```typescript
 * const reporter = new ActivityReporter(apiClient, 'ws_123');
 * await reporter.startSession('Adding auth feature');
 *
 * // After creating snapshot
 * await reporter.reportSnapshotCreated({
 *   trigger: 'manual',
 *   fileCount: 5,
 *   totalBytes: 12500,
 * });
 * ```
 */
export class ActivityReporter {
	private apiClient: SnapBackAPIClient | undefined;
	private sessionId: string | null = null;
	private workspaceId: string;
	private enabled: boolean;

	constructor(apiClient: SnapBackAPIClient | undefined, workspaceId: string) {
		this.apiClient = apiClient;
		this.workspaceId = workspaceId;
		this.enabled = !!apiClient;
	}

	/**
	 * Check if activity reporting is available
	 */
	isEnabled(): boolean {
		return this.enabled && !!this.apiClient;
	}

	/**
	 * Start a session for activity tracking
	 */
	async startSession(task?: string): Promise<string | null> {
		if (!this.isEnabled()) {
			// Generate local session ID for tracking
			const timestamp = Date.now().toString(36);
			const random = Math.random().toString(36).substring(2, 8);
			this.sessionId = `local_${timestamp}${random}`;
			return this.sessionId;
		}

		try {
			const result = (await this.apiClient!.request("mcp.startSession", {
				workspaceId: this.workspaceId,
				taskDescription: task,
			})) as { sessionId: string };
			this.sessionId = result.sessionId;
			return this.sessionId;
		} catch (error) {
			console.error("[SnapBack MCP] Failed to start session for activity tracking:", error);
			// Generate local fallback
			const timestamp = Date.now().toString(36);
			const random = Math.random().toString(36).substring(2, 8);
			this.sessionId = `local_${timestamp}${random}`;
			return this.sessionId;
		}
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string | null {
		return this.sessionId;
	}

	/**
	 * End the current session
	 */
	async endSession(summary?: SessionActivityMetadata): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			this.sessionId = null;
			return;
		}

		try {
			await this.apiClient!.request("mcp.endSession", {
				sessionId: this.sessionId,
				summary: summary
					? {
							filesModified: summary.filesModified,
							snapshotsCreated: summary.snapshotsCreated,
							riskAnalyses: summary.riskAnalyses,
							durationMs: summary.duration,
						}
					: undefined,
			});
		} catch (error) {
			console.error("[SnapBack MCP] Failed to end session:", error);
		} finally {
			this.sessionId = null;
		}
	}

	/**
	 * Report snapshot creation (metadata only)
	 *
	 * CRITICAL: Only aggregate data is sent:
	 * - Trigger type (manual, auto, ai-detected)
	 * - File count
	 * - Total bytes
	 *
	 * NEVER sent:
	 * - File paths
	 * - File content
	 * - Diffs
	 */
	async reportSnapshotCreated(metadata: SnapshotMetadata): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			return;
		}

		try {
			await this.apiClient!.request("mcp.reportActivity", {
				sessionId: this.sessionId,
				event: "snapshot_created",
				metadata: {
					trigger: metadata.trigger,
					fileCount: metadata.fileCount,
					totalBytes: metadata.totalBytes,
					// Sanitize - only aggregate data
				},
			});
		} catch (error) {
			// Silent failure - activity reporting is non-critical
			console.error("[SnapBack MCP] Failed to report snapshot activity:", error);
		}
	}

	/**
	 * Report risk analysis (severity only)
	 *
	 * CRITICAL: Only aggregate data is sent:
	 * - Risk level
	 * - Issue count
	 * - Categories (types of issues found)
	 *
	 * NEVER sent:
	 * - Actual code
	 * - Issue details
	 * - Line numbers
	 * - File paths
	 */
	async reportRiskAnalyzed(metadata: RiskMetadata): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			return;
		}

		try {
			await this.apiClient!.request("mcp.reportActivity", {
				sessionId: this.sessionId,
				event: "risk_analyzed",
				metadata: {
					riskLevel: metadata.riskLevel,
					issueCount: metadata.issueCount,
					categories: metadata.categories,
					// Sanitize - only severity and counts
				},
			});
		} catch (error) {
			// Silent failure - activity reporting is non-critical
			console.error("[SnapBack MCP] Failed to report risk analysis activity:", error);
		}
	}

	/**
	 * Report tool usage (performance metrics only)
	 *
	 * Helps understand tool performance and usage patterns.
	 * NEVER includes arguments or results.
	 */
	async reportToolUsed(metadata: ToolUsageMetadata): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			return;
		}

		try {
			await this.apiClient!.request("mcp.reportActivity", {
				sessionId: this.sessionId,
				event: "tool_used",
				metadata: {
					toolName: metadata.toolName,
					durationMs: metadata.durationMs,
					success: metadata.success,
					// Never include arguments or results
				},
			});
		} catch (error) {
			// Silent failure
			console.error("[SnapBack MCP] Failed to report tool usage:", error);
		}
	}

	/**
	 * Report learning recorded
	 *
	 * Tracks when users record learnings to understand adoption.
	 * NEVER includes the actual learning content.
	 */
	async reportLearningRecorded(type: string): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			return;
		}

		try {
			await this.apiClient!.request("mcp.reportActivity", {
				sessionId: this.sessionId,
				event: "learning_recorded",
				metadata: {
					type,
					// Never include trigger, action, or source content
				},
			});
		} catch (error) {
			// Silent failure
			console.error("[SnapBack MCP] Failed to report learning activity:", error);
		}
	}

	/**
	 * Report violation detected
	 *
	 * Tracks pattern violations to improve recommendations.
	 * NEVER includes actual code or file content.
	 */
	async reportViolationDetected(violationType: string): Promise<void> {
		if (!this.sessionId || !this.isEnabled()) {
			return;
		}

		try {
			await this.apiClient!.request("mcp.reportActivity", {
				sessionId: this.sessionId,
				event: "violation_detected",
				metadata: {
					violationType,
					// Never include file path, code, or message
				},
			});
		} catch (error) {
			// Silent failure
			console.error("[SnapBack MCP] Failed to report violation activity:", error);
		}
	}
}

// =============================================================================
// OFFLINE FALLBACK UTILITY
// =============================================================================

/**
 * Fallback behavior when server is unavailable
 *
 * @example
 * ```typescript
 * const result = await withFallback(
 *   () => apiClient.request('mcp.getContext', args),
 *   () => getLocalContext(args, workspaceRoot),
 * );
 * ```
 */
export async function withFallback<T>(
	serverCall: () => Promise<T>,
	localFallback: () => T | Promise<T>,
	options: { timeout?: number } = {},
): Promise<T> {
	const timeout = options.timeout || 5000;

	try {
		const result = await Promise.race([
			serverCall(),
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
		]);
		return result;
	} catch (error) {
		console.error("[SnapBack MCP] Server unavailable, using local fallback:", error);
		return localFallback();
	}
}

// =============================================================================
// HELPER: Extend SnapBackAPIClient with request method
// =============================================================================

// Add request method type declaration for the API client
declare module "../client/snapback-api" {
	interface SnapBackAPIClient {
		request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
	}
}
