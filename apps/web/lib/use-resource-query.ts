import {
	type QueryKey,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { z } from "zod";
import { type AppError, logError, toAppError } from "./error-handler";
import { R, type Resource } from "./resource";

// Query adapter
export function useResourceQuery<TData>(
	queryKey: QueryKey,
	queryFn: () => Promise<TData | null | undefined>,
	options?: Omit<UseQueryOptions<TData, AppError>, "queryKey" | "queryFn"> & {
		schema?: z.ZodSchema<TData>;
	},
): Resource<TData, AppError> {
	const queryResult = useQuery<TData, AppError>({
		queryKey,
		queryFn: async () => {
			try {
				const result = await queryFn();

				// Handle null/undefined results
				if (result === null || result === undefined) {
					return result as TData;
				}

				// Add optional zod validation
				if (options?.schema) {
					return options.schema.parse(result);
				}

				return result;
			} catch (error) {
				// Auto-detect error type instead of assuming NETWORK
				const appError = toAppError(error);
				logError(appError, { queryKey, context: "resource-query" });
				throw appError;
			}
		},
		...options,
	});

	// Convert TanStack Query result to Resource pattern
	// Updated to use isPending instead of isLoading (TanStack Query v5)
	if (queryResult.isPending) {
		return R.loading();
	}

	if (queryResult.isError) {
		return R.error(queryResult.error);
	}

	if (queryResult.isSuccess) {
		if (queryResult.data === null || queryResult.data === undefined) {
			return R.empty();
		}
		return R.ready(queryResult.data);
	}

	// Fallback to loading state
	return R.loading();
}

// Mutation adapter
export function useResourceMutation<TData, TVariables = void, TContext = unknown>(
	mutationFn: (variables: TVariables) => Promise<TData | null | undefined>,
	options?: UseMutationOptions<TData, AppError, TVariables, TContext> & {
		schema?: z.ZodSchema<TData>;
	},
) {
	const mutationResult = useMutation<TData, AppError, TVariables, TContext>({
		mutationFn: async (variables) => {
			try {
				const result = await mutationFn(variables);

				// Handle null/undefined results
				if (result === null || result === undefined) {
					return result as TData;
				}

				// Add optional zod validation
				if (options?.schema) {
					return options.schema.parse(result);
				}

				return result;
			} catch (error) {
				// Auto-detect error type instead of assuming INTERNAL
				const appError = toAppError(error);
				logError(appError, { variables, context: "resource-mutation" });
				throw appError;
			}
		},
		...options,
	});

	// Convert TanStack Mutation result to Resource pattern
	const resourceResult: Resource<TData, AppError> = mutationResult.isPending
		? R.loading()
		: mutationResult.isError
			? R.error(mutationResult.error)
			: mutationResult.isSuccess
				? mutationResult.data === null || mutationResult.data === undefined
					? R.empty()
					: R.ready(mutationResult.data)
				: R.loading();

	return {
		...mutationResult,
		mutationResult: resourceResult,
	};
}
