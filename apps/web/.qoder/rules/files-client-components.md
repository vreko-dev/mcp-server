# Files: Client Components

**Applies to:** Any file with `'use client'` directive

## Overview

Client Components run **only in the browser**. They have access to browser APIs, React hooks, and event handlers. Add `'use client'` at the top of the file.

## Structure

```
✅ Can use useState, useEffect, useContext hooks
✅ Can use browser APIs (localStorage, window, document)
✅ Can use event handlers (onClick, onChange, onSubmit)
✅ Can use third-party browser libraries
❌ No server-only operations
❌ No direct database access
❌ No sensitive data exposure
```

## Real Example: Interactive Data Component

```tsx
// components/UsageChart.tsx
'use client';

import { useEffect, useState } from "react";
import type { UsageMetrics } from "@/lib/types";

interface Props {
	metrics: UsageMetrics;
	className?: string;
}

export function UsageChart({ metrics, className }: Props) {
	// ✅ Can use hooks
	const [isClient, setIsClient] = useState(false);

	// ✅ Hydration safety pattern
	useEffect(() => {
		setIsClient(true);
	}, []);

	if (!isClient) {
		return <div className={className}>Loading usage data...</div>;
	}

	const usagePercentage = metrics.snapshotsLimit
		? Math.round((metrics.snapshotsUsed / metrics.snapshotsLimit) * 100)
		: 0;

	const isApproachingLimit = usagePercentage >= 80;
	const isCritical = usagePercentage >= 95;

	return (
		<div className={`bg-white rounded-lg border p-6 ${className}`}>
			<h2 className="text-xl font-bold mb-4">Usage</h2>

			<div className="space-y-4">
				<div>
					<div className="flex justify-between mb-1">
						<span className="text-sm font-medium">Snapshots</span>
						<span className="text-sm text-gray-500">
							{metrics.snapshotsUsed}
							{metrics.snapshotsLimit && ` / ${metrics.snapshotsLimit}`}
						</span>
					</div>

					{metrics.snapshotsLimit ? (
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div
								className={`h-2.5 rounded-full ${
									isCritical
										? "bg-red-600"
										: isApproachingLimit
											? "bg-yellow-500"
											: "bg-green-600"
								}`}
								style={{
									width: `${Math.min(usagePercentage, 100)}%`,
								}}
							/>
						</div>
					) : (
						<div className="px-3 py-1 bg-green-600 text-white text-xs rounded">
							Unlimited
						</div>
					)}
				</div>

				{isApproachingLimit && metrics.snapshotsLimit && (
					<div
						className={`p-3 rounded text-sm ${
							isCritical
								? "bg-red-50 text-red-700 border border-red-200"
								: "bg-yellow-50 text-yellow-700 border border-yellow-200"
						}`}
					>
						{isCritical ? (
							<p className="font-medium">
								⚠️ Critical: Only{" "}
								{metrics.snapshotsLimit - metrics.snapshotsUsed} snapshots
								remaining.
							</p>
						) : (
							<p>
								⚠️ You're approaching your limit ({usagePercentage}% used).
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
```

## React Hooks

### State Management

```tsx
'use client';

import { useState } from "react";

export function Counter() {
	const [count, setCount] = useState(0);

	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>Increment</button>
		</div>
	);
}
```

### Side Effects

```tsx
'use client';

import { useEffect, useState } from "react";

export function ThemeToggle() {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	// ✅ Can use browser APIs in useEffect
	useEffect(() => {
		const saved = localStorage.getItem("theme");
		if (saved) setTheme(saved as "light" | "dark");
	}, []);

	// ✅ Save to localStorage
	useEffect(() => {
		localStorage.setItem("theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	return (
		<button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
			Toggle to {theme === "light" ? "dark" : "light"}
		</button>
	);
}
```

### Context

```tsx
'use client';

import { createContext, useContext, useState } from "react";

interface Theme {
	mode: "light" | "dark";
	setMode: (mode: "light" | "dark") => void;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<"light" | "dark">("light");

	return (
		<ThemeContext.Provider value={{ mode, setMode }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return context;
}
```

## Data Fetching with Tanstack Query

```tsx
// hooks/use-api-keys.ts
'use client';

import { useQueryClient } from "@tanstack/react-query";
import { useResourceQuery, useResourceMutation } from "@/lib/use-resource-query";

export interface ApiKey {
	id: string;
	name: string;
	keyPreview: string;
	createdAt: string;
	revokedAt: string | null;
}

export function useApiKeys() {
	return useResourceQuery<ApiKey[]>(
		["api-keys", "list"],
		async () => {
			// ✅ Can fetch from client-side API routes
			const res = await fetch("/api/v1/api-keys/list", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});

			if (!res.ok) {
				throw new Error(`Failed to fetch API keys: ${res.statusText}`);
			}

			return (await res.json()).keys || [];
		},
		{
			staleTime: 30000, // Keep fresh for 30 seconds
		},
	);
}

export function useCreateApiKey() {
	const queryClient = useQueryClient();

	return useResourceMutation(
		async (input: { name: string; rateLimit?: number }) => {
			const res = await fetch("/api/v1/api-keys/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error?.message || "Failed to create API key");
			}

			return res.json();
		},
		{
			// ✅ Optimistic update
			onMutate: async (input) => {
				await queryClient.cancelQueries({
					queryKey: ["api-keys", "list"],
				});

				const previousKeys = queryClient.getQueryData<ApiKey[]>([
					"api-keys",
					"list",
				]);

				// Add optimistic API key
				queryClient.setQueryData<ApiKey[]>(["api-keys", "list"], (old = []) => [
					{
						id: `temp-${Date.now()}`,
						name: input.name,
						keyPreview: "sk_****",
						createdAt: new Date().toISOString(),
						revokedAt: null,
					},
					...old,
				]);

				return { previousKeys };
			},
			// ✅ Rollback on error
			onError: (_error, _variables, context) => {
				if (context?.previousKeys) {
					queryClient.setQueryData(["api-keys", "list"], context.previousKeys);
				}
			},
			// ✅ Refetch actual data
			onSettled: () => {
				queryClient.invalidateQueries({ queryKey: ["api-keys", "list"] });
			},
		},
	);
}

// Usage in component
'use client';

export function ApiKeysList() {
	const { data: keys, isLoading } = useApiKeys();
	const { mutate: createKey, isPending } = useCreateApiKey();

	if (isLoading) return <div>Loading keys...</div>;

	return (
		<div>
			<button
				onClick={() => createKey({ name: "New Key" })}
				disabled={isPending}
			>
				{isPending ? "Creating..." : "Create Key"}
			</button>

			{keys?.map((key) => (
				<div key={key.id}>
					<span>{key.name}</span>
					<span className="text-xs text-gray-500">{key.keyPreview}</span>
				</div>
			))}
		</div>
	);
}
```

## Form Handling

### Using Server Actions

```tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

interface FormState {
	error?: string;
	success?: boolean;
}

export function ApiKeyForm() {
	const [state, formAction, isPending] = useActionState<FormState, FormData>(
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
			<input
				type="text"
				name="name"
				placeholder="API Key Name"
				required
				disabled={isPending}
			/>
			<button type="submit" disabled={isPending}>
				{isPending ? "Creating..." : "Create"}
			</button>
			{state.error && (
				<div className="text-red-600">{state.error}</div>
			)}
			{state.success && (
				<div className="text-green-600">Key created successfully!</div>
			)}
		</form>
	);
}
```

### Traditional State-Based Form

```tsx
'use client';

import { useState } from "react";

interface FormData {
	name: string;
	email: string;
	message: string;
}

export function ContactForm() {
	const [formData, setFormData] = useState<FormData>({
		name: "",
		email: "",
		message: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			if (!res.ok) {
				throw new Error("Failed to submit form");
			}

			setFormData({ name: "", email: "", message: "" });
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<input
				type="text"
				name="name"
				value={formData.name}
				onChange={handleChange}
				required
			/>
			<input
				type="email"
				name="email"
				value={formData.email}
				onChange={handleChange}
				required
			/>
			<textarea
				name="message"
				value={formData.message}
				onChange={handleChange}
				required
			/>
			<button type="submit" disabled={isSubmitting}>
				{isSubmitting ? "Submitting..." : "Submit"}
			</button>
			{error && <div className="text-red-600">{error}</div>}
		</form>
	);
}
```

## Event Handlers

```tsx
'use client';

import { useState } from "react";

export function InteractiveButton() {
	const [clicks, setClicks] = useState(0);

	// ✅ Can use onClick event
	const handleClick = () => {
		setClicks((prev) => prev + 1);
	};

	// ✅ Can use onChange event
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		console.log("Input value:", e.target.value);
	};

	// ✅ Can use onMouseEnter, onBlur, etc.
	const handleMouseEnter = () => {
		console.log("Hovering!");
	};

	return (
		<div>
			<button onClick={handleClick}>
				Clicked {clicks} times
			</button>

			<input
				type="text"
				onChange={handleInputChange}
				onMouseEnter={handleMouseEnter}
			/>
		</div>
	);
}
```

## Browser APIs

```tsx
'use client';

import { useEffect, useState } from "react";

export function GeoLocation() {
	const [location, setLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);

	useEffect(() => {
		// ✅ Can use navigator API
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
				setLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			});
		}
	}, []);

	return location ? (
		<div>
			Lat: {location.lat}, Lng: {location.lng}
		</div>
	) : (
		<div>Getting location...</div>
	);
}
```

## Third-Party Libraries

```tsx
'use client';

import { useEffect } from "react";

export function Analytics() {
	useEffect(() => {
		// ✅ Can use third-party client libraries
		if (window.gtag) {
			window.gtag("event", "page_view", {
				page_path: window.location.pathname,
			});
		}
	}, []);

	return null;
}
```

## Common Mistakes

❌ **Mistake 1:** Using server-only code in Client Components
```tsx
// WRONG
'use client';

import { db } from "@/lib/db";

export function UserList() {
	// ❌ db is server-only!
	const users = await db.users.findAll();
	return <div>{users}</div>;
}

// RIGHT
// Fetch on server, pass as props
export default async function Page() {
	const users = await db.users.findAll();
	return <UserList users={users} />;
}
```

❌ **Mistake 2:** Missing 'use client' when using hooks
```tsx
// WRONG
import { useState } from "react";

export function Counter() {
	const [count, setCount] = useState(0); // ❌ useState requires 'use client'
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

❌ **Mistake 3:** Hydration mismatches
```tsx
// WRONG - Server renders different HTML than client
'use client';

export function Clock() {
	return <div>{new Date().toLocaleString()}</div>;
}

// RIGHT - Wait for hydration
'use client';

import { useEffect, useState } from "react";

export function Clock() {
	const [time, setTime] = useState<string>("");

	useEffect(() => {
		setTime(new Date().toLocaleString());
	}, []);

	if (!time) return <div>Loading...</div>;
	return <div>{time}</div>;
}
```

## Best Practices

✅ **Keep Client Components small** - Push 'use client' as far down tree as possible
✅ **Use useCallback for event handlers** - Prevents unnecessary re-renders
✅ **Use Tanstack Query for data fetching** - Handles caching, refetching, mutations
✅ **Serialize all Server data** - No functions, Dates, or circular references
✅ **Handle loading and error states** - Always show feedback to user
✅ **Use `useEffect` cleanup** - Cancel requests, clear timers
✅ **Validate user input** - Never trust client-side validation alone
