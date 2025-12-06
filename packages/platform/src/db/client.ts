import { createLogger, LogLevel } from "@snapback/contracts";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema/postgres";
import * as snapbackSchema from "./schema/snapback/index";
import { supabase } from "./supabase-service";

const logger = createLogger({ name: "database", level: LogLevel.INFO });

// Check if we're using Supabase
const isSupabase =
	process.env.DATABASE_URL?.includes("supabase") ||
	!!process.env.SUPABASE_URL ||
	!!process.env.VITE_SUPABASE_URL ||
	!!process.env.NEXT_PUBLIC_SUPABASE_URL;

// Database URL from environment variables
const databaseUrl = process.env.DATABASE_URL as string;

// Combined schema
const combinedSchema = { ...schema, ...snapbackSchema };

// Create database client based on environment
let db: ReturnType<typeof drizzle<typeof combinedSchema>> | null = null;
let pool: Pool | null = null;

if (databaseUrl) {
	// Create connection pool
	const poolConfig: PoolConfig = {
		connectionString: databaseUrl,
	};

	const sslDisabledViaUrl = databaseUrl.includes("sslmode=disable");
	const sslDisabledViaEnv = process.env.DB_SSL_ENABLED === "false";

	if (!sslDisabledViaUrl && !sslDisabledViaEnv) {
		const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED;
		let rejectUnauthorized: boolean;

		if (rejectUnauthorizedEnv !== undefined) {
			rejectUnauthorized = rejectUnauthorizedEnv !== "false";
		} else {
			// Supabase deployments require rejectUnauthorized=false by default
			rejectUnauthorized = !isSupabase;
		}

		// Add additional SSL logging for debugging (only in development)
		if (process.env.NODE_ENV !== "production") {
			logger.debug("Database SSL Configuration:", {
				isSupabase,
				sslDisabledViaUrl,
				sslDisabledViaEnv,
				rejectUnauthorized,
			});
		}

		const ca = process.env.DB_SSL_CA;

		poolConfig.ssl = ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
	}

	// Add connection event listeners for debugging
	pool = new Pool(poolConfig);

	// Add error handling for the pool
	pool.on("error", (err) => {
		logger.error("Unexpected error on idle client", err);
		logger.error("Database pool error:", err);
	});

	// Add connection tracking (only in development)
	if (process.env.NODE_ENV !== "production") {
		pool.on("connect", (_client) => {
			logger.debug("New database connection established");
		});

		pool.on("acquire", (_client) => {
			logger.debug("Database client acquired from pool");
		});

		pool.on("remove", (_client) => {
			logger.debug("Database client removed from pool");
		});
	}

	// Create Drizzle client with proper schema typing
	db = drizzle(pool, {
		schema: combinedSchema,
	});
} else if (isSupabase) {
	logger.warn(
		"Database URL not found, but Supabase environment variables detected. Using direct Supabase client only.",
	);
	db = null;
	pool = null;
} else {
	throw new Error("DATABASE_URL is not set and no Supabase configuration detected");
}

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
	if (!db || !pool) {
		return false;
	}

	try {
		const client = await pool.connect();
		await client.query("SELECT 1");
		client.release();
		return true;
	} catch (error) {
		logger.error("Database connection failed:", error as any);
		return false;
	}
};

// Cleanup function
export const closeDatabaseConnection = async (): Promise<void> => {
	if (pool) {
		await pool.end();
	}
};

// Export clients
export { db, supabase, pool };
export type DatabaseClient = typeof db;
export { combinedSchema };
