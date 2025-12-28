/**
 * MCP Daemon Client Facade
 *
 * Provides lightweight daemon communication for MCP tools.
 * Implements minimal IPC protocol to avoid circular dependency with CLI.
 *
 * Features:
 * - Lazy connection (connects on first request)
 * - Graceful fallback to local Intelligence when daemon unavailable
 * - Singleton per workspace to share connections
 * - Auto-detection of daemon availability
 *
 * @module daemon/client-facade
 */

import { existsSync, readFileSync } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { homedir, platform } from "node:os";
import { join } from "node:path";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache of daemon connections per workspace */
const connections = new Map<string, DaemonConnection>();

/** Connection status per workspace */
const connectionStatus = new Map<
	string,
	{
		connected: boolean;
		lastAttempt: number;
		consecutiveFailures: number;
	}
>();

/** Minimum time between connection attempts (ms) */
const MIN_RETRY_INTERVAL_MS = 5000;

/** Max consecutive failures before giving up */
const MAX_CONSECUTIVE_FAILURES = 3;

/** Request timeout (ms) */
const REQUEST_TIMEOUT_MS = 10000;

// =============================================================================
// PLATFORM PATHS
// =============================================================================

const IS_WINDOWS = platform() === "win32";

/**
 * Get the daemon socket path based on platform
 */
function getSocketPath(): string {
	if (IS_WINDOWS) {
		return "\\\\.\\pipe\\snapback-daemon";
	}
	return join(homedir(), ".snapback", "daemon.sock");
}

/**
 * Get the daemon PID file path
 */
function getPidPath(): string {
	return join(homedir(), ".snapback", "daemon.pid");
}

// =============================================================================
// LIGHTWEIGHT IPC CLIENT
// =============================================================================

interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: number;
	method: string;
	params: Record<string, unknown>;
}

interface JsonRpcResponse {
	jsonrpc: "2.0";
	id: number;
	result?: unknown;
	error?: { code: number; message: string };
}

/**
 * Lightweight daemon connection
 * Implements minimal JSON-RPC over IPC
 */
class DaemonConnection {
	private socket: Socket | null = null;
	private requestId = 0;
	private pendingRequests = new Map<
		number,
		{
			resolve: (value: unknown) => void;
			reject: (error: Error) => void;
			timeout: NodeJS.Timeout;
		}
	>();
	private buffer = "";

	constructor(private socketPath: string) {}

	/**
	 * Connect to daemon
	 */
	async connect(): Promise<void> {
		if (this.socket?.writable) {
			return; // Already connected
		}

		return new Promise((resolve, reject) => {
			const socket = createConnection(this.socketPath);

			socket.on("connect", () => {
				this.socket = socket;
				resolve();
			});

			socket.on("error", (err) => {
				reject(err);
			});

			socket.on("data", (data) => {
				this.handleData(data.toString());
			});

			socket.on("close", () => {
				this.socket = null;
				// Reject all pending requests
				for (const [id, pending] of this.pendingRequests) {
					clearTimeout(pending.timeout);
					pending.reject(new Error("Connection closed"));
					this.pendingRequests.delete(id);
				}
			});

			// Connection timeout
			setTimeout(() => {
				if (!this.socket) {
					socket.destroy();
					reject(new Error("Connection timeout"));
				}
			}, 5000);
		});
	}

	/**
	 * Disconnect from daemon
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.destroy();
			this.socket = null;
		}
	}

	/**
	 * Send a request to the daemon
	 */
	async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
		if (!this.socket?.writable) {
			throw new Error("Not connected");
		}

		const id = ++this.requestId;
		const request: JsonRpcRequest = {
			jsonrpc: "2.0",
			id,
			method,
			params,
		};

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Request timeout: ${method}`));
			}, REQUEST_TIMEOUT_MS);

			this.pendingRequests.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timeout,
			});

			this.socket?.write(`${JSON.stringify(request)}\n`);
		});
	}

	/**
	 * Handle incoming data
	 */
	private handleData(data: string): void {
		this.buffer += data;

		// Process complete messages (newline-delimited JSON)
		const lines = this.buffer.split("\n");
		this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			try {
				const response: JsonRpcResponse = JSON.parse(line);
				const pending = this.pendingRequests.get(response.id);

				if (pending) {
					clearTimeout(pending.timeout);
					this.pendingRequests.delete(response.id);

					if (response.error) {
						pending.reject(new Error(response.error.message));
					} else {
						pending.resolve(response.result);
					}
				}
			} catch {
				// Ignore malformed responses
			}
		}
	}
}

// =============================================================================
// CLIENT FACADE
// =============================================================================

/**
 * Get or create a daemon connection for a workspace
 *
 * Returns null if daemon is not available and retry limit exceeded.
 */
async function getDaemonConnection(workspaceRoot: string): Promise<DaemonConnection | null> {
	// Check if we should skip attempting connection
	const status = connectionStatus.get(workspaceRoot);
	if (status) {
		const timeSinceLastAttempt = Date.now() - status.lastAttempt;

		// If we've failed too many times recently, skip
		if (status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && timeSinceLastAttempt < MIN_RETRY_INTERVAL_MS) {
			return null;
		}
	}

	// Get or create connection
	let conn = connections.get(workspaceRoot);

	if (!conn) {
		conn = new DaemonConnection(getSocketPath());
		connections.set(workspaceRoot, conn);
	}

	// Try to connect
	try {
		await conn.connect();

		// Update status on success
		connectionStatus.set(workspaceRoot, {
			connected: true,
			lastAttempt: Date.now(),
			consecutiveFailures: 0,
		});

		return conn;
	} catch {
		// Update status on failure
		const prevStatus = connectionStatus.get(workspaceRoot);
		connectionStatus.set(workspaceRoot, {
			connected: false,
			lastAttempt: Date.now(),
			consecutiveFailures: (prevStatus?.consecutiveFailures ?? 0) + 1,
		});

		return null;
	}
}

/**
 * Check if daemon is available for a workspace without connecting
 */
export function isDaemonAvailable(_workspaceRoot: string): boolean {
	// Check if PID file exists (quick check)
	try {
		const pidPath = getPidPath();
		if (!existsSync(pidPath)) {
			return false;
		}
		// Optionally verify PID is running
		const pid = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
		if (Number.isNaN(pid)) {
			return false;
		}
		// Check if process exists (doesn't kill it)
		try {
			process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	} catch {
		return false;
	}
}

/**
 * Disconnect and remove connection for a workspace
 */
export async function disposeDaemonConnection(workspaceRoot: string): Promise<void> {
	const conn = connections.get(workspaceRoot);
	if (conn) {
		conn.disconnect();
		connections.delete(workspaceRoot);
		connectionStatus.delete(workspaceRoot);
	}
}

/**
 * Disconnect all daemon connections
 * Call on MCP server shutdown
 */
export async function disposeAllDaemonConnections(): Promise<void> {
	for (const [workspace] of connections) {
		await disposeDaemonConnection(workspace);
	}
}

// =============================================================================
// CONVENIENCE METHODS
// =============================================================================

/**
 * Begin a task via daemon
 */
export async function beginTaskViaDaemon(
	workspaceRoot: string,
	task: string,
	files?: string[],
	keywords?: string[],
): Promise<{
	taskId: string;
	snapshot: { created: boolean; id?: string; reason?: string };
	patterns: unknown[];
	constraints: unknown[];
	learnings: unknown[];
	riskAssessment: { overallRisk: string; riskAreas: unknown[]; recommendations: unknown[] };
	nextActions: unknown[];
} | null> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return null;
	}

	try {
		return await conn.request("session.begin", {
			workspace: workspaceRoot,
			task,
			files: files || [],
			keywords: keywords || [],
		});
	} catch {
		return null;
	}
}

/**
 * Get session changes via daemon
 */
export async function getSessionChangesViaDaemon(
	workspaceRoot: string,
	options?: {
		includeDiff?: boolean;
		filterFiles?: string[];
		includeAIAttribution?: boolean;
	},
): Promise<{
	files: Array<{
		path: string;
		status: "created" | "modified" | "deleted";
		linesChanged: number;
		aiAttributed?: boolean;
	}>;
	totalLinesChanged: number;
	riskAssessment: { overallRisk: "low" | "medium" | "high" };
} | null> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return null;
	}

	try {
		return await conn.request("session.changes", {
			workspace: workspaceRoot,
			...options,
		});
	} catch {
		return null;
	}
}

/**
 * End task via daemon
 */
export async function endTaskViaDaemon(
	workspaceRoot: string,
	outcome?: "completed" | "abandoned" | "blocked",
): Promise<{
	summary: { filesModified: number; linesChanged: number; duration: number };
	snapshot: { created: boolean };
	learningsAccepted: number;
} | null> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return null;
	}

	try {
		return await conn.request("session.end", {
			workspace: workspaceRoot,
			outcome: outcome || "completed",
		});
	} catch {
		return null;
	}
}

/**
 * Get session status via daemon
 */
export async function getSessionStatusViaDaemon(workspaceRoot: string): Promise<{
	active: boolean;
	taskId?: string;
	task?: string;
	startedAt?: string;
	filesModified: number;
	snapshotCount: number;
} | null> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return null;
	}

	try {
		return await conn.request("session.status", {
			workspace: workspaceRoot,
		});
	} catch {
		return null;
	}
}

/**
 * Run quick check via daemon
 */
export async function quickCheckViaDaemon(
	workspaceRoot: string,
	options?: { file?: string; files?: string[] },
): Promise<{
	passed: boolean;
	typescript: { passed: boolean; errors: number };
	tests: { discovered: number };
	lint: { passed: boolean; errors: number; warnings: number };
} | null> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return null;
	}

	try {
		return await conn.request("validation.quick", {
			workspace: workspaceRoot,
			...options,
		});
	} catch {
		return null;
	}
}

/**
 * Record file modification via daemon (for AI attribution)
 */
export async function recordFileModificationViaDaemon(
	workspaceRoot: string,
	filePath: string,
	linesChanged: number,
	aiAttributed: boolean,
): Promise<boolean> {
	const conn = await getDaemonConnection(workspaceRoot);
	if (!conn) {
		return false;
	}

	try {
		await conn.request("file.modified", {
			workspace: workspaceRoot,
			path: filePath,
			linesChanged,
			aiAttributed,
		});
		return true;
	} catch {
		return false;
	}
}
