/**
 * Better Auth Middleware Helper
 *
 * Provides session validation for Next.js middleware with Better Auth integration.
 * Validates sessions via Better Auth API endpoint and handles redirects.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Session validation response from Better Auth
 */
interface SessionResponse {
	user: {
		id: string;
		email: string;
		name?: string;
		image?: string;
	};
	session: {
		id: string;
		expiresAt: Date;
	};
}

/**
 * Validate session with Better Auth API
 *
 * @param request - Next.js request object
 * @returns Session data if valid, null if invalid/expired
 */
async function getSession(
	request: NextRequest,
): Promise<SessionResponse | null> {
	const sessionCookie = request.cookies.get("better_auth.session_token");

	if (!sessionCookie) {
		return null;
	}

	try {
		// Get API URL (same domain as request)
		const apiUrl = new URL("/api/auth/get-session", request.url);

		// Validate session with Better Auth API
		const response = await fetch(apiUrl.toString(), {
			headers: {
				Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
			},
			credentials: "include",
			// Add timeout for edge function performance
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			return null;
		}

		const session = (await response.json()) as SessionResponse;
		return session;
	} catch (error) {
		console.error("Session validation error:", error);
		return null;
	}
}

/**
 * Authentication middleware configuration
 */
export interface AuthMiddlewareConfig {
	/** Routes that require authentication */
	protectedRoutes: string[];
	/** Routes that should redirect to dashboard if authenticated */
	authRoutes: string[];
	/** Login page path */
	loginPath: string;
	/** Dashboard path (redirect after login) */
	dashboardPath: string;
}

/**
 * Default configuration
 */
const defaultConfig: AuthMiddlewareConfig = {
	protectedRoutes: [
		"/dashboard",
		"/settings",
		"/admin",
		"/api-keys",
		"/choose-plan",
		"/onboarding",
	],
	authRoutes: ["/auth/login", "/auth/signup"],
	loginPath: "/auth/login",
	dashboardPath: "/dashboard",
};

/**
 * Check if path matches protected routes
 */
function isProtectedRoute(
	pathname: string,
	protectedRoutes: string[],
): boolean {
	return protectedRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Check if path is an auth page
 */
function isAuthRoute(pathname: string, authRoutes: string[]): boolean {
	return authRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Auth middleware handler
 *
 * Validates sessions for protected routes and handles redirects.
 * Integrates with Better Auth session validation.
 *
 * @param request - Next.js request object
 * @param config - Optional configuration override
 * @returns Next.js response or undefined (allows request to proceed)
 *
 * @example
 * ```ts
 * // In middleware.ts
 * export async function middleware(request: NextRequest) {
 *   // Handle auth for console subdomain
 *   if (subdomain === 'console') {
 *     const authResponse = await authMiddleware(request);
 *     if (authResponse) return authResponse;
 *   }
 *
 *   // Continue with other middleware logic
 *   return NextResponse.next();
 * }
 * ```
 */
export async function authMiddleware(
	request: NextRequest,
	config: Partial<AuthMiddlewareConfig> = {},
): Promise<NextResponse | undefined> {
	const { pathname } = request.nextUrl;
	const mergedConfig = { ...defaultConfig, ...config };

	const { protectedRoutes, authRoutes, loginPath, dashboardPath } =
		mergedConfig;

	// Check if route requires authentication
	const isProtected = isProtectedRoute(pathname, protectedRoutes);
	const isAuth = isAuthRoute(pathname, authRoutes);

	// Allow home page and non-protected routes
	if (!isProtected && !isAuth) {
		return undefined;
	}

	// Validate session
	const session = await getSession(request);

	// Protected route without session -> redirect to login
	if (isProtected && !session) {
		const url = request.nextUrl.clone();
		url.pathname = loginPath;
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	// Auth route with session -> redirect to dashboard
	if (isAuth && session) {
		const url = request.nextUrl.clone();
		url.pathname = dashboardPath;
		return NextResponse.redirect(url);
	}

	// Allow request to proceed
	return undefined;
}

/**
 * Enhanced auth middleware with performance monitoring
 *
 * Adds performance tracking for session validation latency
 */
export async function authMiddlewareWithMonitoring(
	request: NextRequest,
	config: Partial<AuthMiddlewareConfig> = {},
): Promise<NextResponse | undefined> {
	const startTime = Date.now();

	const response = await authMiddleware(request, config);

	const duration = Date.now() - startTime;

	// Log slow session validations (>100ms)
	if (duration > 100) {
		console.warn(
			`Slow session validation: ${duration}ms for ${request.nextUrl.pathname}`,
		);
	}

	return response;
}
