# Next.js 15 Edge Runtime Compatibility Guide

This document provides comprehensive guidance for ensuring compatibility with Next.js 15's Edge Runtime restrictions and new features.

## Understanding Next.js 15 Runtime Environments

Next.js 15 supports three runtime environments:

1. **Browser** - Client-side execution in the user's browser
2. **Node.js** - Server-side execution with full Node.js APIs
3. **Edge** - Server-side execution with limited Web APIs only

### Runtime Selection

```typescript
// Specify runtime for API routes
export const runtime = "nodejs"; // or 'edge'
```

## Compatibility Matrix

| Library/Feature                | Browser | Node.js | Edge | Notes                      |
| ------------------------------ | ------- | ------- | ---- | -------------------------- |
| `fs`, `fs-extra`               | ❌      | ✅      | ❌   | File system operations     |
| `os`                           | ❌      | ✅      | ❌   | Operating system info      |
| `crypto` (Node)                | ❌      | ✅      | ❌   | Node.js crypto module      |
| Web Crypto API                 | ✅      | ✅      | ✅   | Modern web crypto standard |
| `@fingerprintjs/fingerprintjs` | ✅      | ❌      | ❌   | Browser-only library       |
| `node-machine-id`              | ❌      | ✅      | ❌   | Machine identification     |
| HTTP fetch                     | ✅      | ✅      | ✅   | Universal API              |
| Environment variables          | ✅      | ✅      | ✅   | Process.env access         |

## Device Fingerprinting Implementation Patterns

### 1. Server-Side Fingerprinting (Route Handlers)

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

### 2. Client-Side Fingerprinting (Browser)

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

### 3. VSCode Extension Fingerprinting

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

## Middleware for API Protection

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

## Proper Async Handling in Next.js 15

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

## Environment-Specific Code Patterns

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

## Best Practices for Next.js 15 Compatibility

### 1. Runtime Declaration

Always specify the runtime when using Node.js-specific APIs:

```typescript
export const runtime = "nodejs"; // Required for Node.js APIs
```

### 2. Environment Checks

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

### 3. Web Crypto API

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

### 4. Dynamic Imports

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

## Summary: Next.js 15 Compatible Stack

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
