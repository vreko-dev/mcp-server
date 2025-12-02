/**
 * Subdomain Utilities
 *
 * Robust subdomain parsing that handles:
 * - IPv6 addresses: [::1]:3000 or 2001:0db8::1
 * - IPv4 with ports: localhost:3000
 * - Complex proxy configurations: X-Forwarded-Host headers
 * - Vercel preview URLs: docs---branch-name.vercel.app
 */

export interface SubdomainConfig {
	subdomain: string | null;
	mainDomain: string;
	port: string | null;
	homeUrl: string;
}

/**
 * Parse host string and extract subdomain configuration
 *
 * @param host - The host header value (e.g., "docs.localhost:3000", "[::1]:3000")
 * @param protocol - The protocol to use (default: "http")
 * @returns Parsed subdomain configuration
 */
export function parseSubdomainConfig(
	host: string,
	protocol = "http",
): SubdomainConfig {
	// Handle IPv6 addresses with port: [::1]:3000 or [2001:0db8::1]:443
	const ipv6Match = host.match(/^\[([^\]]+)\]:(\d+)$/);
	if (ipv6Match) {
		return {
			subdomain: null,
			mainDomain: ipv6Match[1] ?? "",
			port: ipv6Match[2] ?? null,
			homeUrl: `${protocol}://[${ipv6Match[1]}]:${ipv6Match[2]}`,
		};
	}

	// Handle IPv6 addresses without port: ::1 or 2001:0db8::1
	const ipv6PlainMatch = host.match(/^([0-9a-fA-F:]+)$/);
	if (ipv6PlainMatch && host.includes(":") && !host.includes(".")) {
		return {
			subdomain: null,
			mainDomain: ipv6PlainMatch[1] ?? "",
			port: null,
			homeUrl: `${protocol}://[${ipv6PlainMatch[1]}]`,
		};
	}

	// Handle IPv4/domain with port: localhost:3000 or docs.localhost:3000
	const [hostnamePart, ...portParts] = host.split(":");
	const hostname = hostnamePart || host;
	const port = portParts.length > 0 ? (portParts[0] ?? null) : null; // Ensure port is always string | null

	// Extract subdomain for localhost
	if (hostname.includes(".localhost")) {
		const parts = hostname.split(".");
		const subdomain = parts[0] ?? null;
		return {
			subdomain: subdomain === "localhost" ? null : subdomain,
			mainDomain: "localhost",
			port,
			homeUrl: `${protocol}://localhost${port ? `:${port}` : ""}`,
		};
	}

	// Production domain (e.g., new-docs.snapback.dev)
	// const rootDomain =
	// 	process.env.NEXT_PUBLIC_ROOT_DOMAIN || "snapback.dev";
	if (hostname.startsWith("new-docs.")) {
		const mainDomain = hostname.replace("new-docs.", "");
		return {
			subdomain: "new-docs",
			mainDomain,
			port,
			homeUrl: `${protocol}://${mainDomain}${port ? `:${port}` : ""}`,
		};
	}

	// Vercel preview URLs: new-docs---branch-name.vercel.app
	if (hostname.includes("---") && hostname.includes(".vercel.app")) {
		const parts = hostname.split("---");
		const subdomainPart = parts[0] ?? null;
		if (subdomainPart === "new-docs") {
			// Main domain without subdomain
			const mainDomain = hostname.replace(`${subdomainPart}---`, "");
			return {
				subdomain: "new-docs",
				mainDomain,
				port,
				homeUrl: `${protocol}://${mainDomain}${port ? `:${port}` : ""}`,
			};
		}
	}

	// Default: no subdomain
	return {
		subdomain: null,
		mainDomain: hostname,
		port,
		homeUrl: `${protocol}://${hostname}${port ? `:${port}` : ""}`,
	};
}

/**
 * Get the home URL from request headers
 *
 * @param host - The host header value
 * @param forwardedProto - The X-Forwarded-Proto header (optional)
 * @returns The home URL
 */
export function getHomeUrl(host: string, forwardedProto?: string): string {
	const protocol =
		forwardedProto || (host.includes("localhost") ? "http" : "https");
	const config = parseSubdomainConfig(host, protocol);
	return config.homeUrl;
}
