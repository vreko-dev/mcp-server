/**
 * Pioneer WebSocket Hub
 *
 * Enables real-time synchronization of Pioneer Program state across all surfaces:
 * - VS Code Extension
 * - Web Dashboard
 * - MCP Server
 *
 * Per RFC: SNAPBACK-RFC-2025-001
 * Location: apps/api/ws/pioneer-hub.ts
 */

import type { Server as HttpServer, IncomingMessage } from "node:http";
import { auth } from "@snapback/auth";
import type { PioneerTier } from "@snapback/contracts";
import { logger } from "@snapback/infrastructure";
import { WebSocket, WebSocketServer } from "ws";

// --- Types ---

/** @deprecated Use PioneerTier from @snapback/contracts instead */
export type Tier = PioneerTier;

/** Extended WebSocket with user context */
interface AuthenticatedSocket extends WebSocket {
	userId: string;
	isAlive: boolean;
}

/** Server → Client: Connection established */
export interface ConnectedMessage {
	type: "connected";
	payload: {
		userId: string;
		room: string;
		timestamp: number;
	};
}

/** Server → Client: Heartbeat response */
export interface PongMessage {
	type: "pong";
	payload: {
		timestamp: number;
	};
}

/** Server → Client: Points updated */
export interface PointsUpdatedMessage {
	type: "pioneer:points_updated";
	payload: {
		userId: string;
		points: number;
		delta: number;
		actionType: string;
	};
}

/** Server → Client: Tier changed */
export interface TierChangedMessage {
	type: "pioneer:tier_changed";
	payload: {
		userId: string;
		from: Tier;
		to: Tier;
		points: number;
		benefits: string[];
	};
}

/** Server → Client: Leaderboard position changed */
export interface LeaderboardUpdateMessage {
	type: "pioneer:leaderboard_update";
	payload: {
		yourRank: number;
		previousRank: number;
		topChanges: Array<{
			rank: number;
			display: string;
			points: number;
			change: "up" | "down" | "new";
		}>;
	};
}

/** Server → Client: Referral converted */
export interface ReferralConvertedMessage {
	type: "pioneer:referral_converted";
	payload: {
		referrerId: string;
		referralUsername: string;
		pointsEarned: number;
		totalReferrals: number;
	};
}

/** Server → Client: Error */
export interface ErrorMessage {
	type: "error";
	payload: {
		code: string;
		message: string;
	};
}

/** Client → Server: Heartbeat */
export interface PingMessage {
	type: "ping";
}

/** Client → Server: Subscribe to room */
export interface SubscribeMessage {
	type: "subscribe";
	payload: {
		room: string;
	};
}

/** All server → client message types */
export type ServerToClientMessage =
	| ConnectedMessage
	| PongMessage
	| PointsUpdatedMessage
	| TierChangedMessage
	| LeaderboardUpdateMessage
	| ReferralConvertedMessage
	| ErrorMessage;

/** All client → server message types */
export type ClientToServerMessage = PingMessage | SubscribeMessage;

/** Events that can be broadcast */
export type PioneerWSEvent =
	| PointsUpdatedMessage
	| TierChangedMessage
	| LeaderboardUpdateMessage
	| ReferralConvertedMessage;

// --- WebSocket Hub Implementation ---

// Allowed origins for WebSocket connections (OWASP: prevent CSWSH)
const ALLOWED_ORIGINS = [
	"https://snapback.dev",
	"https://www.snapback.dev",
	"https://api.snapback.dev",
	// Development origins
	...(process.env.NODE_ENV === "development"
		? ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "vscode-webview://"]
		: []),
];

export class PioneerWebSocketHub {
	private wss: WebSocketServer;
	private rooms: Map<string, Set<AuthenticatedSocket>> = new Map();
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	constructor(server: HttpServer) {
		this.wss = new WebSocketServer({
			server,
			path: "/ws/pioneer",
		});

		// Handle upgrade requests manually for authentication
		server.on("upgrade", async (request, socket, head) => {
			// Only handle our path
			const url = new URL(request.url || "/", `http://${request.headers.host}`);
			if (url.pathname !== "/ws/pioneer") {
				return;
			}

			// OWASP WSTG-CLIENT-10: Validate Origin header to prevent Cross-Site WebSocket Hijacking
			const origin = request.headers.origin;
			if (origin && !this.isAllowedOrigin(origin)) {
				logger.warn("WebSocket connection rejected: invalid origin", { origin });
				socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
				socket.destroy();
				return;
			}

			try {
				const userId = await this.authenticateRequest(request);
				if (!userId) {
					socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
					socket.destroy();
					return;
				}

				// Attach userId to request for use in connection handler
				(request as any).userId = userId;

				this.wss.handleUpgrade(request, socket, head, (ws) => {
					this.wss.emit("connection", ws, request);
				});
			} catch (error) {
				logger.error("WebSocket upgrade failed", { error });
				socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
				socket.destroy();
			}
		});

		this.wss.on("connection", this.handleConnection.bind(this));
		this.startHeartbeat();

		logger.info("Pioneer WebSocket Hub initialized", { path: "/ws/pioneer" });
	}

	/**
	 * Authenticate WebSocket connection request
	 * Validates session via:
	 * 1. Token in query parameter (for extension/CLI)
	 * 2. Session cookie (for browser)
	 */
	private async authenticateRequest(req: IncomingMessage): Promise<string | null> {
		try {
			const url = new URL(req.url || "/", `http://${req.headers.host}`);
			const token = url.searchParams.get("token");

			// Method 1: Token in query parameter (extension/CLI)
			if (token) {
				const mockHeaders = new Headers({
					cookie: `better-auth.session_token=${token}`,
				});

				const session = await auth.api.getSession({
					headers: mockHeaders,
				});

				if (session?.user) {
					logger.debug("WebSocket auth via token", { userId: session.user.id });
					return session.user.id;
				}
			}

			// Method 2: Session cookie (browser)
			const cookieHeader = req.headers.cookie;
			if (cookieHeader) {
				const mockHeaders = new Headers({
					cookie: cookieHeader,
				});

				const session = await auth.api.getSession({
					headers: mockHeaders,
				});

				if (session?.user) {
					logger.debug("WebSocket auth via cookie", { userId: session.user.id });
					return session.user.id;
				}
			}

			logger.warn("WebSocket connection unauthenticated");
			return null;
		} catch (error) {
			logger.error("WebSocket authentication error", { error });
			return null;
		}
	}

	/**
	 * Handle new WebSocket connection
	 */
	private handleConnection(ws: WebSocket, req: IncomingMessage): void {
		const userId = (req as any).userId as string;
		const socket = ws as AuthenticatedSocket;
		socket.userId = userId;
		socket.isAlive = true;

		// Join user's private room
		const roomId = `user_${userId}`;
		this.joinRoom(socket, roomId);

		// Send connected confirmation
		this.send(socket, {
			type: "connected",
			payload: {
				userId,
				room: roomId,
				timestamp: Date.now(),
			},
		});

		// Handle incoming messages
		socket.on("message", (data) => this.handleMessage(socket, data));

		// Handle pong (heartbeat response)
		socket.on("pong", () => {
			socket.isAlive = true;
		});

		// Handle disconnect
		socket.on("close", () => {
			this.leaveRoom(socket, roomId);
			logger.debug("WebSocket disconnected", { userId });
		});

		socket.on("error", (error) => {
			logger.error("WebSocket error", { userId, error });
			this.leaveRoom(socket, roomId);
		});

		logger.info("WebSocket connected", { userId, room: roomId });
	}

	/**
	 * Handle incoming messages from client
	 */
	private handleMessage(ws: AuthenticatedSocket, data: WebSocket.RawData): void {
		try {
			const message = JSON.parse(data.toString()) as ClientToServerMessage;

			switch (message.type) {
				case "ping":
					this.send(ws, { type: "pong", payload: { timestamp: Date.now() } });
					break;

				case "subscribe":
					// Future: Allow subscribing to additional rooms (e.g., leaderboard updates)
					logger.debug("Subscribe request", {
						userId: ws.userId,
						room: message.payload.room,
					});
					break;

				default:
					logger.warn("Unknown message type", {
						type: (message as any).type,
						userId: ws.userId,
					});
			}
		} catch (error) {
			logger.error("Failed to parse WebSocket message", { error });
		}
	}

	/**
	 * Add socket to a room
	 */
	private joinRoom(ws: AuthenticatedSocket, roomId: string): void {
		if (!this.rooms.has(roomId)) {
			this.rooms.set(roomId, new Set());
		}
		this.rooms.get(roomId)!.add(ws);
	}

	/**
	 * Remove socket from a room
	 */
	private leaveRoom(ws: AuthenticatedSocket, roomId: string): void {
		const room = this.rooms.get(roomId);
		if (room) {
			room.delete(ws);
			if (room.size === 0) {
				this.rooms.delete(roomId);
			}
		}
	}

	/**
	 * Send a message to a specific socket
	 */
	private send(ws: WebSocket, message: ServerToClientMessage): void {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	/**
	 * Broadcast a message to all clients in a room
	 */
	public broadcast(roomId: string, event: PioneerWSEvent): void {
		const room = this.rooms.get(roomId);
		if (!room) {
			logger.debug("Broadcast to empty room", { roomId });
			return;
		}

		const data = JSON.stringify(event);
		let sent = 0;

		for (const ws of room) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(data);
				sent++;
			}
		}

		logger.debug("Broadcast sent", { roomId, type: event.type, sent });
	}

	/**
	 * Broadcast to a specific user (all their connected devices)
	 */
	public broadcastToUser(userId: string, event: PioneerWSEvent): void {
		this.broadcast(`user_${userId}`, event);
	}

	/**
	 * Heartbeat to detect dead connections
	 * Runs every 30 seconds, terminates unresponsive connections
	 */
	private startHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			this.wss.clients.forEach((ws) => {
				const socket = ws as AuthenticatedSocket;
				if (!socket.isAlive) {
					logger.debug("Terminating unresponsive connection", {
						userId: socket.userId,
					});
					socket.terminate();
					return;
				}
				socket.isAlive = false;
				socket.ping();
			});
		}, 30000); // 30 seconds
	}

	/**
	 * Get connection stats
	 */
	public getStats(): { totalConnections: number; rooms: number } {
		return {
			totalConnections: this.wss.clients.size,
			rooms: this.rooms.size,
		};
	}

	/**
	 * Gracefully shutdown the hub
	 */
	public shutdown(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		// Close all connections gracefully
		this.wss.clients.forEach((ws) => {
			ws.close(1000, "Server shutting down");
		});

		this.wss.close(() => {
			logger.info("Pioneer WebSocket Hub shutdown complete");
		});
	}

	/**
	 * Check if origin is allowed for WebSocket connections
	 * Supports wildcard matching for VS Code webview origins
	 */
	private isAllowedOrigin(origin: string): boolean {
		// VS Code webview origins are dynamic
		if (origin.startsWith("vscode-webview://")) {
			return true;
		}

		return ALLOWED_ORIGINS.some((allowed) => {
			if (allowed.startsWith("vscode-webview://")) {
				return origin.startsWith("vscode-webview://");
			}
			return origin === allowed;
		});
	}
}

// --- Singleton Pattern ---

let hubInstance: PioneerWebSocketHub | null = null;

/**
 * Initialize the Pioneer WebSocket Hub
 * Should be called once when the HTTP server starts
 */
export function initPioneerHub(server: HttpServer): PioneerWebSocketHub {
	if (!hubInstance) {
		hubInstance = new PioneerWebSocketHub(server);
	}
	return hubInstance;
}

/**
 * Get the Pioneer WebSocket Hub instance
 * Throws if not initialized
 */
export function getPioneerHub(): PioneerWebSocketHub {
	if (!hubInstance) {
		throw new Error("PioneerWebSocketHub not initialized. Call initPioneerHub first.");
	}
	return hubInstance;
}

/**
 * Check if the hub is initialized
 */
export function isPioneerHubInitialized(): boolean {
	return hubInstance !== null;
}
