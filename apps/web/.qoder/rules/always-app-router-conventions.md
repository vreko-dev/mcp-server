# Always: App Router Conventions for Next.js 15

## Overview
This project uses Next.js 15 App Router (not Pages Router). All routing is file-based, with layouts and pages organized hierarchically in the `app/` directory.

## File-Based Routing Structure

### Core Files
- **`page.tsx`**: Defines the UI for a route segment
- **`layout.tsx`**: Defines shared UI for a segment and all children (must be async)
- **`error.tsx`**: Error boundary for a segment
- **`loading.tsx`**: Suspense fallback UI during async operations
- **`not-found.tsx`**: 404 UI for a segment
- **`route.ts`**: API route handler

### Example: Route Hierarchy
```
app/
├── layout.tsx                  # Root layout
├── (marketing)/                # Route group (visual organization, doesn't affect URL)
│   ├── layout.tsx
│   ├── (home)/
│   │   └── page.tsx           # /
│   ├── about/
│   │   └── page.tsx           # /about
│   └── blog/
│       ├── page.tsx           # /blog
│       └── [...path]/
│           └── page.tsx       # /blog/* (catch-all)
├── (saas)/                    # Private app route group
│   ├── layout.tsx
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx           # /app (private)
│       ├── api-keys/
│       │   ├── page.tsx       # /app/api-keys
│       │   └── actions.ts     # Server actions
│       └── [organizationSlug]/
│           ├── layout.tsx
│           └── page.tsx       # /app/[slug]
└── auth/
    ├── layout.tsx
    ├── login/
    │   └── page.tsx           # /auth/login
    └── callback/
        └── page.tsx           # /auth/callback
```

## Route Groups (Parentheses)

Route groups use parentheses to organize routes **without affecting the URL structure**.

**Good use cases:**
- Separating marketing site from SaaS app: `(marketing)` vs `(saas)`
- Organizing account pages: `(account)`
- Grouping admin pages: `(admin)`

```tsx
// app/(marketing)/layout.tsx
export default async function MarketingLayout({ children }: PropsWithChildren) {
	return (
		<Document>
			<Navbar />
			<main className="min-h-screen">{children}</main>
			<Footer />
		</Document>
	);
}

// app/(saas)/layout.tsx - Shows different layout, same URL structure
export default async function SaaSLayout({ children }: PropsWithChildren) {
	const session = await getSession();
	if (!session) redirect("/auth/login");

	return (
		<Document>
			<SidebarNav />
			<main>{children}</main>
		</Document>
	);
}
```

## Dynamic Routes (Brackets)

Dynamic routes use **square brackets** `[param]` to capture URL segments.

```tsx
// app/(saas)/app/(organizations)/[organizationSlug]/page.tsx
interface Props {
	params: Promise<{ organizationSlug: string }>;
}

export default async function OrgPage({ params }: Props) {
	const { organizationSlug } = await params;
	// Use organizationSlug
	return <div>Organization: {organizationSlug}</div>;
}
```

**Key pattern for Next.js 15:** Always use `Promise<Params>` and `await params`.

### Catch-All Routes
Use `[...param]` to capture all remaining segments:

```tsx
// app/(marketing)/blog/[...path]/page.tsx
interface Props {
	params: Promise<{ path: string[] }>;
}

export default async function BlogPost({ params }: Props) {
	const { path } = await params;
	// path = ["2025", "january", "my-post"]
	return <BlogPostContent path={path} />;
}
```

## Parallel Routes (@folder)

Parallel routes render multiple pages in the same layout using `@` prefix. Useful for modals, sidebars, or complex UIs.

```
app/(saas)/
├── layout.tsx
├── page.tsx
├── @modal/
│   └── [id]/
│       └── page.tsx     # Parallel route at modal.id
└── @sidebar/
    └── page.tsx        # Parallel route at sidebar
```

```tsx
// app/(saas)/layout.tsx
interface Props {
	children: React.ReactNode;
	modal: React.ReactNode;
	sidebar: React.ReactNode;
}

export default function Layout({ children, modal, sidebar }: Props) {
	return (
		<div className="flex">
			{sidebar}
			<main>{children}</main>
			{modal}
		</div>
	);
}
```

## Intercepting Routes

Intercepting routes allow you to "intercept" a route and show different content. Use `(.)` for same level, `(..)` for parent level.

```
app/
├── (saas)/
│   ├── page.tsx
│   └── (.)feed/
│       └── [id]/
│           └── page.tsx    # Intercepts /feed/[id] when in /saas
└── feed/
    └── [id]/
        └── page.tsx        # Full page version
```

## Metadata API (SEO)

Define metadata in `layout.tsx` or `page.tsx` using `Metadata` export:

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
	metadataBase: new URL("https://snapback.dev"),
	title: {
		absolute: "SnapBack - Code Breaks. Snap Back.",
		default: "SnapBack",
		template: "%s | SnapBack",
	},
	description: "Visual protection for every file.",
	openGraph: {
		title: "SnapBack",
		description: "Visual protection for every file.",
		url: "https://snapback.dev",
		images: [{ url: "og-image.png", width: 1200, height: 630 }],
	},
	twitter: {
		card: "summary_large_image",
		title: "SnapBack",
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#020617",
};
```

For dynamic metadata (based on params), use `generateMetadata()`:

```tsx
// app/(marketing)/blog/[...path]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { path } = await props.params;
	const post = await fetchPost(path);

	return {
		title: post.title,
		description: post.excerpt,
	};
}
```

## Revalidation & Caching

Control caching behavior per route:

```tsx
// No caching - always fresh
export const revalidate = 0;

// Revalidate every 60 seconds
export const revalidate = 60;

// Cache indefinitely (must manually revalidate)
export const revalidate = false; // or omit

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Force static rendering
export const dynamic = "force-static";
```

## Common Mistakes

❌ **Mistake 1:** Using Pages Router syntax in App Router
```tsx
// WRONG
export const getServerSideProps = async () => {};

// RIGHT
// Just use async Server Component
```

❌ **Mistake 2:** Forgetting route groups affect organization, not URLs
```
// This creates /account, not /(account)/account
app/(account)/page.tsx
```

❌ **Mistake 3:** Not awaiting params in dynamic routes
```tsx
// WRONG
export default function Page({ params }) {
	return <div>{params.id}</div>;  // params.id might be Promise!
}

// RIGHT
export default async function Page({ params }: Props) {
	const { id } = await params;
	return <div>{id}</div>;
}
```

❌ **Mistake 4:** Mixing URL structure with route groups
```
// WRONG - if you want /blog, not /(blog)
app/(blog)/page.tsx

// RIGHT
app/blog/page.tsx
```

## Best Practices

✅ Use route groups `()` to organize code without changing URLs
✅ Always await `params` in dynamic routes
✅ Define metadata at the appropriate level (affects children)
✅ Use `generateMetadata()` for dynamic metadata based on params
✅ Leverage caching: `revalidate`, `dynamic` exports
✅ Organize auth routes separately: `app/auth/`
✅ Use catch-all routes `[...]` for nested structures (blog posts, docs)
