import { z } from "zod";
/**
 * Base Snapshot interface
 * This is the core data structure for snapshots across all SnapBack clients
 */
export const SnapshotSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    meta: z.record(z.string(), z.any()).optional(),
    files: z.array(z.string()).optional(),
    fileContents: z.record(z.string(), z.string()).optional(),
});
/**
 * File state at a specific snapshot
 * Used for deduplication and change tracking
 */
export const FileStateSchema = z.object({
    path: z.string(),
    content: z.string(),
    hash: z.string(),
});
/**
 * Complete snapshot state for deduplication
 */
export const SnapshotStateSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    files: z.array(FileStateSchema),
});
/**
 * Rich Snapshot with UI metadata
 * Used by VS Code extension and other clients with UI
 */
export const RichSnapshotSchema = SnapshotSchema.extend({
    name: z.string(),
    fileStates: z.array(FileStateSchema).optional(),
    isProtected: z.boolean(),
    icon: z.string().optional(),
    iconColor: z.string().optional(),
});
/**
 * Minimal snapshot for deletion operations
 */
export const MinimalSnapshotSchema = z.object({
    id: z.string(),
    name: z.string(),
    timestamp: z.number(),
    isProtected: z.boolean(),
});
/**
 * File input for snapshot creation
 */
export const FileInputSchema = z.object({
    path: z.string(),
    content: z.string(),
    action: z.enum(["add", "modify", "delete"]),
});
/**
 * Snapshot creation options
 */
export const CreateSnapshotOptionsSchema = z.object({
    description: z.string().optional(),
    protected: z.boolean().optional(),
});
/**
 * Snapshot filters for querying
 */
export const SnapshotFiltersSchema = z.object({
    filePath: z.string().optional(),
    before: z.date().optional(),
    after: z.date().optional(),
    protected: z.boolean().optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
});
/**
 * Snapshot restore result
 */
export const SnapshotRestoreResultSchema = z.object({
    success: z.boolean(),
    restoredFiles: z.array(z.string()),
    errors: z.array(z.string()).optional(),
});
/**
 * Snapshot manager configuration
 */
export const SnapshotManagerConfigSchema = z.object({
    enableDeduplication: z.boolean().default(true),
    namingStrategy: z.enum(["git", "semantic", "timestamp", "custom"]).default("semantic"),
    autoProtect: z.boolean().default(false),
    maxSnapshots: z.number().int().positive().optional(),
});
/**
 * Risk score for files and checkpoints
 */
export const RiskScoreSchema = z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.object({
        type: z.string(),
        weight: z.number().min(0).max(1),
        score: z.number().min(0).max(100),
    })),
});
/**
 * File metadata for analytics and tracking
 */
export const FileMetadataSchema = z.object({
    id: z.string(),
    path: z.string(),
    hash: z.string().optional(),
    size: z.number().optional(),
    language: z.string().optional(),
    risk: RiskScoreSchema.optional(),
    lastModified: z.number().optional(),
    createdAt: z.number().optional(),
});
/**
 * Snapshot metadata for analytics
 */
export const SnapshotMetadataSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    fileCount: z.number(),
    totalSize: z.number().optional(),
    riskScore: RiskScoreSchema.optional(),
    tags: z.array(z.string()).optional(),
});
/**
 * Analytics response structure
 */
export const AnalyticsResponseSchema = z.object({
    workspaceId: z.string(),
    period: z.object({
        start: z.number(),
        end: z.number(),
    }),
    risk: RiskScoreSchema,
    fileStats: z.object({
        total: z.number(),
        byLanguage: z.record(z.string(), z.number()),
        byRisk: z.record(z.string(), z.number()),
    }),
    snapshotStats: z.object({
        total: z.number(),
        frequency: z.number(),
        averageSize: z.number().optional(),
    }),
    snapshotRecommendations: z.object({
        shouldCreateSnapshot: z.boolean(),
        reason: z.string(),
        urgency: z.enum(["low", "medium", "high", "critical"]),
        suggestedTiming: z.string(),
    }),
    trends: z.object({
        risk: z.array(z.object({
            timestamp: z.number(),
            score: z.number(),
        })),
        activity: z.array(z.object({
            timestamp: z.number(),
            count: z.number(),
        })),
    }),
});
/**
 * Factory function to create a snapshot storage instance
 * This allows public packages to create storage instances without
 * directly depending on the private @snapback/storage package.
 *
 * @param basePath The base path for storage operations
 * @returns A SnapshotStorage instance
 */
export async function createSnapshotStorage(basePath) {
    // Dynamically import the storage package to avoid circular dependencies
    // The import path is resolved at runtime after both packages are built
    try {
        const { StorageBrokerAdapter } = await import("@snapback/sdk/storage");
        // Use the standard workspace database path
        const storage = new StorageBrokerAdapter(`${basePath}/.snapback/snapback.db`);
        await storage.initialize();
        return {
            create: async (data) => {
                const snapshot = {
                    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    timestamp: Date.now(),
                    meta: {
                        ...data,
                        protected: data.protected || false,
                        description: data.description || "",
                    },
                };
                await storage.save(snapshot);
                return snapshot;
            },
            retrieve: async (id) => {
                return await storage.get(id);
            },
            list: async () => {
                return await storage.list();
            },
            restore: async (id, _targetPath, options) => {
                // Note: Full restore implementation requires file system operations
                // This is a simplified version - real implementation in storage package
                const snapshot = await storage.get(id);
                if (!snapshot) {
                    return {
                        success: false,
                        restoredFiles: [],
                        errors: [`Snapshot ${id} not found`],
                    };
                }
                if (options?.dryRun) {
                    return {
                        success: true,
                        restoredFiles: snapshot.files || [],
                        errors: [],
                    };
                }
                return {
                    success: true,
                    restoredFiles: snapshot.files || [],
                    errors: [],
                };
            },
        };
    }
    catch (error) {
        throw new Error(`Failed to initialize snapshot storage: ${error instanceof Error ? error.message : String(error)}. ` +
            "Ensure @snapback/sdk is installed and storage path is writable.");
    }
}
