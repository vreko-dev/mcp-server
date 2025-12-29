"use client";

/**
 * Browser MCP Client
 *
 * Per /apps/onboarding/implementation.md Phase 4:
 * - HTTP+SSE transport for browser (can't use STDIO)
 * - Token refresh on 401
 * - Request retry with exponential backoff
 *
 * Per /apps/onboarding/mcp_broker.md:
 * - JSON-RPC 2.0 compliant
 * - Circuit breaker pattern
 */

export interface MCPClientConfig {
	baseUrl: string;
	sessionToken: string;
	refreshToken?: string;
	maxRetries?: number;
	useSSE?: boolean;
	onTokenRefresh?: (newToken: string) => void;
	onMessage?: (message: unknown) => void;
	circuitBreaker?: {
		threshold: number;
		resetTimeout: number;
	};
}

interface JsonRpcRequest {
	jsonrpc: "2.0";
	id: number;
	method: string;
	params: Record<string, unknown>;
}

interface JsonRpcResponse<T = unknown> {
	jsonrpc: "2.0";
	id: number;
	result?: T;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

interface CircuitState {
	failures: number;
	lastFailure: number;
	state: "closed" | "open" | "half-open";
}

export interface MCPClient {
	call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
	connect(): Promise<void>;
	disconnect(): void;
	getCircuitState(): CircuitState["state"];
}

/**
 * Create a browser MCP client for HTTP+SSE transport
 */
export function createMCPClient(config: MCPClientConfig): MCPClient {
	let currentToken = config.sessionToken;
	let requestId = 0;
	let eventSource: EventSource | null = null;

	// Circuit breaker state
	const circuit: CircuitState = {
		failures: 0,
		lastFailure: 0,
		state: "closed",
	};

	const circuitThreshold = config.circuitBreaker?.threshold ?? 5;
	const circuitResetTimeout = config.circuitBreaker?.resetTimeout ?? 30000;

	/**
	 * Check and update circuit breaker state
	 */
	function checkCircuit(): void {
		if (circuit.state === "open") {
			const elapsed = Date.now() - circuit.lastFailure;
			if (elapsed > circuitResetTimeout) {
				circuit.state = "half-open";
			}
		}
	}

	/**
	 * Record circuit failure
	 */
	function recordFailure(): void {
		circuit.failures++;
		circuit.lastFailure = Date.now();
		if (circuit.failures >= circuitThreshold) {
			circuit.state = "open";
		}
	}

	/**
	 * Record circuit success
	 */
	function recordSuccess(): void {
		circuit.failures = 0;
		circuit.state = "closed";
	}

	/**
	 * Delay with exponential backoff
	 */
	function delay(attempt: number): Promise<void> {
		const ms = Math.min(100 * 2 ** attempt, 10000);
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Refresh the session token
	 */
	async function refreshToken(): Promise<boolean> {
		if (!config.refreshToken) {
			return false;
		}

		try {
			const response = await fetch(`${config.baseUrl}/auth/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ refreshToken: config.refreshToken }),
			});

			if (response.ok) {
				const data = await response.json();
				currentToken = data.sessionToken;
				config.onTokenRefresh?.(data.sessionToken);
				return true;
			}
		} catch {
			// Refresh failed
		}

		return false;
	}

	/**
	 * Make authenticated MCP call
	 */
	async function call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
		// Check if offline - queue request
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return { queued: true, method, params } as T;
		}

		// Check circuit breaker
		checkCircuit();
		if (circuit.state === "open") {
			throw new Error("Circuit breaker open");
		}

		const maxRetries = config.maxRetries ?? 3;
		let lastError: Error | undefined;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const request: JsonRpcRequest = {
					jsonrpc: "2.0",
					id: ++requestId,
					method: "tools/call",
					params: {
						name: method,
						arguments: params,
					},
				};

				const response = await fetch(`${config.baseUrl}/mcp`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${currentToken}`,
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					body: JSON.stringify(request),
				});

				// Handle 401 - token refresh
				if (response.status === 401) {
					const refreshed = await refreshToken();
					if (refreshed) {
						// Retry with new token
						continue;
					}
					throw new Error("Unauthorized - token refresh failed");
				}

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data: JsonRpcResponse<T> = await response.json();

				// Handle JSON-RPC error
				if (data.error) {
					throw new Error(data.error.message);
				}

				recordSuccess();
				return data.result as T;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				recordFailure();

				if (attempt < maxRetries - 1) {
					await delay(attempt);
				}
			}
		}

		throw lastError ?? new Error("Request failed");
	}

	/**
	 * Establish SSE connection for streaming
	 */
	async function connect(): Promise<void> {
		if (!config.useSSE) {
			return;
		}

		const url = new URL(`${config.baseUrl}/mcp`);
		url.searchParams.set("token", currentToken);

		eventSource = new EventSource(url.toString());

		eventSource.addEventListener("message", (event) => {
			try {
				const data = JSON.parse(event.data);
				config.onMessage?.(data);
			} catch {
				// Ignore parse errors
			}
		});

		eventSource.addEventListener("error", () => {
			// Reconnect logic handled by EventSource
		});
	}

	/**
	 * Close SSE connection
	 */
	function disconnect(): void {
		eventSource?.close();
		eventSource = null;
	}

	/**
	 * Get circuit breaker state
	 */
	function getCircuitState(): CircuitState["state"] {
		checkCircuit();
		return circuit.state;
	}

	return {
		call,
		connect,
		disconnect,
		getCircuitState,
	};
}

export type { JsonRpcRequest, JsonRpcResponse };
