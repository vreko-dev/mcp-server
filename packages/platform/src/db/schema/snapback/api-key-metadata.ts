import { relations } from "drizzle-orm";
import { boolean, inet, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

// API key metadata table - extends Better Auth api_key table
export const apiKeyMetadata = pgTable("api_key_metadata", {
	id: uuid("id").primaryKey().defaultRandom(),
	apiKeyId: text("api_key_id")
		.notNull()
		.unique()
		.references(() => apiKeys.id), // References Better Auth api_key.id

	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Key details
	name: text("name").notNull(), // "VS Code - Work Laptop"
	environment: text("environment").default("production"), // "development" | "production"

	// Permissions/scopes
	scopes: jsonb("scopes").default(JSON.stringify(["code:analyze", "code:refactor", "code:search"])),

	// Usage limits per key (optional override)
	rateLimitPerMinute: integer("rate_limit_per_minute"),
	rateLimitPerHour: integer("rate_limit_per_hour"),
	dailyRequestLimit: integer("daily_request_limit"),

	// Tracking
	lastUsedAt: timestamp("last_used_at"),
	lastUsedIp: inet("last_used_ip"),
	lastUsedClient: text("last_used_client"), // "vscode-1.2.3"
	totalRequests: integer("total_requests").default(0),

	// Security
	isActive: boolean("is_active").default(true),
	expiresAt: timestamp("expires_at"),
	signingSecret: text("signing_secret").notNull(), // HMAC-SHA256 signing secret (256-bit)

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const apiKeyMetadataRelations = relations(apiKeyMetadata, ({ one }) => ({
	user: one(user, {
		fields: [apiKeyMetadata.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [apiKeyMetadata.apiKeyId],
		references: [apiKeys.id],
	}),
}));
