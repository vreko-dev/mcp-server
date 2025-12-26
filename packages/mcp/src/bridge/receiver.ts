/**
 * MCP Bridge Receiver
 *
 * HTTP endpoint to receive observations and file changes from the VS Code extension.
 * Part of the "pair programmer" architecture that enables proactive observations.
 *
 * Architecture:
 * - VS Code extension pushes observations and changes via HTTP
 * - This receiver stores them in session state
 * - Composite tools drain observations when called
 *
 * @module bridge/receiver
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type FileChange, type Observation, pushObservation, recordFileChange } from "../session/state.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Payload pushed from extension
 */
interface BridgePushPayload {
	/** Observations to add */
	observations?: Observation[];
	/** File changes to record */
	changes?: FileChange[];
	/** Workspace root (for state lookup) */
	workspaceRoot?: string;
}

/**
 * Bridge receiver configuration
 */
export interface BridgeReceiverConfig {
	/** Port to listen on (default: 3100) */
	port?: number;
	/** Host to bind to (default: localhost) */
	host?: string;
	/** Default workspace root if not in request */
	defaultWorkspaceRoot?: string;
}

/**
 * Bridge receiver status
 */
export interface BridgeReceiverStatus {
	running: boolean;
	port: number;
	host: string;
	observationsReceived: number;
	changesReceived: number;
	lastActivity: number | null;
}

// =============================================================================
// BRIDGE RECEIVER CLASS
// =============================================================================

/**
 * MCP Bridge Receiver
 *
 * Lightweight HTTP server that receives observations and changes from
 * the VS Code extension. Designed to run alongside the stdio MCP server.
 *
 * Usage:
 * ```typescript
 * const receiver = new BridgeReceiver({
 *   port: 3100,
 *   defaultWorkspaceRoot: process.cwd(),
 * });
 *
 * await receiver.start();
 * // ... later
 * await receiver.stop();
 * ```
 */
export class BridgeReceiver {
	private server: Server | null = null;
	private readonly port: number;
	private readonly host: string;
	private readonly defaultWorkspaceRoot: string;

	// Stats
	private observationsReceived = 0;
	private changesReceived = 0;
	private lastActivity: number | null = null;

	constructor(config: BridgeReceiverConfig = {}) {
		this.port = config.port ?? 3100;
		this.host = config.host ?? "127.0.0.1";
		this.defaultWorkspaceRoot = config.defaultWorkspaceRoot ?? process.cwd();
	}

	/**
	 * Start the bridge receiver
	 */
	async start(): Promise<void> {
		if (this.server) {
			console.error("[BridgeReceiver] Already running");
			return;
		}

		return new Promise((resolve, reject) => {
			this.server = createServer((req, res) => this.handleRequest(req, res));

			this.server.on("error", (err) => {
				console.error("[BridgeReceiver] Server error:", err);
				reject(err);
			});

			this.server.listen(this.port, this.host, () => {
				console.error(`[BridgeReceiver] Listening on http://${this.host}:${this.port}`);
				resolve();
			});
		});
	}

	/**
	 * Stop the bridge receiver
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			return;
		}

		return new Promise((resolve) => {
			this.server?.close(() => {
				console.error("[BridgeReceiver] Stopped");
				this.server = null;
				resolve();
			});
		});
	}

	/**
	 * Get receiver status
	 */
	getStatus(): BridgeReceiverStatus {
		return {
			running: this.server !== null,
			port: this.port,
			host: this.host,
			observationsReceived: this.observationsReceived,
			changesReceived: this.changesReceived,
			lastActivity: this.lastActivity,
		};
	}

	/**
	 * Handle incoming HTTP request
	 */
	private handleRequest(req: IncomingMessage, res: ServerResponse): void {
		// CORS headers for local development
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

		// Handle preflight
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		// Route handling
		const url = req.url ?? "/";

		if (url === "/bridge/push" && req.method === "POST") {
			this.handlePush(req, res);
		} else if (url === "/bridge/status" && req.method === "GET") {
			this.handleStatus(res);
		} else if (url === "/bridge/health" && req.method === "GET") {
			this.handleHealth(res);
		} else {
			this.sendJson(res, 404, { error: "Not found" });
		}
	}

	/**
	 * Handle /bridge/push - receive observations and changes
	 */
	private handlePush(req: IncomingMessage, res: ServerResponse): void {
		let body = "";

		req.on("data", (chunk) => {
			body += chunk;
			// Limit body size to 1MB
			if (body.length > 1024 * 1024) {
				this.sendJson(res, 413, { error: "Payload too large" });
				req.destroy();
			}
		});

		req.on("end", () => {
			try {
				const payload = JSON.parse(body) as BridgePushPayload;
				this.processPush(payload);

				this.lastActivity = Date.now();

				this.sendJson(res, 200, {
					received: true,
					observationsCount: payload.observations?.length ?? 0,
					changesCount: payload.changes?.length ?? 0,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				this.sendJson(res, 400, { error: `Invalid payload: ${message}` });
			}
		});

		req.on("error", (err) => {
			console.error("[BridgeReceiver] Request error:", err);
			this.sendJson(res, 500, { error: "Request error" });
		});
	}

	/**
	 * Process push payload
	 */
	private processPush(payload: BridgePushPayload): void {
		const workspaceRoot = payload.workspaceRoot ?? this.defaultWorkspaceRoot;

		// Process observations
		if (payload.observations && payload.observations.length > 0) {
			for (const observation of payload.observations) {
				pushObservation(workspaceRoot, observation);
				this.observationsReceived++;
			}
		}

		// Process changes (only if task is active, handled by recordFileChange)
		if (payload.changes && payload.changes.length > 0) {
			for (const change of payload.changes) {
				recordFileChange(workspaceRoot, change);
				this.changesReceived++;
			}
		}
	}

	/**
	 * Handle /bridge/status - return bridge status
	 */
	private handleStatus(res: ServerResponse): void {
		const status = this.getStatus();
		this.sendJson(res, 200, status);
	}

	/**
	 * Handle /bridge/health - health check endpoint
	 */
	private handleHealth(res: ServerResponse): void {
		this.sendJson(res, 200, {
			healthy: true,
			timestamp: Date.now(),
		});
	}

	/**
	 * Send JSON response
	 */
	private sendJson(res: ServerResponse, status: number, data: unknown): void {
		res.writeHead(status, { "Content-Type": "application/json" });
		res.end(JSON.stringify(data));
	}
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let bridgeReceiver: BridgeReceiver | null = null;

/**
 * Get or create the bridge receiver singleton
 */
export function getBridgeReceiver(config?: BridgeReceiverConfig): BridgeReceiver {
	if (!bridgeReceiver) {
		bridgeReceiver = new BridgeReceiver(config);
	}
	return bridgeReceiver;
}

/**
 * Start the bridge receiver (singleton)
 */
export async function startBridgeReceiver(config?: BridgeReceiverConfig): Promise<BridgeReceiver> {
	const receiver = getBridgeReceiver(config);
	await receiver.start();
	return receiver;
}

/**
 * Stop the bridge receiver (singleton)
 */
export async function stopBridgeReceiver(): Promise<void> {
	if (bridgeReceiver) {
		await bridgeReceiver.stop();
		bridgeReceiver = null;
	}
}

// =============================================================================
// OBSERVATION HELPERS
// =============================================================================

/**
 * Create a risk observation
 */
export function createRiskObservation(file: string, reason: string): Observation {
	return {
		type: "risk",
		message: `High-risk file modified: ${file} (${reason})`,
		timestamp: Date.now(),
		context: { file, riskLevel: "high" },
	};
}

/**
 * Create a pattern observation
 */
export function createPatternObservation(patternName: string, message: string, file?: string): Observation {
	return {
		type: "pattern",
		message,
		timestamp: Date.now(),
		context: { patternName, file },
	};
}

/**
 * Create a warning observation
 */
export function createWarningObservation(message: string, context?: Record<string, unknown>): Observation {
	return {
		type: "warning",
		message,
		timestamp: Date.now(),
		context,
	};
}

/**
 * Create a suggestion observation
 */
export function createSuggestionObservation(message: string, context?: Record<string, unknown>): Observation {
	return {
		type: "suggestion",
		message,
		timestamp: Date.now(),
		context,
	};
}

/**
 * Create a progress observation
 */
export function createProgressObservation(message: string): Observation {
	return {
		type: "progress",
		message,
		timestamp: Date.now(),
	};
}
