import { z } from "zod";
import {
	ProtectedFileSchema,
	ProtectionCheckResultSchema,
	ProtectionConfigSchema,
	ProtectionLevelSchema,
} from "../types/protection";

/**
 * API Contracts for Protection Operations
 * Canonical source for all protection-related API endpoints
 */

// ===== Get Protection Level =====

export const GetProtectionLevelRequestSchema = z.object({
	filePath: z.string(),
});

export type GetProtectionLevelRequest = z.infer<typeof GetProtectionLevelRequestSchema>;

export const GetProtectionLevelResponseSchema = z.object({
	filePath: z.string(),
	isProtected: z.boolean(),
	level: ProtectionLevelSchema.nullable(),
});

export type GetProtectionLevelResponse = z.infer<typeof GetProtectionLevelResponseSchema>;

// ===== Set Protection Level =====

export const SetProtectionLevelRequestSchema = z.object({
	filePath: z.string(),
	level: ProtectionLevelSchema,
	reason: z.string().optional(),
});

export type SetProtectionLevelRequest = z.infer<typeof SetProtectionLevelRequestSchema>;

export const SetProtectionLevelResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		filePath: z.string(),
		level: ProtectionLevelSchema,
		timestamp: z.number(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type SetProtectionLevelResponse = z.infer<typeof SetProtectionLevelResponseSchema>;

// ===== Remove Protection =====

export const RemoveProtectionRequestSchema = z.object({
	filePath: z.string(),
});

export type RemoveProtectionRequest = z.infer<typeof RemoveProtectionRequestSchema>;

export const RemoveProtectionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		filePath: z.string(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type RemoveProtectionResponse = z.infer<typeof RemoveProtectionResponseSchema>;

// ===== List Protected Files =====

export const ListProtectedFilesRequestSchema = z.object({
	workspaceId: z.string().optional(),
	level: ProtectionLevelSchema.optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export type ListProtectedFilesRequest = z.infer<typeof ListProtectedFilesRequestSchema>;

export const ListProtectedFilesResponseSchema = z.object({
	files: z.array(ProtectedFileSchema),
	total: z.number(),
	hasMore: z.boolean(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export type ListProtectedFilesResponse = z.infer<typeof ListProtectedFilesResponseSchema>;

// ===== Check Protection =====

export const CheckProtectionRequestSchema = z.object({
	filePath: z.string(),
	operation: z.enum(["read", "write", "delete"]),
});

export type CheckProtectionRequest = z.infer<typeof CheckProtectionRequestSchema>;

export const CheckProtectionResponseSchema = z.object({
	result: ProtectionCheckResultSchema,
});

export type CheckProtectionResponse = z.infer<typeof CheckProtectionResponseSchema>;

// ===== Get Protection Config =====

export const GetProtectionConfigRequestSchema = z.object({
	workspaceId: z.string().optional(),
});

export type GetProtectionConfigRequest = z.infer<typeof GetProtectionConfigRequestSchema>;

export const GetProtectionConfigResponseSchema = z.object({
	config: ProtectionConfigSchema,
});

export type GetProtectionConfigResponse = z.infer<typeof GetProtectionConfigResponseSchema>;

// ===== Update Protection Config =====

export const UpdateProtectionConfigRequestSchema = z.object({
	workspaceId: z.string().optional(),
	config: ProtectionConfigSchema.partial(),
});

export type UpdateProtectionConfigRequest = z.infer<typeof UpdateProtectionConfigRequestSchema>;

export const UpdateProtectionConfigResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		config: ProtectionConfigSchema,
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type UpdateProtectionConfigResponse = z.infer<typeof UpdateProtectionConfigResponseSchema>;

// ===== Protection Event Payloads =====

export const ProtectionChangedPayloadSchema = z.object({
	filePath: z.string(),
	level: ProtectionLevelSchema,
	timestamp: z.number(),
	reason: z.string().optional(),
});

export type ProtectionChangedPayload = z.infer<typeof ProtectionChangedPayloadSchema>;

export const ProtectionViolationPayloadSchema = z.object({
	filePath: z.string(),
	level: ProtectionLevelSchema,
	operation: z.enum(["read", "write", "delete"]),
	timestamp: z.number(),
	allowed: z.boolean(),
	reason: z.string().optional(),
});

export type ProtectionViolationPayload = z.infer<typeof ProtectionViolationPayloadSchema>;
