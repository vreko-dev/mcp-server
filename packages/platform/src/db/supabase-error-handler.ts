import { createLogger, LogLevel } from "@snapback/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

const logger = createLogger({
	name: "supabase-error-handler",
	level: LogLevel.ERROR,
});

// Custom error types for Supabase operations
export class SupabaseError extends Error {
	constructor(
		message: string,
		public code?: string,
		public details?: any,
	) {
		super(message);
		this.name = "SupabaseError";
	}
}

export class DatabaseConnectionError extends SupabaseError {
	constructor(message: string, code?: string, details?: any) {
		super(message, code, details);
		this.name = "DatabaseConnectionError";
	}
}

export class AuthenticationError extends SupabaseError {
	constructor(message: string, code?: string, details?: any) {
		super(message, code, details);
		this.name = "AuthenticationError";
	}
}

export class ValidationError extends SupabaseError {
	constructor(message: string, code?: string, details?: any) {
		super(message, code, details);
		this.name = "ValidationError";
	}
}

// Error handler for Supabase operations
export const handleSupabaseError = (error: any): SupabaseError => {
	if (!error) {
		return new SupabaseError("Unknown error occurred");
	}

	// Handle Supabase-specific errors
	if (error.message) {
		const message = error.message;
		const code = error.code || error.name;
		const details = {
			hint: error.hint,
			details: error.details,
		};

		// Connection errors
		if (message.includes("connection") || message.includes("network")) {
			return new DatabaseConnectionError(message, code, details);
		}

		// Authentication errors
		if (message.includes("authentication") || message.includes("auth") || message.includes("jwt")) {
			return new AuthenticationError(message, code, details);
		}

		// Validation errors
		if (message.includes("validation") || message.includes("constraint")) {
			return new ValidationError(message, code, details);
		}

		// Generic Supabase error
		return new SupabaseError(message, code, details);
	}

	// Handle generic errors
	return new SupabaseError(error.toString());
};

// Retry mechanism for Supabase operations
export interface RetryOptions {
	maxRetries?: number;
	delay?: number;
	exponentialBackoff?: boolean;
}

export const withRetry = async <T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
	const { maxRetries = 3, delay = 1000, exponentialBackoff = true } = options;

	let lastError: any;

	for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			// Don't retry on validation errors or authentication errors
			if (error instanceof ValidationError || error instanceof AuthenticationError) {
				throw error;
			}

			// If this was the last attempt, throw the error
			if (attempt > maxRetries) {
				throw handleSupabaseError(lastError);
			}

			// Calculate delay
			const currentDelay = exponentialBackoff ? delay * 2 ** (attempt - 1) : delay;

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, currentDelay));
		}
	}

	throw handleSupabaseError(lastError);
};

// Connection management utilities
export class SupabaseConnectionManager {
	private static instance: SupabaseConnectionManager;
	private connectionTimeout = 30000; // 30 seconds
	private retryAttempts = 3;

	private constructor() {}

	static getInstance(): SupabaseConnectionManager {
		if (!SupabaseConnectionManager.instance) {
			SupabaseConnectionManager.instance = new SupabaseConnectionManager();
		}
		return SupabaseConnectionManager.instance;
	}

	async testConnection(supabase: SupabaseClient): Promise<boolean> {
		try {
			const result = await withRetry(
				async () => {
					const { data, error } = await supabase.from("user").select("id").limit(1);
					if (error) {
						throw error;
					}
					return { data, error };
				},
				{ maxRetries: this.retryAttempts },
			);

			return !result.error;
		} catch (error) {
			logger.error("Supabase connection test failed:", error as Error | Record<string, unknown> | undefined);
			return false;
		}
	}

	async waitForConnection(supabase: SupabaseClient, timeout: number = this.connectionTimeout): Promise<boolean> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			if (await this.testConnection(supabase)) {
				return true;
			}

			// Wait 1 second before retrying
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		return false;
	}

	async refreshConnection(supabase: SupabaseClient): Promise<void> {
		try {
			// Attempt to refresh the session
			const result = await withRetry(
				async () => {
					const { data, error } = await supabase.auth.refreshSession();
					if (error) {
						throw error;
					}
					return { data, error };
				},
				{ maxRetries: this.retryAttempts },
			);

			if (result.error) {
				throw result.error;
			}

			if (result.data?.session && process.env.NODE_ENV !== "production") {
				logger.debug("Supabase session refreshed successfully");
			}
		} catch (error) {
			logger.error(
				"Failed to refresh Supabase connection:",
				error as Error | Record<string, unknown> | undefined,
			);
			throw handleSupabaseError(error);
		}
	}
}

// Export singleton instance
export const supabaseConnectionManager = SupabaseConnectionManager.getInstance();

// Utility function to wrap Supabase operations with error handling
export const safeSupabaseOperation = async <T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
	try {
		return await withRetry(operation, options);
	} catch (error) {
		throw handleSupabaseError(error);
	}
};
