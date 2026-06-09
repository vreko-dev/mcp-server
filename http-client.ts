/**
 * HTTP Client with Connection Pooling via undici
 *
 * Uses undici's Agent (ships with Node.js 20+) for proper connection pooling.
 * The native fetch() in Node.js is backed by undici  -  setGlobalDispatcher
 * wires our pooled Agent into every fetch() call site without changing call
 * signatures.
 *
 * Previous approach used node:http Agent passed via the `agent` option on
 * globalThis.fetch  -  that option is silently ignored because undici does not
 * read it, so pooling was a no-op.
 *
 * @module http-client
 */

import { Agent, setGlobalDispatcher } from "undici";

const globalAgent = new Agent({
	connections: 50,
	keepAliveTimeout: 30_000,
	keepAliveMaxTimeout: 60_000,
	pipelining: 1,
});

setGlobalDispatcher(globalAgent);

/**
 * Thin wrapper around global fetch().
 *
 * Connection pooling is handled by the undici Agent registered above.
 * Call sites are unchanged  -  drop-in replacement for the old implementation.
 */
export async function fetchWithPooling(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	return fetch(input, init);
}

/**
 * Get connection pool statistics for monitoring.
 */
export function getPoolStats() {
	return { dispatcher: "undici-global-agent", connections: 50, pooling: true };
}

/**
 * Drain and destroy all pooled connections.
 * Call this on server shutdown.
 */
export function destroyPools(): void {
	void globalAgent.destroy();
}
