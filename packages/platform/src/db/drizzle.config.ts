// This file is deprecated - use drizzle.config.ts at the package root instead
// The authoritative configuration is in packages/platform/drizzle.config.ts

import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema/snapback",
	out: "./drizzle/migrations",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
});
