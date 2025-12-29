"use client";

/**
 * Session Sync - Cross-client logout synchronization
 *
 * Per /apps/onboarding/implementation.md Phase 5:
 * - Session revocation on logout (all clients sync)
 *
 * Uses localStorage events to sync logout across:
 * - Browser tabs
 * - Console ↔ Extension
 */

import { AUTH_SYNC_KEYS } from "./authSync";

export interface SessionSyncConfig {
	onLogout?: () => void;
	apiBaseUrl?: string;
}

export interface SessionSync {
	start(): void;
	stop(): void;
	signalLogout(userId: string): Promise<void>;
	logoutAllSessions(sessionToken: string): Promise<void>;
}

const SESSION_REVOKED_KEY = "snapback_session_revoked";

/**
 * Create a session sync manager
 */
export function createSessionSync(config: SessionSyncConfig): SessionSync {
	let storageHandler: ((event: StorageEvent) => void) | null = null;

	/**
	 * Handle storage events from other tabs/windows
	 */
	function handleStorageEvent(event: StorageEvent): void {
		if (event.key === SESSION_REVOKED_KEY && event.newValue) {
			try {
				const data = JSON.parse(event.newValue);
				// Verify this is a recent logout (within last minute)
				if (Date.now() - data.timestamp < 60 * 1000) {
					config.onLogout?.();
				}
			} catch {
				// Ignore parse errors
			}
		}
	}

	/**
	 * Start listening for logout events
	 */
	function start(): void {
		if (typeof window === "undefined") {
			return;
		}

		storageHandler = handleStorageEvent;
		window.addEventListener("storage", storageHandler);
	}

	/**
	 * Stop listening for logout events
	 */
	function stop(): void {
		if (storageHandler && typeof window !== "undefined") {
			window.removeEventListener("storage", storageHandler);
			storageHandler = null;
		}
	}

	/**
	 * Signal logout to all clients via localStorage
	 */
	async function signalLogout(userId: string): Promise<void> {
		if (typeof localStorage === "undefined") {
			return;
		}

		// Set revocation signal
		localStorage.setItem(
			SESSION_REVOKED_KEY,
			JSON.stringify({
				timestamp: Date.now(),
				userId,
			}),
		);

		// Clear all session data
		localStorage.removeItem(AUTH_SYNC_KEYS.SESSION_TOKEN);
		localStorage.removeItem(AUTH_SYNC_KEYS.AUTH_SUCCESS);
		localStorage.removeItem(AUTH_SYNC_KEYS.USER_INFO);

		// Dispatch storage event for current window
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: SESSION_REVOKED_KEY,
				newValue: JSON.stringify({ timestamp: Date.now(), userId }),
			}),
		);
	}

	/**
	 * Revoke all sessions on the backend
	 */
	async function logoutAllSessions(sessionToken: string): Promise<void> {
		const baseUrl = config.apiBaseUrl ?? "";

		try {
			await fetch(`${baseUrl}/auth/logout`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${sessionToken}`,
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
		} catch {
			// Best effort - continue with local logout even if API fails
		}
	}

	return {
		start,
		stop,
		signalLogout,
		logoutAllSessions,
	};
}
