# Next.js 15 Device Fingerprinting Integration for Monetization

This document explains how the Next.js 15 compatible device fingerprinting implementations integrate with the existing SnapBack monetization system.

## Overview

The SnapBack monetization system uses device fingerprinting for trial tracking and abuse prevention. With Next.js 15's Edge Runtime restrictions, we've implemented compatible solutions for all environments:

1. **VSCode Extension** - Node.js environment with full API access
2. **Web Application** - Browser environment for client-side detection
3. **API Routes** - Server environment with selective runtime capabilities
4. **Middleware** - Edge Runtime for API protection

## Integration with Existing Device Trials System

### Database Schema

The existing `device_trials` table remains unchanged:

```sql
CREATE TABLE device_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL UNIQUE,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  checkpoint_limit INTEGER NOT NULL DEFAULT 50,
  api_call_limit INTEGER NOT NULL DEFAULT 10000,
  checkpoints_used INTEGER NOT NULL DEFAULT 0,
  api_calls_used INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  install_count INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Device Fingerprinting Flow

#### 1. VSCode Extension Activation

```typescript
// apps/vscode/src/services/device-fingerprint.ts
const fingerprintService = new DeviceFingerprintService();
const deviceFingerprint = await fingerprintService.generateFingerprint();

// Send to SnapBack API
const response = await fetch("https://api.snapback.dev/v1/device-trial", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ deviceFingerprint }),
});
```

#### 2. Web Application Client Detection

```typescript
// apps/web/app/components/trial-detector.tsx
"use client";

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
```

#### 3. API Route Processing

```typescript
// apps/web/app/api/v1/device-fingerprint/route.ts
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const fingerprintData = await request.json();

	// Process fingerprint and create/update device trial
	// Integration with existing @snapback/api procedures
	const result = await createDeviceTrial({
		deviceFingerprint: fingerprintData.deviceId,
	});

	return NextResponse.json(result);
}
```

## Anti-Abuse Mechanisms

### Reinstall Detection

The VSCode extension tracks session IDs to detect reinstalls:

```typescript
// apps/vscode/src/services/device-fingerprint.ts
async isReinstall(context: vscode.ExtensionContext): Promise<boolean> {
  const currentSessionId = vscode.env.sessionId;
  const storedSessionId = context.globalState.get<string>('lastSessionId');

  // Store current sessionId for next time
  await context.globalState.update('lastSessionId', currentSessionId);

  // If we have a stored sessionId and it's different, it's a reinstall
  return !!storedSessionId && storedSessionId !== currentSessionId;
}
```

### Block Enforcement

The existing device trial system enforces blocks:

```typescript
// packages/api/modules/device-trials/procedures/create-device-trial.ts
if (trial.blockedUntil && trial.blockedUntil.getTime() > Date.now()) {
	throw new Error(
		JSON.stringify({
			error: "Device blocked",
			message: "This device has been temporarily blocked",
			blockedUntil: trial.blockedUntil.toISOString(),
		})
	);
}
```

## Progressive Authentication Funnel

### Stage 1: Anonymous Device Trial

-   50 checkpoints limit
-   10,000 API calls/month
-   Device fingerprint only

### Stage 2: Email Signup

-   1,000 checkpoints limit
-   50,000 API calls/month
-   Device linked to user account

### Stage 3: Paid Tier

-   Unlimited checkpoints
-   Unlimited API calls
-   Full feature access

## API Protection with Middleware

The Edge Runtime compatible middleware protects all API routes:

```typescript
// apps/web/middleware.ts
export async function middleware(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith("/api")) {
		const apiKey = request.headers
			.get("authorization")
			?.replace("Bearer ", "");

		// Validate with Unkey service (Edge compatible)
		const validation = await fetch("https://api.unkey.dev/v1/keys/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ key: apiKey }),
		});

		// Add user context to headers
		const response = NextResponse.next();
		const data = await validation.json();
		response.headers.set("x-user-id", data.ownerId || "anonymous");

		return response;
	}
}
```

## Usage Tracking Integration

### Checkpoint Creation

```typescript
// packages/api/modules/checkpoints/procedures/create-checkpoint.ts
export const createCheckpoint = publicProcedure
	.input(createCheckpointSchema)
	.handler(async ({ input, context }) => {
		// Extract API key from context (added by middleware)
		const apiKeyId = context.headers.get("x-api-key-id");

		// Track usage against device trial limits
		const usage = await trackUsage({
			apiKeyId,
			operation: "checkpoint_create",
		});

		// Check limits
		if (usage.checkpointsUsed >= usage.checkpointLimit) {
			throw new Error("Checkpoint limit exceeded");
		}

		// Create checkpoint
		// ... implementation
	});
```

### API Call Tracking

```typescript
// apps/web/app/api/v1/checkpoint/route.ts
export async function POST(request: NextRequest) {
	const headersList = await headers();
	const userId = headersList.get("x-user-id");

	// Track API usage
	await trackApiUsage({ userId, endpoint: "/api/v1/checkpoint" });

	// Process request
	// ... implementation
}
```

## Environment-Specific Implementations

### Browser Environment

```typescript
// apps/web/lib/client-fingerprint.ts
export async function getClientFingerprint() {
	if (typeof window === "undefined") {
		throw new Error(
			"getClientFingerprint can only be called in browser environment"
		);
	}

	// Use browser APIs for fingerprinting
	const components = {
		userAgent: navigator.userAgent,
		language: navigator.language,
		platform: navigator.platform,
		screenResolution: `${screen.width}x${screen.height}`,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	};

	// Hash using Web Crypto API
	const encoder = new TextEncoder();
	const data = encoder.encode(JSON.stringify(components));
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	// ... return fingerprint
}
```

### Node.js Environment (VSCode Extension)

```typescript
// apps/vscode/src/services/device-fingerprint.ts
export class DeviceFingerprintService {
	async generateFingerprint(): Promise<string> {
		// Use VSCode and Node.js APIs
		const machineId = vscode.env.machineId;
		const extension = vscode.extensions.getExtension("snapback.snapback");
		const version = extension ? extension.packageJSON.version : "unknown";

		// Combine and hash with Node.js crypto
		const fingerprint = `${machineId}:${version}`;
		const hash = createHash("sha256");
		hash.update(fingerprint);
		return hash.digest("hex");
	}
}
```

### Edge Runtime Environment

```typescript
// apps/web/app/api/v1/device-fingerprint/route.ts
export const runtime = "edge";

export async function POST(request: NextRequest) {
	// Use Edge-compatible Web APIs
	const headersList = await headers();
	const userAgent = headersList.get("user-agent");

	// Use Web Crypto API
	const encoder = new TextEncoder();
	const data = encoder.encode(userAgent);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	// ... process fingerprint
}
```

## Testing Strategy

### Unit Tests

```typescript
// apps/web/__tests__/lib/client-fingerprint.test.ts
describe("getClientFingerprint", () => {
	it("should generate consistent fingerprints", async () => {
		const fingerprint1 = await getClientFingerprint();
		const fingerprint2 = await getClientFingerprint();

		expect(fingerprint1).toEqual(fingerprint2);
	});
});
```

### Integration Tests

```typescript
// apps/web/__tests__/api/device-fingerprint.test.ts
describe("POST /api/v1/device-fingerprint", () => {
	it("should create device trial for new fingerprint", async () => {
		const response = await fetch("/api/v1/device-fingerprint", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ deviceId: "test-fingerprint" }),
		});

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.deviceId).toBeDefined();
	});
});
```

### E2E Tests

```typescript
// apps/web/tests/e2e/device-trial.e2e.ts
test("should track device trial across sessions", async ({ page }) => {
	// Simulate device fingerprinting
	await page.goto("/");

	// Check that trial detector component loaded
	await expect(page.locator("trial-detector")).toBeAttached();

	// Verify API call was made
	// ... assertions
});
```

## Performance Considerations

### Caching Strategies

```typescript
// apps/web/lib/api/device-trials.ts
export async function getDeviceTrial(fingerprint: string) {
	const response = await fetch(`/api/device-trial/${fingerprint}`, {
		next: {
			revalidate: 3600, // Revalidate every hour
			tags: ["device-trial", `fingerprint:${fingerprint}`],
		},
	});

	return response.json();
}
```

### Lazy Loading

```typescript
// apps/web/app/components/trial-detector.tsx
"use client";

import { useEffect } from "react";

export function TrialDetector() {
	useEffect(() => {
		// Lazy load fingerprinting library
		import("@/lib/client-fingerprint").then(({ getClientFingerprint }) => {
			// Use library
		});
	}, []);

	return null;
}
```

## Security Measures

### Data Minimization

Only collect necessary device information:

```typescript
// apps/web/lib/client-fingerprint.ts
const components = {
	userAgent: navigator.userAgent, // Browser identification
	language: navigator.language, // User language preference
	platform: navigator.platform, // OS platform
	screenResolution: `${screen.width}x${screen.height}`, // Screen size
	timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Timezone
	// Avoid collecting sensitive data like precise geolocation
};
```

### Secure Hashing

Use cryptographic hashing for privacy:

```typescript
// All implementations use SHA-256 hashing
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
```

### Transport Security

All API communications use HTTPS:

```typescript
const response = await fetch("https://api.snapback.dev/v1/device-trial", {
	method: "POST",
	// HTTPS enforced by domain
});
```

## Monitoring and Analytics

### Error Tracking

```typescript
// apps/web/app/components/trial-detector.tsx
try {
	const fingerprint = await getClientFingerprint();
	// ... process
} catch (error) {
	// Log to monitoring service
	console.error("Device fingerprinting failed:", error);
}
```

### Usage Analytics

```typescript
// apps/web/app/api/v1/device-fingerprint/route.ts
export async function POST(request: NextRequest) {
	const result = await createDeviceTrial(fingerprintData);

	// Track event
	await trackEvent("device_trial_created", {
		deviceId: result.deviceId,
		timestamp: new Date(),
	});

	return NextResponse.json(result);
}
```

## Summary

The Next.js 15 compatible device fingerprinting implementation:

✅ **Maintains compatibility** with all Next.js 15 runtime environments
✅ **Integrates seamlessly** with existing monetization infrastructure
✅ **Preserves anti-abuse mechanisms** through reinstall detection
✅ **Supports progressive authentication** funnel
✅ **Implements proper security measures** with data minimization
✅ **Provides comprehensive testing** coverage
✅ **Includes performance optimizations** through caching
✅ **Maintains existing database schema** without breaking changes

This implementation ensures that SnapBack's monetization system continues to function effectively while taking full advantage of Next.js 15's capabilities and maintaining security and privacy standards.
