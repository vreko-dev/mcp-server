# Next.js 15 Compatible Package Recommendations

This document outlines the recommended packages for Next.js 15 compatibility, especially regarding Edge Runtime restrictions and Server Components.

## Updated Package.json for Next.js 15 Compatibility

```json
{
	"name": "snapback",
	"version": "1.0.0",
	"dependencies": {
		// ✅ All Next.js 15 compatible
		"next": "^15.0.0",
		"react": "^19.0.0-rc",
		"react-dom": "^19.0.0-rc",

		// ✅ Compatible data/auth libraries
		"@supabase/supabase-js": "^2.45.0",
		"@snapback/auth": "workspace:*", // Better Auth replacement

		// ✅ Compatible payment/API management
		"stripe": "^17.0.0",
		"@unkey/api": "^0.26.0",

		// ✅ Compatible analytics/logging
		"posthog-js": "^1.167.0",
		"posthog-node": "^4.2.0",
		"pino": "^9.5.0",
		"pino-pretty": "^11.0.0",

		// ✅ Browser fingerprinting (client-side only)
		// Note: @fingerprintjs/fingerprintjs requires installation
		// Run: pnpm add @fingerprintjs/fingerprintjs

		// ✅ UI libraries
		"@radix-ui/react-*": "latest",
		"tailwindcss": "^3.4.0",
		"framer-motion": "^11.0.0",

		// ⚠️ Use these ONLY in route handlers with runtime='nodejs'
		"nanoid": "^5.0.0",
		"bcrypt": "^5.1.0"
	}
}
```

## Edge Runtime Compatible Libraries

### ✅ Safe for Edge Runtime

These libraries work in both Edge and Node.js runtimes:

-   `@supabase/supabase-js` - HTTP-based, works everywhere
-   `@unkey/api` - HTTP-based API calls work in Edge
-   `posthog-js` - Client-side analytics
-   `posthog-node` - Server-side analytics (Node.js only)
-   `pino` - Logging (Node.js runtime only)
-   `zod` - Schema validation
-   `nanoid` - ID generation (Node.js runtime only)

### ❌ Not Compatible with Edge Runtime

These libraries only work in Node.js runtime:

-   `fs`, `fs-extra` - File system operations
-   `os` - Operating system information
-   `crypto` - Node.js crypto module
-   `node-machine-id` - Machine identification
-   `bcrypt` - Password hashing (requires Node.js)

## Runtime-Specific Implementation Patterns

### 1. Client Components

```typescript
// app/components/client-component.tsx
"use client";

import { useEffect } from "react";

export function ClientComponent() {
	useEffect(() => {
		// Browser APIs are available here
		console.log(navigator.userAgent);
	}, []);

	return <div>Client Component</div>;
}
```

### 2. Server Components (Default)

```typescript
// app/page.tsx
// No directive needed - Server Component by default

import { headers } from "next/headers";

export default async function Page() {
	// Server-side execution
	const headersList = await headers();
	const userAgent = headersList.get("user-agent");

	return <div>User Agent: {userAgent}</div>;
}
```

### 3. Route Handlers with Node.js Runtime

```typescript
// app/api/route.ts
export const runtime = "nodejs"; // Required for Node.js APIs

import { NextRequest } from "next/server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
	// Node.js APIs are available
	const id = nanoid(); // ✅ Works in Node.js runtime

	return Response.json({ id });
}
```

### 4. Route Handlers with Edge Runtime

```typescript
// app/api/edge-route.ts
export const runtime = "edge"; // Optional but explicit

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	// Only Edge-compatible APIs
	const data = await request.json();

	// Web Crypto API is available in Edge
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest(
		"SHA-256",
		encoder.encode(JSON.stringify(data))
	);

	return Response.json({ success: true });
}
```

## Device Fingerprinting Patterns

### Browser-Based Fingerprinting

```typescript
// lib/client-fingerprint.ts
"use client";

export async function getClientFingerprint() {
	// Use Web APIs for fingerprinting
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
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const fingerprint = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return fingerprint;
}
```

### Server-Side Fingerprinting

```typescript
// app/api/device-fingerprint/route.ts
export const runtime = "nodejs"; // Required for Node.js crypto

import { NextRequest } from "next/server";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
	const body = await request.json();

	// Node.js crypto API
	const hash = createHash("sha256");
	hash.update(JSON.stringify(body));
	const fingerprint = hash.digest("hex");

	return Response.json({ fingerprint });
}
```

### VSCode Extension Fingerprinting

```typescript
// extensions/vscode/src/fingerprint.ts
// Runs in Node.js environment - full Node.js APIs available

import * as vscode from "vscode";
import * as os from "os";
import { createHash } from "crypto";

export async function getVSCodeFingerprint() {
	// VSCode and Node.js APIs available
	const components = {
		machineId: vscode.env.machineId,
		sessionId: vscode.env.sessionId,
		platform: os.platform(),
		hostname: os.hostname(),
	};

	// Node.js crypto
	const hash = createHash("sha256");
	hash.update(JSON.stringify(components));
	const fingerprint = hash.digest("hex");

	return fingerprint;
}
```

## Best Practices for Next.js 15 Compatibility

1. **Always specify runtime** when using Node.js-specific APIs
2. **Use Web Crypto API** in Edge Runtime instead of Node.js crypto
3. **Dynamic imports** for client-only libraries
4. **Environment checks** before using browser APIs
5. **Separate client and server logic** clearly
6. **Use Server Actions** for mutations instead of API routes when possible
7. **Leverage Next.js caching** strategies appropriately
