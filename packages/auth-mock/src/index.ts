/**
 * Mock authentication service for testing
 */

export interface AuthResult {
	valid: boolean;
	tier: "free" | "pro";
	scopes?: string[];
	error?: string;
}

/**
 * Mock authenticate function
 * @param apiKey The API key to authenticate
 * @returns Authentication result
 */
export async function authenticate(apiKey: string): Promise<AuthResult> {
	// Handle null or undefined keys
	if (apiKey === null || apiKey === undefined) {
		return {
			valid: false,
			tier: "free",
			error: "API key is required",
		};
	}

	// Mock implementation based on key format
	if (!apiKey) {
		return {
			valid: true,
			tier: "free",
			scopes: [],
		};
	}

	if (apiKey.startsWith("sb_live_")) {
		return {
			valid: true,
			tier: "pro",
			scopes: ["analyze", "snapshot", "context"],
		};
	}

	if (apiKey.startsWith("sb_test_")) {
		return {
			valid: true,
			tier: "free",
			scopes: ["analyze"],
		};
	}

	return {
		valid: false,
		tier: "free",
		error: "Invalid API key format",
	};
}

/**
 * Mock function to get user info
 * @param apiKey The API key
 * @returns User info
 */
export async function getUserInfo(apiKey: string): Promise<any> {
	const authResult = await authenticate(apiKey);

	if (!authResult.valid) {
		throw new Error(authResult.error || "Authentication failed");
	}

	return {
		id: "user-123",
		email: "test@example.com",
		tier: authResult.tier,
		scopes: authResult.scopes,
		createdAt: new Date().toISOString(),
	};
}

/**
 * Mock function to validate scopes
 * @param apiKey The API key
 * @param requiredScopes Required scopes
 * @returns True if user has all required scopes
 */
export async function validateScopes(apiKey: string, requiredScopes: string[]): Promise<boolean> {
	const authResult = await authenticate(apiKey);

	if (!authResult.valid) {
		return false;
	}

	if (!authResult.scopes) {
		return requiredScopes.length === 0;
	}

	return requiredScopes.every((scope) => authResult.scopes?.includes(scope));
}
