import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./db/schema";

// Lazy initialization: create connection only when first accessed
let _db: NodePgDatabase<typeof schema> | null = null;

function getDb() {
	if (_db) {
		return _db;
	}

	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error("DATABASE_URL is not set. Please add it to your .env.local file.");
	}

	// Create postgres pool using node-postgres (pg)
	// Supabase requires SSL connections
	const pool = new Pool({
		connectionString,
		ssl: {
			rejectUnauthorized: false, // Required for Supabase
		},
	});

	// Create Drizzle client with schema
	_db = drizzle(pool, { schema });
	return _db;
}

// Export a proxy that calls getDb() for each property access
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
	get(_, prop) {
		return getDb()[prop as keyof NodePgDatabase<typeof schema>];
	},
});
