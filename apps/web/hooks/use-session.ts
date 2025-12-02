/**
 * useSession Hook
 *
 * Provides session state management with automatic auth state synchronization
 * and optimistic updates for Better Auth integration.
 */

"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth/helpers";

/**
 * User information from session
 */
export interface User {
	id: string;
	email: string;
	name?: string;
	image?: string;
	username?: string;
	role?: string;
	emailVerified?: boolean;
	twoFactorEnabled?: boolean;
}

/**
 * Session information
 */
export interface Session {
	user: User;
	session: {
		id: string;
		expiresAt: Date;
		ipAddress?: string;
		userAgent?: string;
	};
}

/**
 * Hook return type
 */
export interface UseSessionReturn {
	/** Current session data (null if not authenticated) */
	session: Session | null;
	/** Loading state (true during initial session fetch) */
	loading: boolean;
	/** Refresh session data */
	refetch: () => Promise<void>;
}

/**
 * Session management hook
 *
 * Automatically loads and synchronizes session state with Better Auth.
 * Subscribes to auth state changes for real-time updates.
 *
 * @returns Session state, loading indicator, and refetch function
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { session, loading } = useSession();
 *
 *   if (loading) return <Spinner />;
 *   if (!session) return <LoginPrompt />;
 *
 *   return <Profile user={session.user} />;
 * }
 * ```
 */
export function useSession(): UseSessionReturn {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	/**
	 * Load session from Better Auth
	 */
	const loadSession = async () => {
		try {
			const data = await getSession();
			if (data && data.user && data.session) {
				// Fix the type incompatibility by ensuring proper typing
				const sessionData: Session = {
					user: {
						id: data.user.id,
						email: data.user.email,
						name: data.user.name ?? undefined,
						image: (data.user as any)?.image ?? undefined,
					},
					session: {
						id: data.session.id,
						expiresAt: data.session.expiresAt,
					},
				};
				setSession(sessionData);
			} else {
				setSession(null);
			}
		} catch (error) {
			console.error("Failed to load session:", error);
			setSession(null);
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Manually refetch session (useful after auth actions)
	 */
	const refetch = async () => {
		setLoading(true);
		await loadSession();
	};

	/**
	 * Initial session load and auth state subscription
	 */
	useEffect(() => {
		loadSession();

		// Subscribe to auth state changes
		// const unsubscribe = // authClient.onAuthStateChange((newSession) => { // TODO: Re-enable when onAuthStateChange is implemented
		//   setSession(newSession);
		// });

		// return () => unsubscribe();
		return () => {}; // TODO: Re-enable when onAuthStateChange is implemented
	}, []);

	return { session, loading, refetch };
}
