import CircuitBreaker from "opossum";

// import { snapbackDefaults } from '@snapback/config';
// Using hardcoded values for now to avoid import issues
const snapbackDefaults = {
	mcp: {
		timeoutMs: 5000,
		maxConcurrent: 4,
		retry: { retries: 2, factor: 2, min: 250, max: 1500, jitter: true },
		circuit: {
			enabled: true,
			errorThresholdPercentage: 50,
			volumeThreshold: 10,
			timeoutMs: 5000,
			resetMs: 30000,
			rollingCountMs: 60000,
			rollingCountBuckets: 6,
		},
	},
} as const;

type ToolFn<I, O> = (input: I) => Promise<O>;

// Store circuit breakers by tool name
const circuitBreakers = new Map<string, CircuitBreaker<any, any>>();

export function withBreaker<I, O>(toolName: string, fn: ToolFn<I, O>, cfg = snapbackDefaults.mcp.circuit) {
	// Get or create circuit breaker for this tool
	if (!circuitBreakers.has(toolName)) {
		const br = new CircuitBreaker(fn as any, {
			timeout: cfg.timeoutMs,
			errorThresholdPercentage: cfg.errorThresholdPercentage,
			resetTimeout: cfg.resetMs,
			rollingCountTimeout: cfg.rollingCountMs,
			rollingCountBuckets: cfg.rollingCountBuckets,
			volumeThreshold: cfg.volumeThreshold,
		});

		br.on("open", () => console.warn(`Circuit breaker opened for tool: ${toolName}`));
		br.on("halfOpen", () => console.warn(`Circuit breaker half-open for tool: ${toolName}`));
		br.on("close", () => console.info(`Circuit breaker closed for tool: ${toolName}`));

		circuitBreakers.set(toolName, br);
	}

	const br = circuitBreakers.get(toolName);
	if (!br) {
		throw new Error(`Circuit breaker not found for tool: ${toolName}`);
	}
	return (input: I) => br.fire(input) as Promise<O>;
}

export function getCircuitBreakerState(toolName: string) {
	const br = circuitBreakers.get(toolName);
	if (!br) {
		return null;
	}
	return {
		isOpen: br.opened,
		isHalfOpen: br.halfOpen,
		isClosed: br.closed,
		// Note: opossum doesn't expose failureCount and successCount directly
	};
}
