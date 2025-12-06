import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

// import type { ApiRouterClient } from "@snapback/api/orpc/router";

// Function to get web app base URL
function getBaseUrl(): string {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snapback.dev";
	return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

// Function to get API base URL - points to external API service
function getApiBaseUrl() {
	// In production, use the API service URL
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}

	// In development, use localhost:3001 for the API service
	if (process.env.NODE_ENV === "development") {
		return "http://localhost:3001";
	}

	// Fallback to the web app URL (current behavior)
	return getBaseUrl();
}

const link = new RPCLink({
	url: `${getApiBaseUrl()}/api/rpc`,
	headers: async () => {
		if (typeof window !== "undefined") {
			return {};
		}

		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
	interceptors: [
		onError((error) => {
			if (error instanceof Error && error.name === "AbortError") {
				return;
			}

			console.error("ORPC client error", { error });
		}),
	],
});

// biome-ignore lint/suspicious/noExplicitAny: ApiRouterClient type not yet exported from API package
export const orpcClient: any = createORPCClient(link);
