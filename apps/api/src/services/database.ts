import type { DatabaseClient } from "@snapback/platform";
import { db as drizzleDb } from "@snapback/platform";

// Lazy initialization: return the existing db instance
let _db: DatabaseClient | null = null;

function getDb(): NonNullable<DatabaseClient> {
	if (_db) {
		return _db;
	}

	if (!drizzleDb) {
		throw new Error("Database is not initialized");
	}

	_db = drizzleDb;
	return _db;
}

// Export a proxy that calls getDb() for each property access
// This maintains backward compatibility while using the getDb pattern
export const db: NonNullable<DatabaseClient> = new Proxy({} as NonNullable<DatabaseClient>, {
	get(_, prop) {
		const database = getDb();
		return (database as any)[prop];
	},
});

export { getDb };
