import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { bigint, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres.js";

// Enums
export const severityLevelEnum = pgEnum("severity_level", ["debug", "info", "warning", "error", "critical"]);

// Error logs (partitioned by month)
export const errorLogs = pgTable("error_logs", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	// Error identification
	errorId: text("error_id")
		.notNull()
		.$defaultFn(() => cuid()),
	errorCode: text("error_code"),
	errorType: text("error_type"), // "APIError", "ValidationError", etc.

	// Context
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id"),
	requestId: text("request_id"),

	// Error details
	severity: severityLevelEnum("severity").notNull().default("error"),
	message: text("message").notNull(),
	stackTrace: text("stack_trace"),

	// Request context
	endpoint: text("endpoint"),
	method: text("method"),
	requestBody: jsonb("request_body"),

	// Environment
	serviceName: text("service_name").default("api"),
	environment: text("environment").default("production"),
	version: text("version"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

// Partition tables for error_logs
export const errorLogs202510 = pgTable("error_logs_2025_10", {
	id: bigint("id", { mode: "number" }).primaryKey(),

	// Error identification
	errorId: text("error_id")
		.notNull()
		.$defaultFn(() => cuid()),
	errorCode: text("error_code"),
	errorType: text("error_type"), // "APIError", "ValidationError", etc.

	// Context
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id"),
	requestId: text("request_id"),

	// Error details
	severity: severityLevelEnum("severity").notNull().default("error"),
	message: text("message").notNull(),
	stackTrace: text("stack_trace"),

	// Request context
	endpoint: text("endpoint"),
	method: text("method"),
	requestBody: jsonb("request_body"),

	// Environment
	serviceName: text("service_name").default("api"),
	environment: text("environment").default("production"),
	version: text("version"),

	// Metadata
	metadata: jsonb("metadata").default(JSON.stringify({})),

	createdAt: timestamp("created_at").defaultNow(),
});

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
	user: one(user, {
		fields: [errorLogs.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [errorLogs.apiKeyId],
		references: [apiKeys.id],
	}),
}));

export type ErrorLog = typeof errorLogs.$inferSelect;
export type NewErrorLog = typeof errorLogs.$inferInsert;
