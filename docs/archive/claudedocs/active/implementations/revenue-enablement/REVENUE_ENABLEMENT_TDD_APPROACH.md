# Revenue Enablement System - TDD Implementation Approach

**Last Updated**: 2025-10-04

## Tech Stack Alignment

### Infrastructure

-   **Database**: Supabase (managed PostgreSQL + Storage)
-   **ORM**: Drizzle ORM (NOT Prisma)
-   **Auth**: Better Auth with Drizzle adapter (NOT Supabase Auth, NOT Clerk)
-   **Storage**: Supabase Storage (S3-compatible)

### Application Stack

-   **Framework**: Next.js 15 (App Router) + React 19
-   **API**: Next.js Route Handlers + oRPC (existing)
-   **Payments**: Stripe (via @snapback/payments)
-   **Analytics**: PostHog
-   **Logging**: Pino
-   **Testing**: Vitest (unit/integration) + Playwright (E2E)

### Existing Packages

-   `@snapback/database` - Drizzle schema + Supabase client
-   `@snapback/auth` - Better Auth configuration
-   `@snapback/api` - API routes with oRPC
-   `@snapback/payments` - Stripe integration
-   `@snapback/storage` - Supabase Storage client
-   `@snapback/config` - App configuration

## Problem Statement

**Current Issue**: Users can create infinite free trials by reinstalling the VSCode extension.

**Solution**: Progressive authentication with device fingerprinting

1. **Stage 1 (Anonymous)**: 50 checkpoints using device fingerprint only
2. **Stage 2 (Email)**: 1,000 checkpoints after email signup
3. **Stage 3 (Paid)**: Unlimited checkpoints after payment

## Existing Database Schema (Already Built)

✅ `user` - Better Auth users
✅ `session` - Better Auth sessions
✅ `apiKeys` - Better Auth API keys
✅ `checkpoints` - Privacy-first checkpoint metadata
✅ `checkpointFiles` - Individual file metadata
✅ `apiKeyMetadata` - Extended API key tracking
✅ `apiUsageLogs` - Partitioned usage logs (by month)
✅ `usageStatsDaily` - Aggregated daily stats
✅ `organization` - Team/org management
✅ `planTypeEnum` - "free" | "solo" | "team" | "enterprise"
✅ `deviceTrials` - Device trial tracking with anti-abuse measures

## TDD Implementation Strategy

### Phase 1: Red Phase (Write Tests First)

#### Test 1.1: Authentication Middleware

**File**: `apps/web/__tests__/middleware/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { authMiddleware } from "../../middleware/auth";

describe("Authentication Middleware", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should allow requests with valid API key", async () => {
		// TODO: Test valid API key authentication
		// - Mock request with valid Authorization header
		// - Mock database lookup for API key
		// - Verify middleware calls next() without error
		// - Verify user/device context is attached to request
	});

	it("should reject requests with invalid API key", async () => {
		// TODO: Test invalid API key rejection
		// - Mock request with invalid Authorization header
		// - Verify middleware returns 401 Unauthorized
		// - Verify appropriate error message
	});

	it("should reject requests without Authorization header", async () => {
		// TODO: Test missing Authorization header
		// - Mock request without Authorization header
		// - Verify middleware returns 401 Unauthorized
		// - Verify appropriate error message
	});

	it("should validate JWT tokens for authenticated users", async () => {
		// TODO: Test JWT validation
		// - Mock request with valid JWT token
		// - Mock Better Auth session validation
		// - Verify user context is attached to request
	});

	it("should reject expired JWT tokens", async () => {
		// TODO: Test expired JWT rejection
		// - Mock request with expired JWT token
		// - Verify middleware returns 401 Unauthorized
		// - Verify appropriate error message
	});
});
```

#### Test 1.2: Rate Limiting Middleware

**File**: `apps/web/__tests__/middleware/rate-limit.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimitMiddleware } from "../../middleware/rate-limit";

describe("Rate Limiting Middleware", () => {
	beforeEach(() => {
		// Reset mocks and Redis
		vi.resetAllMocks();
	});

	it("should allow requests under rate limit for free tier", async () => {
		// TODO: Test free tier rate limiting
		// - Mock request with free tier API key
		// - Make 99 requests (under 100/hour limit)
		// - Verify all requests pass
	});

	it("should block requests over rate limit for free tier", async () => {
		// TODO: Test free tier rate limit blocking
		// - Mock request with free tier API key
		// - Make 101 requests (over 100/hour limit)
		// - Verify 101st request is blocked with 429
	});

	it("should allow higher limits for paid tiers", async () => {
		// TODO: Test paid tier higher limits
		// - Mock request with solo tier API key
		// - Make 1000 requests (under 1000/hour limit)
		// - Verify all requests pass
	});

	it("should reset counters properly", async () => {
		// TODO: Test counter reset
		// - Mock time progression
		// - Verify counters reset at proper intervals
	});

	it("should handle concurrent requests properly", async () => {
		// TODO: Test concurrent request handling
		// - Simulate multiple simultaneous requests
		// - Verify rate limiting works correctly under load
	});
});
```

#### Test 1.3: Usage Tracking Middleware

**File**: `apps/web/__tests__/middleware/usage-tracking.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usageTrackingMiddleware } from "../../middleware/usage-tracking";

describe("Usage Tracking Middleware", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should track API calls for device trials", async () => {
		// TODO: Test device trial usage tracking
		// - Mock request with device trial API key
		// - Verify apiCallsUsed incremented in database
		// - Verify lastSeenAt updated
	});

	it("should track API calls for authenticated users", async () => {
		// TODO: Test authenticated user usage tracking
		// - Mock request with authenticated user
		// - Verify usage tracked against user's plan limits
	});

	it("should block requests when checkpoint limit reached", async () => {
		// TODO: Test checkpoint limit blocking
		// - Mock device trial with 50/50 checkpoints used
		// - Make request to checkpoint endpoint
		// - Verify 402 Payment Required response
	});

	it("should allow requests when under limits", async () => {
		// TODO: Test under limit allowance
		// - Mock device trial with 25/50 checkpoints used
		// - Make request to checkpoint endpoint
		// - Verify request allowed to proceed
	});

	it("should update usage stats daily", async () => {
		// TODO: Test daily stats aggregation
		// - Mock multiple API calls
		// - Verify usageStatsDaily updated correctly
	});
});
```

#### Test 1.4: GET /api/v1/user/me

**File**: `apps/web/__tests__/api/user.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../../app/api/v1/user/me/route";

describe("GET /api/v1/user/me", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should return user info with plan and limits for authenticated users", async () => {
		// TODO: Test authenticated user response
		// - Mock authenticated request
		// - Mock database lookup for user and usage
		// - Verify response includes:
		//   - userId
		//   - email
		//   - plan
		//   - limits object with checkpoints, requestsPerHour, storage
		//   - usage object with current usage
	});

	it("should return device trial info for anonymous users", async () => {
		// TODO: Test device trial response
		// - Mock request with device trial API key
		// - Mock database lookup for device trial
		// - Verify response includes:
		//   - deviceId
		//   - plan: "free"
		//   - limits object with trial limits
		//   - usage object with current usage
	});

	it("should calculate remaining limits correctly", async () => {
		// TODO: Test limit calculation
		// - Mock user/device with specific usage
		// - Verify remaining limits calculated correctly
	});

	it("should handle database errors gracefully", async () => {
		// TODO: Test error handling
		// - Mock database failure
		// - Verify 500 Internal Server Error response
	});

	it("should include upgrade prompts when near limits", async () => {
		// TODO: Test upgrade prompts
		// - Mock user/device at 80%+ usage
		// - Verify upgradePrompt included in response
	});
});
```

#### Test 1.5: POST /api/v1/checkpoints/metadata

**File**: `apps/web/__tests__/api/checkpoints/metadata.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../app/api/v1/checkpoints/metadata/route";

describe("POST /api/v1/checkpoints/metadata", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should create checkpoint metadata for device trials under limit", async () => {
		// TODO: Test device trial checkpoint creation
		// - Mock request with device trial API key
		// - Mock 25/50 checkpoints used
		// - Verify checkpoint created in database
		// - Verify checkpointsUsed incremented
		// - Verify 201 Created response
	});

	it("should block checkpoint creation when limit reached", async () => {
		// TODO: Test limit blocking
		// - Mock request with device trial API key
		// - Mock 50/50 checkpoints used
		// - Verify 402 Payment Required response
	});

	it("should create checkpoint for authenticated users under limit", async () => {
		// TODO: Test authenticated user checkpoint creation
		// - Mock request with authenticated user
		// - Mock usage under plan limits
		// - Verify checkpoint created in database
		// - Verify usage tracking updated
	});

	it("should validate request body", async () => {
		// TODO: Test request validation
		// - Mock request with invalid body
		// - Verify 400 Bad Request response
		// - Verify appropriate error message
	});

	it("should handle database errors gracefully", async () => {
		// TODO: Test database error handling
		// - Mock database failure
		// - Verify 500 Internal Server Error response
	});
});
```

#### Test 1.6: GET /api/v1/checkpoints/list

**File**: `apps/web/__tests__/api/checkpoints/list.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../../app/api/v1/checkpoints/list/route";

describe("GET /api/v1/checkpoints/list", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should list checkpoints for device trial user", async () => {
		// TODO: Test device trial checkpoint listing
		// - Mock request with device trial API key
		// - Mock database with checkpoints
		// - Verify response includes checkpoint list
		// - Verify pagination works correctly
	});

	it("should list checkpoints for authenticated user", async () => {
		// TODO: Test authenticated user checkpoint listing
		// - Mock request with authenticated user
		// - Mock database with user's checkpoints
		// - Verify response includes user's checkpoints only
	});

	it("should apply project filtering", async () => {
		// TODO: Test project filtering
		// - Mock request with projectId query param
		// - Verify response filtered by project
	});

	it("should handle pagination correctly", async () => {
		// TODO: Test pagination
		// - Mock request with limit and offset
		// - Verify pagination metadata in response
	});

	it("should handle database errors gracefully", async () => {
		// TODO: Test error handling
		// - Mock database failure
		// - Verify 500 Internal Server Error response
	});
});
```

#### Test 1.7: POST /api/v1/telemetry/event

**File**: `apps/web/__tests__/api/telemetry/event.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../app/api/v1/telemetry/event/route";

describe("POST /api/v1/telemetry/event", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should log telemetry events", async () => {
		// TODO: Test event logging
		// - Mock telemetry event request
		// - Verify event stored in database
		// - Verify 200 OK response
	});

	it("should validate event structure", async () => {
		// TODO: Test event validation
		// - Mock request with invalid event structure
		// - Verify 400 Bad Request response
	});

	it("should handle high volume events efficiently", async () => {
		// TODO: Test high volume handling
		// - Simulate multiple concurrent events
		// - Verify performance under load
	});

	it("should include device context", async () => {
		// TODO: Test device context inclusion
		// - Mock request with device trial
		// - Verify device context included in event
	});

	it("should handle database errors gracefully", async () => {
		// TODO: Test error handling
		// - Mock database failure
		// - Verify 500 Internal Server Error response
	});
});
```

#### Test 1.8: POST /api/v1/billing/create-checkout

**File**: `apps/web/__tests__/api/billing/create-checkout.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../app/api/v1/billing/create-checkout/route";

describe("POST /api/v1/billing/create-checkout", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should create Stripe checkout session for plan upgrade", async () => {
		// TODO: Test checkout creation
		// - Mock request with plan selection
		// - Mock Stripe checkout session creation
		// - Verify checkout URL returned
		// - Verify 200 OK response
	});

	it("should validate plan selection", async () => {
		// TODO: Test plan validation
		// - Mock request with invalid plan
		// - Verify 400 Bad Request response
	});

	it("should include success/cancel URLs", async () => {
		// TODO: Test URL inclusion
		// - Mock request with redirect URLs
		// - Verify URLs passed to Stripe correctly
	});

	it("should handle Stripe errors gracefully", async () => {
		// TODO: Test Stripe error handling
		// - Mock Stripe API failure
		// - Verify 500 Internal Server Error response
	});

	it("should track checkout initiation in analytics", async () => {
		// TODO: Test analytics tracking
		// - Mock checkout creation
		// - Verify PostHog event tracked
	});
});
```

#### Test 1.9: Stripe Webhook Handler

**File**: `apps/web/__tests__/api/webhooks/stripe.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../app/api/webhooks/stripe/route";

describe("Stripe Webhook Handler", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should handle customer.subscription.created", async () => {
		// TODO: Test subscription creation
		// - Mock subscription.created webhook
		// - Verify user plan updated in database
		// - Verify paymentsCustomerId linked
		// - Verify PostHog event tracked
	});

	it("should handle customer.subscription.updated", async () => {
		// TODO: Test subscription update
		// - Mock subscription.updated webhook
		// - Verify plan changes applied
	});

	it("should handle customer.subscription.deleted", async () => {
		// TODO: Test subscription cancellation
		// - Mock subscription.deleted webhook
		// - Verify user downgraded to free tier
		// - Verify cloud backup disabled
	});

	it("should verify webhook signature", async () => {
		// TODO: Test signature verification
		// - Mock request with invalid signature
		// - Verify 400 Bad Request response
	});

	it("should handle checkout.session.completed", async () => {
		// TODO: Test checkout completion
		// - Mock checkout.session.completed webhook
		// - Verify one-time purchase recorded
	});
});
```

#### Test 1.10: Device Trials Integration

**File**: `apps/web/__tests__/services/device-trials.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceTrialsService } from "../../services/device-trials";

describe("Device Trials Service", () => {
	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();
	});

	it("should create new device trial for unknown device", async () => {
		// TODO: Test new trial creation
		// - Mock unknown device fingerprint
		// - Verify new device trial created
		// - Verify API key generated
		// - Verify default limits set
	});

	it("should return existing trial for known device", async () => {
		// TODO: Test existing trial retrieval
		// - Mock known device fingerprint
		// - Verify existing trial returned
		// - Verify installCount incremented
	});

	it("should block after 3 reinstalls", async () => {
		// TODO: Test reinstall blocking
		// - Mock device with 3 reinstalls
		// - Verify blockedUntil set
		// - Verify 403 Forbidden response
	});

	it("should enforce 24h cooldown", async () => {
		// TODO: Test cooldown enforcement
		// - Mock recently blocked device
		// - Verify 429 Too Many Requests response
	});

	it("should link device to user on conversion", async () => {
		// TODO: Test device linking
		// - Mock device trial and user signup
		// - Verify device linked to user
		// - Verify limits increased
		// - Verify PostHog identity merged
	});
});
```

### Phase 2: Green Phase (Implement to Pass Tests)

#### Implementation 2.1: Authentication Middleware

**File**: `apps/web/middleware/auth.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { apiKeys } from "@snapback/database/drizzle/schema/postgres";
import { deviceTrials } from "@snapback/database/drizzle/schema/snapback";
import { eq } from "drizzle-orm";
import { auth } from "@snapback/auth";
import { logger } from "@snapback/logs";

/**
 * Authentication Middleware
 *
 * Validates API keys and JWT tokens for requests to protected endpoints
 *
 * TODO:
 * - [ ] Extract Authorization header from request
 * - [ ] Determine auth type (Bearer API key vs JWT token)
 * - [ ] For API key:
 *   - [ ] Extract key from "Bearer <key>" format
 *   - [ ] Lookup key in database (hashed comparison)
 *   - [ ] Verify key not expired or revoked
 *   - [ ] Attach device trial context if applicable
 * - [ ] For JWT:
 *   - [ ] Validate token with Better Auth
 *   - [ ] Extract user session
 *   - [ ] Attach user context
 * - [ ] Handle errors:
 *   - [ ] Missing auth: 401 Unauthorized
 *   - [ ] Invalid auth: 401 Unauthorized
 *   - [ ] Expired auth: 401 Unauthorized
 *   - [ ] Revoked auth: 401 Unauthorized
 * - [ ] Attach auth context to request for downstream middleware
 */
export async function authMiddleware(request: NextRequest) {
	try {
		// TODO: Implement authentication logic

		// Placeholder response
		return NextResponse.next();
	} catch (error) {
		logger.error("Authentication middleware error", { error });
		return NextResponse.json(
			{ error: "Authentication failed" },
			{ status: 401 }
		);
	}
}
```

#### Implementation 2.2: Rate Limiting Middleware

**File**: `apps/web/middleware/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@snapback/logs";

/**
 * Rate Limiting Middleware
 *
 * Enforces API call limits based on subscription plans
 *
 * Plan Limits:
 * - Free/Device Trial: 100 API calls per hour
 * - Solo: 1,000 API calls per hour
 * - Team: 10,000 API calls per hour
 * - Enterprise: Unlimited
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] Determine plan/limits for context
 * - [ ] Track API calls in Redis (sliding window)
 * - [ ] Check if current request exceeds limits
 * - [ ] If exceeded:
 *   - [ ] Return 429 Too Many Requests
 *   - [ ] Include Retry-After header
 * - [ ] If not exceeded:
 *   - [ ] Increment counter
 *   - [ ] Call next() to continue
 * - [ ] Handle Redis errors gracefully
 * - [ ] Log rate limiting events for analytics
 */
export async function rateLimitMiddleware(request: NextRequest) {
	try {
		// TODO: Implement rate limiting logic

		// Placeholder response
		return NextResponse.next();
	} catch (error) {
		logger.error("Rate limiting middleware error", { error });
		return NextResponse.json(
			{ error: "Rate limiting check failed" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.3: Usage Tracking Middleware

**File**: `apps/web/middleware/usage-tracking.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * Usage Tracking Middleware
 *
 * Tracks API usage and enforces limits for checkpoints and API calls
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] Determine if this is a checkpoint-related endpoint
 * - [ ] If checkpoint endpoint:
 *   - [ ] Check current checkpoint usage
 *   - [ ] Compare against plan limits
 *   - [ ] If at/over limit:
 *     - [ ] Return 402 Payment Required
 *     - [ ] Include upgrade prompt
 *   - [ ] If under limit:
 *     - [ ] Allow request to proceed
 * - [ ] For all endpoints:
 *   - [ ] Increment apiCallsUsed counter
 *   - [ ] Update lastSeenAt timestamp
 * - [ ] Update daily usage stats
 * - [ ] Handle database errors gracefully
 */
export async function usageTrackingMiddleware(request: NextRequest) {
	try {
		// TODO: Implement usage tracking logic

		// Placeholder response
		return NextResponse.next();
	} catch (error) {
		logger.error("Usage tracking middleware error", { error });
		return NextResponse.json(
			{ error: "Usage tracking failed" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.4: GET /api/v1/user/me

**File**: `apps/web/app/api/v1/user/me/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * GET /api/v1/user/me
 *
 * Returns user information including subscription plan and usage limits
 *
 * Response Structure:
 * {
 *   "userId": "string",
 *   "email": "string",
 *   "plan": "free|solo|team|enterprise",
 *   "limits": {
 *     "checkpoints": number,
 *     "requestsPerHour": number,
 *     "storage": number // in MB
 *   },
 *   "usage": {
 *     "checkpoints": number,
 *     "requestsThisHour": number,
 *     "storage": number // in MB
 *   },
 *   "upgradePrompt"?: {
 *     "message": "string",
 *     "cta": "string",
 *     "ctaUrl": "string"
 *   }
 * }
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] For authenticated users:
 *   - [ ] Fetch user data from database
 *   - [ ] Fetch subscription data
 *   - [ ] Calculate current usage from Redis/stats
 *   - [ ] Return user-specific plan and limits
 * - [ ] For device trials:
 *   - [ ] Fetch device trial data
 *   - [ ] Return trial-specific limits (50 checkpoints)
 *   - [ ] Include upgrade prompt if near limits
 * - [ ] Calculate remaining limits
 * - [ ] Add upgrade prompt if >80% usage
 * - [ ] Handle errors gracefully
 */
export async function GET(request: NextRequest) {
	try {
		// TODO: Implement user info logic

		// Placeholder response
		return NextResponse.json({
			userId: "placeholder",
			email: "placeholder@example.com",
			plan: "free",
			limits: {
				checkpoints: 50,
				requestsPerHour: 100,
				storage: 0,
			},
			usage: {
				checkpoints: 0,
				requestsThisHour: 0,
				storage: 0,
			},
		});
	} catch (error) {
		logger.error("User info endpoint error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.5: POST /api/v1/checkpoints/metadata

**File**: `apps/web/app/api/v1/checkpoints/metadata/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { checkpoints } from "@snapback/database/drizzle/schema/snapback/checkpoints";
import { logger } from "@snapback/logs";
import { nanoid } from "nanoid";

/**
 * POST /api/v1/checkpoints/metadata
 *
 * Creates and stores checkpoint metadata
 *
 * Request Body:
 * {
 *   "name": "string",
 *   "description": "string",
 *   "tags": ["string"],
 *   "projectId": "string"
 * }
 *
 * Response Structure:
 * {
 *   "checkpointId": "string",
 *   "createdAt": "ISO timestamp",
 *   "metadata": {
 *     "name": "string",
 *     "description": "string",
 *     "tags": ["string"],
 *     "projectId": "string"
 *   }
 * }
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] Validate request body
 * - [ ] Check checkpoint limits (middleware should have done this, but double-check)
 * - [ ] Generate checkpoint ID
 * - [ ] Insert checkpoint metadata into database:
 *   - [ ] Use checkpoints table
 *   - [ ] Include privacy-safe metadata only
 *   - [ ] Link to user/device context
 * - [ ] Update usage tracking (checkpointsUsed)
 * - [ ] Return checkpoint ID and metadata
 * - [ ] Handle database errors gracefully
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement checkpoint creation logic

		// Placeholder response
		const checkpointId = `ckpt_${nanoid()}`;
		const metadata = await request.json();

		return NextResponse.json(
			{
				checkpointId,
				createdAt: new Date().toISOString(),
				metadata,
			},
			{ status: 201 }
		);
	} catch (error) {
		logger.error("Checkpoint creation error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.6: GET /api/v1/checkpoints/list

**File**: `apps/web/app/api/v1/checkpoints/list/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * GET /api/v1/checkpoints/list
 *
 * Lists checkpoints for the authenticated user/device
 *
 * Query Parameters:
 * - projectId (optional) - Filter by project
 * - limit (optional, default 50) - Number of checkpoints to return
 * - offset (optional, default 0) - Pagination offset
 *
 * Response Structure:
 * {
 *   "checkpoints": [
 *     {
 *       "checkpointId": "string",
 *       "name": "string",
 *       "createdAt": "ISO timestamp",
 *       "projectId": "string"
 *     }
 *   ],
 *   "totalCount": number
 * }
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] Parse query parameters
 * - [ ] Query database for checkpoints:
 *   - [ ] For authenticated users: user's checkpoints only
 *   - [ ] For device trials: device's checkpoints only
 *   - [ ] Apply projectId filtering if provided
 *   - [ ] Apply pagination (limit/offset)
 *   - [ ] Sort by creation date (newest first)
 * - [ ] Count total matching checkpoints
 * - [ ] Return checkpoint list and totalCount
 * - [ ] Handle database errors gracefully
 */
export async function GET(request: NextRequest) {
	try {
		// TODO: Implement checkpoint listing logic

		// Placeholder response
		return NextResponse.json({
			checkpoints: [],
			totalCount: 0,
		});
	} catch (error) {
		logger.error("Checkpoint listing error", { error });
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.7: POST /api/v1/telemetry/event

**File**: `apps/web/app/api/v1/telemetry/event/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * POST /api/v1/telemetry/event
 *
 * Collects telemetry data from the VS Code extension
 *
 * Request Body:
 * {
 *   "eventType": "string",
 *   "timestamp": "ISO timestamp",
 *   "data": {}
 * }
 *
 * Response Structure:
 * {
 *   "success": true
 * }
 *
 * TODO:
 * - [ ] Extract user/device context from request
 * - [ ] Validate request body structure
 * - [ ] Store event in time-series database:
 *   - [ ] Include user/device context
 *   - [ ] Include event type and timestamp
 *   - [ ] Store event data (privacy-safe)
 *   - [ ] Include client metadata (version, platform)
 * - [ ] Log event to analytics (PostHog)
 * - [ ] Return success response quickly (no heavy processing)
 * - [ ] Handle database errors gracefully (don't fail request)
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement telemetry event logic

		// Placeholder response
		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error("Telemetry event error", { error });
		// Don't fail the request for telemetry errors
		return NextResponse.json({ success: true });
	}
}
```

#### Implementation 2.8: POST /api/v1/billing/create-checkout

**File**: `apps/web/app/api/v1/billing/create-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createCheckoutLink } from "@snapback/payments/provider/stripe";
import { logger } from "@snapback/logs";

/**
 * POST /api/v1/billing/create-checkout
 *
 * Creates a Stripe checkout session for plan upgrades
 *
 * Request Body:
 * {
 *   "plan": "solo|team|enterprise",
 *   "successUrl": "string",
 *   "cancelUrl": "string"
 * }
 *
 * Response Structure:
 * {
 *   "checkoutUrl": "string"
 * }
 *
 * TODO:
 * - [ ] Extract user context from request (must be authenticated)
 * - [ ] Validate request body:
 *   - [ ] Check plan is valid
 *   - [ ] Check successUrl and cancelUrl provided
 *   - [ ] Validate URLs are secure (https)
 * - [ ] Create Stripe checkout session:
 *   - [ ] Use @snapback/payments createCheckoutLink
 *   - [ ] Pass plan information
 *   - [ ] Pass redirect URLs
 *   - [ ] Pass user context
 * - [ ] Track checkout initiation in analytics
 * - [ ] Return checkout URL to client
 * - [ ] Handle Stripe errors gracefully
 */
export async function POST(request: NextRequest) {
	try {
		// TODO: Implement checkout creation logic

		// Placeholder response
		return NextResponse.json({
			checkoutUrl: "https://checkout.stripe.com/placeholder",
		});
	} catch (error) {
		logger.error("Checkout creation error", { error });
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 }
		);
	}
}
```

#### Implementation 2.9: Stripe Webhook Handler

**File**: `apps/web/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { webhookHandler } from "@snapback/payments/provider/stripe";
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events
 *
 * Events Handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * TODO:
 * - [ ] Use existing @snapback/payments webhookHandler
 * - [ ] Extend with additional business logic:
 *   - [ ] For customer.subscription.created:
 *     - [ ] Update user plan in database
 *     - [ ] Enable cloud backup permission
 *     - [ ] Send welcome email via @snapback/mail
 *     - [ ] Track "subscription_created" event (PostHog)
 *   - [ ] For customer.subscription.updated:
 *     - [ ] Update user plan if changed
 *     - [ ] Adjust permissions accordingly
 *   - [ ] For customer.subscription.deleted:
 *     - [ ] Downgrade user tier to "free"
 *     - [ ] Set checkpoint limit to 1000 (preserve email tier)
 *     - [ ] Disable cloud backup
 *     - [ ] DO NOT delete local checkpoints
 *     - [ ] Send cancellation email
 *     - [ ] Track "subscription_cancelled" event
 *   - [ ] For checkout.session.completed:
 *     - [ ] Handle one-time purchases
 *   - [ ] Log all events to Pino
 * - [ ] Return 200 OK to Stripe
 * - [ ] Handle errors and return appropriate status codes
 */
export async function POST(request: NextRequest) {
	try {
		// Use existing webhook handler and extend as needed
		return await webhookHandler(request);
	} catch (error) {
		logger.error("Stripe webhook processing failed", { error });
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 400 }
		);
	}
}
```

#### Implementation 2.10: Device Trials Service

**File**: `apps/web/services/device-trials.ts`

```typescript
import { db } from "@snapback/database/drizzle/client";
import { deviceTrials } from "@snapback/database/drizzle/schema/snapback/device-trials";
import { apiKeys } from "@snapback/database/drizzle/schema/postgres";
import { eq, and, gte } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { nanoid } from "nanoid";
import { logger } from "@snapback/logs";

/**
 * Device Trials Service
 *
 * Manages device trial creation, validation, and anti-abuse measures
 *
 * TODO:
 * - [ ] getOrCreateDeviceTrial(deviceFingerprint):
 *   - [ ] Check if device trial exists
 *   - [ ] If exists:
 *     - [ ] Check if blocked (installCount > 3 or blockedUntil in future)
 *     - [ ] If blocked: throw error
 *     - [ ] If not blocked: increment installCount, update lastSeenAt
 *   - [ ] If not exists:
 *     - [ ] Generate API key
 *     - [ ] Create device trial record with default limits
 *     - [ ] Return API key and trial info
 * - [ ] linkDeviceToUser(deviceFingerprint, userId):
 *   - [ ] Find device trial by fingerprint
 *   - [ ] Verify not already linked to different user
 *   - [ ] Update device trial with userId and convertedAt
 *   - [ ] Increase limits to email tier (1000 checkpoints)
 *   - [ ] Merge analytics identities (PostHog)
 * - [ ] isDeviceBlocked(deviceFingerprint):
 *   - [ ] Check installCount > 3
 *   - [ ] Check blockedUntil in future
 *   - [ ] Return boolean
 * - [ ] generateApiKey():
 *   - [ ] Generate secure API key
 *   - [ ] Hash for storage
 *   - [ ] Return both raw and hashed versions
 * - [ ] validateDeviceTrial(deviceFingerprint):
 *   - [ ] Check if trial exists
 *   - [ ] Check if blocked
 *   - [ ] Return trial info if valid
 */
export class DeviceTrialsService {
	// TODO: Implement device trials service methods
}
```

### Phase 3: Services & Utilities

#### Service 3.1: Usage Limit Service

**File**: `apps/web/services/usage-limits.ts`

```typescript
import { db } from "@snapback/database/drizzle/client";
import { logger } from "@snapback/logs";

/**
 * Usage Limits Service
 *
 * Manages usage limit calculations and enforcement
 *
 * TODO:
 * - [ ] getUsageLimits(userId|deviceFingerprint):
 *   - [ ] Determine user/device context
 *   - [ ] Fetch current usage from database/Redis
 *   - [ ] Get plan limits from subscription or trial
 *   - [ ] Calculate remaining limits
 *   - [ ] Determine if upgrade prompt needed (>80% usage)
 *   - [ ] Return usage limits object
 * - [ ] checkLimits(userId|deviceFingerprint):
 *   - [ ] Get current usage and limits
 *   - [ ] Check if at/over any limits
 *   - [ ] Return boolean and limit info
 * - [ ] incrementUsage(userId|deviceFingerprint, usageType, amount):
 *   - [ ] Increment specific usage counter
 *   - [ ] Update daily stats
 *   - [ ] Check if new limits exceeded
 *   - [ ] Return updated usage info
 * - [ ] shouldPromptUpgrade(usageStats):
 *   - [ ] Check if any usage >80% of limits
 *   - [ ] Return boolean and prompt info
 */
export class UsageLimitsService {
	// TODO: Implement usage limits service methods
}
```

#### Service 3.2: Analytics Service

**File**: `apps/web/services/analytics.ts`

```typescript
import { logger } from "@snapback/logs";

/**
 * Analytics Service
 *
 * Handles analytics event tracking and identity management
 *
 * TODO:
 * - [ ] trackEvent(event, properties, userId|deviceFingerprint):
 *   - [ ] Send event to PostHog
 *   - [ ] Include user/device context
 *   - [ ] Handle errors gracefully
 * - [ ] identifyUser(userId, properties):
 *   - [ ] Identify user in PostHog
 *   - [ ] Set user properties
 * - [ ] aliasIdentities(deviceFingerprint, userId):
 *   - [ ] Merge device and user identities in PostHog
 *   - [ ] Preserve device event history
 * - [ ] trackConversion(event, properties):
 *   - [ ] Track conversion funnel events
 *   - [ ] Include funnel stage info
 */
export class AnalyticsService {
	// TODO: Implement analytics service methods
}
```

### Phase 4: Integration & Refactor

#### Integration 4.1: Middleware Chain

**File**: `apps/web/middleware.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { usageTrackingMiddleware } from "./middleware/usage-tracking";

/**
 * Main Middleware Chain
 *
 * Applies authentication, rate limiting, and usage tracking to API routes
 *
 * TODO:
 * - [ ] Match API routes that need protection
 * - [ ] Apply middleware in correct order:
 *   1. [ ] Authentication (required for all)
 *   2. [ ] Rate limiting (depends on auth)
 *   3. [ ] Usage tracking (depends on auth)
 * - [ ] Skip middleware for public routes
 * - [ ] Handle middleware errors gracefully
 * - [ ] Optimize for performance (early returns)
 */
export async function middleware(request: NextRequest) {
	// TODO: Implement middleware chain

	// For now, continue to next middleware
	return NextResponse.next();
}

export const config = {
	matcher: [
		// TODO: Define which routes need middleware protection
		"/api/v1/:path*",
	],
};
```

#### Integration 4.2: Error Handling

**File**: `apps/web/lib/errors.ts`

```typescript
/**
 * Custom Error Classes
 *
 * Standardized error handling for the revenue enablement system
 *
 * TODO:
 * - [ ] Create error classes for:
 *   - [ ] AuthenticationError (401)
 *   - [ ] AuthorizationError (403)
 *   - [ ] RateLimitError (429)
 *   - [ ] UsageLimitError (402)
 *   - [ ] ValidationError (400)
 *   - [ ] PaymentRequiredError (402)
 * - [ ] Include error codes and messages
 * - [ ] Support structured error responses
 * - [ ] Enable error logging with context
 */
// TODO: Implement custom error classes
```

## Testing Strategy

### Unit Tests

-   [ ] Middleware components (auth, rate limiting, usage tracking)
-   [ ] API route handlers (all 5 critical endpoints)
-   [ ] Service layer (device trials, usage limits, analytics)
-   [ ] Utility functions
-   [ ] Error handling

### Integration Tests

-   [ ] Database operations with Drizzle ORM
-   [ ] Stripe API integration
-   [ ] Redis operations for rate limiting
-   [ ] Authentication flow (API key + JWT)
-   [ ] Middleware chain execution

### E2E Tests

-   [ ] Complete user journey (device trial → email signup → payment)
-   [ ] Abuse prevention scenarios
-   [ ] Rate limiting enforcement
-   [ ] Usage limit enforcement
-   [ ] Analytics event tracking

## Deployment Checklist

### Pre-Deployment

-   [ ] All unit tests passing (100% coverage for new code)
-   [ ] All integration tests passing
-   [ ] All E2E tests passing
-   [ ] Security audit completed
-   [ ] Performance benchmarks met
-   [ ] Documentation updated

### Deployment

-   [ ] Database migrations applied
-   [ ] Environment variables configured
-   [ ] Stripe webhook endpoint updated
-   [ ] Analytics configured
-   [ ] Monitoring and alerting set up

### Post-Deployment

-   [ ] Smoke tests in production
-   [ ] Monitor error rates
-   [ ] Monitor performance metrics
-   [ ] Verify analytics tracking
-   [ ] User acceptance testing

## Success Metrics

**Week 1 (MVP Launch)**:

-   100+ extension installs
-   20+ email signups
-   5+ paid conversions
-   <2% error rate
-   <200ms API response time
-   Analytics funnel visualized

**Week 2 (Optimization)**:

-   200+ extension installs
-   50+ email signups
-   15+ paid conversions
-   <1% error rate
-   <150ms API response time
-   A/B test conversion improvements

## Notes

-   **Supabase** hosts the PostgreSQL database + provides S3-compatible Storage
-   **Drizzle ORM** for all database queries (type-safe, no Prisma)
-   **Better Auth** for authentication (not Supabase Auth, not Clerk)
-   **Next.js 15** App Router with React 19
-   **TDD approach**: Red (write tests) → Green (implement) → Refactor
-   **Existing packages**: Leverage @snapback/payments, @snapback/storage, etc.
-   **Progressive auth**: 3 stages (anonymous → email → payment)
-   **Privacy-first**: Device fingerprinting is hashed, no PII collected anonymously
-   **Anti-abuse**: Device trials with reinstall detection and cooldowns
