# Client-Server Separation Architecture

## Overview

This document defines the architectural pattern for separating client and server concerns in the SnapBack turborepo monorepo. Following these patterns ensures type safety, optimal performance, and maintainability across the entire codebase.

## Architecture Layers

### Layer 1: Business Logic (Workspace Packages)

**Location**: `packages/*`

**Purpose**: Reusable business logic, database operations, and utilities.

**Packages**:

-   `@snapback/auth` - Authentication, authorization, API key management
-   `@snapback/database` - Drizzle ORM, database schema, migrations
-   `@snapback/core` - Core business logic and utilities
-   `@snapback/payments` - Payment provider integrations
-   `@snapback/storage` - Checkpoint/snapshot storage

**Rules**:

-   ✅ Node.js only - can use any Node.js APIs
-   ✅ Can import other workspace packages
-   ✅ Can use Drizzle ORM and database clients
-   ❌ NEVER import directly in client components
-   ❌ NEVER import directly in browser-executed code

**Example**:

```typescript
// packages/auth/index.ts
import { db } from "@snapback/database";
import { eq } from "drizzle-orm";

export async function createApiKey(userId: string, name: string) {
	return await db.insert(apiKeys).values({ userId, name }).returning();
}
```

---

### Layer 2A: ORPC Procedures (Type-Safe RPC)

**Location**: `packages/api/modules/*/procedures/`

**Purpose**: Type-safe RPC procedures for external API consumption (SDKs, extensions).

**When to Use**:

-   Building SDK endpoints for VS Code extension
-   Creating mobile app APIs
-   External service integrations
-   When you need cross-platform type-safe APIs

**Structure**:

```
packages/api/modules/
├── apikeys/
│   ├── procedures/
│   │   ├── create-api-key.ts
│   │   ├── list-api-keys.ts
│   │   └── revoke-api-key.ts
│   └── router.ts
```

**Rules**:

-   ✅ Import from Layer 1 (workspace packages)
-   ✅ Export type-safe procedures
-   ✅ Use ORPC input/output schemas
-   ❌ Don't use Next.js-specific APIs

**Example**:

```typescript
// packages/api/modules/apikeys/procedures/create-api-key.ts
import { createApiKey } from "@snapback/auth";
import { z } from "zod";

export const createApiKeyProcedure = orpc
	.input(
		z.object({
			name: z.string(),
			rateLimit: z.number(),
		})
	)
	.handler(async ({ input, context }) => {
		return await createApiKey(context.userId, input.name, input.rateLimit);
	});
```

---

### Layer 2B: Server Actions (Next.js App Router)

**Location**: `apps/web/app/(saas)/*/actions.ts`

**Purpose**: Server-side mutations and data operations for Next.js pages.

**When to Use**:

-   Dashboard pages and authenticated routes
-   Form submissions and mutations
-   Any server-side operation needed by UI
-   **Recommended for most web app features**

**Rules**:

-   ✅ Use `'use server'` directive
-   ✅ Import from Layer 1 (workspace packages)
-   ✅ Co-locate with the page/route using them
-   ✅ Call `revalidatePath()` after mutations
-   ❌ Don't use browser APIs

**Example**:

```typescript
// apps/web/app/(saas)/app/api-keys/actions.ts
"use server";

import { createApiKey, listApiKeys, revokeApiKey } from "@snapback/auth";
import { revalidatePath } from "next/cache";

export async function createApiKeyAction(name: string, rateLimit: number) {
	const result = await createApiKey(userId, name, rateLimit);
	revalidatePath("/app/api-keys");
	return result;
}

export async function listApiKeysAction(userId: string) {
	return await listApiKeys(userId);
}

export async function revokeApiKeyAction(keyId: string) {
	await revokeApiKey(keyId);
	revalidatePath("/app/api-keys");
}
```

---

### Layer 2C: REST API Routes (External APIs)

**Location**: `apps/web/app/api/v1/*/route.ts`

**Purpose**: Traditional REST endpoints for external consumption (SDK, webhooks, legacy integrations).

**When to Use**:

-   SDK endpoints for VS Code extension
-   Webhook handlers (Stripe, etc.)
-   Public API endpoints
-   When you need explicit HTTP semantics

**Rules**:

-   ✅ Import from Layer 1 (workspace packages)
-   ✅ Return `NextResponse` objects
-   ✅ Handle authentication manually
-   ❌ Don't use for internal web app - use Server Actions instead

**Example**:

```typescript
// apps/web/app/api/v1/snapshots/list/route.ts
import { auth } from "@snapback/auth";
import { db } from "@snapback/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const session = await auth();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const snapshots = await db.query.checkpoints.findMany({
		where: eq(checkpoints.userId, session.user.id),
	});

	return NextResponse.json({ snapshots });
}
```

---

### Layer 3: Next.js Server Components

**Location**: `apps/web/app/(saas)/*/page.tsx` (WITHOUT `'use client'`)

**Purpose**: Server-side data fetching and initial page rendering.

**Rules**:

-   ✅ Async functions - use `await`
-   ✅ Fetch data using Layer 2B (Server Actions) or Layer 1 directly
-   ✅ Pass data to Client Components as props
-   ✅ Use `getSession()` for authentication
-   ❌ NO `'use client'` directive
-   ❌ NO React hooks (useState, useEffect, etc.)
-   ❌ NO browser APIs

**Example**:

```typescript
// apps/web/app/(saas)/app/api-keys/page.tsx
import { getSession } from "@saas/auth/lib/server";
import { listApiKeysAction } from "./actions";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
	const { user } = await getSession();

	if (!user) {
		redirect("/auth/login");
	}

	const apiKeys = await listApiKeysAction(user.id);

	return <ApiKeysClient initialKeys={apiKeys} userId={user.id} />;
}
```

---

### Layer 4: Client Components + Resource Pattern

**Location**: `apps/web/app/(saas)/*/components/*.tsx` (WITH `'use client'`)

**Purpose**: Interactive UI, user interactions, and client-side state management.

**Rules**:

-   ✅ Use `'use client'` directive
-   ✅ Receive data via props from Server Components
-   ✅ Use Resource<T> pattern for state management
-   ✅ Call Server Actions for mutations
-   ✅ Use React hooks (useState, useEffect, etc.)
-   ❌ NEVER import `@snapback/*` server packages
-   ❌ NEVER import Drizzle ORM or database code
-   ❌ Don't fetch initial data - receive as props

**Example**:

```typescript
// apps/web/app/(saas)/app/api-keys/api-keys-client.tsx
"use client";

import { useState } from "react";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";
import type { ApiKey } from "@snapback/auth";
import { R, type Resource } from "@/lib/resource";

export function ApiKeysClient({
	initialKeys,
	userId,
}: {
	initialKeys: ApiKey[];
	userId: string;
}) {
	const [keysResource, setKeysResource] = useState<Resource<ApiKey[]>>(
		R.ready(initialKeys)
	);

	async function handleCreate(name: string, rateLimit: number) {
		setKeysResource(R.loading());
		try {
			const newKey = await createApiKeyAction(name, rateLimit);
			setKeysResource(R.ready([...initialKeys, newKey]));
		} catch (error) {
			setKeysResource(R.error(error as Error));
		}
	}

	async function handleRevoke(keyId: string) {
		try {
			await revokeApiKeyAction(keyId);
			// Resource will update via revalidation
		} catch (error) {
			console.error("Failed to revoke key:", error);
		}
	}

	return <div>{/* Your interactive UI using keysResource */}</div>;
}
```

---

## Resource Pattern

The Resource pattern provides type-safe state management for async operations.

**Definition**:

```typescript
type Resource<T, E = Error> =
	| { state: "loading" }
	| { state: "empty" }
	| { state: "error"; error: E }
	| { state: "ready"; data: T };
```

**Usage**:

```typescript
import { R, matchResource, type Resource } from "@/lib/resource";

// Create resources
const loading = R.loading<ApiKey[]>();
const empty = R.empty<ApiKey[]>();
const error = R.error<ApiKey[]>(new Error("Failed"));
const ready = R.ready<ApiKey[]>([...keys]);

// Pattern matching
matchResource(keysResource, {
	loading: () => <Spinner />,
	empty: () => <EmptyState />,
	error: (err) => <ErrorMessage error={err} />,
	ready: (keys) => <KeysList keys={keys} />,
});

// Type guards
if (isReady(keysResource)) {
	console.log(keysResource.data); // TypeScript knows data exists
}
```

---

## Data Flow Diagrams

### Read Operations (Fetching Data)

```
┌─────────────────────────┐
│  1. Server Component    │
│  page.tsx               │
│  - Fetches data         │
│  - Passes as props      │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  2. Server Action       │
│  actions.ts             │
│  - Calls workspace pkg  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  3. Workspace Package   │
│  @snapback/auth         │
│  - Database operations  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  4. Client Component    │
│  component.tsx          │
│  - Receives data        │
│  - Wraps in Resource<T> │
└─────────────────────────┘
```

### Write Operations (Mutations)

```
┌─────────────────────────┐
│  1. Client Component    │
│  - User interaction     │
│  - Calls Server Action  │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  2. Server Action       │
│  - Validates input      │
│  - Calls workspace pkg  │
│  - revalidatePath()     │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  3. Workspace Package   │
│  - Performs mutation    │
│  - Returns result       │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  4. Next.js             │
│  - Revalidates cache    │
│  - Re-renders component │
└─────────────────────────┘
```

---

## Common Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Client Hook Importing Server Package

```typescript
// ❌ WRONG - hooks/use-api-keys.ts
"use client";
import { createApiKey } from "@snapback/auth"; // Server package!

export function useApiKeys() {
	// This will fail - can't bundle database code
}
```

**✅ Correct Approach**:

```typescript
// ✅ RIGHT - Use Server Action
"use client";
import { createApiKeyAction } from "../actions";

export function useApiKeys() {
	// Calls Server Action instead
}
```

---

### ❌ Anti-Pattern 2: Entire Page as Client Component

```typescript
// ❌ WRONG - page.tsx
"use client";

import { useEffect, useState } from "react";

export default function Page() {
	const [data, setData] = useState(null);

	useEffect(() => {
		fetch("/api/data")
			.then((r) => r.json())
			.then(setData);
	}, []);

	return <div>{data && <UI data={data} />}</div>;
}
```

**✅ Correct Approach**:

```typescript
// ✅ RIGHT - Server Component fetches, Client Component renders
// page.tsx (Server Component)
export default async function Page() {
	const data = await getData(); // Server-side fetch
	return <PageClient data={data} />;
}

// page-client.tsx
("use client");
export function PageClient({ data }) {
	return (
		<div>
			<UI data={data} />
		</div>
	);
}
```

---

### ❌ Anti-Pattern 3: API Route for Internal UI

```typescript
// ❌ WRONG - Creating API route for internal use
// app/api/internal/create-key/route.ts
export async function POST(request: Request) {
	const body = await request.json();
	return NextResponse.json(await createApiKey(body));
}

// page.tsx
async function handleSubmit() {
	await fetch("/api/internal/create-key", {
		method: "POST",
		body: JSON.stringify(data),
	});
}
```

**✅ Correct Approach**:

```typescript
// ✅ RIGHT - Use Server Action
// actions.ts
"use server";
export async function createApiKeyAction(data) {
	return await createApiKey(data);
}

// component.tsx
("use client");
async function handleSubmit() {
	await createApiKeyAction(data);
}
```

---

## Decision Tree: Which Layer Should I Use?

```
Is this code for external consumption (SDK, webhooks)?
├─ Yes → Use Layer 2A (ORPC) or Layer 2C (API Routes)
└─ No → Is this a Next.js page?
    ├─ Yes → Does it need interactivity?
    │   ├─ Yes → Server Component (Layer 3) + Client Component (Layer 4)
    │   └─ No → Server Component (Layer 3) only
    └─ No → Is this shared business logic?
        ├─ Yes → Workspace Package (Layer 1)
        └─ No → Re-evaluate architecture
```

---

## Migration Checklist

When converting existing code to this pattern:

### Converting Client Component Page to Server Component

-   [ ] Remove `'use client'` from page.tsx
-   [ ] Remove all React hooks (useState, useEffect, etc.)
-   [ ] Make the component async: `export default async function Page()`
-   [ ] Fetch data directly in the component using Server Actions
-   [ ] Extract interactive UI into separate Client Component
-   [ ] Pass data as props to Client Component

### Creating Server Actions

-   [ ] Create `actions.ts` file co-located with page
-   [ ] Add `'use server'` directive at top
-   [ ] Import workspace packages directly
-   [ ] Call `revalidatePath()` after mutations
-   [ ] Export async functions

### Creating Client Components

-   [ ] Add `'use client'` directive at top
-   [ ] Receive data via props (not from server packages!)
-   [ ] Use Resource<T> pattern for state management
-   [ ] Call Server Actions for mutations
-   [ ] Never import `@snapback/*` server packages

---

## Testing Guidelines

### Server Component Tests

-   Test data fetching logic
-   Test authentication/authorization
-   Test error handling
-   Mock workspace packages

### Server Action Tests

-   Test input validation
-   Test authorization
-   Test mutation logic
-   Test cache revalidation
-   Mock database operations

### Client Component Tests

-   Test UI rendering with different Resource states
-   Test user interactions
-   Test Server Action calls
-   Mock Server Actions

---

## Performance Benefits

Following this architecture provides:

1. **Smaller Client Bundles**: No database/ORM code in browser
2. **Faster Initial Load**: Server Components don't ship JavaScript
3. **Better SEO**: Content rendered on server
4. **Reduced API Calls**: Direct server-side data fetching
5. **Automatic Code Splitting**: Next.js optimizes automatically
6. **Progressive Enhancement**: Works without JavaScript

---

## Type Safety

This architecture maintains end-to-end type safety:

```typescript
// 1. Workspace package defines types
// packages/auth/index.ts
export type ApiKey = { id: string; name: string; ... }
export async function createApiKey(...): Promise<ApiKey>

// 2. Server Action uses package types
// actions.ts
import type { ApiKey } from '@snapback/auth'
export async function createApiKeyAction(...): Promise<ApiKey>

// 3. Client Component receives typed props
// component.tsx
import type { ApiKey } from '@snapback/auth'
export function Component({ keys }: { keys: ApiKey[] })
```

**TypeScript infers types automatically across all layers!**

---

## Summary

**Key Principles**:

1. **Server packages** (`@snapback/*`) are Node.js only
2. **Server Actions** bridge server packages and client UI
3. **Server Components** fetch data, Client Components handle interactivity
4. **Resource pattern** provides type-safe async state management
5. **Never import server packages in client code**

**Benefits**:

-   ✅ Type safety across the entire stack
-   ✅ Optimal performance (smaller bundles, faster loads)
-   ✅ Better developer experience (co-located code)
-   ✅ Scalable architecture (clear separation of concerns)
-   ✅ Maintainable codebase (consistent patterns)

---

## IP Protection Migration

### Background

SnapBack currently has **~15,000 LOC of proprietary detection algorithms** exposed in client-side bundles (VSCode extension, MCP server, web dashboard). This poses a significant IP risk as competitors could reverse-engineer:

- Guardian risk analysis algorithms
- Secret detection patterns and entropy calculations
- Mock detection AST analysis logic
- Policy evaluation rules

### Migration Strategy

**Objective:** Move proprietary algorithms from `@snapback/core` to backend API endpoints while maintaining functionality.

**Target Architecture:**

```
┌─────────────────────────┐
│  Client (VSCode/MCP)    │
│  - Lightweight adapter  │
│  - API client only      │
│  - Offline fallback     │
└────────┬────────────────┘
         │ HTTPS
         ↓
┌─────────────────────────┐
│  Backend API            │
│  - Guardian algorithms  │
│  - Risk scoring         │
│  - Pattern detection    │
└─────────────────────────┘
```

### Migration Endpoints

#### 1. POST /api/v1/analyze
**Purpose:** Server-side Guardian risk analysis

**Request:**
```typescript
interface AnalyzeRequest {
  code: string;
  language: string;
  context?: {
    filePath: string;
    gitDiff?: string;
  };
}
```

**Response:**
```typescript
interface AnalysisResult {
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  confidence: number;
  findings: Finding[];
  recommendations: string[];
}
```

#### 2. POST /api/v1/detect-secrets
**Purpose:** Entropy-based secret detection (proprietary patterns)

**Request:**
```typescript
interface SecretDetectionRequest {
  code: string;
  patterns?: string[]; // Client can request specific checks
}
```

**Response:**
```typescript
interface SecretDetectionResult {
  secrets: SecretMatch[];
  confidence: number;
}
```

#### 3. POST /api/v1/policy/evaluate
**Purpose:** Enterprise policy evaluation (server-side rules)

**Request:**
```typescript
interface PolicyEvalRequest {
  userId: string;
  organizationId?: string;
  action: 'save' | 'commit' | 'push';
  changes: CodeChange[];
}
```

**Response:**
```typescript
interface PolicyEvalResult {
  allowed: boolean;
  violations: PolicyViolation[];
  recommendations: string[];
}
```

### Client Refactoring

**VSCode Extension Changes:**
```typescript
// Before: Direct Guardian usage
import { Guardian } from '@snapback/core';
const guardian = new Guardian();
const result = await guardian.analyze(code);

// After: API client
import { AnalysisClient } from './services/api-client';
const client = new AnalysisClient(apiKey);
const result = await client.analyze(code, {
  offlineFallback: true // Basic pattern matching only
});
```

**Offline Fallback:**
Clients maintain minimal pattern detection (non-proprietary) for offline scenarios:
- Basic regex patterns (public knowledge)
- Simple heuristics
- Clearly labeled as "Limited Mode"

### Migration Phases

**Phase 1: Backend Implementation** (2-3 days)
- [ ] Create `/api/v1/analyze` endpoint
- [ ] Create `/api/v1/detect-secrets` endpoint
- [ ] Create `/api/v1/policy/evaluate` endpoint
- [ ] Deploy to production
- [ ] Verify health checks

**Phase 2: Client Refactoring** (2-3 days)
- [ ] Create API client service in VSCode extension
- [ ] Remove Guardian package from extension
- [ ] Implement offline fallback
- [ ] Update MCP server to proxy to backend
- [ ] Update CLI to use API

**Phase 3: Verification** (1 day)
- [ ] E2E tests: Save file analysis
- [ ] E2E tests: Offline fallback
- [ ] Bundle size verification (should reduce by ~2MB)
- [ ] Performance benchmarking

### Benefits

✅ **IP Protection:** Proprietary algorithms stay on server
✅ **Smaller Bundles:** Extension size reduced by ~2MB
✅ **Centralized Updates:** Algorithm improvements deployed instantly
✅ **Enterprise Isolation:** Policy rules never exposed to clients
✅ **Offline Capability:** Basic patterns still work without network

### Risks & Mitigation

**Risk:** Network latency impacts UX
**Mitigation:**
- Cache common analysis results (1 minute TTL)
- Optimize API response time (<200ms target)
- Show progress indicator for slower requests

**Risk:** Offline mode provides degraded experience
**Mitigation:**
- Clearly communicate "Limited Mode" to users
- Maintain public pattern library for basic checks
- Prompt users to reconnect for full analysis

**Risk:** API costs increase
**Mitigation:**
- Implement rate limiting per tier
- Cache analysis for identical code blocks
- Optimize backend for low latency

---

**Questions or need help?** See examples in:

-   [apps/web/app/(saas)/app/api-keys](<../apps/web/app/(saas)/app/api-keys>) (after implementation)
-   [lib/resource.ts](../apps/web/lib/resource.ts) (Resource pattern)
-   [packages/api/modules/apikeys](../packages/api/modules/apikeys) (ORPC procedures)
-   [IP_PROTECTION_MIGRATION_PLAN.md](../../IP_PROTECTION_MIGRATION_PLAN.md) (detailed task breakdown)
