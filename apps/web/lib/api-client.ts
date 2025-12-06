import { createORPCClient } from "@orpc/client";
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

// Create a client that connects to our external API service
// IMPORTANT: credentials: "include" is required for cross-subdomain cookie-based auth
const link = new RPCLink({
	url: `${getApiBaseUrl()}/api/rpc`,
	fetch: (input: string | URL | Request, init?: RequestInit) => {
		return fetch(input, {
			...init,
			credentials: "include", // Required for cross-subdomain session cookies
		});
	},
});

// biome-ignore lint/suspicious/noExplicitAny: ApiRouterClient type not yet exported from API package
export const apiClient = createORPCClient(link) as any;
