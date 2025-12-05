import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const runMigrate = async () => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not defined");
	}

	console.log("Connecting to database...");
	const connection = postgres(process.env.DATABASE_URL, { max: 1 });
	const db = drizzle(connection);

	/*
    console.log("Resetting database schema...");
    await connection`DROP SCHEMA IF EXISTS public CASCADE`;
    await connection`CREATE SCHEMA public`;
    await connection`GRANT ALL ON SCHEMA public TO public`;
    await connection`COMMENT ON SCHEMA public IS 'standard public schema'`;
    */

	console.log("Running migrations...");
	await migrate(db, { migrationsFolder: "drizzle/migrations" });
	console.log("Migrations completed!");

	await connection.end();
};

runMigrate().catch((err) => {
	console.error("Migration failed!", err);
	process.exit(1);
});
