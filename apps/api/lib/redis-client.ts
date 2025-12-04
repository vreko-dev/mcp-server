// Redis implementation commented out for MVP - replaced with Postgres counters
// For more context, see Redis Elimination Strategy in project documentation
/*
import { logger } from "@snapback/infrastructure";
import { createClient, type RedisClientType } from "redis";

// Create a Redis client instance
let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
	if (!redisClient) {
		const redisUrl = process.env.REDIS_URL;

		if (!redisUrl) {
			throw new Error("REDIS_URL environment variable is not set");
		}

		// Parse the Redis URL to extract connection details
		const url = new URL(redisUrl);
		const username = url.username || "default";
		const password = url.password;
		const host = url.hostname;
		const port = Number.parseInt(url.port, 10);

		redisClient = createClient({
			username,
			password,
			socket: {
				host,
				port,
			},
		});

		redisClient.on("error", (err) => {
			logger.error("Redis Client Error:", err);
		});

		await redisClient.connect();
	}

	return redisClient;
}

export async function initializeRedisClient(): Promise<void> {
	// Initialize the Redis client on startup
	await getRedisClient();
	logger.info("Redis client initialized successfully");
}

export async function closeRedisClient(): Promise<void> {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
	}
}
*/

// MVP implementation uses Postgres with INSERT ... ON CONFLICT DO UPDATE
// into monthly usage tables and materialized views instead of Redis
export async function getRedisClient(): Promise<any> {
	throw new Error(
		"Redis client not available in MVP - using Postgres counters instead",
	);
}

export async function initializeRedisClient(): Promise<void> {
	// No-op in MVP - Redis replaced with Postgres counters
	console.log(
		"Redis initialization skipped in MVP - using Postgres counters instead",
	);
}

export async function closeRedisClient(): Promise<void> {
	// No-op in MVP - Redis replaced with Postgres counters
	console.log(
		"Redis client close skipped in MVP - using Postgres counters instead",
	);
}
