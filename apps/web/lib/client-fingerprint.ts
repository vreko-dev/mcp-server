// lib/client-fingerprint.ts
// Client-side fingerprinting utilities for Next.js 15

/**
 * Client-side fingerprinting utilities
 *
 * These functions run in the browser and are fully compatible with Next.js 15
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

/**
 * Get client fingerprint using a lightweight approach
 *
 * This runs in the browser, fully compatible with Next.js 15
 * Uses built-in browser APIs instead of external libraries
 *
 * @returns Promise<{ visitorId: string, components: Record<string, string> }> - fingerprint data
 */
export async function getClientFingerprint() {
	if (!isBrowser) {
		throw new Error("getClientFingerprint can only be called in browser environment");
	}

	// Collect browser-specific attributes
	const components: Record<string, string> = {
		userAgent: navigator.userAgent,
		language: navigator.language,
		platform: navigator.platform,
		hardwareConcurrency: navigator.hardwareConcurrency?.toString() || "unknown",
		deviceMemory: (navigator as any).deviceMemory?.toString() || "unknown",
		screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		touchSupport: "ontouchstart" in window ? "true" : "false",
	};

	// Create a fingerprint from the components
	const fingerprintString = Object.values(components).join("::");

	// Simple hash function (for demonstration - in production, use Web Crypto API)
	let hash = 0;
	for (let i = 0; i < fingerprintString.length; i++) {
		const char = fingerprintString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Convert to hex string
	const visitorId = Math.abs(hash).toString(16);

	return {
		visitorId,
		components,
	};
}

/**
 * Get basic device information
 *
 * Collects non-identifiable device information for analytics
 *
 * @returns Object with device information
 */
export function getDeviceInfo() {
	if (!isBrowser) {
		return {
			platform: "ssr",
			runtime: "server",
		};
	}

	return {
		platform: navigator.platform,
		userAgent: navigator.userAgent,
		language: navigator.language,
		screenResolution: `${screen.width}x${screen.height}`,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		cookieEnabled: navigator.cookieEnabled,
		online: navigator.onLine,
	};
}

/**
 * Get cryptographic hash of data using Web Crypto API
 *
 * Next.js 15 compatible Web Crypto API usage
 *
 * @param data String to hash
 * @returns Promise<string> Hex-encoded SHA-256 hash
 */
export async function cryptoHash(data: string): Promise<string> {
	if (!isBrowser) {
		throw new Error("cryptoHash can only be called in browser environment");
	}

	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
