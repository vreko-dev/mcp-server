import { eq, lte } from "drizzle-orm";

// Mock database client and schema for testing
let db: any = null;
let retentionConfig: any = null;
let agentSuggestions: any = null;
let postAcceptOutcomes: any = null;
let policyEvaluations: any = null;
let loops: any = null;
let feedback: any = null;
let snapshots: any = null;
let apiKeyUsage: any = null;

// Function to initialize database connections lazily
async function initializeDb() {
	// Only initialize if not already initialized
	if (db === null) {
		try {
			// Try to import the actual database client
			const dbModule = await import("@snapback/platform/db/client");
			const schemaModule = await import("@snapback/platform/db/schema/snapback");
			db = dbModule.db;
			retentionConfig = schemaModule.retentionConfig;
			agentSuggestions = schemaModule.agentSuggestions;
			postAcceptOutcomes = schemaModule.postAcceptOutcomes;
			policyEvaluations = schemaModule.policyEvaluations;
			loops = schemaModule.loops;
			feedback = schemaModule.feedback;
			snapshots = schemaModule.snapshots;
			apiKeyUsage = schemaModule.apiKeyUsage;
		} catch (_error) {
			// If import fails (e.g., during testing), use mock objects
			console.warn("Database client not available, using mock objects");
			db = {
				select: () => ({ from: () => Promise.resolve([]) }),
				insert: () => ({ values: () => ({ execute: () => Promise.resolve() }) }),
				update: () => ({ set: () => ({ where: () => ({ execute: () => Promise.resolve() }) }) }),
				delete: () => ({ where: () => ({ execute: () => Promise.resolve() }) }),
			};
			retentionConfig = {};
			agentSuggestions = {};
			postAcceptOutcomes = {};
			policyEvaluations = {};
			loops = {};
			feedback = {};
			snapshots = {};
			apiKeyUsage = {};
		}
	}
}

export interface RetentionJobConfig {
	tableName: string;
	retentionDays: number;
	isEnabled: boolean;
}

export class RetentionService {
	/**
	 * Get all retention configurations
	 */
	async getRetentionConfigs(): Promise<RetentionJobConfig[]> {
		await initializeDb();
		const configs = await db.select().from(retentionConfig);
		return configs.map((config: any) => ({
			tableName: config.tableName,
			retentionDays: config.retentionDays,
			isEnabled: config.isEnabled,
		}));
	}

	/**
	 * Purge old telemetry data based on retention configuration
	 */
	async purgeTelemetryData(): Promise<void> {
		await initializeDb();
		const configs = await this.getRetentionConfigs();

		for (const config of configs) {
			if (!config.isEnabled) {
				continue;
			}

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

			switch (config.tableName) {
				case "agent_suggestions":
					await db.delete(agentSuggestions).where(lte(agentSuggestions.timestamp, cutoffDate));
					break;
				case "post_accept_outcomes":
					await db.delete(postAcceptOutcomes).where(lte(postAcceptOutcomes.timestamp, cutoffDate));
					break;
				case "policy_evaluations":
					await db.delete(policyEvaluations).where(lte(policyEvaluations.timestamp, cutoffDate));
					break;
				case "loops":
					await db.delete(loops).where(lte(loops.timestamp, cutoffDate));
					break;
				case "feedback":
					await db.delete(feedback).where(lte(feedback.timestamp, cutoffDate));
					break;
				case "snapshots":
					// For snapshots, we might want to keep some metadata but purge the actual content
					// This would depend on the specific retention policy for snapshots
					await db
						.update(snapshots)
						.set({
							content: null,
							compressedContent: null,
							updatedAt: new Date(),
						})
						.where(lte(snapshots.createdAt, cutoffDate));
					break;
				case "api_key_usage":
					await db.delete(apiKeyUsage).where(lte(apiKeyUsage.timestamp, cutoffDate));
					break;
				default:
					console.warn(`Unknown table name in retention config: ${config.tableName}`);
					break;
			}

			// Update last run timestamp
			await db
				.update(retentionConfig)
				.set({ lastRunAt: new Date() })
				.where(eq(retentionConfig.tableName, config.tableName));
		}
	}

	/**
	 * Add a new retention configuration
	 */
	async addRetentionConfig(config: RetentionJobConfig): Promise<void> {
		await initializeDb();
		await db.insert(retentionConfig).values({
			tableName: config.tableName,
			retentionDays: config.retentionDays,
			isEnabled: config.isEnabled,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	/**
	 * Update an existing retention configuration
	 */
	async updateRetentionConfig(tableName: string, config: Partial<RetentionJobConfig>): Promise<void> {
		await initializeDb();
		await db
			.update(retentionConfig)
			.set({
				...config,
				updatedAt: new Date(),
			})
			.where(eq(retentionConfig.tableName, tableName));
	}

	/**
	 * Remove a retention configuration
	 */
	async removeRetentionConfig(tableName: string): Promise<void> {
		await initializeDb();
		await db.delete(retentionConfig).where(eq(retentionConfig.tableName, tableName));
	}
}
