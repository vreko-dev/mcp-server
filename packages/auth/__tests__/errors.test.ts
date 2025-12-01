import { describe, expect, it } from "vitest";
import {
	AuthError,
	InsufficientRoleError,
	InsufficientScopesError,
} from "../src/errors";

describe("Auth Errors", () => {
	it("should create AuthError with message, statusCode, and code", () => {
		const error = new AuthError(
			"Authentication failed",
			401,
			"UNAUTHENTICATED",
		);

		expect(error.message).toBe("Authentication failed");
		expect(error.statusCode).toBe(401);
		expect(error.code).toBe("UNAUTHENTICATED");
		expect(error.name).toBe("AuthError");
	});

	it("should have default status code of 401", () => {
		const error = new AuthError("Authentication failed");
		expect(error.statusCode).toBe(401);
	});

	it("should convert to JSON correctly", () => {
		const error = new AuthError(
			"Authentication failed",
			401,
			"UNAUTHENTICATED",
		);
		const json = error.toJSON();

		expect(json).toEqual({
			error: "Authentication failed",
			code: "UNAUTHENTICATED",
			statusCode: 401,
		});
	});

	it("should create InsufficientRoleError with correct status and code", () => {
		const error = new InsufficientRoleError(["admin"], "user");

		expect(error.message).toBe("Insufficient role. Required: admin, got: user");
		expect(error.statusCode).toBe(403);
		expect(error.code).toBe("INSUFFICIENT_ROLE");
	});

	it("should create InsufficientScopesError with correct status and code", () => {
		const error = new InsufficientScopesError(["read", "write"], ["read"]);

		expect(error.message).toBe(
			"Missing scopes. Required: read, write, got: read",
		);
		expect(error.statusCode).toBe(403);
		expect(error.code).toBe("INSUFFICIENT_SCOPES");
	});
});
