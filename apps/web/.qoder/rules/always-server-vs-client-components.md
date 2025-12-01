# Always: Server Components vs Client Components

## Architecture Overview

**Next.js 15 defaults to Server Components** for security, performance, and database access. Client Components are opt-in for interactivity.

```
┌─ Server Component (async) ───────────────────────┐
│ ✅ Database queries                               │
│ ✅ Sensitive data (API keys, tokens)             │
│ ✅ Complex async operations                       │
│ ✅ Hydration-safe (no mismatch)                  │
│ ❌ No hooks (useState, useEffect)                │
│ ❌ No browser APIs (window, document)            │
└────────────────────────────────────────────────────┘

┌─ Client Component ('use client') ────────────────┐
│ ✅ Hooks (useState, useEffect, useContext)       │
│ ✅ Browser APIs (localStorage, geolocation)      │
│ ✅ Event handlers (onClick, onChange)            │
│ ✅ Third-party libraries needing browser         │
│ ❌ No direct database access                     │
│ ❌ No sensitive data                             │
│ ❌ No async/await (except fetch)                 │
└────────────────────────────────────────────────────┘
```

## Server Components (Default - No 'use client')

Server Components run **only on the server** during rendering. They can be async.

### Rules
- ✅ Can access databases, APIs, environment variables
- ✅ Can be async functions
- ✅ Can access sensitive data
- ❌ Cannot use hooks (useState, useEffect, etc.)
- ❌ Cannot use browser APIs (window, document, localStorage)
- ❌ Cannot use event handlers (onClick, onChange)

### Real Example: Protected SaaS Layout

```tsx
// app/(saas)/layout.tsx - Server Component
import { getSession } from "@saas/auth/lib/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";

export default async function SaaSLayout({ children }: PropsWithChildren) {
	// ✅ Server-only: Direct session validation
	const session = await getSession();

	if (!session) {
		// ✅ Server-only: Redirect is safe here
		redirect("/auth/login");
	}

	// ✅ Server-only: Prefetch queries on server
	const queryClient = getServerQueryClient();
	await queryClient.prefetchQuery({
		queryKey: sessionQueryKey,
		queryFn: () => session,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionProvider>
				<div className="flex">
					<Sidebar user={session.user} />
					<main>{children}</main>
				</div>
			</SessionProvider>
		</HydrationBoundary>
	);
}
```

### Real Example: Async Business Logic

```tsx
// app/(saas)/app/layout.tsx - Server Component with complex logic
import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// ✅ Can do complex async logic
	if (config.users.enableOnboarding && !session.user?.onboardingComplete) {
		redirect("/onboarding");
	}

	// ✅ Can fetch multiple resources
	const organizations = await getOrganizationList();

	if (config.organizations.enable && config.organizations.requireOrganization) {
		const organization = organizations.find(
			(org) => org.id === session?.session.activeOrganizationId,
		) || organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}
	}

	// ✅ Can check billing status via API
	const [error, data] = await attemptAsync(() =>
		orpcClient.payments.listPurchases({
			organizationId: session?.session.activeOrganizationId,
		}),
	);

	if (error) {
		throw new Error("Failed to fetch purchases");
	}

	const { activePlan } = createPurchasesHelper(data?.purchases ?? []);

	if (!activePlan) {
		redirect("/choose-plan");
	}

	return children;
}
```

## Client Components (Opt-in with 'use client')

Client Components run in the browser. Add `'use client'` at the top of the file.

### Rules
- ✅ Can use all React hooks
- ✅ Can use browser APIs
- ✅ Can use event handlers
- ❌ Cannot have async components (wrap async data fetching)
- ❌ Cannot directly fetch from databases
- ❌ Cannot use sensitive data

### Real Example: Interactive Component with State

```tsx
// components/UsageChart.tsx
'use client';

import { useEffect, useState } from "react";
import type { UsageMetrics } from "../lib/types";

interface UsageChartProps {
	metrics: UsageMetrics;
}

export function UsageChart({ metrics }: UsageChartProps) {
	// ✅ Can use hooks
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// ✅ Can use browser-safe rendering checks
	if (!isClient) {
		return <div>Loading...</div>;
	}

	const usagePercentage = metrics.snapshotsLimit
		? Math.round((metrics.snapshotsUsed / metrics.snapshotsLimit) * 100)
		: 0;

	return (
		<div className="bg-white rounded-lg p-6">
			<h2 className="text-xl font-bold">Usage</h2>
			<div className="w-full bg-gray-200 rounded h-2">
				<div
					className="h-2 rounded bg-green-600"
					style={{ width: `${usagePercentage}%` }}
				/>
			</div>
			<span className="text-sm text-gray-500">
				{metrics.snapshotsUsed} / {metrics.snapshotsLimit}
			</span>
		</div>
	);
}
```

### Real Example: Client Component with Tanstack Query

```tsx
// hooks/use-api-keys.ts
'use client';

import { useQueryClient } from "@tanstack/react-query";
import { useResourceQuery } from "@/lib/use-resource-query";

export interface ApiKey {
	id: string;
	name: string;
	keyPreview: string;
	createdAt: string;
}

export function useApiKeys() {
	// ✅ Can use hooks like useQueryClient
	const queryClient = useQueryClient();

	return useResourceQuery<ApiKey[]>(
		["api-keys", "list"],
		async () => {
			// ✅ Can fetch from client-side API routes
			const res = await fetch("/api/v1/api-keys/list", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});

			if (!res.ok) {
				throw new Error(`Failed to fetch: ${res.statusText}`);
			}

			return (await res.json()).keys || [];
		},
		{
			staleTime: 30000, // 30 seconds
		},
	);
}
```

## Props Passing Between Server and Client

### Server → Client (Serializable Data Only)

```tsx
// app/(saas)/layout.tsx - Server Component
interface UserData {
	id: string;
	email: string;
	name: string;
	role: "admin" | "user";
	// ❌ NEVER: functions, Dates, Map, Set, etc.
}

export default async function Layout({ children }: Props) {
	const session = await getSession();

	// ✅ Serialize data before passing to Client Component
	const userData: UserData = {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name || "",
		role: session.user.role || "user",
	};

	return (
		<ClientWrapper user={userData}>
			{children}
		</ClientWrapper>
	);
}

// components/ClientWrapper.tsx
'use client';

interface Props {
	user: UserData; // All plain objects/primitives
	children: React.ReactNode;
}

export function ClientWrapper({ user, children }: Props) {
	// ✅ Can use user data here
	return <div>{user.email}</div>;
}
```

### Client → Server (Via Server Actions)

```tsx
// app/(saas)/app/api-keys/actions.ts
'use server';

import { getSession } from "@saas/auth/lib/server";
import { createApiKey } from "@snapback/auth";

export async function createApiKeyAction(name: string): Promise<ApiKey> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return await createApiKey({
		userId: session.user.id,
		name,
	});
}

// components/ApiKeyForm.tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

export function ApiKeyForm() {
	const [state, formAction] = useActionState(createApiKeyAction, null);

	return (
		<form action={formAction}>
			<input type="text" name="name" required />
			<button type="submit">Create Key</button>
			{state?.error && <div>{state.error}</div>}
		</form>
	);
}
```

## Common Mistakes

❌ **Mistake 1:** Passing functions from Server to Client Components
```tsx
// WRONG
export default async function Page() {
	const getData = async () => {
		const data = await db.query(...);
		return data;
	};

	return <ClientComponent getData={getData} />; // ❌ Function not serializable
}

// RIGHT
export default async function Page() {
	const data = await db.query(...);
	return <ClientComponent data={data} />; // ✅ Serialize data first
}
```

❌ **Mistake 2:** Using browser APIs in Server Components
```tsx
// WRONG
export default async function Page() {
	const theme = localStorage.getItem("theme"); // ❌ localStorage doesn't exist on server
	return <div>{theme}</div>;
}

// RIGHT
'use client';

import { useEffect, useState } from "react";

export function ThemeSelector() {
	const [theme, setTheme] = useState<string | null>(null);

	useEffect(() => {
		const theme = localStorage.getItem("theme");
		setTheme(theme);
	}, []);

	return <div>{theme}</div>;
}
```

❌ **Mistake 3:** Using hooks in Server Components
```tsx
// WRONG
export default async function Page() {
	const [count, setCount] = useState(0); // ❌ useState not allowed
	return <div>{count}</div>;
}

// RIGHT
'use client';

import { useState } from "react";

export function Counter() {
	const [count, setCount] = useState(0);
	return <div>{count}</div>;
}
```

## Best Practices

✅ **Default to Server Components** - No 'use client' unless needed
✅ **Push 'use client' down the tree** - Use it on small interactive components
✅ **Fetch data in Server Components** - Then pass as props to Client Components
✅ **Use Server Actions for mutations** - Instead of traditional API routes
✅ **Validate sensitive data server-side** - Never trust client-side validation
✅ **Serialize data carefully** - No functions, Dates, or circular references
✅ **Leverage async/await** - Use in Server Components for clean async code
