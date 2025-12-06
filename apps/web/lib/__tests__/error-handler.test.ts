import { describe, expect, it, vi } from "vitest";
import { getErrorMessage, logError, toAppError } from "../error-handler";

describe("Error Handler", () => {
	it("should handle network errors", () => {
		const error = new TypeError("Failed to fetch");
		const appError = toAppError(error);
		expect(appError.code).toBe("NETWORK");
		expect(appError.retryable).toBe(true);
	});

	it("should handle 401 errors", () => {
		const error = new Error("unauthorized");
		const appError = toAppError(error);
		expect(appError.code).toBe("UNAUTHORIZED");
		expect(appError.statusCode).toBe(401);
	});

	it("should provide user-friendly messages", () => {
		const error = toAppError(new Error("test"), "RATE_LIMITED");
		const message = getErrorMessage(error);
		expect(message).toContain("Too many requests");
	});

	it("should handle Drizzle database errors", () => {
		const error = new Error("duplicate key value violates unique constraint");
		const appError = toAppError(error);
		expect(appError.code).toBe("CONFLICT");
		expect(appError.statusCode).toBe(409);
	});

	it("should handle Response errors", async () => {
		const response = new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			statusText: "Not Found",
		});
		const appError = await toAppError(response);
		expect(appError.code).toBe("NOT_FOUND");
		expect(appError.statusCode).toBe(404);
	});
});
