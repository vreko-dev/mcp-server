# Decision: Authentication Integration

## Architecture Overview

This project uses **Better Auth** for authentication. It's integrated across:
- **Middleware**: Session detection and route protection
- **Server Components**: Session verification and protected pages
- **Server Actions**: User context for mutations
- **Client Components**: Session context and logout

```
Middleware (Edge Runtime)
├─ Detect session cookie: better-auth.session_token
├─ Redirect unauthenticated users to /auth/login
└─ Forward to Server Component for full validation

Server Component
├─ Call getSession() from lib/auth/server
├─ Validate session database
├─ Redirect if no session or role mismatch
└─ Pass user data to Client Components

Server Actions
├─ Access session for user context
├─ Validate permissions before mutation
└─ Return data to Client

Client Component
├─ Receive session as prop
├─ Use SessionContext for global access
└─ Call Server Actions for mutations
```

## Session Handling in Server Components

### Get Current Session (Optional)

```tsx
// lib/auth/server.ts
import { cache } from "react";

export const getSession = cache(async (): Promise<Session | null> => {
	try {
		const headersList = await headers();
		const session = await betterAuth.api.getSession({
			headers: headersList,
		});
		return session as Session | null;
	} catch (error) {
		console.error("[Auth] Get session error:", error);
		return null;
	}
});

// app/page.tsx
export default async function HomePage() {
	const session = await getSession();

	return (
		<div>
			{session ? (
				<p>Welcome, {session.user.email}</p>
			) : (
				<p>Please sign in</p>
			)}
		</div>
	);
}
```

**Benefits:**
- ✅ Optional - returns null if not authenticated
- ✅ Cached per-request using React's `cache()`
- ✅ Safe to call multiple times

### Require Authentication (Redirect if Missing)

```tsx
// lib/auth/server.ts
export async function requireAuth(
	redirectTo = "/auth/login",
): Promise<Session> {
	const session = await getSession();
	if (!session) {
		redirect(redirectTo);
	}
	return session;
}

// app/(saas)/app/page.tsx - Protected page
export default async function DashboardPage() {
	// ✅ If no session, redirects automatically
	const session = await requireAuth();

	// Guaranteed to have session here
	return <Dashboard user={session.user} />;
}
```

**Benefits:**
- ✅ Never returns null - always authenticated or redirects
- ✅ Clean code - no null checks needed
- ✅ Prevents rendering without auth

### Require Specific Role

```tsx
// lib/auth/server.ts
export async function requireRole(
	allowedRoles: string[],
	redirectTo = "/dashboard",
): Promise<Session> {
	const session = await requireAuth();

	const userRole = session.user.role || "user";
	if (!allowedRoles.includes(userRole)) {
		redirect(redirectTo);
	}

	return session;
}

// app/(saas)/app/(account)/admin/users/page.tsx
export default async function AdminPage() {
	const session = await requireRole(["admin"]);

	// Only admins reach here
	return <AdminPanel />;
}
```

**Benefits:**
- ✅ Authorization checks before rendering
- ✅ Prevents unauthorized access
- ✅ Customizable redirect path

### Real Example: Protected SaaS Layout

```tsx
// app/(saas)/layout.tsx
import { getSession } from "@saas/auth/lib/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function SaaSLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	// ✅ Edge Runtime check: session cookie exists
	if (!session) {
		// ✅ Server Component redirect to login
		redirect("/auth/login");
	}

	// ✅ Access user data
	return (
		<Document>
			<Header user={session.user} />
			<main>{children}</main>
		</Document>
	);
}
```

## Middleware for Auth Routing

```tsx
// middleware.ts - Runs on Edge Runtime
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Protected routes
	const protectedRoutes = ["/app/", "/dashboard", "/settings"];
	const isProtectedRoute = protectedRoutes.some((route) =>
		pathname.startsWith(route),
	);

	if (isProtectedRoute) {
		// ⚠️ Edge Runtime - cannot import auth package (has native deps)
		// Check only for session cookie presence
		const sessionToken = request.cookies.get("better-auth.session_token");

		if (!sessionToken) {
			// ✅ Redirect to login
			const loginUrl = new URL("/auth/login", request.url);
			loginUrl.searchParams.set("redirect", pathname);
			return NextResponse.redirect(loginUrl);
		}

		// ✅ Cookie exists - allow through to Server Component
		// Full session validation happens in Server Component
		const response = NextResponse.next();
		addSecurityHeaders(response);
		return response;
	}

	// Allow non-protected routes
	const response = NextResponse.next();
	addSecurityHeaders(response);
	return response;
}

export const config = {
	matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
```

**Important:**
- ⚠️ Middleware runs on Edge Runtime (no native dependencies)
- ✅ Check cookie presence for initial redirect
- ✅ Full session validation in Server Components
- ✅ Pass to Server Component for database validation

## Server Actions with Auth

```tsx
// app/(saas)/app/api-keys/actions.ts
'use server';

import { getSession } from "@saas/auth/lib/server";
import { createApiKey } from "@snapback/auth";
import { revalidatePath } from "next/cache";

export async function createApiKeyAction(name: string) {
	// ✅ Get session in Server Action
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	// ✅ Use user context for mutation
	const key = await createApiKey({
		userId: session.user.id,
		name,
	});

	// ✅ Revalidate affected pages
	revalidatePath("/app/api-keys");

	return key;
}

// components/ApiKeyForm.tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

export function ApiKeyForm() {
	const [state, formAction] = useActionState(
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
			<button type="submit">Create Key</button>
			{state.error && <div>{state.error}</div>}
		</form>
	);
}
```

**Benefits:**
- ✅ Server-side authorization check
- ✅ User context automatically available
- ✅ Secure - users can't spoof identity

## Session Access in Client Components

### Via Props (From Server Component)

```tsx
// app/(saas)/layout.tsx - Server Component
import { getSession } from "@saas/auth/lib/server";
import { SidebarNav } from "@/components/SidebarNav";

export default async function Layout({ children }: Props) {
	const session = await getSession();

	// ✅ Pass session to Client Component
	return (
		<SidebarNav user={session?.user} />
	);
}

// components/SidebarNav.tsx
'use client';

import type { User } from "@snapback/auth";

interface Props {
	user?: User;
}

export function SidebarNav({ user }: Props) {
	return (
		<nav>
			{user && (
				<div>
					<img src={user.image} alt={user.email} />
					<span>{user.email}</span>
				</div>
			)}
		</nav>
	);
}
```

### Via Context Provider

```tsx
// app/(saas)/layout.tsx - Server Component
import { getSession } from "@saas/auth/lib/server";
import { SessionProvider } from "@/components/SessionProvider";

export default async function Layout({ children }: Props) {
	const session = await getSession();

	// ✅ Wrap with session context
	return (
		<SessionProvider initialSession={session}>
			{children}
		</SessionProvider>
	);
}

// components/SessionProvider.tsx
'use client';

import { createContext, useContext } from "react";
import type { Session } from "@saas/auth/lib/server";

const SessionContext = createContext<Session | null>(null);

interface Props {
	initialSession: Session | null;
	children: React.ReactNode;
}

export function SessionProvider({ initialSession, children }: Props) {
	return (
		<SessionContext.Provider value={initialSession}>
			{children}
		</SessionContext.Provider>
	);
}

export function useSession() {
	return useContext(SessionContext);
}

// components/UserMenu.tsx
'use client';

import { useSession } from "@/components/SessionProvider";

export function UserMenu() {
	const session = useSession();

	if (!session) return null;

	return <div>Logged in as {session.user.email}</div>;
}
```

## Logout Flow

```tsx
// lib/auth/server.ts
export async function signOut() {
	'use server';

	try {
		const headersList = await headers();
		await betterAuth.api.signOut({
			headers: headersList,
		});
		redirect("/auth/login");
	} catch (error) {
		console.error("[Auth] Sign out error:", error);
		throw error;
	}
}

// components/LogoutButton.tsx
'use client';

import { signOut } from "@/lib/auth/server";

export function LogoutButton() {
	return (
		<form action={signOut}>
			<button type="submit">Sign Out</button>
		</form>
	);
}
```

**Benefits:**
- ✅ Works without JavaScript (form submission)
- ✅ Server-side session clearing
- ✅ Automatic redirect to login

## Login/Signup Flow

### Login Page (Server Component Layout)

```tsx
// app/auth/layout.tsx
export default function AuthLayout({ children }: Props) {
	// No session check here - allow unauthenticated users
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-md">{children}</div>
		</div>
	);
}

// app/auth/login/page.tsx
'use client';

import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
	const searchParams = useSearchParams();
	const redirect = searchParams.get("redirect");

	return <LoginForm redirectTo={redirect || "/app"} />;
}
```

### Login Form Component

```tsx
// components/LoginForm.tsx
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
	redirectTo?: string;
}

export function LoginForm({ redirectTo = "/app" }: Props) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			// ✅ Better Auth client library call
			const response = await signIn.email({
				email,
				password,
				callbackURL: redirectTo,
			});

			if (response) {
				router.push(redirectTo);
			}
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
			/>
			<input
				type="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
			/>
			<button type="submit" disabled={isLoading}>
				{isLoading ? "Signing in..." : "Sign In"}
			</button>
			{error && <div className="text-red-600">{error}</div>}
		</form>
	);
}
```

## OAuth Integration (Google, GitHub, etc.)

```tsx
// lib/auth/config.ts
import { betterAuth } from "@snapback/auth";
import { google, github } from "better-auth/social-providers";

export const auth = betterAuth({
	database: getDatabase(),
	plugins: [
		google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
		github({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
	],
});

// components/OAuthButtons.tsx
'use client';

import { signIn } from "@better-auth/client";
import { useRouter } from "next/navigation";

export function OAuthButtons() {
	const router = useRouter();

	const handleGoogleSignIn = async () => {
		await signIn.social({
			provider: "google",
			callbackURL: "/app",
		});
	};

	return (
		<button onClick={handleGoogleSignIn}>
			Sign in with Google
		</button>
	);
}
```

## Protected Routes Pattern

### Option 1: Require Auth + Role Check

```tsx
// app/(saas)/app/(account)/admin/users/page.tsx
import { requireRole } from "@saas/auth/lib/server";

export default async function AdminUsersPage() {
	const session = await requireRole(["admin"]);

	// ✅ Redirects if not admin
	return <AdminUsersList />;
}
```

### Option 2: Conditional Rendering

```tsx
// app/page.tsx
import { getSession } from "@saas/auth/lib/server";

export default async function HomePage() {
	const session = await getSession();

	return (
		<div>
			{session ? (
				<Link href="/app">Go to Dashboard</Link>
			) : (
				<Link href="/auth/login">Sign In</Link>
			)}
		</div>
	);
}
```

## Advanced: Multi-Factor Authentication

```tsx
// lib/auth/server.ts
export async function requireVerifiedEmail() {
	const headersList = await headers();
	const request = new Request("http://localhost", { headers: headersList });

	const ctx = await snapbackAuth.requireAuth(request);

	if (!ctx.emailVerified) {
		redirect("/auth/verify-email");
	}

	return ctx;
}

export async function requireStepUp(options?: { requirePasskey?: boolean }) {
	const ctx = await snapbackAuth.requireAuth(request);

	const hasStrongFactor =
		ctx.twoFactorEnabled || (options?.requirePasskey && ctx.passkeyRegistered);

	if (!hasStrongFactor) {
		redirect("/auth/step-up");
	}

	return ctx;
}

// app/(saas)/app/settings/security/page.tsx
export default async function SecurityPage() {
	const session = await requireStepUp({ requirePasskey: true });

	// ✅ Only users with passkey/2FA reach here
	return <SecuritySettings />;
}
```

## Best Practices

✅ **Use `getSession()` for optional auth** - Returns null if not authenticated
✅ **Use `requireAuth()` for protected pages** - Redirects if not authenticated
✅ **Use `requireRole()` for admin pages** - Enforces authorization
✅ **Check auth in Server Components** - Secure, database-backed validation
✅ **Cache session with React `cache()`** - Avoid duplicate queries per request
✅ **Pass session as props or context** - Share with Client Components
✅ **Validate in Server Actions** - Never trust client-side auth checks
✅ **Use `revalidateTag()` after logout** - Clear cached session data
✅ **Store sensitive data server-side** - Never expose API keys to client
✅ **Use HTTPS in production** - Protect session cookies

## Common Mistakes

❌ **Mistake 1:** Trusting client-side session checks
```tsx
// WRONG
'use client';
export function AdminComponent() {
	const { user } = useSession();
	if (user?.role !== "admin") return null; // ❌ Client can spoof!
	return <AdminPanel />;
}

// RIGHT
export default async function AdminPage() {
	const session = await requireRole(["admin"]); // ✅ Server validates
	return <AdminPanel />;
}
```

❌ **Mistake 2:** Exposing session in API response
```tsx
// WRONG
export async function GET(req: NextRequest) {
	const session = await getSession();
	return Response.json({ session }); // ❌ Exposes to client!
}

// RIGHT
export async function GET(req: NextRequest) {
	const session = await getSession();
	if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
	return Response.json({ userId: session.user.id }); // ✅ Only safe data
}
```

❌ **Mistake 3:** Not revalidating after login/logout
```tsx
// WRONG
export async function signOut() {
	'use server';
	await betterAuth.api.signOut({ headers: await headers() });
	// ❌ No revalidation - cached pages show stale data
}

// RIGHT
export async function signOut() {
	'use server';
	await betterAuth.api.signOut({ headers: await headers() });
	revalidateTag("user-session"); // ✅ Clear cached session
	redirect("/auth/login");
}
```
