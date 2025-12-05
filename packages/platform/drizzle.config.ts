import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: ["./src/db/schema/postgres.ts", "./src/db/schema/snapback/*.ts"],
	out: "./drizzle/migrations",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
