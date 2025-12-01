# Files: Server Actions

**Applies to:** `app/**/actions.ts`, `app/actions/**`

## Overview

Server Actions are async functions that run on the server. They replace traditional API routes for mutations and form submissions. Add `'use server'` at the top of the file or function.

## Directory Convention

```
app/(saas)/app/
├── api-keys/
│   ├── page.tsx          # Client Component showing API keys
│   ├── actions.ts        # Server Actions for CRUD
│   └── ApiKeyForm.tsx    # Form using actions
├── settings/
│   ├── page.tsx
│   └── actions.ts
└── actions.ts            # Shared app-level actions
```

## Creating Server Actions

### File-Level Server Actions (Recommended)

Add `'use server'` at the top of `actions.ts`:

```tsx
// app/(saas)/app/api-keys/actions.ts
'use server';

import { getSession } from "@saas/auth/lib/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@snapback/auth";
import { revalidatePath } from "next/cache";

interface ApiKey {
	id: string;
	userId: string;
	keyHash: string;
	keyPreview: string;
	name: string;
	lastUsedAt?: Date | null;
	createdAt: Date;
	expiresAt?: Date | null;
	revokedAt?: Date | null;
	scopes: string[];
	rateLimit: number;
}

/**
 * List all API keys for current user
 */
export async function listApiKeysAction(): Promise<Omit<ApiKey, "keyHash">[]> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return await listApiKeys(session.user.id);
}

/**
 * Create a new API key
 */
export async function createApiKeyAction(
	name: string,
	rateLimit = 100,
): Promise<ApiKey & { fullKey: string }> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	const result = await createApiKey({
		userId: session.user.id,
		name,
		rateLimit,
	});

	// Revalidate to show the new key
	revalidatePath("/app/api-keys");

	return result;
}

/**
 * Revoke an API key
 */
export async function revokeApiKeyAction(keyId: string): Promise<void> {
	const session = await getSession();

	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	await revokeApiKey(keyId, session.user.id);

	// Revalidate the page to update the list
	revalidatePath("/app/api-keys");
}
```

### Function-Level Server Actions

Add `'use server'` to individual async functions:

```tsx
// app/auth/actions.ts

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
```

## Form Actions vs Programmatic Actions

### Form Actions (HTML Form Submission)

Use Server Actions directly in `<form action={}>`:

```tsx
// components/ApiKeyForm.tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

interface FormState {
	error?: string;
	success?: boolean;
	key?: string;
}

export function ApiKeyForm() {
	const [state, formAction, isPending] = useActionState<FormState, FormData>(
		async (prevState, formData) => {
			try {
				const name = formData.get("name") as string;
				const result = await createApiKeyAction(name);
				return { success: true, key: result.fullKey };
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
				{isPending ? "Creating..." : "Create Key"}
			</button>
			{state.error && <div className="text-red-600">{state.error}</div>}
			{state.success && (
				<div className="text-green-600">
					Key created: {state.key}
				</div>
			)}
		</form>
	);
}
```

### Programmatic Actions (Button Click or Mutation)

Call Server Actions from event handlers or mutations:

```tsx
// components/RevokeKeyButton.tsx
'use client';

import { useTransition } from "react";
import { revokeApiKeyAction } from "@/app/(saas)/app/api-keys/actions";

interface Props {
	keyId: string;
}

export function RevokeKeyButton({ keyId }: Props) {
	const [isPending, startTransition] = useTransition();

	return (
		<button
			onClick={() => {
				startTransition(async () => {
					try {
						await revokeApiKeyAction(keyId);
						alert("Key revoked");
					} catch (error) {
						alert(`Error: ${(error as Error).message}`);
					}
				});
			}}
			disabled={isPending}
		>
			{isPending ? "Revoking..." : "Revoke"}
		</button>
	);
}
```

## Error Handling

### Custom Error Types

```tsx
// lib/errors.ts
export class AuthenticationError extends Error {
	constructor(message = "Not authenticated") {
		super(message);
		this.name = "AuthenticationError";
	}
}

export class AuthorizationError extends Error {
	constructor(message = "Not authorized") {
		super(message);
		this.name = "AuthorizationError";
	}
}

export class ValidationError extends Error {
	constructor(message: string, public fields: Record<string, string> = {}) {
		super(message);
		this.name = "ValidationError";
	}
}

// app/(saas)/app/api-keys/actions.ts
'use server';

import { AuthenticationError, ValidationError } from "@/lib/errors";

export async function createApiKeyAction(name: string) {
	const session = await getSession();

	if (!session?.user) {
		throw new AuthenticationError("You must be logged in");
	}

	if (!name || name.trim().length < 3) {
		throw new ValidationError("Invalid API key name", {
			name: "Name must be at least 3 characters",
		});
	}

	return await createApiKey({ userId: session.user.id, name });
}
```

### Error Handling in Components

```tsx
'use client';

import { useActionState } from "react";
import { createApiKeyAction } from "@/app/(saas)/app/api-keys/actions";
import type { ValidationError } from "@/lib/errors";

export function ApiKeyForm() {
	const [state, formAction] = useActionState(
		async (prevState, formData) => {
			try {
				const name = formData.get("name") as string;
				await createApiKeyAction(name);
				return { success: true };
			} catch (error) {
				if (error instanceof ValidationError) {
					return { validationErrors: error.fields };
				}
				return { error: (error as Error).message };
			}
		},
		{},
	);

	return (
		<form action={formAction}>
			<input type="text" name="name" />
			{state.validationErrors?.name && (
				<span className="text-red-600">{state.validationErrors.name}</span>
			)}
			{state.error && <span className="text-red-600">{state.error}</span>}
			<button type="submit">Create</button>
		</form>
	);
}
```

## Validation

Use Zod or similar for input validation:

```tsx
// app/(saas)/app/api-keys/actions.ts
'use server';

import { z } from "zod";

const createApiKeySchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters"),
	rateLimit: z.number().min(1, "Rate limit must be positive"),
	scopes: z.array(z.string()).optional(),
});

export async function createApiKeyAction(
	name: string,
	rateLimit: number,
	scopes?: string[],
) {
	// Validate input
	const result = createApiKeySchema.safeParse({
		name,
		rateLimit,
		scopes,
	});

	if (!result.success) {
		throw new Error(result.error.errors[0]?.message || "Validation failed");
	}

	const session = await getSession();
	if (!session?.user) {
		throw new Error("Unauthorized");
	}

	return await createApiKey({
		userId: session.user.id,
		...result.data,
	});
}
```

## Revalidation Patterns

After mutations, revalidate affected data:

```tsx
'use server';

import { revalidatePath, revalidateTag } from "next/cache";

// Revalidate a specific page
export async function createApiKeyAction(name: string) {
	// ... create logic
	revalidatePath("/app/api-keys");
}

// Revalidate by cache tag
export async function updateUserAction(name: string) {
	// ... update logic
	revalidateTag("user-profile");
}

// Revalidate multiple pages
export async function deleteApiKeyAction(keyId: string) {
	// ... delete logic
	revalidatePath("/app/api-keys");
	revalidatePath("/app/settings");
}
```

## Best Practices

✅ **Use `'use server'` at file level** - Cleaner than function-level
✅ **Always validate input** - Use Zod or similar validation
✅ **Check authentication first** - Before any business logic
✅ **Check authorization** - Verify user can perform action
✅ **Revalidate affected data** - Use `revalidatePath()` or `revalidateTag()`
✅ **Return meaningful errors** - Use custom error types
✅ **Type your functions** - Define clear input/output types
✅ **Use `useActionState` hook** - For form submissions with pending state
✅ **Use `useTransition` hook** - For programmatic action calls with loading state

## Common Mistakes

❌ **Mistake 1:** Forgetting to validate input
```tsx
// WRONG
export async function updateAction(input: string) {
	// ❌ Could be empty, malicious, etc.
	await db.update(input);
}

// RIGHT
export async function updateAction(input: string) {
	const schema = z.string().min(1).max(100);
	const validated = schema.parse(input);
	await db.update(validated);
}
```

❌ **Mistake 2:** Not checking authentication
```tsx
// WRONG - Exposes user data!
export async function listUsers() {
	return await db.users.findAll();
}

// RIGHT
export async function listUsers() {
	const session = await getSession();
	if (!session?.user) throw new Error("Unauthorized");
	return await db.users.findAll();
}
```

❌ **Mistake 3:** Forgetting to revalidate
```tsx
// WRONG - Page shows stale data
export async function createItem(name: string) {
	await db.items.create(name);
	// ❌ Missing revalidatePath
}

// RIGHT
export async function createItem(name: string) {
	await db.items.create(name);
	revalidatePath("/items");
}
```
