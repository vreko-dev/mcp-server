/**
 * Pioneer Program WebSocket Types
 *
 * Canonical location: packages/contracts/src/pioneer/ws-types.ts
 * Shared types for real-time sync between Extension, Web, and API
 *
 * Based on: apps/vscode/pioneer_websocket.md RFC
 */

// ─────────────────────────────────────────────────────────────────────────
// Base Types
// ─────────────────────────────────────────────────────────────────────────

export type PioneerTier = "seedling" | "grower" | "cultivator" | "guardian";

/** @deprecated Use PioneerTier instead to avoid conflict with subscription Tier */
export type Tier = PioneerTier;

// ─────────────────────────────────────────────────────────────────────────
// Server → Client Messages
// ─────────────────────────────────────────────────────────────────────────

export interface ConnectedMessage {
	type: "connected";
	payload: {
		userId: string;
		room: string;
		timestamp: number;
	};
}

export interface PongMessage {
	type: "pong";
	payload: {
		timestamp: number;
	};
}

export interface PointsUpdatedMessage {
	type: "pioneer:points_updated";
	payload: {
		userId: string;
		points: number;
		delta: number;
		actionType: string;
	};
}

export interface TierChangedMessage {
	type: "pioneer:tier_changed";
	payload: {
		userId: string;
		from: PioneerTier;
		to: PioneerTier;
		points: number;
		benefits: string[];
	};
}

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

export interface ReferralConvertedMessage {
	type: "pioneer:referral_converted";
	payload: {
		referrerId: string;
		referralUsername: string; // Obfuscated
		pointsEarned: number;
		totalReferrals: number;
	};
}

export interface ErrorMessage {
	type: "error";
	payload: {
		code: string;
		message: string;
	};
}

export type ServerToClientMessage =
	| ConnectedMessage
	| PongMessage
	| PointsUpdatedMessage
	| TierChangedMessage
	| LeaderboardUpdateMessage
	| ReferralConvertedMessage
	| ErrorMessage;

// ─────────────────────────────────────────────────────────────────────────
// Client → Server Messages
// ─────────────────────────────────────────────────────────────────────────

export interface PingMessage {
	type: "ping";
}

export interface SubscribeMessage {
	type: "subscribe";
	payload: {
		channel: "leaderboard" | "global_activity";
	};
}

export interface UnsubscribeMessage {
	type: "unsubscribe";
	payload: {
		channel: string;
	};
}

export type ClientToServerMessage = PingMessage | SubscribeMessage | UnsubscribeMessage;

// ─────────────────────────────────────────────────────────────────────────
// Union Types
// ─────────────────────────────────────────────────────────────────────────

export type PioneerWSMessage = ServerToClientMessage | ClientToServerMessage;

// ─────────────────────────────────────────────────────────────────────────
// Event Types (for internal broadcasting)
// ─────────────────────────────────────────────────────────────────────────

export type PioneerEventType =
	| "pioneer:points_updated"
	| "pioneer:tier_changed"
	| "pioneer:leaderboard_update"
	| "pioneer:referral_converted";

export interface PioneerWSEvent {
	type: PioneerEventType;
	payload:
		| PointsUpdatedMessage["payload"]
		| TierChangedMessage["payload"]
		| LeaderboardUpdateMessage["payload"]
		| ReferralConvertedMessage["payload"];
}

// ─────────────────────────────────────────────────────────────────────────
// WebSocket Close Codes
// ─────────────────────────────────────────────────────────────────────────

export const WS_CLOSE_CODES = {
	NORMAL: 1000,
	UNAUTHORIZED: 4001,
	RATE_LIMITED: 4002,
	INVALID_MESSAGE: 4003,
} as const;

export type WSCloseCode = (typeof WS_CLOSE_CODES)[keyof typeof WS_CLOSE_CODES];
