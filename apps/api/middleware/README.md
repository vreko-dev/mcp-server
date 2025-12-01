# Middleware Components Documentation

This document explains how to use the cross-cutting concern middleware components that have been implemented for the SnapBack API.

## Overview

The following middleware components have been implemented to handle cross-cutting concerns in the API:

1. **Analytics Middleware** - Tracks feature usage and API calls in PostHog
2. **Logging Middleware** - Provides structured logging for API requests and feature usage
3. **Error Tracking Middleware** - Tracks errors in PostHog and logs them locally
4. **Monitoring Middleware** - Tracks performance metrics and response times

## Middleware Components

### Analytics Middleware

Tracks feature usage and API calls in PostHog.

**File**: `packages/api/middleware/analytics.ts`

**Usage**:

```typescript
import { analyticsMiddleware } from "../middleware/analytics";

const result = await analyticsMiddleware(context, async () => {
	// Your handler logic here
	return await handler();
});
```

### Logging Middleware

Provides structured logging for API requests and feature usage.

**File**: `packages/api/middleware/logging.ts`

**Usage**:

```typescript
import { loggingMiddleware } from "../middleware/logging";

const result = await loggingMiddleware(context, async () => {
	// Your handler logic here
	return await handler();
});
```

### Error Tracking Middleware

Tracks errors in PostHog and logs them locally.

**File**: `packages/api/middleware/error-tracking.ts`

**Usage**:

```typescript
import { errorTrackingMiddleware } from "../middleware/error-tracking";

const result = await errorTrackingMiddleware(context, async () => {
	// Your handler logic here
	return await handler();
});
```

### Monitoring Middleware

Tracks performance metrics and response times.

**File**: `packages/api/middleware/monitoring.ts`

**Usage**:

```typescript
import { monitoringMiddleware } from "../middleware/monitoring";

const result = await monitoringMiddleware(context, async () => {
	// Your handler logic here
	return await handler();
});
```

## Comprehensive Middleware

A utility function is provided to compose all middleware components together in the correct order.

**File**: `packages/api/middleware/compose-middleware.ts`

**Usage**:

```typescript
import { withComprehensiveMiddleware } from "../middleware/compose-middleware";

const result = await withComprehensiveMiddleware(context, async () => {
	// Your handler logic here
	return await handler();
});
```

This function applies all middleware components in the following order:

1. Error Tracking (first to catch all errors)
2. Analytics
3. Logging
4. Monitoring (last to track performance)

## Context Object

All middleware components expect a context object with the following properties:

```typescript
interface MiddlewareContext {
	requestId: string;
	userId: string;
	apiKeyId: string;
	endpoint: string;
	method: string;
	clientVersion?: string;
	platform?: string;
	ideVersion?: string;
	userAgent?: string;
	ipAddress?: string;
}
```

## Integration Example

Here's an example of how to integrate the comprehensive middleware into an API route:

```typescript
import {
	withComprehensiveMiddleware,
	MiddlewareContext,
} from "../middleware/compose-middleware";

export async function apiHandler(req: NextRequest) {
	const context: MiddlewareContext = {
		requestId: crypto.randomUUID(),
		userId: session.user.id,
		apiKeyId: apiKey,
		endpoint: req.nextUrl.pathname,
		method: req.method,
		clientVersion: req.headers.get("x-snapback-version") || undefined,
		platform: req.headers.get("x-snapback-platform") || undefined,
		ideVersion: req.headers.get("x-snapback-ide-version") || undefined,
		userAgent: req.headers.get("user-agent") || undefined,
		ipAddress: req.headers.get("x-forwarded-for") || undefined,
	};

	return await withComprehensiveMiddleware(context, async () => {
		// Your actual API logic here
		return NextResponse.json({ data: "success" });
	});
}
```

## Testing

Each middleware component has comprehensive tests located in `packages/api/__tests__/`:

-   `analytics.test.ts`
-   `logging.test.ts`
-   `error-tracking.test.ts`
-   `monitoring.test.ts`
-   `compose-middleware.test.ts`

To run the tests:

```bash
cd packages/api
pnpm test middleware-name.test.ts
```

Or to run all middleware tests:

```bash
cd packages/api
pnpm test analytics.test.ts logging.test.ts error-tracking.test.ts monitoring.test.ts compose-middleware.test.ts
```
