# Next.js 15 + React 19 SaaS Monetization Patterns

**Technology Stack**: Next.js 15, React 19, TypeScript, Supabase, Better Auth
**Focus**: Production-ready patterns for SaaS billing and API monetization

---

## 1. Next.js 15 App Router Architecture

### Route Structure for SaaS Billing

```typescript
// apps/web/app/api/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth";

export const runtime = "nodejs"; // or 'edge' for edge runtime
export const dynamic = "force-dynamic"; // Disable static optimization

export async function GET(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Fetch billing data
	return NextResponse.json({ data: billingData });
}

export async function POST(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();

	// Process billing update
	return NextResponse.json({ success: true });
}
```

### API Route Handler Best Practices

```typescript
// apps/web/app/api/v1/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { validateApiKey } from "@repo/api/lib/security";
import { trackUsage } from "@repo/api/lib/usage";

// Edge runtime for low latency
export const runtime = "edge";

export async function POST(request: NextRequest) {
	try {
		// Get API key from header
		const apiKey = request.headers.get("x-api-key");

		if (!apiKey) {
			return NextResponse.json(
				{ error: "API key required" },
				{ status: 401 }
			);
		}

		// Validate and get key details
		const keyData = await validateApiKey(apiKey);

		if (!keyData) {
			return NextResponse.json(
				{ error: "Invalid API key" },
				{ status: 403 }
			);
		}

		// Check quota limits
		if (keyData.usage >= keyData.quota) {
			return NextResponse.json(
				{ error: "Quota exceeded" },
				{ status: 429 }
			);
		}

		// Process request
		const body = await request.json();

		// Track usage asynchronously
		await trackUsage({
			apiKeyId: keyData.id,
			userId: keyData.userId,
			endpoint: request.nextUrl.pathname,
			timestamp: new Date(),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

---

## 2. Next.js 15 Middleware for API Key Validation

### Middleware Pattern

```typescript
// apps/web/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth";

// Match API routes that require authentication
export const config = {
	matcher: ["/api/v1/:path*", "/app/:path*", "/api/billing/:path*"],
};

export async function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// API Key validation for /api/v1/* routes
	if (pathname.startsWith("/api/v1/")) {
		const apiKey = request.headers.get("x-api-key");

		if (!apiKey) {
			return NextResponse.json(
				{ error: "API key required" },
				{ status: 401 }
			);
		}

		// Fast validation using edge-compatible storage
		const isValid = await validateApiKeyEdge(apiKey);

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid API key" },
				{ status: 403 }
			);
		}

		// Add user context to headers for downstream handlers
		const response = NextResponse.next();
		response.headers.set("x-user-id", userId);
		response.headers.set("x-api-key-id", keyId);

		return response;
	}

	// Session-based auth for /app/* routes
	if (pathname.startsWith("/app/")) {
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session) {
			return NextResponse.redirect(new URL("/auth/signin", request.url));
		}

		return NextResponse.next();
	}

	return NextResponse.next();
}

// Edge-compatible API key validation
async function validateApiKeyEdge(apiKey: string): Promise<boolean> {
	// Use KV store or edge-compatible database
	// Example with Vercel KV:
	// const keyData = await kv.get(`apikey:${apiKey}`);
	// return keyData?.active === true;

	return true; // Placeholder
}
```

---

## 3. React 19 Server Components vs Client Components

### Server Component Pattern (Default)

```typescript
// apps/web/app/(saas)/app/billing/page.tsx
import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import { BillingDashboard } from "@/modules/saas/billing/components/BillingDashboard";
import { getPurchases } from "@repo/api/modules/payments/procedures/list-purchases";

// Server Component by default in Next.js 15
export default async function BillingPage() {
	// Async data fetching in Server Component
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/auth/signin");
	}

	// Fetch data server-side
	const purchases = await getPurchases({ userId: session.user.id });
	const usage = await getUsageStats({ userId: session.user.id });

	return (
		<div>
			<h1>Billing Dashboard</h1>

			{/* Pass data to client component */}
			<BillingDashboard
				initialPurchases={purchases}
				initialUsage={usage}
			/>
		</div>
	);
}
```

### Client Component Pattern (Interactive UI)

```typescript
// apps/web/modules/saas/billing/components/BillingDashboard.tsx
"use client";

import { useState, useTransition } from "react";
import { updateSubscription } from "@/modules/saas/billing/actions/update-subscription";

interface BillingDashboardProps {
	initialPurchases: Purchase[];
	initialUsage: UsageStats;
}

export function BillingDashboard({
	initialPurchases,
	initialUsage,
}: BillingDashboardProps) {
	const [purchases, setPurchases] = useState(initialPurchases);
	const [isPending, startTransition] = useTransition();

	const handleUpgrade = () => {
		startTransition(async () => {
			// Server Action call
			const result = await updateSubscription({ plan: "pro" });

			if (result.success) {
				setPurchases(result.purchases);
			}
		});
	};

	return (
		<div>
			<UsageChart data={initialUsage} />

			<button onClick={handleUpgrade} disabled={isPending}>
				{isPending ? "Upgrading..." : "Upgrade Plan"}
			</button>
		</div>
	);
}
```

---

## 4. React 19 Server Actions for Payment Flows

### Server Action Pattern

```typescript
// apps/web/modules/saas/billing/actions/update-subscription.ts
"use server";

import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateSubscriptionSchema = z.object({
	plan: z.enum(["free", "starter", "pro", "enterprise"]),
});

export async function updateSubscription(
	formData: FormData | { plan: string }
) {
	// Get session
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/auth/signin");
	}

	// Parse and validate input
	const data =
		formData instanceof FormData ? Object.fromEntries(formData) : formData;

	const parsed = UpdateSubscriptionSchema.safeParse(data);

	if (!parsed.success) {
		return {
			success: false,
			error: "Invalid plan selection",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		// Update subscription via payment provider
		const result = await stripe.subscriptions.update(
			session.user.stripeSubscriptionId,
			{
				items: [{ price: getPriceId(parsed.data.plan) }],
			}
		);

		// Update database
		await db.purchase.update({
			where: { userId: session.user.id },
			data: { plan: parsed.data.plan },
		});

		// Revalidate billing page cache
		revalidatePath("/app/billing");

		return {
			success: true,
			purchases: await getPurchases({ userId: session.user.id }),
		};
	} catch (error) {
		console.error("Subscription update failed:", error);
		return {
			success: false,
			error: "Failed to update subscription",
		};
	}
}
```

### Form with Server Action

```typescript
// apps/web/modules/saas/billing/components/SubscriptionForm.tsx
"use client";

import { useFormStatus } from "react-dom";
import { updateSubscription } from "../actions/update-subscription";

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button type="submit" disabled={pending}>
			{pending ? "Updating..." : "Update Plan"}
		</button>
	);
}

export function SubscriptionForm() {
	return (
		<form action={updateSubscription}>
			<select name="plan">
				<option value="free">Free</option>
				<option value="starter">Starter</option>
				<option value="pro">Pro</option>
				<option value="enterprise">Enterprise</option>
			</select>

			<SubmitButton />
		</form>
	);
}
```

---

## 5. React 19 useOptimistic for Payment UI

### Optimistic UI Pattern

```typescript
// apps/web/modules/saas/billing/components/UsageCounter.tsx
"use client";

import { useOptimistic } from "react";
import { incrementUsage } from "../actions/increment-usage";

interface UsageCounterProps {
	initialCount: number;
	quota: number;
}

export function UsageCounter({ initialCount, quota }: UsageCounterProps) {
	const [optimisticCount, addOptimistic] = useOptimistic(
		initialCount,
		(currentCount, increment: number) => currentCount + increment
	);

	const handleIncrement = async () => {
		// Immediately update UI
		addOptimistic(1);

		// Perform server action
		await incrementUsage();
	};

	const percentageUsed = (optimisticCount / quota) * 100;

	return (
		<div>
			<div className="usage-bar">
				<div
					className="usage-fill"
					style={{ width: `${percentageUsed}%` }}
				/>
			</div>

			<p>
				{optimisticCount} / {quota} requests used
			</p>

			<button onClick={handleIncrement}>Make API Call</button>
		</div>
	);
}
```

---

## 6. Next.js 15 Streaming and Suspense Patterns

### Streaming Server Component

```typescript
// apps/web/app/(saas)/app/dashboard/page.tsx
import { Suspense } from "react";
import { UsageStats } from "@/modules/saas/dashboard/components/UsageStats";
import { RecentActivity } from "@/modules/saas/dashboard/components/RecentActivity";
import { BillingInfo } from "@/modules/saas/billing/components/BillingInfo";

export default function DashboardPage() {
	return (
		<div className="grid grid-cols-3 gap-6">
			{/* Fast component - renders immediately */}
			<Suspense fallback={<UsageStatsSkeleton />}>
				<UsageStats />
			</Suspense>

			{/* Slow component - streams in when ready */}
			<Suspense fallback={<ActivitySkeleton />}>
				<RecentActivity />
			</Suspense>

			{/* Another async component */}
			<Suspense fallback={<BillingSkeleton />}>
				<BillingInfo />
			</Suspense>
		</div>
	);
}
```

### Async Server Component

```typescript
// apps/web/modules/saas/dashboard/components/UsageStats.tsx
import { auth } from "@repo/auth";
import { getUsageStats } from "@repo/api/modules/auth/procedures/track-api-usage";

// Async Server Component
export async function UsageStats() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// This fetch can be slow - component will stream
	const stats = await getUsageStats({ userId: session.user.id });

	return (
		<div className="usage-card">
			<h3>API Usage</h3>
			<p>{stats.totalRequests} requests this month</p>
			<p>{stats.remainingQuota} remaining</p>
		</div>
	);
}
```

---

## 7. Next.js 15 Caching Strategies

### Fetch with Cache Options

```typescript
// apps/web/lib/api/usage.ts

// Cache for 1 hour
export async function getUsageStats(userId: string) {
	const response = await fetch(`/api/usage/${userId}`, {
		next: {
			revalidate: 3600, // Revalidate every hour
			tags: ["usage", `user:${userId}`],
		},
	});

	return response.json();
}

// No cache - always fresh
export async function getCurrentUsage(userId: string) {
	const response = await fetch(`/api/usage/${userId}/current`, {
		cache: "no-store", // Always fetch fresh
	});

	return response.json();
}

// Cache until manually revalidated
export async function getBillingInfo(userId: string) {
	const response = await fetch(`/api/billing/${userId}`, {
		next: {
			tags: ["billing", `user:${userId}`],
		},
	});

	return response.json();
}
```

### Route Handler Caching

```typescript
// apps/web/app/api/usage/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";

// Static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } }
) {
	const stats = await db.usage.aggregate({
		where: { userId: params.userId },
		_sum: { requests: true },
	});

	return NextResponse.json(stats, {
		headers: {
			"Cache-Control":
				"public, s-maxage=3600, stale-while-revalidate=7200",
		},
	});
}
```

### Manual Cache Revalidation

```typescript
// apps/web/modules/saas/billing/actions/update-subscription.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function updateSubscription(plan: string) {
	// Update subscription...

	// Revalidate specific paths
	revalidatePath("/app/billing");
	revalidatePath("/app/dashboard");

	// Revalidate by tag
	revalidateTag("billing");
	revalidateTag(`user:${userId}`);

	return { success: true };
}
```

---

## 8. Error Boundaries and Loading States

### Error Boundary

```typescript
// apps/web/app/(saas)/app/billing/error.tsx
"use client";

import { useEffect } from "react";

export default function BillingError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log error to monitoring service
		console.error("Billing page error:", error);
	}, [error]);

	return (
		<div className="error-container">
			<h2>Something went wrong with billing</h2>
			<p>{error.message}</p>
			<button onClick={reset}>Try again</button>
		</div>
	);
}
```

### Loading State

```typescript
// apps/web/app/(saas)/app/billing/loading.tsx
export default function BillingLoading() {
	return (
		<div className="animate-pulse">
			<div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
			<div className="h-32 bg-gray-200 rounded mb-4" />
			<div className="h-64 bg-gray-200 rounded" />
		</div>
	);
}
```

---

## 9. API Key Validation with Supabase

### Supabase Edge Function for Validation

```typescript
// packages/api/lib/security.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function validateApiKey(apiKey: string) {
	// Hash the API key (never store plain text)
	const hashedKey = await hashApiKey(apiKey);

	// Query Supabase
	const { data, error } = await supabase
		.from("api_keys")
		.select("id, user_id, quota, usage, active")
		.eq("key_hash", hashedKey)
		.eq("active", true)
		.single();

	if (error || !data) {
		return null;
	}

	// Check quota
	if (data.usage >= data.quota) {
		return null;
	}

	return {
		id: data.id,
		userId: data.user_id,
		quota: data.quota,
		usage: data.usage,
	};
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

### Usage Tracking with Supabase

```typescript
// packages/api/lib/usage.ts
export async function trackUsage(params: {
	apiKeyId: string;
	userId: string;
	endpoint: string;
	timestamp: Date;
}) {
	// Increment usage counter
	const { error: updateError } = await supabase
		.from("api_keys")
		.update({
			usage: supabase.sql`usage + 1`,
			last_used_at: params.timestamp.toISOString(),
		})
		.eq("id", params.apiKeyId);

	if (updateError) {
		console.error("Failed to update usage:", updateError);
	}

	// Log detailed usage
	const { error: insertError } = await supabase
		.from("api_usage_logs")
		.insert({
			api_key_id: params.apiKeyId,
			user_id: params.userId,
			endpoint: params.endpoint,
			timestamp: params.timestamp.toISOString(),
		});

	if (insertError) {
		console.error("Failed to log usage:", insertError);
	}
}
```

---

## 10. Complete Example: Monetized API Route

```typescript
// apps/web/app/api/v1/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@repo/api/lib/security";
import { trackUsage } from "@repo/api/lib/usage";
import { checkQuota } from "@repo/api/lib/quota";
import { z } from "zod";

export const runtime = "edge";

const AnalyzeRequestSchema = z.object({
	url: z.string().url(),
	options: z
		.object({
			depth: z.number().min(1).max(10).optional(),
		})
		.optional(),
});

export async function POST(request: NextRequest) {
	const startTime = Date.now();

	try {
		// 1. Validate API key
		const apiKey = request.headers.get("x-api-key");

		if (!apiKey) {
			return NextResponse.json(
				{ error: "API key required" },
				{ status: 401 }
			);
		}

		const keyData = await validateApiKey(apiKey);

		if (!keyData) {
			return NextResponse.json(
				{ error: "Invalid or inactive API key" },
				{ status: 403 }
			);
		}

		// 2. Check quota
		const quotaCheck = await checkQuota(keyData);

		if (!quotaCheck.allowed) {
			return NextResponse.json(
				{
					error: "Quota exceeded",
					quota: keyData.quota,
					usage: keyData.usage,
					resetDate: quotaCheck.resetDate,
				},
				{ status: 429 }
			);
		}

		// 3. Validate request body
		const body = await request.json();
		const parsed = AnalyzeRequestSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Invalid request",
					details: parsed.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		// 4. Process request
		const result = await analyzeUrl(parsed.data);

		// 5. Track usage (async, don't await)
		trackUsage({
			apiKeyId: keyData.id,
			userId: keyData.userId,
			endpoint: "/api/v1/analyze",
			timestamp: new Date(),
		}).catch(console.error);

		// 6. Return response
		const responseTime = Date.now() - startTime;

		return NextResponse.json(
			{
				success: true,
				data: result,
				meta: {
					responseTime,
					quotaRemaining: keyData.quota - keyData.usage - 1,
				},
			},
			{
				headers: {
					"X-RateLimit-Limit": keyData.quota.toString(),
					"X-RateLimit-Remaining": (
						keyData.quota -
						keyData.usage -
						1
					).toString(),
					"X-Response-Time": `${responseTime}ms`,
				},
			}
		);
	} catch (error) {
		console.error("API error:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				requestId: crypto.randomUUID(),
			},
			{ status: 500 }
		);
	}
}

async function analyzeUrl(data: z.infer<typeof AnalyzeRequestSchema>) {
	// Implementation
	return { analysis: "result" };
}
```

---

## 11. Rate Limiting Pattern

```typescript
// packages/api/lib/rate-limit.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RateLimitConfig {
	requests: number;
	windowSeconds: number;
}

export async function checkRateLimit(
	identifier: string,
	config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
	const now = new Date();
	const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

	// Count requests in current window
	const { count, error } = await supabase
		.from("rate_limit_logs")
		.select("*", { count: "exact", head: true })
		.eq("identifier", identifier)
		.gte("timestamp", windowStart.toISOString());

	if (error) {
		console.error("Rate limit check failed:", error);
		// Fail open for availability
		return {
			allowed: true,
			remaining: config.requests,
			resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
		};
	}

	const requestCount = count || 0;
	const allowed = requestCount < config.requests;

	if (allowed) {
		// Log this request
		await supabase.from("rate_limit_logs").insert({
			identifier,
			timestamp: now.toISOString(),
		});
	}

	return {
		allowed,
		remaining: Math.max(0, config.requests - requestCount - 1),
		resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
	};
}
```

---

## 12. Next.js 15 Edge Runtime Compatibility

### Understanding Runtime Environments

Next.js 15 supports three runtime environments:

1. **Browser** - Client-side execution in the user's browser
2. **Node.js** - Server-side execution with full Node.js APIs
3. **Edge** - Server-side execution with limited Web APIs only

### Runtime Selection

```typescript
// Specify runtime for API routes
export const runtime = "nodejs"; // or 'edge'
```

### Device Fingerprinting Implementation Patterns

#### Server-Side Fingerprinting (Route Handlers)

```typescript
// app/api/v1/device-fingerprint/route.ts
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Use Node.js runtime, not edge

export async function POST(request: NextRequest) {
	const headersList = await headers();

	// Next.js 15 compatible fingerprinting
	const fingerprint = {
		// Network-based (available in route handlers)
		userAgent: headersList.get("user-agent"),
		acceptLanguage: headersList.get("accept-language"),
		acceptEncoding: headersList.get("accept-encoding"),

		// CloudFlare/Vercel headers (if deployed there)
		cfRay: headersList.get("cf-ray"),
		cfCountry: headersList.get("cf-ipcountry"),
		vercelId: headersList.get("x-vercel-id"),

		// Client-provided data (from request body)
		...(await request.json()),
	};

	// Hash using Web Crypto API (Next.js 15 compatible)
	const encoder = new TextEncoder();
	const data = encoder.encode(JSON.stringify(fingerprint));
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const deviceId = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return NextResponse.json({ deviceId });
}
```

#### Client-Side Fingerprinting (Browser)

```typescript
// lib/client-fingerprint.ts
// Use built-in browser APIs for fingerprinting

export async function getClientFingerprint() {
	// This runs in the browser, fully compatible
	const components = {
		userAgent: navigator.userAgent,
		language: navigator.language,
		platform: navigator.platform,
		screenResolution: `${screen.width}x${screen.height}`,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		cookieEnabled: navigator.cookieEnabled,
		online: navigator.onLine,
	};

	// Hash using Web Crypto API
	const encoder = new TextEncoder();
	const data = encoder.encode(JSON.stringify(components));
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const fingerprint = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return {
		fingerprint,
		components,
	};
}

// app/components/trial-detector.tsx
("use client"); // Client component for Next.js 15

import { useEffect } from "react";
import { getClientFingerprint } from "@/lib/client-fingerprint";

export function TrialDetector() {
	useEffect(() => {
		async function detectDevice() {
			const fingerprint = await getClientFingerprint();

			// Send to API route
			const response = await fetch("/api/v1/device-trial/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(fingerprint),
			});
		}

		detectDevice();
	}, []);

	return null;
}
```

#### VSCode Extension Fingerprinting

```typescript
// extensions/vscode/src/fingerprint.ts
// This runs in VSCode's Node.js environment, NOT Next.js

import * as vscode from "vscode";
import * as os from "os";
import { createHash } from "crypto";

export async function getVSCodeFingerprint() {
	// VSCode APIs - these work in the extension
	const components = {
		machineId: vscode.env.machineId, // ✅ VSCode provides this
		sessionId: vscode.env.sessionId, // ✅ VSCode provides this
		platform: process.platform, // ✅ Works in VSCode extension
		hostname: os.hostname(), // ✅ Works in VSCode extension
		totalMemory: os.totalmem().toString(), // ✅ Works in VSCode extension
	};

	// Hash using Node.js crypto
	const hash = createHash("sha256");
	hash.update(JSON.stringify(components));
	const deviceId = hash.digest("hex");

	// The extension calls your Next.js API
	const response = await fetch(
		"https://api.snapback.dev/v1/device-fingerprint",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				machineId: vscode.env.machineId,
				platform: process.platform,
				// Don't send sensitive data
			}),
		}
	);

	return response.json();
}
```

### Middleware for API Protection

```typescript
// middleware.ts - Runs in Edge Runtime
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	// ✅ Edge-compatible operations only
	if (request.nextUrl.pathname.startsWith("/api")) {
		const apiKey = request.headers
			.get("authorization")
			?.replace("Bearer ", "");

		if (!apiKey) {
			return NextResponse.json(
				{ error: "Missing API key" },
				{ status: 401 }
			);
		}

		// Call Unkey API (external HTTP works in Edge)
		const validation = await fetch("https://api.unkey.dev/v1/keys/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.UNKEY_ROOT_KEY}`,
			},
			body: JSON.stringify({ key: apiKey }),
		});

		if (!validation.ok) {
			return NextResponse.json(
				{ error: "Invalid API key" },
				{ status: 401 }
			);
		}

		// Add validation result to headers
		const response = NextResponse.next();
		const data = await validation.json();
		response.headers.set("x-user-id", data.ownerId || "anonymous");
		response.headers.set("x-key-id", data.keyId);

		return response;
	}
}

export const config = {
	matcher: "/api/:path*",
};
```

### Proper Async Handling in Next.js 15

```typescript
// app/api/v1/checkpoint/route.ts
import { headers } from "next/headers";

// Specify runtime if using Node.js APIs
export const runtime = "nodejs"; // or 'edge' for Edge Runtime

export async function POST(request: Request) {
	// Next.js 15 requires await for headers/cookies/params
	const headersList = await headers();
	const userId = headersList.get("x-user-id");

	// Parse body
	const body = await request.json();

	// Use try-catch for proper error handling
	try {
		// Your logic here
		return Response.json({ success: true });
	} catch (error) {
		return Response.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

### Environment-Specific Code Patterns

```typescript
// lib/device-detection.ts
export function getDeviceInfo() {
	if (typeof window !== "undefined") {
		// Browser environment
		return {
			platform: navigator.platform,
			userAgent: navigator.userAgent,
			language: navigator.language,
			screenResolution: `${screen.width}x${screen.height}`,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};
	} else if (typeof process !== "undefined" && process.versions?.node) {
		// Node.js environment (VSCode extension or API routes with runtime='nodejs')
		const os = require("os");
		return {
			platform: os.platform(),
			hostname: os.hostname(),
			cpus: os.cpus().length,
			totalMemory: os.totalmem(),
		};
	} else {
		// Edge Runtime
		return {
			runtime: "edge",
			// Limited info available
		};
	}
}
```

### Best Practices for Next.js 15 Compatibility

1. **Runtime Declaration**
   Always specify the runtime when using Node.js-specific APIs:

    ```typescript
    export const runtime = "nodejs"; // Required for Node.js APIs
    ```

2. **Environment Checks**
   Check the environment before using platform-specific APIs:

    ```typescript
    // Check if running in browser
    if (typeof window !== "undefined") {
    	// Browser-specific code
    }

    // Check if running in Node.js
    if (typeof process !== "undefined" && process.versions?.node) {
    	// Node.js-specific code
    }
    ```

3. **Web Crypto API**
   Prefer Web Crypto API over Node.js crypto for Edge compatibility:

    ```typescript
    // Edge-compatible
    const encoder = new TextEncoder();
    const data = encoder.encode("string to hash");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Node.js only
    import { createHash } from "crypto";
    const hash = createHash("sha256");
    hash.update("string to hash");
    const digest = hash.digest("hex");
    ```

4. **Dynamic Imports**
   Use dynamic imports for client-only libraries:

    ```typescript
    // Client component
    "use client";

    useEffect(() => {
    	import("@fingerprintjs/fingerprintjs").then((FingerprintJS) => {
    		// Use library
    	});
    }, []);
    ```

### Summary: Next.js 15 Compatible Stack

| Component                    | Compatible Library       | Notes                                  |
| ---------------------------- | ------------------------ | -------------------------------------- |
| **Fingerprinting (Browser)** | Built-in Web APIs        | Client components only                 |
| **Fingerprinting (Server)**  | Web Crypto API + Headers | Built into Next.js 15                  |
| **Database**                 | `@supabase/ssr`          | Server components/routes               |
| **Auth**                     | `@snapback/auth`         | Fully compatible                       |
| **Analytics**                | `posthog-js`             | Client-side compatible                 |
| **Logging**                  | `pino`                   | Route handlers with `runtime='nodejs'` |
| **API Keys**                 | `@unkey/api`             | HTTP API calls work everywhere         |
| **Payments**                 | `stripe`                 | Server-side only                       |

**Key Rules for Next.js 15:**

1. Use `'use client'` for interactive components
2. Await `headers()`, `cookies()`, `params()`
3. Specify `runtime='nodejs'` for Node.js APIs
4. Use Web APIs in Edge Runtime
5. Handle async properly everywhere

---

## 13. Production Deployment Checklist

### Environment Variables

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Authentication
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payment Provider
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email Provider
RESEND_API_KEY=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

### Next.js Config Optimizations

```typescript
// apps/web/next.config.ts
import { NextConfig } from "next";

const config: NextConfig = {
	// Enable React 19 features
	experimental: {
		reactCompiler: true, // React Compiler for optimizations
	},

	// Optimize images
	images: {
		formats: ["image/avif", "image/webp"],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**.supabase.co",
			},
		],
	},

	// Headers for API security
	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
				],
			},
		];
	},
};

export default config;
```
