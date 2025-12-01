// Environment-specific Drizzle configuration

export interface DrizzleConfig {
	dialect: "postgresql";
	schema: string;
	dbCredentials: {
		url: string;
		ssl?: boolean;
	};
	verbose?: boolean;
	strict?: boolean;
}

export const getDrizzleConfig = (
	environment: "development" | "production" | "staging" = "development",
): DrizzleConfig => {
	// Get environment-specific database URL
	let databaseUrl: string;

	switch (environment) {
		case "production":
			databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || "";
			break;
		case "staging":
			databaseUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || "";
			break;
		default:
			databaseUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL || "";
			break;
	}

	if (!databaseUrl) {
		throw new Error(`DATABASE_URL is not set for ${environment} environment`);
	}

	return {
		dialect: "postgresql",
		schema: "./drizzle/schema/postgres.ts",
		dbCredentials: {
			url: databaseUrl,
			ssl: databaseUrl.includes("sslmode=disable")
				? false
				: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
					? false
					: undefined,
		},
		verbose: environment === "development",
		strict: true,
	};
};

// Export configs for different environments
export const developmentConfig = getDrizzleConfig("development");
export const stagingConfig = getDrizzleConfig("staging");
export const productionConfig = getDrizzleConfig("production");
