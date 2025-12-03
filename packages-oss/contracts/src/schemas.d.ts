import { z } from "zod";
export declare const DiffChangeSchema: z.ZodObject<{
    added: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    removed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    value: z.ZodString;
    count: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type DiffChange = z.infer<typeof DiffChangeSchema>;
export declare const RiskScoreSchema: z.ZodObject<{
    score: z.ZodNumber;
    factors: z.ZodArray<z.ZodString>;
    severity: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        critical: "critical";
    }>;
}, z.core.$strip>;
export type RiskScore = z.infer<typeof RiskScoreSchema>;
export declare const SnapshotSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
    fileContents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export declare const FileMetadataSchema: z.ZodObject<{
    path: z.ZodString;
    size: z.ZodNumber;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    hash: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export declare const SnapshotMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    createdBy: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type SnapshotMetadata = z.infer<typeof SnapshotMetadataSchema>;
export declare const AnalyticsResponseSchema: z.ZodObject<{
    metrics: z.ZodRecord<z.ZodString, z.ZodNumber>;
    trends: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
    insights: z.ZodArray<z.ZodString>;
    timestamp: z.ZodNumber;
    snapshotRecommendations: z.ZodOptional<z.ZodObject<{
        shouldCreateSnapshot: z.ZodBoolean;
        reason: z.ZodString;
        urgency: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
            critical: "critical";
        }>;
        suggestedTiming: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
export declare const CreateSnapshotArgsSchema: z.ZodObject<{
    trigger: z.ZodDefault<z.ZodString>;
    risk: z.ZodOptional<z.ZodNumber>;
    content: z.ZodOptional<z.ZodString>;
    files: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const AnalyzeRiskArgsSchema: z.ZodObject<{
    changes: z.ZodArray<z.ZodObject<{
        added: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        removed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        value: z.ZodString;
        count: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const DepQuickArgsSchema: z.ZodObject<{
    before: z.ZodRecord<z.ZodString, z.ZodAny>;
    after: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.core.$strip>;
export declare const CommonErrorSchema: z.ZodObject<{
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const RetrySchema: z.ZodObject<{
    retries: z.ZodDefault<z.ZodNumber>;
    factor: z.ZodDefault<z.ZodNumber>;
    min: z.ZodDefault<z.ZodNumber>;
    max: z.ZodDefault<z.ZodNumber>;
    jitter: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const CircuitSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    errorThresholdPercentage: z.ZodDefault<z.ZodNumber>;
    volumeThreshold: z.ZodDefault<z.ZodNumber>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    resetMs: z.ZodDefault<z.ZodNumber>;
    rollingCountMs: z.ZodDefault<z.ZodNumber>;
    rollingCountBuckets: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const McpSchema: z.ZodObject<{
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    maxConcurrent: z.ZodDefault<z.ZodNumber>;
    retry: z.ZodObject<{
        retries: z.ZodDefault<z.ZodNumber>;
        factor: z.ZodDefault<z.ZodNumber>;
        min: z.ZodDefault<z.ZodNumber>;
        max: z.ZodDefault<z.ZodNumber>;
        jitter: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    circuit: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        errorThresholdPercentage: z.ZodDefault<z.ZodNumber>;
        volumeThreshold: z.ZodDefault<z.ZodNumber>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        resetMs: z.ZodDefault<z.ZodNumber>;
        rollingCountMs: z.ZodDefault<z.ZodNumber>;
        rollingCountBuckets: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    batch: z.ZodObject<{
        size: z.ZodDefault<z.ZodNumber>;
        maxWaitMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const WatcherSchema: z.ZodObject<{
    debounceMs: z.ZodDefault<z.ZodNumber>;
    awaitWriteFinish: z.ZodObject<{
        stabilityThreshold: z.ZodDefault<z.ZodNumber>;
        pollInterval: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    ignored: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
