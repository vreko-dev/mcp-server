import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apiKeys, user } from "../postgres";

/**
 * Snapshots - Privacy-first metadata storage
 *
 * PRIVACY PRINCIPLE: Store only metadata by default.
 * File content storage requires explicit user opt-in via cloudBackup permission.
 */
export const snapshots = pgTable("snapshots", {
	id: uuid("id").primaryKey().defaultRandom(),

	// Ownership
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id")
		.notNull()
		.references(() => apiKeys.id, { onDelete: "cascade" }),

	// Snapshot metadata (always stored)
	name: text("name"), // Optional user-provided name
	description: text("description"), // Optional description
	trigger: text("trigger").notNull(), // "manual", "auto", "pre_command", "risk_detection"

	// File metadata (no actual content by default)
	fileCount: integer("file_count").notNull().default(0),
	totalSizeBytes: integer("total_size_bytes").notNull().default(0),
	fileHashes: jsonb("file_hashes").$type<string[]>().default([]), // SHA-256 hashes

	// Git context (metadata only)
	gitBranch: text("git_branch"),
	gitCommit: text("git_commit"),
	gitDirty: boolean("git_dirty").default(false),

	// Risk analysis metadata
	riskScore: integer("risk_score"), // 0-100
	riskFactors: jsonb("risk_factors")
		.$type<
			{
				type: string;
				severity: "low" | "medium" | "high";
				message: string;
			}[]
		>()
		.default([]),

	// Project context
	projectPath: text("project_path"),
	workspaceId: text("workspace_id"), // For future team features

	// Cloud backup (only if user opted in)
	cloudBackupEnabled: boolean("cloud_backup_enabled").default(false),
	cloudBackupUrl: text("cloud_backup_url"), // S3/storage URL if backed up

	// Encryption fields for server-side KMS encryption
	// MVP Note: Server-side KMS encryption with Row Level Security (RLS) to isolate rows
	// Post-MVP: Will add client-side E2EE with user-controlled keys
	encryptionKeyId: text("encryption_key_id"), // KMS key identifier
	encryptedDataKey: text("encrypted_data_key"), // Data encryption key encrypted with KMS key
	encryptionAlgorithm: text("encryption_algorithm").default("AES-256-GCM"), // Encryption algorithm used

	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"), // For automatic cleanup

	// Metadata for additional context
	metadata: jsonb("metadata")
		.$type<{
			clientVersion?: string;
			ideVersion?: string;
			platform?: string;
			tags?: string[];
		}>()
		.default({}),
});

/**
 * Snapshot Files - Individual file metadata
 * Only stores file paths and hashes, NOT content (unless cloud backup enabled)
 */
export const snapshotFiles = pgTable("snapshot_files", {
	id: uuid("id").primaryKey().defaultRandom(),

	snapshotId: uuid("snapshot_id")
		.notNull()
		.references(() => snapshots.id, { onDelete: "cascade" }),

	// File metadata
	filePath: text("file_path").notNull(), // Relative path in project
	fileHash: text("file_hash").notNull(), // SHA-256 hash
	fileSizeBytes: integer("file_size_bytes").notNull(),

	// Change detection
	changeType: text("change_type"), // "added", "modified", "deleted"
	linesChanged: integer("lines_changed"),

	// Risk flags
	containsSecrets: boolean("contains_secrets").default(false),
	riskLevel: text("risk_level"), // "low", "medium", "high"

	// Cloud backup (only if snapshot has cloudBackupEnabled)
	cloudBackupUrl: text("cloud_backup_url"), // Individual file backup URL

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const snapshotsRelations = relations(snapshots, ({ one, many }) => ({
	user: one(user, {
		fields: [snapshots.userId],
		references: [user.id],
	}),
	apiKey: one(apiKeys, {
		fields: [snapshots.apiKeyId],
		references: [apiKeys.id],
	}),
	files: many(snapshotFiles),
}));

export const snapshotFilesRelations = relations(snapshotFiles, ({ one }) => ({
	snapshot: one(snapshots, {
		fields: [snapshotFiles.snapshotId],
		references: [snapshots.id],
	}),
}));

// Type exports
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type SnapshotFile = typeof snapshotFiles.$inferSelect;
export type NewSnapshotFile = typeof snapshotFiles.$inferInsert;
