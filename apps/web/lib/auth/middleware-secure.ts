/**
 * Secure Better Auth Middleware
 *
 * SECURITY FIX: Uses optimistic cookie checks in middleware (Edge-safe)
 * Session validation happens in page components (Node.js runtime)
 *
 * This addresses the critical security flaw of making external API calls
 * in middleware which causes performance and reliability issues.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
	/** Cookie name for session token */
	sessionCookieName: string;
}

/**
 * Default configuration
 */
const defaultConfig: AuthMiddlewareConfig = {
	protectedRoutes: ["/dashboard", "/settings", "/admin", "/api-keys", "/choose-plan", "/onboarding"],
	authRoutes: ["/auth/login", "/auth/signup"],
	loginPath: "/auth/login",
	dashboardPath: "/dashboard",
	sessionCookieName: "better_auth.session_token",
};

/**
 * Check if path matches protected routes
 */
function isProtectedRoute(pathname: string, protectedRoutes: string[]): boolean {
	return protectedRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Check if path is an auth page
 */
function isAuthRoute(pathname: string, authRoutes: string[]): boolean {
	return authRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Secure auth middleware handler
 *
 * ✅ SECURITY FIX: Uses ONLY optimistic cookie checks in middleware
 * ✅ PERFORMANCE: No blocking API calls in Edge runtime
 * ✅ RELIABILITY: No external dependencies in middleware layer
 *
 * Session validation happens in page components using auth.api.getSession()
 * which runs in Node.js runtime and can access database directly.
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
 *
 * // In page.tsx (verify session server-side)
 * import { auth } from '@/lib/auth/server';
 * import { headers } from 'next/headers';
 * import { redirect } from 'next/navigation';
 *
 * export default async function DashboardPage() {
 *   const session = await auth.api.getSession({
 *     headers: await headers()
 *   });
 *
 *   if (!session?.user) {
 *     redirect('/auth/login');
 *   }
 *
 *   return <Dashboard user={session.user} />;
 * }
 * ```
 */
export async function authMiddleware(
	request: NextRequest,
	config: Partial<AuthMiddlewareConfig> = {},
): Promise<NextResponse | undefined> {
	const { pathname } = request.nextUrl;
	const mergedConfig = { ...defaultConfig, ...config };

	const { protectedRoutes, authRoutes, loginPath, dashboardPath, sessionCookieName } = mergedConfig;

	// Check if route requires authentication
	const isProtected = isProtectedRoute(pathname, protectedRoutes);
	const isAuth = isAuthRoute(pathname, authRoutes);

	// Allow home page and non-protected routes
	if (!isProtected && !isAuth) {
		return undefined;
	}

	// ✅ SECURITY FIX: Optimistic cookie check ONLY (no API calls)
	const sessionCookie = request.cookies.get(sessionCookieName);
	const hasSessionCookie = Boolean(sessionCookie?.value);

	// Protected route without session cookie -> redirect to login
	if (isProtected && !hasSessionCookie) {
		const url = request.nextUrl.clone();
		url.pathname = loginPath;
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	// Auth route with session cookie -> redirect to dashboard
	// (User likely already logged in)
	if (isAuth && hasSessionCookie) {
		const url = request.nextUrl.clone();
		url.pathname = dashboardPath;
		return NextResponse.redirect(url);
	}

	// Allow request to proceed
	// ⚠️ IMPORTANT: Page components MUST verify session server-side
	// This middleware only checks cookie existence, not validity
	return undefined;
}

/**
 * Auth middleware with monitoring
 *
 * Tracks performance metrics for middleware execution
 */
export async function authMiddlewareWithMonitoring(
	request: NextRequest,
	config: Partial<AuthMiddlewareConfig> = {},
): Promise<NextResponse | undefined> {
	const startTime = Date.now();

	const response = await authMiddleware(request, config);

	const duration = Date.now() - startTime;

	// Optimistic checks should be <5ms
	if (duration > 5) {
		console.warn(`Slow middleware execution: ${duration}ms for ${request.nextUrl.pathname}`);
	}

	return response;
}
