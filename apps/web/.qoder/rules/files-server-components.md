# Files: Server Components

**Applies to:** `app/**/page.tsx`, `app/**/layout.tsx` (without 'use client')

## Overview

Server Components are the default in Next.js 15. They run **only on the server** and can be async. They have direct access to databases, APIs, and sensitive data.

## Structure

```
✅ Async function
✅ Export as default
✅ No hooks (useState, useEffect, etc.)
❌ No 'use client' directive
❌ No browser APIs
```

## Real Example: Protected SaaS Page

```tsx
// app/(saas)/app/(account)/page.tsx
import { getSession, requireAuth } from "@saas/auth/lib/server";
import { getDashboardData } from "@/lib/dashboard";
import { Dashboard } from "@/components/Dashboard";
import { redirect } from "next/navigation";

export const metadata = {
	title: "Dashboard",
};

interface Props {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<{ view?: string }>;
}

export default async function DashboardPage(props: Props) {
	// ✅ Can await params in Next.js 15
	const { organizationSlug } = await props.params;
	const { view } = await props.searchParams;

	// ✅ Can call server-only functions
	const session = await requireAuth();

	// ✅ Can fetch data directly
	const dashboardData = await getDashboardData(
		organizationSlug,
		session.user.id,
	);

	if (!dashboardData) {
		// ✅ Can use redirect
		redirect("/onboarding");
	}

	return (
		<Dashboard
			data={dashboardData}
			user={session.user}
			view={view || "overview"}
		/>
	);
}
```

## Async Data Fetching Patterns

### Sequential Fetching
Use when later queries depend on earlier results:

```tsx
export default async function Page() {
	// First fetch
	const user = await getUser();

	// Second fetch depends on user
	const posts = await getUserPosts(user.id);

	// Third fetch depends on posts
	const comments = await getPostComments(posts[0]?.id);

	return <View user={user} posts={posts} comments={comments} />;
}
```

### Parallel Fetching (Preferred)
Use when queries are independent:

```tsx
export default async function Page() {
	// ✅ All queries happen in parallel
	const [user, posts, recommendations] = await Promise.all([
		getUser(),
		getUserPosts(),
		getRecommendations(),
	]);

	return (
		<View
			user={user}
			posts={posts}
			recommendations={recommendations}
		/>
	);
}
```

### Real Example: Multi-Resource Page

```tsx
// app/(saas)/app/[organizationSlug]/settings/billing/page.tsx
import { getSession, requireAuth } from "@saas/auth/lib/server";
import { getOrganization, getSubscription, getInvoices } from "@/lib/billing";
import { BillingPage } from "@/components/BillingPage";

export const dynamic = "force-dynamic"; // Always fresh billing data

export default async function BillingPage(props: Props) {
	const { organizationSlug } = await props.params;
	const session = await requireAuth();

	// ✅ Parallel fetching - all requests happen concurrently
	const [organization, subscription, invoices, usage] = await Promise.all([
		getOrganization(organizationSlug),
		getSubscription(organizationSlug),
		getInvoices(organizationSlug),
		getUsage(organizationSlug),
	]);

	return (
		<BillingPage
			organization={organization}
			subscription={subscription}
			invoices={invoices}
			usage={usage}
		/>
	);
}
```

## Database Access

Server Components can query databases directly:

```tsx
// app/(saas)/app/team/page.tsx
import { db } from "@/lib/db";

export default async function TeamPage() {
	// ✅ Direct database access
	const members = await db.teamMembers.findMany({
		where: {
			teamId: getCurrentTeamId(),
		},
		include: {
			user: true,
		},
	});

	return (
		<div>
			{members.map((member) => (
				<div key={member.id}>{member.user.email}</div>
			))}
		</div>
	);
}
```

## Streaming with Suspense

Use `<Suspense>` for streaming UI updates:

```tsx
// app/(saas)/app/page.tsx
import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DashboardLoading } from "@/components/DashboardLoading";
import { ReportsSection } from "@/components/ReportsSection";
import { ReportsSkeleton } from "@/components/ReportsSkeleton";

async function Reports() {
	// This takes longer - will stream separately
	const reports = await generateReports();
	return <ReportsSection data={reports} />;
}

export default async function Page() {
	// Fast initial page load with streaming content
	return (
		<>
			<Dashboard />

			{/* Show skeleton while Reports are loading */}
			<Suspense fallback={<ReportsSkeleton />}>
				<Reports />
			</Suspense>
		</>
	);
}
```

### Real Example: Complex Page with Multiple Suspense Boundaries

```tsx
// app/(saas)/app/analytics/page.tsx
import { Suspense } from "react";
import { getSession } from "@saas/auth/lib/server";
import { AnalyticsOverview } from "@/components/AnalyticsOverview";
import { DetailedReports } from "@/components/DetailedReports";
import { LoadingOverview, LoadingReports } from "@/components/Skeletons";

async function Overview() {
	// Fast query
	const overview = await db.analytics.getOverview();
	return <AnalyticsOverview data={overview} />;
}

async function Reports() {
	// Slower query
	const reports = await db.analytics.generateDetailedReports();
	return <DetailedReports data={reports} />;
}

export default async function AnalyticsPage() {
	return (
		<div className="space-y-8">
			{/* Quick overview loads immediately */}
			<Suspense fallback={<LoadingOverview />}>
				<Overview />
			</Suspense>

			{/* Detailed reports load later */}
			<Suspense fallback={<LoadingReports />}>
				<Reports />
			</Suspense>
		</div>
	);
}
```

## Protected Pages with Auth

```tsx
// app/(saas)/app/page.tsx
import { requireAuth, requireRole } from "@saas/auth/lib/server";

// Require authentication
export default async function ProtectedPage() {
	const session = await requireAuth();

	// session is guaranteed to exist here
	return <div>Welcome, {session.user.email}</div>;
}

// Require specific role
export default async function AdminPage() {
	const session = await requireRole(["admin"]);

	// Only admins reach here
	return <div>Admin Panel</div>;
}
```

## Metadata with Dynamic Data

Use `generateMetadata()` for dynamic metadata based on params:

```tsx
// app/(marketing)/blog/[...path]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { path } = await props.params;

	// Fetch the post
	const post = await getPost(path.join("/"));

	if (!post) {
		return {
			title: "Post not found",
		};
	}

	return {
		title: post.title,
		description: post.excerpt,
		openGraph: {
			title: post.title,
			description: post.excerpt,
			images: [post.ogImage],
		},
	};
}

export default async function BlogPost(props: Props) {
	const { path } = await props.params;
	const post = await getPost(path.join("/"));

	return <ArticleView post={post} />;
}
```

## Caching Control

```tsx
// Force cache (default)
export const revalidate = false; // Cache indefinitely

// Revalidate every 60 seconds
export const revalidate = 60;

// Always fresh (no cache)
export const dynamic = "force-dynamic";

// Static rendering
export const dynamic = "force-static";

// Real example: Billing page (always fresh)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillingPage() {
	const usage = await getCurrentUsage();
	return <BillingView usage={usage} />;
}
```

## Layout Patterns

### Shared Layout with Providers

```tsx
// app/(saas)/layout.tsx
import { getSession } from "@saas/auth/lib/server";
import { getServerQueryClient } from "@shared/lib/server";
import { SessionProvider } from "@/components/SessionProvider";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";

export default async function SaaSLayout({ children }: Props) {
	// ✅ Fetch session on server
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// ✅ Prefetch queries on server
	const queryClient = getServerQueryClient();
	await queryClient.prefetchQuery({
		queryKey: ["session"],
		queryFn: () => session,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<SessionProvider initialSession={session}>
				<div className="flex">
					<Sidebar />
					<main>{children}</main>
				</div>
			</SessionProvider>
		</HydrationBoundary>
	);
}
```

## Common Mistakes

❌ **Mistake 1:** Using hooks in Server Components
```tsx
// WRONG
import { useState } from "react";

export default async function Page() {
	const [count, setCount] = useState(0); // ❌ useState not allowed
	return <div>{count}</div>;
}

// RIGHT - Move to Client Component
'use client';
import { useState } from "react";

export function Counter() {
	const [count, setCount] = useState(0);
	return <div>{count}</div>;
}
```

❌ **Mistake 2:** Not awaiting async operations
```tsx
// WRONG
export default async function Page() {
	const data = fetchData(); // ❌ Returns Promise, not data
	return <div>{data.name}</div>;
}

// RIGHT
export default async function Page() {
	const data = await fetchData();
	return <div>{data.name}</div>;
}
```

❌ **Mistake 3:** Forgetting to await params
```tsx
// WRONG
export default async function Page({ params }: Props) {
	// params might be a Promise in Next.js 15!
	const id = params.id;
	return <div>{id}</div>;
}

// RIGHT
export default async function Page({ params }: Props) {
	const { id } = await params;
	return <div>{id}</div>;
}
```

## Best Practices

✅ **Use `Promise.all()` for parallel queries** - Faster than sequential
✅ **Use `<Suspense>` for streaming** - Faster perceived load times
✅ **Prefetch queries in layouts** - Share data with nested pages
✅ **Control caching explicitly** - Use `revalidate` and `dynamic`
✅ **Fetch close to where it's used** - Avoid over-fetching in layouts
✅ **Always check authentication** - Before accessing protected data
✅ **Serialize data before passing to Client** - No functions or circular refs
