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

		redisClient.on("error", (err: Error) => {
			logger.error("Redis Client Error:", err);
		});

		await redisClient.connect();
	}

	return redisClient;
}

export async function initializeRedisClient(): Promise<void> {
	if (!process.env.REDIS_URL) {
		logger.warn(
			"REDIS_URL not configured - rate limiting will use in-memory fallback",
		);
		return;
	}

	try {
		await getRedisClient();
		logger.info("✅ Redis client initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize Redis client", {
			error: error instanceof Error ? error.message : String(error),
		});
		// Don't throw - allow fallback to in-memory
	}
}

export async function closeRedisClient(): Promise<void> {
	if (redisClient) {
		try {
			await redisClient.quit();
			redisClient = null;
			logger.info("Redis client closed");
		} catch (error) {
			logger.error("Error closing Redis client", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
