"use client";

/**
 * Session Manager
 *
 * Per /apps/onboarding/implementation.md Phase 5:
 * - Token refresh before expiry (automatic, transparent)
 * - User never sees "session expired"
 *
 * Implements proactive token refresh ~30 seconds before expiry
 */

export interface SessionManagerConfig {
	sessionToken: string;
	refreshToken: string;
	expiresIn: number; // seconds
	onTokenRefresh?: (newToken: string) => void;
	onSessionExpired?: () => void;
	apiBaseUrl?: string;
}

export interface SessionManager {
	start(): void;
	stop(): void;
	getToken(): string;
	getExpiresAt(): number;
	isExpired(): boolean;
	refresh(): Promise<boolean>;
}

/**
 * Create a session manager with auto-refresh
 */
export function createSessionManager(config: SessionManagerConfig): SessionManager {
	let currentToken = config.sessionToken;
	let refreshToken = config.refreshToken;
	let expiresAt = Date.now() + config.expiresIn * 1000;
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	const apiBaseUrl = config.apiBaseUrl ?? "";

	// Refresh 30 seconds before expiry, but at least at 90% of token lifetime
	const REFRESH_BUFFER_MS = 30 * 1000;
	const REFRESH_THRESHOLD = 0.9;

	/**
	 * Calculate when to schedule the next refresh
	 */
	function getRefreshDelay(): number {
		const now = Date.now();
		const tokenLifetime = expiresAt - now;

		// Refresh at 90% of lifetime or 30 seconds before expiry, whichever is sooner
		const thresholdDelay = tokenLifetime * REFRESH_THRESHOLD;
		const bufferDelay = tokenLifetime - REFRESH_BUFFER_MS;

		return Math.max(0, Math.min(thresholdDelay, bufferDelay));
	}

	/**
	 * Schedule the next token refresh
	 */
	function scheduleRefresh(): void {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
		}

		const delay = getRefreshDelay();

		// Only schedule if token has >5 seconds remaining
		if (delay > 5000) {
			refreshTimer = setTimeout(async () => {
				const success = await refresh();
				if (success) {
					scheduleRefresh(); // Schedule next refresh
				} else {
					config.onSessionExpired?.();
				}
			}, delay);
		}
	}

	/**
	 * Refresh the session token
	 */
	async function refresh(): Promise<boolean> {
		try {
			const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ refreshToken }),
			});

			if (!response.ok) {
				return false;
			}

			const data = await response.json();

			currentToken = data.sessionToken;
			expiresAt = Date.now() + data.expiresIn * 1000;

			// Update refresh token if provided
			if (data.refreshToken) {
				refreshToken = data.refreshToken;
			}

			// Notify callback
			config.onTokenRefresh?.(currentToken);

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Start the session manager
	 */
	function start(): void {
		scheduleRefresh();
	}

	/**
	 * Stop the session manager
	 */
	function stop(): void {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
	}

	/**
	 * Get current token
	 */
	function getToken(): string {
		return currentToken;
	}

	/**
	 * Get expiration timestamp
	 */
	function getExpiresAt(): number {
		return expiresAt;
	}

	/**
	 * Check if session is expired
	 */
	function isExpired(): boolean {
		return Date.now() >= expiresAt;
	}

	return {
		start,
		stop,
		getToken,
		getExpiresAt,
		isExpired,
		refresh,
	};
}
