import { z } from "zod";
import { SnapshotFiltersSchema, SnapshotRestoreResultSchema, SnapshotSchema } from "../types/snapshot";

/**
 * API Contracts for Snapshot Operations
 * Canonical source for all snapshot-related API endpoints
 */

// ===== Create Snapshot =====

export const CreateSnapshotRequestSchema = z.object({
	filePath: z.string().optional(),
	files: z.array(z.string()).optional(),
	reason: z.string().optional(),
	meta: z.record(z.string(), z.any()).optional(),
	sessionId: z.string().optional(),
});

export type CreateSnapshotRequest = z.infer<typeof CreateSnapshotRequestSchema>;

export const CreateSnapshotResponseSchema = z.object({
	id: z.string(),
	timestamp: z.number(),
	meta: z.object({
		source: z.string(),
		reason: z.string().optional(),
		sessionId: z.string().optional(),
	}),
});

export type CreateSnapshotResponse = z.infer<typeof CreateSnapshotResponseSchema>;

// ===== List Snapshots =====

export const ListSnapshotsRequestSchema = z.object({
	filters: SnapshotFiltersSchema.optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
	sortBy: z.enum(["timestamp", "id"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type ListSnapshotsRequest = z.infer<typeof ListSnapshotsRequestSchema>;

export const ListSnapshotsResponseSchema = z.object({
	snapshots: z.array(SnapshotSchema),
	total: z.number(),
	hasMore: z.boolean(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export type ListSnapshotsResponse = z.infer<typeof ListSnapshotsResponseSchema>;

// ===== Get Snapshot =====

export const GetSnapshotRequestSchema = z.object({
	id: z.string(),
	includeFiles: z.boolean().optional(),
});

export type GetSnapshotRequest = z.infer<typeof GetSnapshotRequestSchema>;

export const GetSnapshotResponseSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		snapshot: SnapshotSchema,
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type GetSnapshotResponse = z.infer<typeof GetSnapshotResponseSchema>;

// ===== Update Snapshot =====

export const UpdateSnapshotRequestSchema = z.object({
	id: z.string(),
	meta: z.record(z.string(), z.any()).optional(),
});

export type UpdateSnapshotRequest = z.infer<typeof UpdateSnapshotRequestSchema>;

export const UpdateSnapshotResponseSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		snapshot: SnapshotSchema,
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type UpdateSnapshotResponse = z.infer<typeof UpdateSnapshotResponseSchema>;

// ===== Delete Snapshot =====

export const DeleteSnapshotRequestSchema = z.object({
	id: z.string(),
});

export type DeleteSnapshotRequest = z.infer<typeof DeleteSnapshotRequestSchema>;

export const DeleteSnapshotResponseSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		deletedId: z.string(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type DeleteSnapshotResponse = z.infer<typeof DeleteSnapshotResponseSchema>;

// ===== Restore Snapshot =====

export const RestoreSnapshotRequestSchema = z.object({
	id: z.string(),
	targetPath: z.string().optional(),
	overwrite: z.boolean().optional(),
});

export type RestoreSnapshotRequest = z.infer<typeof RestoreSnapshotRequestSchema>;

export const RestoreSnapshotResponseSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		result: SnapshotRestoreResultSchema,
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type RestoreSnapshotResponse = z.infer<typeof RestoreSnapshotResponseSchema>;

// ===== Snapshot Event Payloads =====

export const SnapshotCreatedPayloadSchema = z.object({
	id: z.string(),
	filePath: z.string().optional(),
	timestamp: z.number(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SnapshotCreatedPayload = z.infer<typeof SnapshotCreatedPayloadSchema>;
