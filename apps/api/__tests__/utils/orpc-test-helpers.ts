/**
 * oRPC Test Helpers
 *
 * Utilities for testing oRPC procedures in isolation without requiring
 * HTTP server setup. Provides mock context factories and assertion helpers.
 *
 * @module orpc-test-helpers
 * @see Design: .qoder/quests/orpc-test-infrastructure.md
 */

import type { PlanId, SnapbackAuthContext, UserRole } from "@snapback/auth";
import { vi } from "vitest";
import type { OrpcContext } from "../../orpc/procedures";

// ============================================================================
// Result Types (Following always-result-type-pattern.md)
// ============================================================================

/**
 * Discriminated union representing operation success or failure
 */
export type Result<T> =
	| { success: true; data: T }
	| { success: false; error: { code: string; message: string } };

export type SuccessResult<T> = { success: true; data: T };
export type ErrorResult = { success: false; error: { code: string; message: string } };

// ============================================================================
// Context Override Types
// ============================================================================

/**
 * Options for customizing mock oRPC contexts
 */
export interface ContextOverrides {
	user?: {
		id?: string;
		email?: string;
		role?: UserRole;
		plan?: PlanId;
		name?: string;
		createdAt?: Date;
		orgId?: string;
		orgRole?: "owner" | "admin" | "member";
	};
	auth?: Partial<SnapbackAuthContext> | null;
	subscription?: {
		plan?: PlanId;
		status?: string;
		monthlyRequestLimit?: number;
		cloudStorageGB?: number;
	};
	apiKey?: {
		key?: string;
		permissions?: {
			maxSnapshots?: number;
			cloudBackup?: boolean;
			advancedDetection?: boolean;
			customRules?: boolean;
			teamSharing?: boolean;
		};
	};
	headers?: Record<string, string>;
	request?: {
		method?: string;
		url?: string;
	};
}

// ============================================================================
// Mock Handler Type
// ============================================================================

/**
 * Type signature for mock procedure handlers
 */
export type MockHandler<TInput, TOutput> = (args: {
	input: TInput;
	context: OrpcContext;
}) => Promise<TOutput> | TOutput;

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Generate unique test user IDs
 */
let userIdCounter = 0;
function generateTestUserId(): string {
	return `test-user-${++userIdCounter}-${Date.now()}`;
}

/**
 * Create a mock oRPC context for testing
 *
 * Generates realistic OrpcContext objects with sensible defaults.
 * All fields can be overridden via the options parameter.
 *
 * @param overrides - Partial context values to override defaults
 * @returns Complete OrpcContext ready for testing
 *
 * @example
 * ```typescript
 * // Authenticated free user
 * const context = createMockORPCContext({
 *   user: { plan: 'free' }
 * });
 *
 * // Admin user
 * const adminContext = createMockORPCContext({
 *   user: { role: 'admin' }
 * });
 *
 * // Unauthenticated request
 * const publicContext = createMockORPCContext({
 *   auth: null,
 *   user: null
 * });
 * ```
 */
export function createMockORPCContext(overrides: ContextOverrides = {}): OrpcContext {
	// Generate unique user ID
	const userId = overrides.user?.id ?? generateTestUserId();
	const email = overrides.user?.email ?? `${userId}@test.example.com`;
	const role = overrides.user?.role ?? "user";
	const plan = overrides.user?.plan ?? overrides.subscription?.plan ?? "free";
	const name = overrides.user?.name ?? "Test User";

	// Build request object
	const method = overrides.request?.method ?? "POST";
	const url = overrides.request?.url ?? "http://localhost:3001/api/test";
	const headers = new Headers(overrides.headers ?? {});

	// Create Request object
	const request = new Request(url, {
		method,
		headers,
	});

	// Build auth context (null if explicitly set to null)
	const auth: SnapbackAuthContext | null =
		overrides.auth === null
			? null
			: {
					userId,
					email,
					role,
					plan,
					name,
					authenticatedVia: "session" as const,
					emailVerified: true,
					twoFactorEnabled: false,
					passkeyRegistered: false,
					createdAt: new Date(),
					...overrides.auth,
				};

	// Build user object (null if auth is null or user explicitly null)
	const user =
		auth === null || overrides.user === null
			? null
			: {
					id: userId,
					email,
					role,
					plan,
					name,
					createdAt: new Date(),
					orgId: overrides.user?.orgId,
					orgRole: overrides.user?.orgRole,
				};

	return {
		request,
		auth,
		user,
	};
}

// ============================================================================
// Mock Procedure Invocation
// ============================================================================

/**
 * Call a mock procedure handler with proper context
 *
 * Invokes mock procedure handlers in a way that simulates oRPC's
 * internal behavior while catching errors and wrapping results.
 *
 * @param mockProcedure - Object with a handler function
 * @param input - Input data for the procedure
 * @param context - Optional oRPC context (generates default if omitted)
 * @returns Result object with success/error discrimination
 *
 * @example
 * ```typescript
 * const mockProcedure = {
 *   handler: vi.fn().mockResolvedValue({ flags: { feature: true } })
 * };
 *
 * const result = await callMockProcedure(
 *   mockProcedure,
 *   { userId: 'test-123' },
 *   createMockORPCContext()
 * );
 *
 * expectORPCSuccess(result);
 * expect(result.data.flags.feature).toBe(true);
 * ```
 */
export async function callMockProcedure<TInput, TOutput>(
	mockProcedure: { handler: MockHandler<TInput, TOutput> },
	input: TInput,
	context?: OrpcContext,
): Promise<Result<TOutput>> {
	const ctx = context ?? createMockORPCContext();

	try {
		const data = await mockProcedure.handler({ input, context: ctx });
		return { success: true, data };
	} catch (error) {
		// Extract error details
		const err = error as Error;
		const code = "code" in err ? (err as { code: string }).code : "INTERNAL_ERROR";
		const message = err.message || "Unknown error";

		return {
			success: false,
			error: { code, message },
		};
	}
}

// ============================================================================
// Assertion Utilities
// ============================================================================

/**
 * Assert that a result is successful (type guard)
 *
 * Throws if the result is an error, otherwise narrows the type
 * to guarantee that `result.data` exists.
 *
 * @param result - Result to check
 * @throws {Error} If result is an error
 *
 * @example
 * ```typescript
 * const result = await callMockProcedure(...);
 * expectORPCSuccess(result);
 * // TypeScript now knows result.data exists
 * expect(result.data.userId).toBe('test-123');
 * ```
 */
export function expectORPCSuccess<T>(result: Result<T>): asserts result is SuccessResult<T> {
	if (!result.success) {
		const error = result.error;
		throw new Error(
			`Expected successful result, but got error:\n` +
				`  Code: ${error.code}\n` +
				`  Message: ${error.message}`,
		);
	}
}

/**
 * Assert that a result is an error (type guard)
 *
 * Throws if the result is successful, otherwise narrows the type
 * to guarantee that `result.error` exists. Optionally validates
 * that the error code matches an expected value.
 *
 * @param result - Result to check
 * @param expectedCode - Optional error code to validate
 * @throws {Error} If result is successful or code doesn't match
 *
 * @example
 * ```typescript
 * const result = await callMockProcedure(...);
 * expectORPCError(result);
 * // TypeScript now knows result.error exists
 *
 * // With code validation
 * expectORPCError(result, 'FORBIDDEN');
 * expect(result.error.message).toContain('permissions');
 * ```
 */
export function expectORPCError(
	result: Result<unknown>,
	expectedCode?: string,
): asserts result is ErrorResult {
	if (result.success) {
		throw new Error(
			`Expected error result, but got success:\n` + `  Data: ${JSON.stringify(result.data)}`,
		);
	}

	// Validate error code if specified
	if (expectedCode && result.error.code !== expectedCode) {
		throw new Error(
			`Expected error code "${expectedCode}", but got "${result.error.code}":\n` +
				`  Message: ${result.error.message}`,
		);
	}
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Create a mock procedure object with Vitest spy
 *
 * Convenience function to create a mock procedure with a Vitest
 * mock function that can be configured with mockResolvedValue, etc.
 *
 * @param implementation - Optional handler implementation
 * @returns Mock procedure object with handler spy
 *
 * @example
 * ```typescript
 * const mockProc = createMockProcedure<{ id: string }, { found: boolean }>();
 * mockProc.handler.mockResolvedValue({ found: true });
 *
 * const result = await callMockProcedure(mockProc, { id: 'test' });
 * expect(mockProc.handler).toHaveBeenCalledWith({
 *   input: { id: 'test' },
 *   context: expect.any(Object)
 * });
 * ```
 */
export function createMockProcedure<TInput = unknown, TOutput = unknown>(
	implementation?: MockHandler<TInput, TOutput>,
) {
	return {
		handler: implementation ? vi.fn(implementation) : vi.fn<MockHandler<TInput, TOutput>>(),
	};
}
