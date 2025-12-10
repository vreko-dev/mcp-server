/**
 * E2E Test API Client
 *
 * Provides helper functions for E2E tests to interact with auth endpoints.
 * Handles JWT creation, token validation, and authenticated requests.
 */

/**
 * API response type
 */
export interface ApiResponse<T = any> {
	status: number;
	headers: Headers;
	body: T;
}

/**
 * Auth credentials
 */
export interface AuthCredentials {
	email: string;
	password: string;
}

/**
 * JWT token payload
 */
export interface JwtPayload {
	id: string;
	email: string;
	role: "admin" | "user" | "viewer";
	iat?: number;
	exp?: number;
	iss?: string;
	aud?: string;
	nbf?: number;
}

/**
 * E2E Auth API Client
 */
export class AuthApiClient {
	private baseUrl: string;

	constructor(baseUrl = "http://api.snapback.dev:8080") {
		this.baseUrl = baseUrl;
	}

	/**
	 * Sign in with email and password
	 */
	async signInWithEmail(credentials: AuthCredentials): Promise<ApiResponse<{ token: string; user: any }>> {
		const response = await fetch(`${this.baseUrl}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(credentials),
		});

		const body = await response.json().catch(() => null);

		return {
			status: response.status,
			headers: response.headers,
			body,
		};
	}

	/**
	 * Make authenticated request to protected endpoint
	 */
	async makeAuthenticatedRequest(
		token: string,
		endpoint: string,
		options: {
			method?: "GET" | "POST" | "PUT" | "DELETE";
			body?: Record<string, any>;
		} = {},
	): Promise<ApiResponse> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: options.method || "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
		});

		const body = await response.json().catch(() => null);

		return {
			status: response.status,
			headers: response.headers,
			body,
		};
	}

	/**
	 * Make request with API key
	 */
	async makeApiKeyRequest(
		apiKey: string,
		endpoint: string,
		options: {
			method?: "GET" | "POST" | "PUT" | "DELETE";
			body?: Record<string, any>;
		} = {},
	): Promise<ApiResponse> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: options.method || "GET",
			headers: {
				"X-API-Key": apiKey,
				"Content-Type": "application/json",
			},
			body: options.body ? JSON.stringify(options.body) : undefined,
		});

		const body = await response.json().catch(() => null);

		return {
			status: response.status,
			headers: response.headers,
			body,
		};
	}
}

/**
 * Create test JWT token
 *
 * WARNING: This creates unsigned tokens for testing purposes only.
 * Real tokens must be signed with proper keys.
 */
export function createTestJwt(payload: JwtPayload, algorithm = "HS256"): string {
	const header = btoa(JSON.stringify({ alg: algorithm, typ: "JWT" }));
	const payloadWithDefaults = {
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		...payload,
	};
	const encodedPayload = btoa(JSON.stringify(payloadWithDefaults));

	// This is a fake signature - in real tests, properly sign with test keys
	const signature = "test.signature.invalid";

	return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Create expired JWT token
 */
export function createExpiredJwt(payload: JwtPayload): string {
	const expiredPayload = {
		...payload,
		iat: Math.floor(Date.now() / 1000) - 7200,
		exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
	};

	return createTestJwt(expiredPayload);
}

/**
 * Create test user
 */
export interface TestUser {
	id: string;
	email: string;
	password: string;
	role: "admin" | "user" | "viewer";
}

/**
 * Generate unique test user
 */
export function generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
	const timestamp = Date.now();

	return {
		id: `user_${timestamp}`,
		email: `test-${timestamp}@example.com`,
		password: `TestPassword${timestamp}!@#`,
		role: "user",
		...overrides,
	};
}

/**
 * Sleep helper for tests
 */
export async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
