/**
 * Authentication Mock Handlers for MSW
 *
 * Provides mock implementations of Better Auth authentication flows
 * for testing without real database or email services.
 *
 * Matches Better Auth v1.3.26+ API conventions:
 * - Hyphenated endpoints (/sign-in/email, /sign-up/email)
 * - Cookie name: snapback_auth.session_token
 * - OWASP 2025 compliant password validation
 * - No user enumeration in error messages
 *
 * @example
 * ```typescript
 * import { server } from "@snapback/testing/msw/server";
 * import { authHandlers, authErrorHandlers } from "@snapback/testing/msw/handlers/auth";
 *
 * // Use error scenario in specific test
 * server.use(authErrorHandlers.invalidCredentials);
 * ```
 */

import { HttpResponse, http } from "msw";

/**
 * Test credentials (configurable for test scenarios)
 * @internal
 */
export const TEST_CREDENTIALS = {
	email: "test@example.com",
	password: "ValidPassword123!",
	name: "Test User",
} as const;

/**
 * Mock user data for testing
 * Generic, IP-safe test data (no proprietary logic)
 */
const mockUser = {
	id: "user_test123",
	email: TEST_CREDENTIALS.email,
	name: TEST_CREDENTIALS.name,
	emailVerified: true,
	createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
	updatedAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
};

const mockSession = {
	id: "sess_abc123",
	token: "session_token_abc123xyz",
	userId: mockUser.id,
	expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
	createdAt: new Date().toISOString(),
	ipAddress: "127.0.0.1",
	userAgent: "Mozilla/5.0 (Test Environment)",
};

/**
 * Cookie name used by Better Auth with snapback prefix
 * Matches packages/auth/src/auth.ts cookiePrefix configuration
 */
const SESSION_COOKIE_NAME = "snapback_auth.session_token";

/**
 * Password validation (matches packages/contracts/src/auth/api.ts PasswordSchema)
 * OWASP 2025 compliant:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
function validatePassword(password: string): string | null {
	if (password.length < 8) {
		return "Password must be at least 8 characters";
	}
	if (!/[A-Z]/.test(password)) {
		return "Password must contain at least one uppercase letter";
	}
	if (!/[a-z]/.test(password)) {
		return "Password must contain at least one lowercase letter";
	}
	if (!/[0-9]/.test(password)) {
		return "Password must contain at least one number";
	}
	return null;
}

/**
 * Check if session is expired
 */
function isSessionExpired(session: typeof mockSession): boolean {
	return new Date(session.expiresAt) < new Date();
}

/**
 * Helper: Create successful auth response with proper cookie
 */
function createAuthSuccessResponse() {
	return HttpResponse.json(
		{
			user: mockUser,
			session: mockSession,
		},
		{
			headers: {
				"set-cookie": `${SESSION_COOKIE_NAME}=${mockSession.token}; Path=/; HttpOnly; SameSite=Lax`,
			},
		},
	);
}

/**
 * Registration handlers
 * Simulates Better Auth email/password registration flow
 *
 * Endpoint: POST /api/auth/sign-up/email (hyphenated per Better Auth convention)
 */
export const registrationHandlers = [
	// Email/password registration
	http.post("*/api/auth/sign-up/email", async ({ request }) => {
		const body = await request.json();

		// Validate required fields
		if (!body || typeof body !== "object") {
			return HttpResponse.json(
				{ error: "Invalid request body" },
				{ status: 400 },
			);
		}

		const { email, password, name } = body as {
			email?: string;
			password?: string;
			name?: string;
		};

		if (!email || !password) {
			return HttpResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			);
		}

		// OWASP 2025: Generic error for duplicate email (no user enumeration)
		if (email === "existing@example.com") {
			return HttpResponse.json(
				{ error: "Unable to create account with this email. If you already have an account, please sign in." },
				{ status: 400 },
			);
		}

		// Password validation (matches PasswordSchema)
		const passwordError = validatePassword(password);
		if (passwordError) {
			return HttpResponse.json(
				{ error: passwordError },
				{ status: 400 },
			);
		}

		// Success: Return user without password
		return HttpResponse.json({
			user: {
				...mockUser,
				email,
				name: name || "Test User",
				emailVerified: false, // New registrations not verified
			},
		});
	}),

	// Email verification
	http.post("*/api/auth/verify-email", async ({ request }) => {
		const body = await request.json();
		const { token } = body as { token?: string };

		if (!token) {
			return HttpResponse.json({ error: "Token is required" }, { status: 400 });
		}

		// Simulate expired token
		if (token === "expired_token") {
			return HttpResponse.json({ error: "Token expired" }, { status: 400 });
		}

		// Simulate invalid token
		if (token !== "valid_token") {
			return HttpResponse.json({ error: "Invalid token" }, { status: 400 });
		}

		// Success: Return user + session (autoSignInAfterVerification: true)
		return HttpResponse.json(
			{
				user: {
					...mockUser,
					emailVerified: true,
				},
				session: mockSession,
			},
			{
				headers: {
					"set-cookie": `${SESSION_COOKIE_NAME}=${mockSession.token}; Path=/; HttpOnly; SameSite=Lax`,
				},
			},
		);
	}),
];

/**
 * Login handlers
 * Simulates Better Auth login flows
 *
 * Endpoint: POST /api/auth/sign-in/email (hyphenated per Better Auth convention)
 */
export const loginHandlers = [
	// Email/password login
	http.post("*/api/auth/sign-in/email", async ({ request }) => {
		const body = await request.json();
		const { email, password } = body as { email?: string; password?: string };

		if (!email || !password) {
			return HttpResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			);
		}

		// OWASP 2025: Generic error message (no user enumeration)
		if (email !== TEST_CREDENTIALS.email || password !== TEST_CREDENTIALS.password) {
			return HttpResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}

		// Success
		return createAuthSuccessResponse();
	}),
];

/**
 * Session management handlers
 * Simulates Better Auth session operations
 */
export const sessionHandlers = [
	// Get current session
	http.get("*/api/auth/session", ({ request }) => {
		const cookieHeader = request.headers.get("cookie");

		// Check for session cookie
		if (!cookieHeader || !cookieHeader.includes(`${SESSION_COOKIE_NAME}=${mockSession.token}`)) {
			return HttpResponse.json({ user: null, session: null });
		}

		// Validate session expiry
		if (isSessionExpired(mockSession)) {
			return HttpResponse.json({ user: null, session: null });
		}

		// Return active session
		return HttpResponse.json({
			user: mockUser,
			session: mockSession,
		});
	}),

	// Logout
	http.post("*/api/auth/sign-out", () => {
		return HttpResponse.json(
			{ success: true },
			{
				headers: {
					"set-cookie": `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
				},
			},
		);
	}),

	// Session refresh
	http.post("*/api/auth/refresh", ({ request }) => {
		const cookieHeader = request.headers.get("cookie");

		// Require existing valid session
		if (!cookieHeader?.includes(`${SESSION_COOKIE_NAME}=${mockSession.token}`)) {
			return HttpResponse.json(
				{ error: "No active session" },
				{ status: 401 },
			);
		}

		const newSession = {
			...mockSession,
			id: `sess_${Date.now()}`,
			token: `session_token_${Date.now()}`,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			createdAt: new Date().toISOString(),
		};

		return HttpResponse.json(
			{
				session: newSession,
			},
			{
				headers: {
					"set-cookie": `${SESSION_COOKIE_NAME}=${newSession.token}; Path=/; HttpOnly; SameSite=Lax`,
				},
			},
		);
	}),
];

/**
 * Password reset handlers
 * Simulates Better Auth password reset flow
 */
export const passwordResetHandlers = [
	// Request password reset
	http.post("*/api/auth/forget-password", async ({ request }) => {
		const body = await request.json();
		const { email } = body as { email?: string };

		if (!email) {
			return HttpResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Success (no user enumeration - always return success)
		return HttpResponse.json({ success: true });
	}),

	// Reset password with token
	http.post("*/api/auth/reset-password", async ({ request }) => {
		const body = await request.json();
		const { token, password } = body as { token?: string; password?: string };

		if (!token || !password) {
			return HttpResponse.json(
				{ error: "Token and password are required" },
				{ status: 400 },
			);
		}

		// Simulate expired token
		if (token === "expired_token") {
			return HttpResponse.json({ error: "Token expired" }, { status: 400 });
		}

		// Simulate invalid token
		if (token !== "valid_reset_token") {
			return HttpResponse.json({ error: "Invalid token" }, { status: 400 });
		}

		// Weak password check
		if (password.length < 8) {
			return HttpResponse.json(
				{ error: "Password must be at least 8 characters" },
				{ status: 400 },
			);
		}

		// Success
		return HttpResponse.json({ success: true });
	}),
];

/**
 * Error scenario handlers
 * Mock various auth failure scenarios for testing error handling
 */
export const authErrorHandlers = {
	// Invalid credentials
	invalidCredentials: http.post("*/api/auth/sign-in/email", () =>
		HttpResponse.json({ error: "Invalid email or password" }, { status: 401 }),
	),

	// Server error during login
	serverError: http.post(
		"*/api/auth/sign-in/email",
		() => new HttpResponse(null, { status: 500 }),
	),

	// Network timeout (simulated)
	networkTimeout: http.post("*/api/auth/sign-in/email", async () => {
		await new Promise((resolve) => setTimeout(resolve, 30000)); // 30s timeout
		return new HttpResponse(null, { status: 408 });
	}),

	// Rate limit exceeded
	rateLimitExceeded: http.post("*/api/auth/sign-in/email", () =>
		HttpResponse.json(
			{ error: "Too many attempts. Please try again later." },
			{
				status: 429,
				headers: {
					"retry-after": "60",
				},
			},
		),
	),

	// Account locked
	accountLocked: http.post("*/api/auth/sign-in/email", () =>
		HttpResponse.json(
			{ error: "Account locked due to too many failed attempts" },
			{ status: 423 },
		),
	),

	// Email not verified
	emailNotVerified: http.post("*/api/auth/sign-in/email", () =>
		HttpResponse.json(
			{ error: "Please verify your email before logging in" },
			{ status: 403 },
		),
	),

	// Session expired
	sessionExpired: http.get("*/api/auth/session", () =>
		HttpResponse.json({ error: "Session expired" }, { status: 401 }),
	),
};

/**
 * All auth handlers combined (happy path)
 */
export const authHandlers = [
	...registrationHandlers,
	...loginHandlers,
	...sessionHandlers,
	...passwordResetHandlers,
];
