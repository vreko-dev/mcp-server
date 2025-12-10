import { z } from "zod";
import type { SessionManifestV1 } from "../session";

/**
 * API Contracts for Session Operations
 * Canonical source for all session-related API endpoints
 */

// ===== Create Session =====

export const CreateSessionRequestSchema = z.object({
	name: z.string().optional(),
	meta: z.record(z.string(), z.any()).optional(),
	workspaceId: z.string().optional(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		session: z.custom<SessionManifestV1>(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// ===== Finalize Session =====

export const FinalizeSessionRequestSchema = z.object({
	sessionId: z.string(),
	reason: z.string().optional(),
	fileCount: z.number().optional(),
});

export type FinalizeSessionRequest = z.infer<typeof FinalizeSessionRequestSchema>;

export const FinalizeSessionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		sessionId: z.string(),
		finalizedAt: z.number(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type FinalizeSessionResponse = z.infer<typeof FinalizeSessionResponseSchema>;

// ===== List Sessions =====

export const ListSessionsRequestSchema = z.object({
	limit: z.number().optional(),
	offset: z.number().optional(),
	workspaceId: z.string().optional(),
	active: z.boolean().optional(),
	sortBy: z.enum(["startTime", "endTime", "name"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type ListSessionsRequest = z.infer<typeof ListSessionsRequestSchema>;

export const ListSessionsResponseSchema = z.object({
	sessions: z.array(z.custom<SessionManifestV1>()),
	total: z.number(),
	hasMore: z.boolean(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;

// ===== Get Session =====

export const GetSessionRequestSchema = z.object({
	sessionId: z.string(),
});

export type GetSessionRequest = z.infer<typeof GetSessionRequestSchema>;

export const GetSessionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		session: z.custom<SessionManifestV1>(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;

// ===== Update Session =====

export const UpdateSessionRequestSchema = z.object({
	sessionId: z.string(),
	name: z.string().optional(),
	meta: z.record(z.string(), z.any()).optional(),
});

export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

export const UpdateSessionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		session: z.custom<SessionManifestV1>(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type UpdateSessionResponse = z.infer<typeof UpdateSessionResponseSchema>;

// ===== Delete Session =====

export const DeleteSessionRequestSchema = z.object({
	sessionId: z.string(),
});

export type DeleteSessionRequest = z.infer<typeof DeleteSessionRequestSchema>;

export const DeleteSessionResponseSchema = z.union([
	z.object({
		success: z.literal(true),
		deletedId: z.string(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
	}),
]);

export type DeleteSessionResponse = z.infer<typeof DeleteSessionResponseSchema>;

// ===== Session Event Payloads =====

export const SessionFinalizedPayloadSchema = z.object({
	sessionId: z.string(),
	fileCount: z.number(),
	reason: z.string(),
	timestamp: z.number(),
});

export type SessionFinalizedPayload = z.infer<typeof SessionFinalizedPayloadSchema>;
