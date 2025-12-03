import { z } from "zod";
/**
 * Base Snapshot interface
 * This is the core data structure for snapshots across all SnapBack clients
 */
export declare const SnapshotSchema: z.ZodObject<
	{
		id: z.ZodString;
		timestamp: z.ZodNumber;
		meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
		files: z.ZodOptional<z.ZodArray<z.ZodString>>;
		fileContents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
	},
	z.core.$strip
>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
/**
 * File state at a specific snapshot
 * Used for deduplication and change tracking
 */
export declare const FileStateSchema: z.ZodObject<
	{
		path: z.ZodString;
		content: z.ZodString;
		hash: z.ZodString;
	},
	z.core.$strip
>;
export type FileState = z.infer<typeof FileStateSchema>;
/**
 * Complete snapshot state for deduplication
 */
export declare const SnapshotStateSchema: z.ZodObject<
	{
		id: z.ZodString;
		timestamp: z.ZodNumber;
		files: z.ZodArray<
			z.ZodObject<
				{
					path: z.ZodString;
					content: z.ZodString;
					hash: z.ZodString;
				},
				z.core.$strip
			>
		>;
	},
	z.core.$strip
>;
export type SnapshotState = z.infer<typeof SnapshotStateSchema>;
/**
 * Rich Snapshot with UI metadata
 * Used by VS Code extension and other clients with UI
 */
export declare const RichSnapshotSchema: z.ZodObject<
	{
		id: z.ZodString;
		timestamp: z.ZodNumber;
		meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
		files: z.ZodOptional<z.ZodArray<z.ZodString>>;
		fileContents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		name: z.ZodString;
		fileStates: z.ZodOptional<
			z.ZodArray<
				z.ZodObject<
					{
						path: z.ZodString;
						content: z.ZodString;
						hash: z.ZodString;
					},
					z.core.$strip
				>
			>
		>;
		isProtected: z.ZodBoolean;
		icon: z.ZodOptional<z.ZodString>;
		iconColor: z.ZodOptional<z.ZodString>;
	},
	z.core.$strip
>;
export type RichSnapshot = z.infer<typeof RichSnapshotSchema>;
/**
 * Minimal snapshot for deletion operations
 */
export declare const MinimalSnapshotSchema: z.ZodObject<
	{
		id: z.ZodString;
		name: z.ZodString;
		timestamp: z.ZodNumber;
		isProtected: z.ZodBoolean;
	},
	z.core.$strip
>;
export type MinimalSnapshot = z.infer<typeof MinimalSnapshotSchema>;
/**
 * File input for snapshot creation
 */
export declare const FileInputSchema: z.ZodObject<
	{
		path: z.ZodString;
		content: z.ZodString;
		action: z.ZodEnum<{
			add: "add";
			modify: "modify";
			delete: "delete";
		}>;
	},
	z.core.$strip
>;
export type FileInput = z.infer<typeof FileInputSchema>;
/**
 * Snapshot creation options
 */
export declare const CreateSnapshotOptionsSchema: z.ZodObject<
	{
		description: z.ZodOptional<z.ZodString>;
		protected: z.ZodOptional<z.ZodBoolean>;
	},
	z.core.$strip
>;
export type CreateSnapshotOptions = z.infer<typeof CreateSnapshotOptionsSchema>;
/**
 * Snapshot filters for querying
 */
export declare const SnapshotFiltersSchema: z.ZodObject<
	{
		filePath: z.ZodOptional<z.ZodString>;
		before: z.ZodOptional<z.ZodDate>;
		after: z.ZodOptional<z.ZodDate>;
		protected: z.ZodOptional<z.ZodBoolean>;
		limit: z.ZodOptional<z.ZodNumber>;
		offset: z.ZodOptional<z.ZodNumber>;
	},
	z.core.$strip
>;
export type SnapshotFilters = z.infer<typeof SnapshotFiltersSchema>;
/**
 * Snapshot restore result
 */
export declare const SnapshotRestoreResultSchema: z.ZodObject<
	{
		success: z.ZodBoolean;
		restoredFiles: z.ZodArray<z.ZodString>;
		errors: z.ZodOptional<z.ZodArray<z.ZodString>>;
	},
	z.core.$strip
>;
export type SnapshotRestoreResult = z.infer<typeof SnapshotRestoreResultSchema>;
/**
 * Snapshot naming strategy types
 */
export type SnapshotNamingStrategy =
	| "git"
	| "semantic"
	| "timestamp"
	| "custom";
/**
 * Snapshot manager configuration
 */
export declare const SnapshotManagerConfigSchema: z.ZodObject<
	{
		enableDeduplication: z.ZodDefault<z.ZodBoolean>;
		namingStrategy: z.ZodDefault<
			z.ZodEnum<{
				custom: "custom";
				timestamp: "timestamp";
				git: "git";
				semantic: "semantic";
			}>
		>;
		autoProtect: z.ZodDefault<z.ZodBoolean>;
		maxSnapshots: z.ZodOptional<z.ZodNumber>;
	},
	z.core.$strip
>;
export type SnapshotManagerConfig = z.infer<typeof SnapshotManagerConfigSchema>;
/**
 * Risk score for files and checkpoints
 */
export declare const RiskScoreSchema: z.ZodObject<
	{
		score: z.ZodNumber;
		factors: z.ZodArray<
			z.ZodObject<
				{
					type: z.ZodString;
					weight: z.ZodNumber;
					score: z.ZodNumber;
				},
				z.core.$strip
			>
		>;
	},
	z.core.$strip
>;
export type RiskScore = z.infer<typeof RiskScoreSchema>;
/**
 * File metadata for analytics and tracking
 */
export declare const FileMetadataSchema: z.ZodObject<
	{
		id: z.ZodString;
		path: z.ZodString;
		hash: z.ZodOptional<z.ZodString>;
		size: z.ZodOptional<z.ZodNumber>;
		language: z.ZodOptional<z.ZodString>;
		risk: z.ZodOptional<
			z.ZodObject<
				{
					score: z.ZodNumber;
					factors: z.ZodArray<
						z.ZodObject<
							{
								type: z.ZodString;
								weight: z.ZodNumber;
								score: z.ZodNumber;
							},
							z.core.$strip
						>
					>;
				},
				z.core.$strip
			>
		>;
		lastModified: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodOptional<z.ZodNumber>;
	},
	z.core.$strip
>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
/**
 * Snapshot metadata for analytics
 */
export declare const SnapshotMetadataSchema: z.ZodObject<
	{
		id: z.ZodString;
		timestamp: z.ZodNumber;
		fileCount: z.ZodNumber;
		totalSize: z.ZodOptional<z.ZodNumber>;
		riskScore: z.ZodOptional<
			z.ZodObject<
				{
					score: z.ZodNumber;
					factors: z.ZodArray<
						z.ZodObject<
							{
								type: z.ZodString;
								weight: z.ZodNumber;
								score: z.ZodNumber;
							},
							z.core.$strip
						>
					>;
				},
				z.core.$strip
			>
		>;
		tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
	},
	z.core.$strip
>;
export type SnapshotMetadata = z.infer<typeof SnapshotMetadataSchema>;
/**
 * Analytics response structure
 */
export declare const AnalyticsResponseSchema: z.ZodObject<
	{
		workspaceId: z.ZodString;
		period: z.ZodObject<
			{
				start: z.ZodNumber;
				end: z.ZodNumber;
			},
			z.core.$strip
		>;
		risk: z.ZodObject<
			{
				score: z.ZodNumber;
				factors: z.ZodArray<
					z.ZodObject<
						{
							type: z.ZodString;
							weight: z.ZodNumber;
							score: z.ZodNumber;
						},
						z.core.$strip
					>
				>;
			},
			z.core.$strip
		>;
		fileStats: z.ZodObject<
			{
				total: z.ZodNumber;
				byLanguage: z.ZodRecord<z.ZodString, z.ZodNumber>;
				byRisk: z.ZodRecord<z.ZodString, z.ZodNumber>;
			},
			z.core.$strip
		>;
		snapshotStats: z.ZodObject<
			{
				total: z.ZodNumber;
				frequency: z.ZodNumber;
				averageSize: z.ZodOptional<z.ZodNumber>;
			},
			z.core.$strip
		>;
		snapshotRecommendations: z.ZodObject<
			{
				shouldCreateSnapshot: z.ZodBoolean;
				reason: z.ZodString;
				urgency: z.ZodEnum<{
					low: "low";
					medium: "medium";
					high: "high";
					critical: "critical";
				}>;
				suggestedTiming: z.ZodString;
			},
			z.core.$strip
		>;
		trends: z.ZodObject<
			{
				risk: z.ZodArray<
					z.ZodObject<
						{
							timestamp: z.ZodNumber;
							score: z.ZodNumber;
						},
						z.core.$strip
					>
				>;
				activity: z.ZodArray<
					z.ZodObject<
						{
							timestamp: z.ZodNumber;
							count: z.ZodNumber;
						},
						z.core.$strip
					>
				>;
			},
			z.core.$strip
		>;
	},
	z.core.$strip
>;
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
/**
 * Storage interface for snapshots
 * This interface allows public packages to interact with snapshot storage
 * without depending on the private @snapback/storage implementation.
 */
export interface SnapshotStorage {
	create(data: CreateSnapshotOptions): Promise<Snapshot>;
	retrieve(id: string): Promise<Snapshot | null>;
	list(): Promise<Snapshot[]>;
	restore(
		id: string,
		targetPath: string,
		options?: {
			files?: string[];
			dryRun?: boolean;
			backupCurrent?: boolean;
		}
	): Promise<SnapshotRestoreResult>;
}
/**
 * Factory function to create a snapshot storage instance
 * This allows public packages to create storage instances without
 * directly depending on the private @snapback/storage package.
 *
 * @param basePath The base path for storage operations
 * @returns A SnapshotStorage instance
 */
export declare function createSnapshotStorage(
	basePath: string
): Promise<SnapshotStorage>;
