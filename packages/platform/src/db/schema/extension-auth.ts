/**
 * Extension Authentication Schema
 *
 * Defines database tables for VS Code extension (and future CLI/MCP) authentication
 * using short-lived link tokens and long-lived refresh tokens with JWT access tokens.
 *
 * Tables:
 * - extension_link_tokens: One-time link tokens for initiating auth flow (5 min TTL)
 * - extension_sessions: Long-lived refresh tokens for token refresh (90 day TTL)
 *
 * Security:
 * - All tokens hashed with SHA-256 before storage
 * - Link tokens are single-use only
 * - Refresh tokens can be revoked
 * - Cascade delete on user deletion
 *
 * @package @snapback/platform
 */

import { createId as cuid } from "@paralleldrive/cuid2";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./postgres.js";

/**
 * Extension Link Tokens
 *
 * Short-lived one-time tokens for initiating the linking flow between
 * web console and extension. Valid for 5 minutes, single-use only.
 *
 * Flow:
 * 1. User clicks "Connect SnapBack Account" in VS Code
 * 2. Browser opens /connect/vscode
 * 3. Web calls POST /api/auth/extension/link-token
 * 4. Browser redirects to vscode://snapback.snapback/auth?token={linkToken}
 * 5. Extension calls POST /api/auth/extension/exchange
 * 6. Token marked as used=true (enforced with transaction)
 */
export const extensionLinkTokens = pgTable(
	"extension_link_tokens",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		tokenHash: text("token_hash").notNull(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		workspaceId: varchar("workspace_id", { length: 255 }), // References organization.id (nullable)
		client: text("client").notNull(), // 'vscode' | 'cli' | 'mcp'
		used: boolean("used").notNull().default(false),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		// Partial index for fast active token lookup (used=false, not expired)
		tokenHashIdx: index("idx_extension_link_tokens_hash").on(table.tokenHash),
		// Index for cleanup jobs
		expiryIdx: index("idx_extension_link_tokens_expiry").on(table.expiresAt),
	}),
);

/**
 * Extension Sessions
 *
 * Long-lived refresh tokens for extension authentication. Each session
 * represents a linked extension instance. Valid for 90 days.
 *
 * Flow:
 * 1. Created during token exchange
 * 2. Used to refresh expired JWT access tokens
 * 3. Can be revoked from web dashboard (Phase 2)
 * 4. Auto-expires after 90 days of inactivity
 */
export const extensionSessions = pgTable(
	"extension_sessions",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		workspaceId: varchar("workspace_id", { length: 255 }), // References organization.id (nullable)
		client: text("client").notNull(), // 'vscode' | 'cli' | 'mcp'
		refreshTokenHash: text("refresh_token_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		metadata: jsonb("metadata").$type<{
			extensionVersion?: string;
			vscodeVersion?: string;
			platform?: string;
			hostname?: string;
		}>(),
	},
	(table) => ({
		// Unique index for fast refresh token lookup (only non-revoked)
		refreshHashIdx: index("idx_extension_sessions_refresh_hash").on(table.refreshTokenHash),
		// Index for user session queries (Phase 2 UI)
		userIdx: index("idx_extension_sessions_user").on(table.userId),
		// Index for active sessions
		activeIdx: index("idx_extension_sessions_active").on(table.userId, table.revokedAt),
	}),
);

/**
 * TypeScript Types
 */
export type ExtensionLinkToken = typeof extensionLinkTokens.$inferSelect;
export type NewExtensionLinkToken = typeof extensionLinkTokens.$inferInsert;

export type ExtensionSession = typeof extensionSessions.$inferSelect;
export type NewExtensionSession = typeof extensionSessions.$inferInsert;

/**
 * Client Type Enum
 * MVP: Only 'vscode' supported
 * Phase 2: Add 'cli' and 'mcp'
 */
export type ExtensionClient = "vscode" | "cli" | "mcp";
