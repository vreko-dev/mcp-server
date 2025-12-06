"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Navigation options for useNavigateTo hook
 */
export interface NavigateOptions {
	/**
	 * Replace current history entry instead of pushing new one
	 * @default false
	 */
	replace?: boolean;

	/**
	 * Control scroll behavior after navigation
	 * @default true
	 */
	scroll?: boolean;
}

/**
 * Navigation function type
 */
export type NavigateTo = (path: string, options?: NavigateOptions) => void;

/**
 * Root-aware navigation hook for Next.js App Router
 *
 * Ensures all navigation is absolute from root, preventing relative path issues.
 * Handles internal routes, external links, and special protocols (mailto, tel).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const navigateTo = useNavigateTo();
 *
 *   return (
 *     <button onClick={() => navigateTo('/features')}>
 *       View Features
 *     </button>
 *   );
 * }
 * ```
 *
 * @example External links
 * ```tsx
 * navigateTo('https://github.com/snapback');
 * // Opens in new tab with noopener,noreferrer
 * ```
 *
 * @example With options
 * ```tsx
 * navigateTo('/pricing', { replace: true, scroll: false });
 * ```
 *
 * @returns NavigateTo function for programmatic navigation
 */
export function useNavigateTo(): NavigateTo {
	const router = useRouter();

	const navigate = useCallback(
		(path: string, options: NavigateOptions = {}) => {
			// Handle edge cases
			if (!path || path === null || path === undefined) {
				path = "/";
			}

			// Trim whitespace
			path = String(path).trim();

			// Handle special protocols (mailto, tel, etc.)
			if (isSpecialProtocol(path)) {
				window.location.href = path;
				return;
			}

			// Handle external URLs (http://, https://)
			if (isExternalUrl(path)) {
				window.open(path, "_blank", "noopener,noreferrer");
				return;
			}

			// Ensure path starts with / for internal routes
			if (!path.startsWith("/")) {
				path = `/${path}`;
			}

			// Use router.replace or router.push based on options
			if (options.replace) {
				router.replace(path);
			} else {
				// Pass scroll option to Next.js router
				if (options.scroll === false) {
					router.push(path, { scroll: false });
				} else {
					router.push(path);
				}
			}
		},
		[router],
	);

	return navigate;
}

/**
 * Check if URL is external (http:// or https://)
 */
function isExternalUrl(path: string): boolean {
	return path.startsWith("http://") || path.startsWith("https://");
}

/**
 * Check if URL uses special protocol (mailto:, tel:, etc.)
 */
function isSpecialProtocol(path: string): boolean {
	const specialProtocols = ["mailto:", "tel:", "sms:", "facetime:"];
	return specialProtocols.some((protocol) => path.startsWith(protocol));
}

/**
 * Get navigate function for use outside React components
 * Note: This should only be used in cases where hooks can't be used
 *
 * @deprecated Use useNavigateTo hook in React components
 */
export function createNavigateTo(router: ReturnType<typeof useRouter>): NavigateTo {
	return (path: string, options: NavigateOptions = {}) => {
		if (!path || path === null || path === undefined) {
			path = "/";
		}

		path = String(path).trim();

		if (isSpecialProtocol(path)) {
			window.location.href = path;
			return;
		}

		if (isExternalUrl(path)) {
			window.open(path, "_blank", "noopener,noreferrer");
			return;
		}

		if (!path.startsWith("/")) {
			path = `/${path}`;
		}

		if (options.replace) {
			router.replace(path);
		} else {
			if (options.scroll === false) {
				router.push(path, { scroll: false });
			} else {
				router.push(path);
			}
		}
	};
}
