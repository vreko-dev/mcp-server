import { auth } from "@snapback/auth";
// import { type NextRequest, NextResponse } from "next/server";
import * as semver from "semver";
import { getCacheKey, getOrCreateCache } from "../lib/cache";
import { log } from "../lib/logger";
import { checkRateLimit } from "../lib/rate-limit";
import { verifyRequestSignature } from "../lib/security";
import { getSubscription } from "../lib/subscription";
import { trackRateLimitViolation, trackUsage } from "../lib/usage";

// Temporary types to avoid Next.js dependency in API service
interface NextRequest {
	url: string;
	method: string;
	headers: {
		get(name: string): string | null;
	};
	nextUrl: {
		pathname: string;
	};
	text(): Promise<string>;
}

class NextResponse {
	status: number;
	headers: Map<string, string>;
	body: unknown;

	constructor(
		body: unknown,
		init?: { status?: number; headers?: Record<string, string> },
	) {
		this.body = body;
		this.status = init?.status || 200;
		this.headers = new Map(Object.entries(init?.headers || {}));
	}

	static json(
		data: unknown,
		init?: { status?: number; headers?: Record<string, string> },
	): NextResponse {
		return new NextResponse(data, init);
	}
}

// Define the request context type
interface RequestContext {
	requestId: string;
	userId: string;
	apiKeyId: string;
	// Subscription and session are complex objects from other packages
	// Using unknown to avoid implicit any, but allow flexibility without deep imports
	subscription: unknown;
	session: unknown;
}

export async function withUsageTracking(
	req: NextRequest,
	handler: (req: NextRequest, context: RequestContext) => Promise<NextResponse>,
) {
	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		// 1. Extract and verify API key
		const apiKey = req.headers.get("x-snapback-key");

		if (!apiKey) {
			return NextResponse.json({ error: "Missing API key" }, { status: 401 });
		}

		// 2. Get session from Better Auth
		const session = await auth.api.getSession({
			headers: req.headers,
		});

		if (!session) {
			return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
		}

		// 3. Verify request signature (if present)
		const signature = req.headers.get("x-snapback-signature");
		if (signature) {
			const isValid = await verifyRequestSignature(
				apiKey,
				signature,
				await req.text(),
			);

			if (!isValid) {
				return NextResponse.json(
					{ error: "Invalid signature" },
					{ status: 401 },
				);
			}
		}

		// 4. Check client version
		const clientVersion = req.headers.get("x-snapback-version");
		if (clientVersion && process.env.MIN_SUPPORTED_CLIENT_VERSION) {
			try {
				if (
					semver.lt(clientVersion, process.env.MIN_SUPPORTED_CLIENT_VERSION)
				) {
					return NextResponse.json(
						{
							error: "Extension update required",
							minVersion: process.env.MIN_SUPPORTED_CLIENT_VERSION,
							updateUrl: "vscode:extension/snapback.snapback",
						},
						{ status: 426 },
					);
				}
			} catch (error) {
				// If semver parsing fails, we'll allow the request to proceed
				log.error(error as Error, {
					context: "clientVersionCheck",
					clientVersion,
					minSupportedVersion: process.env.MIN_SUPPORTED_CLIENT_VERSION,
				});
			}
		}

		// 5. Get user subscription
		const subscription = await getSubscription(session.user.id);

		// 6. Check rate limits (token bucket)
		const rateLimitResult = await checkRateLimit(
			session.user.id,
			subscription.plan,
		);

		if (!rateLimitResult.allowed) {
			const retryAfter =
				"retryAfter" in rateLimitResult && rateLimitResult.retryAfter
					? rateLimitResult.retryAfter
					: 60;
			const consumed =
				"consumed" in rateLimitResult && rateLimitResult.consumed
					? rateLimitResult.consumed
					: 0;

			await trackRateLimitViolation({
				userId: session.user.id,
				apiKeyId: apiKey,
				limitType: "per_minute",
				currentValue: consumed,
				limitValue: rateLimitResult.limit,
				retryAfter,
			});

			return NextResponse.json(
				{
					error: "Rate limit exceeded",
					retryAfter,
					limit: rateLimitResult.limit,
					remaining: 0,
					upgradeUrl: "/pricing",
				},
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": rateLimitResult.limit.toString(),
						"X-RateLimit-Remaining": "0",
						"X-RateLimit-Reset": rateLimitResult.resetAt.toString(),
						"Retry-After": retryAfter.toString(),
					},
				},
			);
		}

		// 7. Check cache (for eligible endpoints)
		const cacheKey = getCacheKey(req, session.user.id);
		const cachedResponse = await getOrCreateCache(cacheKey, session.user.id);

		if (cachedResponse) {
			const responseTime = Date.now() - startTime;

			// Track cache hit
			await trackUsage({
				requestId,
				apiKeyId: apiKey,
				userId: session.user.id,
				endpoint: req.nextUrl.pathname,
				method: req.method,
				tokensUsed: cachedResponse.tokensUsed || 0,
				responseTime,
				responseStatus: 200,
				cached: true,
			});

			log.cacheHit(cacheKey, session.user.id);

			return NextResponse.json(cachedResponse.response, {
				status: 200,
				headers: {
					"X-Cache": "HIT",
					"X-Tokens-Used": (cachedResponse.tokensUsed || 0).toString(),
					"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
				},
			});
		}

		// 8. Execute handler
		const context: RequestContext = {
			requestId,
			userId: session.user.id,
			apiKeyId: apiKey,
			subscription,
			session,
		};

		const response = await handler(req, context);
		const responseTime = Date.now() - startTime;

		// 9. Track usage (async, don't block)
		const tokensUsed = Number.parseInt(
			response.headers.get("x-tokens-used") || "0",
			10,
		);

		trackUsage({
			requestId,
			apiKeyId: apiKey,
			userId: session.user.id,
			endpoint: req.nextUrl.pathname,
			method: req.method,
			tokensUsed,
			responseTime,
			responseStatus: response.status,
			cached: false,
			clientVersion: clientVersion || undefined,
			metadata: {
				platform: req.headers.get("x-snapback-platform") || undefined,
				ideVersion: req.headers.get("x-snapback-ide-version") || undefined,
				ipAddress: req.headers.get("x-forwarded-for") || undefined,
				userAgent: req.headers.get("user-agent") || undefined,
			},
		}).catch(console.error);

		// 10. Add response headers
		const responseHeaders: Record<string, string> = {
			"X-Request-Id": requestId,
			"X-Cache": "MISS",
			"X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
			"X-RateLimit-Limit": rateLimitResult.limit.toString(),
			"X-Response-Time": `${responseTime}ms`,
		};

		// Merge with response headers
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		return NextResponse.json(response.body, {
			status: response.status,
			headers: responseHeaders,
		});
	} catch (error) {
		const _responseTime = Date.now() - startTime;

		// Log error
		log.error(error as Error, {
			requestId,
			endpoint: req.nextUrl.pathname,
			method: req.method,
		});

		return NextResponse.json(
			{
				error: "Internal server error",
				requestId,
			},
			{ status: 500 },
		);
	}
}
