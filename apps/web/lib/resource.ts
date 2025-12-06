// Resource pattern implementation for SnapBack

import type { AppError } from "./error-handler";

// Define the Resource type with all possible states
// Default to AppError for consistency across the application
export type Resource<T, E = AppError> =
	| { state: "loading" }
	| { state: "empty" }
	| { state: "error"; error: E }
	| { state: "ready"; data: T };

// R constructors
export const R = {
	loading: <T, E = AppError>(): Resource<T, E> => ({ state: "loading" }),
	empty: <T, E = AppError>(): Resource<T, E> => ({ state: "empty" }),
	error: <T, E = AppError>(error: E): Resource<T, E> => ({
		state: "error",
		error,
	}),
	ready: <T, E = AppError>(data: T): Resource<T, E> => ({
		state: "ready",
		data,
	}),
};

// Pattern matching function
export function matchResource<T, R, E = AppError>(
	resource: Resource<T, E>,
	matcher: {
		loading: () => R;
		empty: () => R;
		error: (error: E) => R;
		ready: (data: T) => R;
	},
): R {
	switch (resource.state) {
		case "loading":
			return matcher.loading();
		case "empty":
			return matcher.empty();
		case "error":
			return matcher.error(resource.error);
		case "ready":
			return matcher.ready(resource.data);
	}
}

// Utility functions
export function isLoading<T, E = AppError>(
	resource: Resource<T, E>,
): resource is { state: "loading" } {
	return resource.state === "loading";
}

export function isEmpty<T, E = AppError>(
	resource: Resource<T, E>,
): resource is { state: "empty" } {
	return resource.state === "empty";
}

export function isError<T, E = AppError>(
	resource: Resource<T, E>,
): resource is { state: "error"; error: E } {
	return resource.state === "error";
}

export function isReady<T, E = AppError>(
	resource: Resource<T, E>,
): resource is { state: "ready"; data: T } {
	return resource.state === "ready";
}
