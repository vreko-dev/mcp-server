import { hash, verify } from "@node-rs/argon2";

// Generate a new API key with sk_live_ prefix for consistency with auth package
export function generateApiKey(mode: "live" | "test" = "live"): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const prefix = mode === "test" ? "sk_test_" : "sk_live_";
	let result = prefix;
	for (let i = 0; i < 32; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// Hash an API key for storage
export async function hashApiKey(key: string): Promise<string> {
	return await hash(key, {
		// recommended minimum parameters
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1,
	});
}

// Verify an API key against its hash
export async function verifyApiKey(
	key: string,
	hash: string,
): Promise<boolean> {
	return await verify(hash, key);
}
