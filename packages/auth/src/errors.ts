export class AuthError extends Error {
	constructor(
		message: string,
		public statusCode = 401,
		public code?: string,
	) {
		super(message);
		this.name = "AuthError";
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AuthError);
		}
	}

	toJSON() {
		return {
			error: this.message,
			code: this.code,
			statusCode: this.statusCode,
		};
	}
}

export class InsufficientRoleError extends AuthError {
	constructor(required: string[], actual: string) {
		super(`Insufficient role. Required: ${required.join(" or ")}, got: ${actual}`, 403, "INSUFFICIENT_ROLE");
	}
}

export class InsufficientScopesError extends AuthError {
	constructor(required: string[], actual: string[]) {
		super(
			`Missing scopes. Required: ${required.join(", ")}, got: ${actual.join(", ")}`,
			403,
			"INSUFFICIENT_SCOPES",
		);
	}
}
