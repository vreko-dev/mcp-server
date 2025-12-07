"use client";

/**
 * SessionProvider - Integrates Better Auth with React Context
 *
 * Provides session state to all child components using Better Auth's native useSession hook.
 * This eliminates the custom session management layer and uses Better Auth's built-in:
 * - CSRF protection (httpOnly, secure, sameSite cookies)
 * - Automatic session validation
 * - Session refresh on update
 *
 * Security: All session data is validated by Better Auth server on every request.
 * No sensitive tokens are exposed to client-side JavaScript.
 */

import { authClient } from "@snapback/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, type ReactNode } from "react";
import { sessionQueryKey } from "../lib/api";
import { SessionContext } from "../lib/session-context";

export function SessionProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();
	
	// Use Better Auth's native useSession hook
	const { data: sessionData, isPending, error, refetch } = authClient.useSession();

	// Extract user and session from Better Auth response
	const user = sessionData?.user ?? null;
	const session = sessionData?.session ?? null;

	// Session is loaded when not pending and no error
	const loaded = !isPending && !error;
	const loading = isPending;

	// Reload session function - invalidates queries and refetches
	const reloadSession = useCallback(async () => {
		// Invalidate React Query cache
		await queryClient.invalidateQueries({
			queryKey: sessionQueryKey,
		});
		
		// Refetch session from Better Auth
		await refetch();
	}, [queryClient, refetch]);

	const contextValue = {
		user,
		session,
		loaded,
		loading,
		reloadSession,
	};

	return (
		<SessionContext.Provider value={contextValue}>
			{children}
		</SessionContext.Provider>
	);
}
