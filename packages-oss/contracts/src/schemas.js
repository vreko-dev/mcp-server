import { z } from "zod";
export const DiffChangeSchema = z.object({
    added: z.boolean().optional().default(false),
    removed: z.boolean().optional().default(false),
    value: z.string(),
    count: z.number().optional(),
});
export const RiskScoreSchema = z.object({
    score: z.number().min(0).max(1),
    factors: z.array(z.string()),
    severity: z.enum(["low", "medium", "high", "critical"]),
});
export const SnapshotSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    meta: z.record(z.string(), z.any()).optional(),
    files: z.array(z.string()).optional(),
    fileContents: z.record(z.string(), z.string()).optional(),
});
// Adding missing types for SDK functionality
export const FileMetadataSchema = z.object({
    path: z.string(),
    size: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    hash: z.string().optional(),
    permissions: z.string().optional(),
});
export const SnapshotMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.number(),
    createdBy: z.string().optional(),
    tags: z.array(z.string()).optional(),
});
export const AnalyticsResponseSchema = z.object({
    metrics: z.record(z.string(), z.number()),
    trends: z.record(z.string(), z.array(z.number())),
    insights: z.array(z.string()),
    timestamp: z.number(),
    snapshotRecommendations: z
        .object({
        shouldCreateSnapshot: z.boolean(),
        reason: z.string(),
        urgency: z.enum(["low", "medium", "high", "critical"]),
        suggestedTiming: z.string(),
    })
        .optional(),
});
export const CreateSnapshotArgsSchema = z.object({
    trigger: z.string().default("manual"),
    risk: z.number().min(0).max(1).optional(),
    content: z.string().optional(),
    files: z.array(z.string()).optional(),
});
export const AnalyzeRiskArgsSchema = z.object({
    changes: z.array(DiffChangeSchema),
});
export const DepQuickArgsSchema = z.object({
    before: z.record(z.string(), z.any()),
    after: z.record(z.string(), z.any()),
});
export const CommonErrorSchema = z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
});
// MCP Configuration Schemas
export const RetrySchema = z.object({
    retries: z.number().int().min(0).default(2),
    factor: z.number().min(1).default(2),
    min: z.number().int().default(250),
    max: z.number().int().default(1500),
    jitter: z.boolean().default(true),
});
export const CircuitSchema = z.object({
    enabled: z.boolean().default(true),
    errorThresholdPercentage: z.number().int().min(1).max(100).default(50),
    volumeThreshold: z.number().int().min(1).default(10),
    timeoutMs: z.number().int().default(5000),
    resetMs: z.number().int().default(30000),
    rollingCountMs: z.number().int().default(60000),
    rollingCountBuckets: z.number().int().default(6),
});
export const McpSchema = z.object({
    timeoutMs: z.number().int().default(5000),
    maxConcurrent: z.number().int().min(1).default(4),
    retry: RetrySchema,
    circuit: CircuitSchema,
    batch: z.object({
        size: z.number().int().min(1).default(5),
        maxWaitMs: z.number().int().default(150),
    }),
});
export const WatcherSchema = z.object({
    debounceMs: z.number().int().default(120),
    awaitWriteFinish: z.object({
        stabilityThreshold: z.number().int().default(200),
        pollInterval: z.number().int().default(50),
    }),
    ignored: z.array(z.string()).default(["**/{node_modules,.git,.vscode,dist,.next,.nuxt,coverage}/**"]),
});
