/**
 * Session Client - Frontend Integration with Auth API
 *
 * Provides type-safe session management with:
 * - Real-time session syncing with backend
 * - Automatic token refresh
 * - Session state persistence
 * - Auth state change listeners
 */

// Local type definitions (replaces @snapback/contracts)
type SessionWithUser = {
	user: {
		id: string;
		email: string;
		name?: string;
	};
	session: {
		id: string;
		expiresAt: Date;
	};
};

type AuthState =
	| {
			status: "authenticated";
			user: SessionWithUser["user"];
			session: SessionWithUser["session"];
	  }
	| { status: "unauthenticated" }
	| { status: "loading" };

function isAuthenticated(state: AuthState): state is {
	status: "authenticated";
	user: SessionWithUser["user"];
	session: SessionWithUser["session"];
} {
	return state.status === "authenticated";
}

function isLoading(state: AuthState): state is { status: "loading" } {
	return state.status === "loading";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const SESSION_KEY = "snapback:session";
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Session client for managing auth state
 */
class SessionClient {
	private sessionData: SessionWithUser | null = null;
	private listeners: Set<(state: AuthState) => void> = new Set();
	private refreshTimer: NodeJS.Timeout | null = null;
	private isRefreshing = false;

	/**
	 * Initialize session on app load
	 */
	async initialize(): Promise<void> {
		try {
			// Try to restore from localStorage first
			const cached = this.loadFromCache();
			if (cached) {
				this.sessionData = cached;
				this.notifyListeners();
			}

			// Always fetch fresh session from API
			await this.refreshSession();

			// Set up periodic refresh
			this.startRefreshTimer();
		} catch (error) {
			console.error("[SessionClient] Initialization failed:", error);
			this.sessionData = null;
			this.notifyListeners();
		}
	}

	/**
	 * Get current session
	 */
	async getSession(): Promise<SessionWithUser | null> {
		return this.sessionData;
	}

	/**
	 * Get current auth state (discriminated union)
	 */
	getAuthState(): AuthState {
		if (this.isRefreshing) {
			return { status: "loading" };
		}

		if (!this.sessionData) {
			return { status: "unauthenticated" };
		}

		return {
			status: "authenticated",
			user: this.sessionData.user,
			session: this.sessionData.session,
		};
	}

	/**
	 * Refresh session from API
	 */
	private async refreshSession(): Promise<void> {
		if (this.isRefreshing) return;

		this.isRefreshing = true;
		this.notifyListeners();

		try {
			const response = await fetch(`${API_BASE_URL}/users/profile`, {
				method: "GET",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = (await response.json()) as {
					user: SessionWithUser["user"];
					session: SessionWithUser["session"];
				};
				this.sessionData = {
					user: data.user,
					session: data.session,
				};
				this.saveToCache();
			} else if (response.status === 401) {
				// Session expired
				this.sessionData = null;
				this.clearCache();
			}
		} catch (error) {
			console.error("[SessionClient] Refresh failed:", error);
			// Keep existing session on network error
		} finally {
			this.isRefreshing = false;
			this.notifyListeners();
		}
	}

	/**
	 * Sign in with email and password
	 */
	async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
		try {
			// Fixed: Use correct Better Auth endpoint (hyphenated)
			const response = await fetch(`${API_BASE_URL}/auth/sign-in/email`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			if (response.ok) {
				const data = (await response.json()) as SessionWithUser;
				this.sessionData = data;
				this.saveToCache();
				this.notifyListeners();
				return { success: true };
			}

			const error = (await response.json()) as { error: string };
			return { success: false, error: error.error || "Sign in failed" };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Network error",
			};
		}
	}

	/**
	 * Sign up with email and password
	 */
	async signUpWithEmail(
		email: string,
		password: string,
		name?: string,
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Fixed: Use correct Better Auth endpoint (hyphenated)
			const response = await fetch(`${API_BASE_URL}/auth/sign-up/email`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password, name }),
			});

			if (response.ok) {
				const data = (await response.json()) as SessionWithUser;
				this.sessionData = data;
				this.saveToCache();
				this.notifyListeners();
				return { success: true };
			}

			const error = (await response.json()) as { error: string };
			return { success: false, error: error.error || "Sign up failed" };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Network error",
			};
		}
	}

	/**
	 * Sign out
	 */
	async signOut(): Promise<void> {
		try {
			// Fixed: Use correct Better Auth endpoint (hyphenated)
			await fetch(`${API_BASE_URL}/auth/sign-out`, {
				method: "POST",
				credentials: "include",
			});
		} catch (error) {
			console.error("[SessionClient] Sign out request failed:", error);
		} finally {
			this.sessionData = null;
			this.clearCache();
			this.notifyListeners();
		}
	}

	/**
	 * Subscribe to auth state changes
	 */
	onAuthStateChange(callback: (state: AuthState) => void): () => void {
		this.listeners.add(callback);

		// Notify immediately with current state
		callback(this.getAuthState());

		// Return unsubscribe function
		return () => {
			this.listeners.delete(callback);
		};
	}

	/**
	 * Notify all listeners of auth state change
	 */
	private notifyListeners(): void {
		const state = this.getAuthState();
		this.listeners.forEach((callback) => {
			try {
				callback(state);
			} catch (error) {
				console.error("[SessionClient] Listener error:", error);
			}
		});
	}

	/**
	 * Start periodic session refresh
	 */
	private startRefreshTimer(): void {
		this.refreshTimer = setInterval(() => {
			this.refreshSession();
		}, SESSION_REFRESH_INTERVAL);
	}

	/**
	 * Stop periodic refresh
	 */
	stopRefreshTimer(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	/**
	 * Save session to localStorage
	 */
	private saveToCache(): void {
		if (typeof window === "undefined") return;

		if (this.sessionData) {
			try {
				localStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionData));
			} catch (error) {
				console.warn("[SessionClient] Failed to save to cache:", error);
			}
		}
	}

	/**
	 * Load session from localStorage
	 */
	private loadFromCache(): SessionWithUser | null {
		if (typeof window === "undefined") return null;

		try {
			const cached = localStorage.getItem(SESSION_KEY);
			if (cached) {
				return JSON.parse(cached) as SessionWithUser;
			}
		} catch (error) {
			console.warn("[SessionClient] Failed to load from cache:", error);
		}

		return null;
	}

	/**
	 * Clear cache
	 */
	private clearCache(): void {
		if (typeof window === "undefined") return;

		try {
			localStorage.removeItem(SESSION_KEY);
		} catch (error) {
			console.warn("[SessionClient] Failed to clear cache:", error);
		}
	}

	/**
	 * Cleanup on app unload
	 */
	destroy(): void {
		this.stopRefreshTimer();
		this.listeners.clear();
	}
}

// Export singleton instance
export const sessionClient = new SessionClient();

// Export types for use in components
export type { AuthState, SessionWithUser };

/**
 * Helper function to check if user is authenticated
 */
export function getAuthState(): AuthState {
	return sessionClient.getAuthState();
}

/**
 * Helper to check if currently loading
 */
export function isLoadingAuth(): boolean {
	const state = sessionClient.getAuthState();
	return isLoading(state);
}

/**
 * Helper to check if authenticated
 */
export function isAuthenticatedUser(): boolean {
	const state = sessionClient.getAuthState();
	return isAuthenticated(state);
}
