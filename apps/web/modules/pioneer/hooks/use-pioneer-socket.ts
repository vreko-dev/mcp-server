"use client";

/**
 * usePioneerSocket - Real-time Pioneer Program updates via WebSocket
 *
 * Connects to the Pioneer WebSocket hub and provides:
 * - Real-time points updates
 * - Tier change notifications with celebration triggers
 * - Leaderboard position changes
 * - Referral conversion notifications
 *
 * Usage:
 * ```tsx
 * const { isConnected, lastPointsUpdate, lastTierChange } = usePioneerSocket({
 *   onPointsUpdated: (data) => console.log("Points:", data.points),
 *   onTierChanged: (data) => showCelebration(data.to),
 * });
 * ```
 */

import { useSession } from "@saas/auth/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tier } from "../lib/tiers";

// --- Types ---

export interface PointsUpdatedPayload {
	userId: string;
	points: number;
	delta: number;
	actionType: string;
}

export interface TierChangedPayload {
	userId: string;
	from: Tier;
	to: Tier;
	points: number;
	benefits: string[];
}

export interface LeaderboardUpdatePayload {
	userId: string;
	newRank: number;
	previousRank?: number;
	change: "up" | "down" | "same";
}

export interface ReferralConvertedPayload {
	userId: string;
	referralUsername: string;
	pointsEarned: number;
}

export interface UsePioneerSocketOptions {
	/** Called when points are updated */
	onPointsUpdated?: (payload: PointsUpdatedPayload) => void;
	/** Called when tier changes (for celebration animations) */
	onTierChanged?: (payload: TierChangedPayload) => void;
	/** Called when leaderboard position changes */
	onLeaderboardUpdate?: (payload: LeaderboardUpdatePayload) => void;
	/** Called when a referral converts */
	onReferralConverted?: (payload: ReferralConvertedPayload) => void;
	/** Called on WebSocket error */
	onError?: (error: Error) => void;
	/** Whether to automatically reconnect on disconnect */
	autoReconnect?: boolean;
	/** Reconnect delay in ms (default: 3000) */
	reconnectDelay?: number;
}

export interface UsePioneerSocketReturn {
	/** WebSocket connection status */
	isConnected: boolean;
	/** Last points update received */
	lastPointsUpdate: PointsUpdatedPayload | null;
	/** Last tier change received */
	lastTierChange: TierChangedPayload | null;
	/** Manually reconnect */
	reconnect: () => void;
	/** Manually disconnect */
	disconnect: () => void;
}

// --- Constants ---

const PING_INTERVAL = 25000; // 25 seconds (server timeout is 30s)
const DEFAULT_RECONNECT_DELAY = 3000;

// Get WebSocket URL from environment or derive from API URL
function getWebSocketUrl(): string {
	// In production, use the API service WebSocket URL
	if (process.env.NEXT_PUBLIC_WS_URL) {
		return process.env.NEXT_PUBLIC_WS_URL;
	}

	// In development, derive from API URL
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
	const wsUrl = apiUrl.replace(/^http/, "ws");
	return `${wsUrl}/ws/pioneer`;
}

// --- Hook Implementation ---

export function usePioneerSocket(options: UsePioneerSocketOptions = {}): UsePioneerSocketReturn {
	const {
		onPointsUpdated,
		onTierChanged,
		onLeaderboardUpdate,
		onReferralConverted,
		onError,
		autoReconnect = true,
		reconnectDelay = DEFAULT_RECONNECT_DELAY,
	} = options;

	const { user } = useSession();
	const queryClient = useQueryClient();

	const [isConnected, setIsConnected] = useState(false);
	const [lastPointsUpdate, setLastPointsUpdate] = useState<PointsUpdatedPayload | null>(null);
	const [lastTierChange, setLastTierChange] = useState<TierChangedPayload | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const shouldReconnectRef = useRef(true);

	// Cleanup function
	const cleanup = useCallback(() => {
		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = null;
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
	}, []);

	// Handle incoming messages
	const handleMessage = useCallback(
		(event: MessageEvent) => {
			try {
				const message = JSON.parse(event.data);

				switch (message.type) {
					case "connected":
						console.log("[PioneerSocket] Connected to room:", message.payload.room);
						break;

					case "pong":
						// Heartbeat response - connection is alive
						break;

					case "pioneer:points_updated":
						setLastPointsUpdate(message.payload);
						onPointsUpdated?.(message.payload);
						// Invalidate pioneer queries to refresh UI
						queryClient.invalidateQueries({ queryKey: ["pioneer", "me"] });
						break;

					case "pioneer:tier_changed":
						setLastTierChange(message.payload);
						onTierChanged?.(message.payload);
						// Invalidate pioneer queries to refresh UI
						queryClient.invalidateQueries({ queryKey: ["pioneer", "me"] });
						queryClient.invalidateQueries({ queryKey: ["pioneer", "leaderboard"] });
						break;

					case "pioneer:leaderboard_update":
						onLeaderboardUpdate?.(message.payload);
						queryClient.invalidateQueries({ queryKey: ["pioneer", "leaderboard"] });
						break;

					case "pioneer:referral_converted":
						onReferralConverted?.(message.payload);
						queryClient.invalidateQueries({ queryKey: ["pioneer", "me"] });
						break;

					case "error":
						console.error("[PioneerSocket] Server error:", message.payload);
						onError?.(new Error(message.payload.message));
						break;

					default:
						console.warn("[PioneerSocket] Unknown message type:", message.type);
				}
			} catch (error) {
				console.error("[PioneerSocket] Failed to parse message:", error);
			}
		},
		[onPointsUpdated, onTierChanged, onLeaderboardUpdate, onReferralConverted, onError, queryClient],
	);

	// Connect to WebSocket
	const connect = useCallback(() => {
		// Need authenticated user
		if (!user) {
			console.log("[PioneerSocket] No authenticated user, skipping connection");
			return;
		}

		// Already connected
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		cleanup();

		// WebSocket URL - browser will automatically include cookies
		const wsUrl = getWebSocketUrl();

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("[PioneerSocket] Connected");
				setIsConnected(true);

				// Start ping interval
				pingIntervalRef.current = setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: "ping" }));
					}
				}, PING_INTERVAL);
			};

			ws.onmessage = handleMessage;

			ws.onclose = (event) => {
				console.log("[PioneerSocket] Disconnected:", event.code, event.reason);
				setIsConnected(false);
				cleanup();

				// Auto-reconnect if enabled and not intentionally closed
				if (autoReconnect && shouldReconnectRef.current && event.code !== 1000) {
					console.log(`[PioneerSocket] Reconnecting in ${reconnectDelay}ms...`);
					reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
				}
			};

			ws.onerror = (event) => {
				console.error("[PioneerSocket] Error:", event);
				onError?.(new Error("WebSocket connection error"));
			};
		} catch (error) {
			console.error("[PioneerSocket] Failed to connect:", error);
			onError?.(error instanceof Error ? error : new Error("Failed to connect"));
		}
	}, [user, cleanup, handleMessage, autoReconnect, reconnectDelay, onError]);

	// Manual reconnect
	const reconnect = useCallback(() => {
		shouldReconnectRef.current = true;
		if (wsRef.current) {
			wsRef.current.close();
		}
		connect();
	}, [connect]);

	// Manual disconnect
	const disconnect = useCallback(() => {
		shouldReconnectRef.current = false;
		cleanup();
		if (wsRef.current) {
			wsRef.current.close(1000, "Client disconnected");
			wsRef.current = null;
		}
		setIsConnected(false);
	}, [cleanup]);

	// Connect when user is authenticated
	useEffect(() => {
		if (user) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [user, connect, disconnect]);

	return {
		isConnected,
		lastPointsUpdate,
		lastTierChange,
		reconnect,
		disconnect,
	};
}

export default usePioneerSocket;
