/**
 * Device Authorization Client (RFC 8628)
 *
 * Shared client for device authorization flow used by CLI and VSCode extension.
 * Implements OAuth 2.0 Device Authorization Grant (RFC 8628) for devices
 * with limited input capabilities or where browser OAuth callbacks don't work.
 *
 * @see https://tools.ietf.org/html/rfc8628
 */

import ky, { type KyInstance } from "ky";

/**
 * Device code response from authorization server (RFC 8628 Section 3.2)
 */
export interface DeviceCodeResponse {
	/** Device code for polling requests */
	device_code: string;
	/** User-friendly code to display for verification */
	user_code: string;
	/** URL where user enters the user code */
	verification_uri: string;
	/** Optional: Pre-filled verification URI with user code */
	verification_uri_complete?: string;
	/** Seconds until device code expires */
	expires_in: number;
	/** Recommended polling interval in seconds (minimum 5) */
	interval: number;
}

/**
 * Token response on successful authorization
 */
export interface TokenResponse {
	/** Bearer token for API access */
	access_token: string;
	/** Token type (always "Bearer") */
	token_type: "Bearer";
	/** Token expiration time in seconds */
	expires_in?: number;
	/** Optional refresh token */
	refresh_token?: string;
	/** Granted scopes (space-separated) */
	scope?: string;
}

/**
 * RFC 8628 error codes during polling
 */
export type DeviceAuthError =
	| "authorization_pending"
	| "slow_down"
	| "expired_token"
	| "access_denied"
	| "invalid_request";

/**
 * Error response during token polling
 */
export interface DeviceAuthErrorResponse {
	error: DeviceAuthError;
	error_description?: string;
}

/**
 * Auth result returned to consumers
 */
export interface AuthResult {
	api_key: string;
	user_id: string;
	tier: "free" | "pro" | "enterprise";
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
}

/**
 * Flow state for tracking authentication progress
 */
export type FlowState = "idle" | "requesting_code" | "waiting_for_approval" | "approved" | "cancelled" | "error";

/**
 * Event callbacks for tracking authentication progress
 */
export interface DeviceAuthCallbacks {
	/** Called when device code is received and user should visit verification URL */
	onDeviceCode?: (response: DeviceCodeResponse) => void;
	/** Called on each poll attempt */
	onPoll?: (attempt: number, intervalMs: number) => void;
	/** Called when polling interval is increased (slow_down response) */
	onSlowDown?: (newIntervalMs: number) => void;
	/** Called when authorization succeeds */
	onApproved?: (result: AuthResult) => void;
	/** Called when an error occurs */
	onError?: (error: Error, code?: DeviceAuthError) => void;
	/** Called when flow is cancelled */
	onCancelled?: () => void;
}

/**
 * Configuration for DeviceAuthClient
 */
export interface DeviceAuthClientConfig {
	/** Base URL for API (e.g., "https://api.snapback.dev/api") */
	baseUrl: string;
	/** Client identifier for the requesting application */
	clientId: string;
	/** Optional scopes to request */
	scope?: string;
	/** Custom HTTP client (for testing) */
	httpClient?: KyInstance;
	/** Optional AbortSignal for cancellation */
	signal?: AbortSignal;
}

/**
 * Device Authorization Client
 *
 * Implements RFC 8628 OAuth 2.0 Device Authorization Grant.
 * Used by CLI and VSCode extension for authentication in environments
 * where browser OAuth callbacks don't work (WSL, Remote SSH, Codespaces).
 *
 * @example
 * ```typescript
 * const client = new DeviceAuthClient({
 *   baseUrl: "https://api.snapback.dev/api",
 *   clientId: "vscode-extension",
 * });
 *
 * const result = await client.authenticate({
 *   onDeviceCode: (response) => {
 *     console.log(`Visit ${response.verification_uri}`);
 *     console.log(`Enter code: ${response.user_code}`);
 *   },
 *   onApproved: (result) => {
 *     console.log(`Authenticated as ${result.user_id}`);
 *   },
 * });
 * ```
 */
export class DeviceAuthClient {
	private http: KyInstance;
	private config: DeviceAuthClientConfig;
	private state: FlowState = "idle";
	private abortController: AbortController | null = null;
	private currentInterval: number = 5000; // Default 5 seconds

	constructor(config: DeviceAuthClientConfig) {
		this.config = config;
		this.http =
			config.httpClient ??
			ky.create({
				prefixUrl: config.baseUrl,
				timeout: 30000,
			});
	}

	/**
	 * Get current flow state
	 */
	getState(): FlowState {
		return this.state;
	}

	/**
	 * Cancel the authentication flow
	 */
	cancel(): void {
		this.abortController?.abort();
		this.state = "cancelled";
	}

	/**
	 * Start device authorization flow
	 *
	 * @param callbacks - Event callbacks for tracking progress
	 * @returns AuthResult on success
	 * @throws Error on failure or cancellation
	 */
	async authenticate(callbacks?: DeviceAuthCallbacks): Promise<AuthResult> {
		// Prevent concurrent authentications
		if (this.state === "requesting_code" || this.state === "waiting_for_approval") {
			throw new Error("Authentication already in progress");
		}

		this.abortController = new AbortController();
		this.state = "requesting_code";

		try {
			// Step 1: Request device code
			const deviceCodeResponse = await this.requestDeviceCode();
			callbacks?.onDeviceCode?.(deviceCodeResponse);

			// Step 2: Set up polling
			this.currentInterval = deviceCodeResponse.interval * 1000;
			this.state = "waiting_for_approval";

			// Step 3: Poll for token
			const result = await this.pollForToken(deviceCodeResponse, callbacks);

			this.state = "approved";
			callbacks?.onApproved?.(result);

			return result;
		} catch (error) {
			// Note: state could be "cancelled" if cancel() was called from another context
			const currentState = this.state as FlowState;
			if (currentState !== "cancelled") {
				this.state = "error";
			}

			const err = error instanceof Error ? error : new Error(String(error));

			if (currentState === "cancelled") {
				callbacks?.onCancelled?.();
			} else {
				callbacks?.onError?.(err);
			}

			throw err;
		}
	}

	/**
	 * Request device code from authorization server (RFC 8628 Section 3.1)
	 */
	private async requestDeviceCode(): Promise<DeviceCodeResponse> {
		const signal = this.mergeSignals();

		try {
			const response = await this.http
				.post("deviceAuth/requestCode", {
					json: {
						client_id: this.config.clientId,
						scope: this.config.scope,
					},
					signal,
				})
				.json<DeviceCodeResponse>();

			if (!response.device_code) {
				throw new Error("Invalid device code response: missing device_code");
			}

			return response;
		} catch (error) {
			this.handleAbortError(error);
			throw new Error(`Device code request failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Poll for token with RFC 8628 compliant error handling
	 */
	private async pollForToken(
		deviceCodeResponse: DeviceCodeResponse,
		callbacks?: DeviceAuthCallbacks,
	): Promise<AuthResult> {
		const { device_code, expires_in } = deviceCodeResponse;
		const startTime = Date.now();
		const timeoutMs = expires_in * 1000;
		let attempt = 0;

		while (true) {
			// Check for timeout
			if (Date.now() - startTime > timeoutMs) {
				throw new Error("Device code expired - authentication timeout");
			}

			// Check for cancellation
			if (this.abortController?.signal.aborted) {
				this.state = "cancelled";
				throw new Error("Authentication cancelled");
			}

			// Wait before polling
			await this.delay(this.currentInterval);

			attempt++;
			callbacks?.onPoll?.(attempt, this.currentInterval);

			try {
				const signal = this.mergeSignals();

				const response = await this.http
					.post("deviceAuth/pollToken", {
						json: {
							device_code,
							grant_type: "urn:ietf:params:oauth:grant-type:device_code",
							client_id: this.config.clientId,
						},
						signal,
					})
					.json<TokenResponse | DeviceAuthErrorResponse>();

				// Check for success
				if ("access_token" in response) {
					return this.mapTokenToAuthResult(response);
				}

				// Handle RFC 8628 error codes
				if ("error" in response) {
					switch (response.error) {
						case "authorization_pending":
							// User hasn't approved yet - continue polling
							break;

						case "slow_down":
							// Server requested slower polling - increase interval by 5s
							this.currentInterval += 5000;
							callbacks?.onSlowDown?.(this.currentInterval);
							break;

						case "access_denied":
							callbacks?.onError?.(new Error("Authorization denied by user"), "access_denied");
							throw new Error("Authorization denied by user");

						case "expired_token":
							callbacks?.onError?.(new Error("Device code expired"), "expired_token");
							throw new Error("Device code expired on server");

						case "invalid_request":
							callbacks?.onError?.(new Error("Invalid device code"), "invalid_request");
							throw new Error("Invalid device code format");

						default:
							throw new Error(`Unknown error: ${response.error}`);
					}
				}
			} catch (error) {
				this.handleAbortError(error);

				// Re-throw terminal errors
				if (error instanceof Error) {
					if (
						error.message.includes("cancelled") ||
						error.message.includes("denied") ||
						error.message.includes("expired") ||
						error.message.includes("Invalid")
					) {
						throw error;
					}
				}
				// Network errors - continue polling
			}
		}
	}

	/**
	 * Map token response to AuthResult
	 */
	private mapTokenToAuthResult(token: TokenResponse): AuthResult {
		// In production, user_id and tier would be extracted from JWT claims
		// For now, use placeholder values that should be updated by the caller
		return {
			api_key: token.access_token,
			user_id: "user-from-token", // Extract from JWT claims
			tier: "free", // Extract from JWT claims
			access_token: token.access_token,
			refresh_token: token.refresh_token,
			expires_in: token.expires_in,
		};
	}

	/**
	 * Delay execution with cancellation support
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const timeout = setTimeout(resolve, ms);

			this.abortController?.signal.addEventListener(
				"abort",
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true },
			);
		});
	}

	/**
	 * Merge configured signal with internal abort controller
	 */
	private mergeSignals(): AbortSignal | undefined {
		const signals: AbortSignal[] = [];

		if (this.abortController?.signal) {
			signals.push(this.abortController.signal);
		}

		if (this.config.signal) {
			signals.push(this.config.signal);
		}

		if (signals.length === 0) return undefined;
		if (signals.length === 1) return signals[0];

		// For multiple signals, create a combined controller
		const combined = new AbortController();

		for (const signal of signals) {
			if (signal.aborted) {
				combined.abort();
				break;
			}
			signal.addEventListener("abort", () => combined.abort(), { once: true });
		}

		return combined.signal;
	}

	/**
	 * Handle abort errors consistently
	 */
	private handleAbortError(error: unknown): void {
		if (error instanceof Error && error.name === "AbortError") {
			this.state = "cancelled";
			throw new Error("Authentication cancelled");
		}
	}
}

/**
 * Create a device auth client with default configuration
 */
export function createDeviceAuthClient(
	baseUrl: string,
	clientId: string,
	options?: Partial<DeviceAuthClientConfig>,
): DeviceAuthClient {
	return new DeviceAuthClient({
		baseUrl,
		clientId,
		...options,
	});
}
