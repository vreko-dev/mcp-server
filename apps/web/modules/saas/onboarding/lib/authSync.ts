/**
 * Auth Token Sync Utilities
 *
 * Per /apps/onboarding/implementation.md Phase 3:
 * - Extension receives auth token via localStorage sync
 * - Session storage for HttpOnly cookies + localStorage for context detection
 *
 * This module provides utilities for syncing authentication state
 * between the web console and VS Code extension via localStorage.
 */

export const AUTH_SYNC_KEYS = {
	/** Auth success flag set by console after magic link verification */
	AUTH_SUCCESS: "snapback_auth_success",
	/** IDE context set by extension */
	IDE_CONTEXT: "snapback_ide_context",
	/** IDE activity marker */
	IDE_ACTIVITY: "snapback_ide_active",
	/** Session token for extension (encrypted) */
	SESSION_TOKEN: "snapback_session",
	/** User info for extension */
	USER_INFO: "snapback_user",
} as const;

export interface AuthSuccessPayload {
	timestamp: number;
	userId: string;
	extensionId?: string;
}

export interface UserInfo {
	id: string;
	email: string;
	name?: string;
}

/**
 * Signal auth success to the extension
 * Called after successful magic link verification
 */
export function signalAuthSuccess(payload: AuthSuccessPayload): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(AUTH_SYNC_KEYS.AUTH_SUCCESS, JSON.stringify(payload));
		// Dispatch a storage event for same-window listeners
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: AUTH_SYNC_KEYS.AUTH_SUCCESS,
				newValue: JSON.stringify(payload),
			}),
		);
	} catch (error) {
		console.error("Failed to signal auth success:", error);
	}
}

/**
 * Listen for auth success from the console
 * Used by extension webview to detect when auth is complete
 */
export function listenForAuthSuccess(callback: (payload: AuthSuccessPayload) => void): () => void {
	if (typeof window === "undefined") return () => {};

	const handler = (event: StorageEvent) => {
		if (event.key === AUTH_SYNC_KEYS.AUTH_SUCCESS && event.newValue) {
			try {
				const payload = JSON.parse(event.newValue) as AuthSuccessPayload;
				callback(payload);
			} catch {
				// Ignore parse errors
			}
		}
	};

	window.addEventListener("storage", handler);

	// Also check if already set (for same-window scenarios)
	const existing = localStorage.getItem(AUTH_SYNC_KEYS.AUTH_SUCCESS);
	if (existing) {
		try {
			const payload = JSON.parse(existing) as AuthSuccessPayload;
			// Only trigger if recent (within last minute)
			if (Date.now() - payload.timestamp < 60000) {
				callback(payload);
			}
		} catch {
			// Ignore
		}
	}

	return () => window.removeEventListener("storage", handler);
}

/**
 * Clear auth success flag
 * Called after extension has consumed the auth success
 */
export function clearAuthSuccess(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(AUTH_SYNC_KEYS.AUTH_SUCCESS);
}

/**
 * Store user info for extension to read
 */
export function storeUserInfo(user: UserInfo): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(AUTH_SYNC_KEYS.USER_INFO, JSON.stringify(user));
	} catch (error) {
		console.error("Failed to store user info:", error);
	}
}

/**
 * Get user info from localStorage
 */
export function getUserInfo(): UserInfo | null {
	if (typeof window === "undefined") return null;
	try {
		const data = localStorage.getItem(AUTH_SYNC_KEYS.USER_INFO);
		return data ? JSON.parse(data) : null;
	} catch {
		return null;
	}
}

/**
 * Clear all auth-related localStorage
 */
export function clearAuthStorage(): void {
	if (typeof window === "undefined") return;
	Object.values(AUTH_SYNC_KEYS).forEach((key) => {
		localStorage.removeItem(key);
	});
}

/**
 * Check if extension is waiting for auth
 * (IDE context is set but no auth success yet)
 */
export function isExtensionWaitingForAuth(): boolean {
	if (typeof window === "undefined") return false;

	const ideContext = localStorage.getItem(AUTH_SYNC_KEYS.IDE_CONTEXT);
	const authSuccess = localStorage.getItem(AUTH_SYNC_KEYS.AUTH_SUCCESS);

	return Boolean(ideContext && !authSuccess);
}

/**
 * Post message to VS Code extension
 * For communication with webview host
 */
export function postToExtension(message: { type: string; payload?: unknown }): void {
	if (typeof window === "undefined") return;

	// VS Code webview API
	const vscode = (window as Window & { acquireVsCodeApi?: () => { postMessage: (msg: unknown) => void } })
		.acquireVsCodeApi;
	if (vscode) {
		try {
			const api = vscode();
			api.postMessage(message);
		} catch {
			// Not in VS Code webview context
		}
	}
}

/**
 * Listen for messages from VS Code extension
 */
export function listenToExtension(callback: (message: { type: string; payload?: unknown }) => void): () => void {
	if (typeof window === "undefined") return () => {};

	const handler = (event: MessageEvent) => {
		if (event.data && typeof event.data === "object" && "type" in event.data) {
			callback(event.data);
		}
	};

	window.addEventListener("message", handler);
	return () => window.removeEventListener("message", handler);
}
