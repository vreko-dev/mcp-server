import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { boolean, integer, json, pgEnum, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

// Session severity enum (different from error log severity)
export const sessionSeverityEnum = pgEnum("session_severity", ["low", "medium", "high", "critical"]);

// Extension sessions table - matching the definition in postgres.ts
export const extensionSessions = pgTable("extension_sessions", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => cuid()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }), // Nullable until API key system is integrated

	// Session timing
	sessionStart: timestamp("session_start").defaultNow().notNull(),
	sessionEnd: timestamp("session_end"),

	// Extension context (privacy-safe)
	extensionVersion: text("extension_version").notNull(),
	vscodeVersion: text("vscode_version").notNull(),
	platform: text("platform").notNull(), // 'darwin', 'win32', 'linux'

	// Activity metrics
	requestsCount: integer("requests_count").default(0).notNull(),

	// Workspace info (hashed for privacy)
	workspaceHash: text("workspace_hash"),

	// Denormalized session summary fields for performance
	highestSeverity: sessionSeverityEnum("highest_severity"),
	aiPresent: boolean("ai_present").default(false),
	issuesByType: json("issues_by_type").$type<Record<string, number>>().default({}),
	bytesSaved: integer("bytes_saved").default(0),

	// AI detection results (v1 schema)
	aiAssistLevel: text("ai_assist_level").notNull().default("unknown"), // 'none' | 'light' | 'medium' | 'heavy' | 'unknown'
	aiConfidenceScore: real("ai_confidence_score").default(0).notNull(),
	aiProvider: text("ai_provider").notNull().default("none"), // 'cursor' | 'claude' | 'unknown' | 'none'
	aiMetadata: json("ai_metadata").$type<{
		reasoning: string;
		metrics: { largeInsertCount: number; totalChars: number; totalLines: number };
	} | null>(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extensionSessionsRelations = relations(extensionSessions, ({ one }) => ({
	user: one(user, {
		fields: [extensionSessions.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [extensionSessions.apiKeyId],
		references: [apiKeys.id],
	}),
}));
