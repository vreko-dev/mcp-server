export class SimpleCircuitBreaker {
	private failureCount = 0;
	private readonly threshold = 3;

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check circuit breaker state first
		if (this.failureCount >= this.threshold) {
			throw new Error("Circuit breaker open");
		}

		try {
			const result = await fn();
			this.failureCount = 0; // Reset on success
			return result;
		} catch (error) {
			this.failureCount++;
			// Check if we should open the circuit breaker now
			if (this.failureCount >= this.threshold) {
				throw new Error("Circuit breaker open");
			}
			throw error;
		}
	}
}
