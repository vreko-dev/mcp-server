# Decision: Data Fetching Strategy

## Decision Tree

```
Does the data come from your database or private API?
├─ YES: In a Server Component?
│   ├─ YES: Fetch directly in the component
│   └─ NO: Use Server Actions or API routes
└─ NO: Client-side public data?
    ├─ Initial load: Server Component + HydrationBoundary
    └─ User interactions: Tanstack Query
```

## Pattern 1: Server Component Direct Fetching

**When:** Data needed for initial page render, sensitive data, database access

```tsx
// app/(saas)/app/page.tsx
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
	// ✅ Direct fetch in Server Component
	// ✅ Can access databases, secret API keys
	const [stats, activities, insights] = await Promise.all([
		getDashboardData(),
		getRecentActivity(),
		getPersonalizedInsights(),
	]);

	return (
		<Dashboard
			stats={stats}
			activities={activities}
			insights={insights}
		/>
	);
}
```

**Benefits:**
- ✅ No waterfall requests (use Promise.all)
- ✅ Secure - sensitive queries don't expose to client
- ✅ Fast - data arrives in initial HTML
- ✅ SEO-friendly - search engines see full content

## Pattern 2: Server Actions for Mutations

**When:** Creating, updating, or deleting data from user actions

```tsx
// app/(saas)/app/api-keys/actions.ts
'use server';

import { revalidatePath } from "next/cache";

export async function createApiKeyAction(name: string) {
	const session = await getSession();
	if (!session?.user) throw new Error("Unauthorized");

	// ✅ Server-side mutation
	const key = await createApiKey({
		userId: session.user.id,
		name,
	});

	// ✅ Revalidate affected pages
	revalidatePath("/app/api-keys");

	return key;
}

// components/CreateKeyForm.tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

export function CreateKeyForm() {
	const [state, formAction, isPending] = useActionState(
		async (prevState, formData) => {
			try {
				const name = formData.get("name") as string;
				await createApiKeyAction(name);
				return { success: true };
			} catch (error) {
				return { error: (error as Error).message };
			}
		},
		{},
	);

	return (
		<form action={formAction}>
			<input type="text" name="name" required />
			<button type="submit" disabled={isPending}>
				{isPending ? "Creating..." : "Create"}
			</button>
			{state.error && <div>{state.error}</div>}
		</form>
	);
}
```

**Benefits:**
- ✅ Secure validation server-side
- ✅ Database access without exposing API
- ✅ Automatic revalidation
- ✅ Works without JavaScript

## Pattern 3: API Routes (When Server Actions Don't Fit)

**When:** Public APIs, webhooks, file uploads, non-standard requests

```tsx
// app/api/v1/api-keys/list/route.ts
import { getSession } from "@saas/auth/lib/server";
import { listApiKeys } from "@snapback/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		const session = await getSession();

		if (!session?.user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const keys = await listApiKeys(session.user.id);

		return NextResponse.json({ keys });
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
```

**When to use:**
- ✅ Public endpoints
- ✅ Webhooks (Stripe, GitHub, etc.)
- ✅ File uploads (multipart/form-data)
- ✅ Non-JSON responses
- ❌ NOT for simple form submissions (use Server Actions)

## Pattern 4: Tanstack Query for Client-Side Data

**When:** Client-side data fetching, real-time updates, user interactions

```tsx
// hooks/use-api-keys.ts
'use client';

import { useQueryClient } from "@tanstack/react-query";
import { useResourceQuery, useResourceMutation } from "@/lib/use-resource-query";

export function useApiKeys() {
	return useResourceQuery<ApiKey[]>(
		["api-keys", "list"],
		async () => {
			const res = await fetch("/api/v1/api-keys/list");
			if (!res.ok) throw new Error("Failed to fetch");
			return (await res.json()).keys;
		},
		{
			staleTime: 30000, // 30 seconds
		},
	);
}

export function useCreateApiKey() {
	const queryClient = useQueryClient();

	return useResourceMutation(
		async (input: { name: string }) => {
			const res = await fetch("/api/v1/api-keys/create", {
				method: "POST",
				body: JSON.stringify(input),
			});
			if (!res.ok) throw new Error("Failed to create");
			return res.json();
		},
		{
			onMutate: async (input) => {
				// Optimistic update
				const previous = queryClient.getQueryData<ApiKey[]>(["api-keys", "list"]);
				queryClient.setQueryData(["api-keys", "list"], (old: ApiKey[] = []) => [
					{ id: "temp", name: input.name, ...temp },
					...old,
				]);
				return { previous };
			},
			onError: (error, variables, context) => {
				// Rollback on error
				if (context?.previous) {
					queryClient.setQueryData(["api-keys", "list"], context.previous);
				}
			},
			onSettled: () => {
				// Refetch actual data
				queryClient.invalidateQueries({ queryKey: ["api-keys", "list"] });
			},
		},
	);
}

// components/ApiKeysList.tsx
'use client';

export function ApiKeysList() {
	const { data: keys, isLoading } = useApiKeys();
	const { mutate: createKey, isPending } = useCreateApiKey();

	if (isLoading) return <div>Loading...</div>;

	return (
		<div>
			<button onClick={() => createKey({ name: "New" })}>
				Create Key
			</button>
			{keys?.map((key) => (
				<div key={key.id}>{key.name}</div>
			))}
		</div>
	);
}
```

**Benefits:**
- ✅ Automatic caching and revalidation
- ✅ Optimistic updates for UX
- ✅ Background refetching
- ✅ Handles race conditions

## Pattern 5: Prefetch on Server, Hydrate on Client

**When:** Initial data + client-side interactivity (best of both worlds)

```tsx
// app/(saas)/layout.tsx - Server Component
import { getSession } from "@saas/auth/lib/server";
import { getServerQueryClient } from "@shared/lib/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SessionProvider } from "@/components/SessionProvider";

export default async function Layout({ children }: Props) {
	const session = await getSession();

	// ✅ Prefetch on server
	const queryClient = getServerQueryClient();
	await queryClient.prefetchQuery({
		queryKey: ["session"],
		queryFn: () => session,
	});

	return (
		// ✅ Hydrate client with server state
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionProvider>
				{children}
			</SessionProvider>
		</HydrationBoundary>
	);
}

// components/SessionProvider.tsx
'use client';

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

const SessionContext = createContext(null);

export function SessionProvider({ children }: Props) {
	// ✅ Data already in cache from server, no fetch needed!
	const { data: session } = useQuery({
		queryKey: ["session"],
		queryFn: async () => {
			const res = await fetch("/api/session");
			return res.json();
		},
	});

	return (
		<SessionContext.Provider value={session}>
			{children}
		</SessionContext.Provider>
	);
}
```

**Benefits:**
- ✅ Fast initial load (data in HTML)
- ✅ Instant client-side updates (no refetch)
- ✅ Background refresh after stale time
- ✅ SEO-friendly

## Caching Strategies

### force-cache (Default)

```tsx
// Cached until revalidated
export const revalidate = false; // or omit

export default async function Page() {
	const data = await fetch("https://api.example.com/data");
	return <div>{data}</div>;
}
```

**When to use:**
- ✅ Static marketing pages
- ✅ Infrequently changing content
- ✅ Blog posts, documentation

### revalidate N (Incremental Static Revalidation)

```tsx
// Revalidate every 60 seconds
export const revalidate = 60;

export default async function Page() {
	const data = await fetch("https://api.example.com/data");
	return <div>{data}</div>;
}
```

**When to use:**
- ✅ Data that changes occasionally
- ✅ User-generated content
- ✅ Analytics dashboards

### force-dynamic (No Cache)

```tsx
// Always fresh
export const dynamic = "force-dynamic";

export default async function Page() {
	const data = await fetch("https://api.example.com/data");
	return <div>{data}</div>;
}
```

**When to use:**
- ✅ Billing data (always current)
- ✅ User account settings
- ✅ Real-time dashboards

### Tag-Based Revalidation

```tsx
// Mark requests with tags
const data = await fetch("https://api.example.com/data", {
	next: { tags: ["users"] },
});

// Later, in a Server Action:
import { revalidateTag } from "next/cache";

export async function updateUser(id: string) {
	await db.users.update(id, ...);
	revalidateTag("users"); // Revalidate all requests tagged "users"
}
```

## Real Example: Complete Page with Multiple Fetch Patterns

```tsx
// app/(saas)/app/analytics/page.tsx
import { Suspense } from "react";
import { getSession } from "@saas/auth/lib/server";
import { AnalyticsOverview } from "@/components/AnalyticsOverview";
import { DetailedCharts } from "@/components/DetailedCharts";
import { LoadingOverview, LoadingCharts } from "@/components/Skeletons";

// ✅ Pattern 1: Server-side prefetch with Suspense streaming
async function OverviewSection() {
	// Fast query - no cache delay
	const overview = await getAnalyticsOverview();
	return <AnalyticsOverview data={overview} />;
}

// ✅ Pattern 2: Slow query streamed separately
async function ChartsSection() {
	const charts = await generateDetailedCharts();
	return <DetailedCharts data={charts} />;
}

export default async function AnalyticsPage() {
	return (
		<div className="space-y-8">
			{/* Shows immediately */}
			<Suspense fallback={<LoadingOverview />}>
				<OverviewSection />
			</Suspense>

			{/* Shows after charts load */}
			<Suspense fallback={<LoadingCharts />}>
				<ChartsSection />
			</Suspense>

			{/* Client component using Tanstack Query for real-time updates */}
			<RealTimeMetrics />
		</div>
	);
}

// components/RealTimeMetrics.tsx
'use client';

import { useQuery } from "@tanstack/react-query";

export function RealTimeMetrics() {
	// ✅ Pattern 3: Client-side polling for real-time data
	const { data: metrics } = useQuery({
		queryKey: ["metrics", "realtime"],
		queryFn: async () => {
			const res = await fetch("/api/metrics/realtime");
			return res.json();
		},
		refetchInterval: 5000, // Refetch every 5 seconds
	});

	return <div>{metrics?.activeUsers} users online</div>;
}
```

## Best Practices

✅ **Use Server Components by default** - Fetch there, pass data to Client
✅ **Use Promise.all for parallel Server fetches** - Faster than sequential
✅ **Use Suspense boundaries** - Stream UI to user faster
✅ **Prefetch in layouts** - Share data across nested pages
✅ **Use Tanstack Query for client-side** - Handles caching automatically
✅ **Set appropriate cache times** - Balance freshness vs performance
✅ **Use revalidateTag()** - For complex revalidation scenarios
✅ **Never expose API keys** - Keep them server-side only

## Common Mistakes

❌ **Mistake 1:** Fetching same data multiple places
```tsx
// WRONG - Multiple requests
export default async function Page() {
	const user = await getUser();
	return <UserCard user={user} />;
}

// WRONG - Layout also fetches
export default async function Layout({ children }: Props) {
	const user = await getUser(); // ❌ Duplicate request!
	return <div>{children}</div>;
}

// RIGHT - Fetch once in layout
export default async function Layout({ children }: Props) {
	const user = await getUser();
	return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
```

❌ **Mistake 2:** Using API routes instead of Server Actions
```tsx
// WRONG - Extra API layer
// app/api/create-key/route.ts
export async function POST(req: Request) {
	const data = await req.json();
	return createKey(data);
}

// components/Form.tsx
const res = await fetch("/api/create-key", { method: "POST" });

// RIGHT - Use Server Actions
// app/actions.ts
export async function createKeyAction(data) {
	return createKey(data);
}

// components/Form.tsx
<form action={createKeyAction}>
```

❌ **Mistake 3:** Not revalidating after mutations
```tsx
// WRONG - Page shows stale data
export async function deleteKey(id: string) {
	await db.keys.delete(id);
	// ❌ Missing revalidatePath or revalidateTag
}

// RIGHT
export async function deleteKey(id: string) {
	await db.keys.delete(id);
	revalidatePath("/app/keys");
}
```
