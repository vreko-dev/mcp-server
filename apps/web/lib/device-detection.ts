// lib/device-detection.ts

/**
 * Get device information based on runtime environment
 *
 * Works in all Next.js 15 environments:
 * - Browser (Client Components)
 * - Server (Server Components)
 * - Edge Runtime (API Routes)
 * - Node.js Runtime (API Routes)
 *
 * @returns Object with device information
 */
export function getDeviceInfo() {
	if (typeof window !== "undefined") {
		// Browser environment (Client Components)
		return {
			runtime: "browser",
			platform: navigator.platform,
			userAgent: navigator.userAgent,
			language: navigator.language,
			screenResolution: `${screen.width}x${screen.height}`,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			cookieEnabled: navigator.cookieEnabled,
			online: navigator.onLine,
			// Device memory and hardware concurrency if available
			deviceMemory: (navigator as any).deviceMemory || "unknown",
			hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
		};
	}

	if (process?.versions?.node) {
		// Node.js environment (VSCode extension or API routes with runtime='nodejs')
		const os = require("node:os");
		return {
			runtime: "nodejs",
			platform: os.platform(),
			hostname: os.hostname(),
			cpus: os.cpus().length,
			totalMemory: os.totalmem(),
			architecture: os.arch(),
			uptime: os.uptime(),
		};
	}

	// Edge Runtime
	return {
		runtime: "edge",
		// Limited info available in Edge Runtime
		platform: "edge-runtime",
	};
}

/**
 * Check if running in browser environment
 *
 * @returns boolean - true if running in browser
 */
export function isBrowser() {
	return typeof window !== "undefined";
}

/**
 * Check if running in Node.js environment
 *
 * @returns boolean - true if running in Node.js
 */
export function isNode() {
	return process?.versions?.node;
}

/**
 * Check if running in Edge Runtime
 *
 * @returns boolean - true if running in Edge Runtime
 */
export function isEdge() {
	return !isBrowser() && !isNode();
}
