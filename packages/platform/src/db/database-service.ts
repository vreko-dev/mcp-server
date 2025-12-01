import { checkDatabaseConnection, closeDatabaseConnection, db, supabase } from "./client.js";
import type { Database } from "./schema/postgres.js";
import type { SupabaseClient } from "./supabase-service.js";

// Type for our combined database service
export interface DatabaseService {
	drizzle: typeof db;
	supabase: SupabaseClient;
	isConnected: () => Promise<boolean>;
	disconnect: () => Promise<void>;
}

// Create the database service instance
export const databaseService: DatabaseService = {
	drizzle: db,
	supabase: supabase,

	isConnected: async (): Promise<boolean> => {
		return await checkDatabaseConnection();
	},

	disconnect: async (): Promise<void> => {
		await closeDatabaseConnection();
	},
};

// Helper functions for common operations
export const healthCheck = async (): Promise<{
	drizzleConnected: boolean;
	supabaseConnected: boolean;
	timestamp: Date;
}> => {
	const drizzleConnected = await checkDatabaseConnection();

	try {
		// Simple Supabase health check
		await supabase.from("user").select("id").limit(1);
		const supabaseConnected = true;
		return { drizzleConnected, supabaseConnected, timestamp: new Date() };
	} catch (_error) {
		return {
			drizzleConnected,
			supabaseConnected: false,
			timestamp: new Date(),
		};
	}
};

// Export schema for convenience
export * as schema from "./schema/postgres.js";
export * as snapbackSchema from "./schema/snapback/index.js";

// Export types
export type { Database };
