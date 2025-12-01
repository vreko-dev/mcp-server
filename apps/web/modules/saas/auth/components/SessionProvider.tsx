"use client";
import { sessionClient } from "@/lib/auth/session-client";
import { type ReactNode, useEffect, useState } from "react";
import type { SessionWithUser } from "@snapback/contracts";
import { SessionContext } from "../lib/session-context";

/**
 * SessionProvider - Manages authentication state for the entire application
 *
 * Initializes session client on mount, syncs auth state across tabs,
 * and provides session context to all child components.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<SessionWithUser | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Initialize session client
		sessionClient.initialize().then(() => {
			setLoading(false);
		});

		// Subscribe to auth state changes
		const unsubscribe = sessionClient.onAuthStateChange((authState) => {
			if (authState.status === "authenticated") {
				setSession({
					user: authState.user,
					session: authState.session,
				});
				setLoaded(true);
			} else if (authState.status === "unauthenticated") {
				setSession(null);
				setLoaded(true);
			}
		});

		return () => {
			unsubscribe();
			sessionClient.stopRefreshTimer();
		};
	}, []);

	const handleReloadSession = async (): Promise<void> => {
		const currentSession = await sessionClient.getSession();
		if (currentSession) {
			setSession(currentSession);
		}
	};

	return (
		<SessionContext.Provider
			value={{
				loaded,
				loading,
				session: session?.session ?? null,
				user: session?.user ?? null,
				reloadSession: handleReloadSession,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
