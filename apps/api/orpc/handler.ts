import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { FetchHandleResult } from "@orpc/server/fetch";
import { RPCHandler } from "@orpc/server/fetch";
import { logger } from "@snapback/infrastructure";
import { router } from "./router";

// Create proper oRPC handlers according to spec
const rpcHandlerInstance = new RPCHandler(router);
const openApiHandlerInstance = new OpenAPIHandler(router);

export const rpcHandler = {
	handle: async (request: Request, options: { prefix: `/${string}`; context: any }): Promise<FetchHandleResult> => {
		// Log that we received an RPC request
		logger.info("RPC handler called", {
			url: request.url,
			method: request.method,
			prefix: options.prefix,
		});

		// Handle RPC requests properly using oRPC RPCHandler
		const result = await rpcHandlerInstance.handle(request, {
			prefix: options.prefix,
			context: options.context,
		});

		// If this is a health check request, return formatted response
		if (request.url.includes("/health")) {
			return {
				matched: true,
				response: new Response("Snap Back\n", {
					status: 200,
					headers: { "Content-Type": "text/plain" },
				}),
			};
		}

		return result;
	},
};

export const openApiHandler = {
	handle: async (request: Request, options: { prefix: `/${string}`; context: any }): Promise<FetchHandleResult> => {
		// Log that we received an OpenAPI request
		logger.info("OpenAPI handler called", {
			url: request.url,
			method: request.method,
			prefix: options.prefix,
		});

		// Handle OpenAPI requests properly using oRPC OpenAPIHandler
		const result = await openApiHandlerInstance.handle(request, {
			prefix: options.prefix,
			context: options.context,
		});

		// If this is a health check request, return formatted response
		if (request.url.includes("/health")) {
			return {
				matched: true,
				response: new Response("Snap Back\n", {
					status: 200,
					headers: { "Content-Type": "text/plain" },
				}),
			};
		}

		return result;
	},
};
