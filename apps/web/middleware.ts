import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const aj = arcjet({
	key: process.env.ARCJET_KEY!,
	// characteristics: ["ip.src"], // default
	rules: [
		shield({ mode: "LIVE" }),
		detectBot({
			mode: "LIVE",
			allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:PREVIEW"],
		}),
		// Global rate limit: 500 req/hour per IP
		slidingWindow({
			mode: "LIVE",
			interval: "1h",
			max: 500,
		}),
	],
});

function addSecurityHeaders(response: NextResponse): void {
	// Prevent clickjacking attacks
	response.headers.set("X-Frame-Options", "DENY");

	// Prevent MIME type sniffing
	response.headers.set("X-Content-Type-Options", "nosniff");

	// Control referrer information
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

	// XSS Protection (legacy, but still useful for older browsers)
	response.headers.set("X-XSS-Protection", "1; mode=block");

	// Content Security Policy
	const isDev = process.env.NODE_ENV !== "production";

	const scriptSrc = isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://i.posthog.com https://us-assets.i.posthog.com https://vercel.live https://cdn.jsdelivr.net https://va.vercel-scripts.com"
		: "script-src 'self' 'unsafe-inline' https://i.posthog.com https://us-assets.i.posthog.com https://vercel.live https://cdn.jsdelivr.net https://va.vercel-scripts.com";

	const cspDirectives = [
		"default-src 'self'",
		scriptSrc,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
		"font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
		"img-src 'self' data: https: blob:",
		"connect-src 'self' https://i.posthog.com https://us.i.posthog.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net https://va.vercel-scripts.com",
		"worker-src 'self' blob: https://cdn.jsdelivr.net",
		"frame-src 'self' https://vercel.live",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"upgrade-insecure-requests",
	].join("; ");

	response.headers.set("Content-Security-Policy", cspDirectives);

	// Permissions Policy (formerly Feature Policy)
	const permissionsPolicy = [
		"camera=()",
		"microphone=()",
		"geolocation=()",
		"interest-cohort=()",
	].join(", ");

	response.headers.set("Permissions-Policy", permissionsPolicy);
}

export async function middleware(req: NextRequest) {
	// Arcjet protection (only if key is present)
	if (process.env.ARCJET_KEY) {
		const decision = await aj.protect(req);

		if (decision.isDenied()) {
			if (decision.reason.isRateLimit()) {
				return NextResponse.json(
					{ error: "Too many requests", reason: "Rate limit exceeded" },
					{ status: 429 },
				);
			}
			if (decision.reason.isBot()) {
				return NextResponse.json(
					{ error: "Bot detected", reason: "Automated traffic denied" },
					{ status: 403 },
				);
			}
			return NextResponse.json(
				{ error: "Access denied", reason: "Security policy violation" },
				{ status: 403 },
			);
		}
	}

	const url = req.nextUrl;
	const host = req.headers.get("host") ?? "";
	const hostname = host.split(":")[0] ?? ""; // Handle ports

	// Console: console.snapback.dev -> /app/(...) routes
	if (hostname.startsWith("console.")) {
		// Root -> /app
		if (url.pathname === "/") {
			url.pathname = "/app";
			const response = NextResponse.rewrite(url);
			addSecurityHeaders(response);
			return response;
		}

		// If path doesn't already start with /app, prefix it
		if (!url.pathname.startsWith("/app")) {
			url.pathname = `/app${url.pathname}`;
			const response = NextResponse.rewrite(url);
			addSecurityHeaders(response);
			return response;
		}

		// Already /app/... -> passthrough
		const response = NextResponse.next();
		addSecurityHeaders(response);
		return response;
	}

	// Docs: new-docs.snapback.dev -> /docs routes
	if (hostname.startsWith("new-docs.")) {
		if (!url.pathname.startsWith("/docs")) {
			url.pathname = `/docs${url.pathname === "/" ? "" : url.pathname}`;
			const response = NextResponse.rewrite(url);
			addSecurityHeaders(response);
			return response;
		}
		const response = NextResponse.next();
		addSecurityHeaders(response);
		return response;
	}

	// Marketing: snapback.dev et al -> normal behavior
	// We accept any other hostname as marketing to be safe, or check the set
	// For now, we'll just pass through everything else as marketing
	const response = NextResponse.next();
	addSecurityHeaders(response);
	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
