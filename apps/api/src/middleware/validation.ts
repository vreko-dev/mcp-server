import { logger } from "@snapback/infrastructure";
import type { Context } from "hono";
import type { ZodSchema, z } from "zod";

/**
 * Validation Middleware
 *
 * Provides type-safe request validation using Zod schemas:
 * - Body validation for POST/PUT/PATCH requests
 * - Query parameter validation
 * - Path parameter validation
 * - Async refinement support
 * - Detailed error messages
 * - Type-safe handler data
 */

/**
 * Validation error format
 */
export interface ValidationError {
	field: string;
	message: string;
	code?: string;
}

export interface ValidationErrorResponse {
	code: "validation_error";
	message: string;
	errors: ValidationError[];
}

/**
 * Parse Zod errors into a standard format
 */
function parseZodErrors(error: z.ZodError<unknown>): ValidationError[] {
	return error.issues.map((err) => ({
		field: err.path.join("."),
		message: err.message,
		code: err.code,
	}));
}

/**
 * Validate request body against a schema
 *
 * Usage:
 * ```typescript
 * const userSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8)
 * });
 *
 * app.post("/api/users", async (c) => {
 *   const data = await validateBody(c, userSchema);
 *   if (!data.success) {
 *     return c.json(data.error, 400);
 *   }
 *   // data.value is typed as { email: string; password: string }
 *   return c.json({ user: data.value });
 * });
 * ```
 */
export async function validateBody<T extends ZodSchema>(
	c: Context,
	schema: T,
): Promise<{ success: true; value: z.infer<T> } | { success: false; error: ValidationErrorResponse }> {
	try {
		// Check Content-Type
		const contentType = c.req.header("Content-Type");
		if (!contentType?.includes("application/json")) {
			return {
				success: false,
				error: {
					code: "validation_error",
					message: "Content-Type must be application/json",
					errors: [
						{
							field: "Content-Type",
							message: "Must be application/json",
						},
					],
				},
			};
		}

		// Parse JSON
		let body: unknown;
		try {
			body = await c.req.json();
		} catch (err) {
			return {
				success: false,
				error: {
					code: "validation_error",
					message: "Invalid JSON in request body",
					errors: [
						{
							field: "body",
							message: err instanceof Error ? err.message : "Failed to parse JSON",
						},
					],
				},
			};
		}

		// Validate against schema
		const result = await schema.safeParseAsync(body);

		if (!result.success) {
			const errors = parseZodErrors(result.error);

			logger.warn("Request validation failed", {
				path: c.req.path,
				method: c.req.method,
				errorCount: errors.length,
				errors: errors.slice(0, 5), // Log first 5 errors
			});

			return {
				success: false,
				error: {
					code: "validation_error",
					message: "Request validation failed",
					errors,
				},
			};
		}

		return { success: true, value: result.data };
	} catch (err) {
		logger.error("Validation middleware error", {
			path: c.req.path,
			error: err instanceof Error ? err.message : String(err),
		});

		return {
			success: false,
			error: {
				code: "validation_error",
				message: "An error occurred during validation",
				errors: [
					{
						field: "system",
						message: "Validation system error",
					},
				],
			},
		};
	}
}

/**
 * Validate query parameters against a schema
 */
export async function validateQuery<T extends ZodSchema>(
	c: Context,
	schema: T,
): Promise<{ success: true; value: z.infer<T> } | { success: false; error: ValidationErrorResponse }> {
	try {
		const query = c.req.query();

		// Convert query object to match schema
		const queryObj: Record<string, unknown> = {};
		Object.entries(query).forEach(([key, value]) => {
			// Handle array values from query string
			queryObj[key] = Array.isArray(value) ? value[0] : value;
		});

		const result = await schema.safeParseAsync(queryObj);

		if (!result.success) {
			const errors = parseZodErrors(result.error);

			logger.warn("Query validation failed", {
				path: c.req.path,
				errorCount: errors.length,
				errors: errors.slice(0, 5),
			});

			return {
				success: false,
				error: {
					code: "validation_error",
					message: "Query parameter validation failed",
					errors,
				},
			};
		}

		return { success: true, value: result.data };
	} catch (err) {
		logger.error("Query validation error", {
			path: c.req.path,
			error: err instanceof Error ? err.message : String(err),
		});

		return {
			success: false,
			error: {
				code: "validation_error",
				message: "An error occurred during query validation",
				errors: [
					{
						field: "system",
						message: "Validation system error",
					},
				],
			},
		};
	}
}

/**
 * Validate path parameters against a schema
 */
export async function validateParams<T extends ZodSchema>(
	c: Context,
	schema: T,
): Promise<{ success: true; value: z.infer<T> } | { success: false; error: ValidationErrorResponse }> {
	try {
		const params = c.req.param();

		const result = await schema.safeParseAsync(params);

		if (!result.success) {
			const errors = parseZodErrors(result.error);

			return {
				success: false,
				error: {
					code: "validation_error",
					message: "Path parameter validation failed",
					errors,
				},
			};
		}

		return { success: true, value: result.data };
	} catch (err) {
		logger.error("Path validation error", {
			path: c.req.path,
			error: err instanceof Error ? err.message : String(err),
		});

		return {
			success: false,
			error: {
				code: "validation_error",
				message: "An error occurred during path validation",
				errors: [
					{
						field: "system",
						message: "Validation system error",
					},
				],
			},
		};
	}
}

/**
 * Create a combined validator for body and query
 */
export async function validateRequest<B extends ZodSchema, Q extends ZodSchema>(
	c: Context,
	schemas: {
		body?: B;
		query?: Q;
	},
): Promise<{
	body?: z.infer<B>;
	query?: z.infer<Q>;
	errors?: ValidationErrorResponse;
}> {
	const result: { body?: z.infer<B>; query?: z.infer<Q> } = {};

	// Validate body
	if (schemas.body) {
		const bodyResult = await validateBody(c, schemas.body);
		if (!bodyResult.success) {
			return { errors: bodyResult.error };
		}
		result.body = bodyResult.value;
	}

	// Validate query
	if (schemas.query) {
		const queryResult = await validateQuery(c, schemas.query);
		if (!queryResult.success) {
			return { errors: queryResult.error };
		}
		result.query = queryResult.value;
	}

	return result;
}
