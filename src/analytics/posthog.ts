/**
 * PostHog Server Analytics for MCP Server
 *
 * Lightweight PostHog client for server-side analytics.
 * Reports capability cache metrics and system events.
 *
 * @packageDocumentation
 */

import type { PostHog } from "posthog-node";

// Lazy-loaded PostHog client
let posthogClient: PostHog | null = null;
let initialized = false;

// Simple logger (matches existing pattern in index.ts)
const logger = {
	info: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL !== "silent") {
			console.log(`[INFO] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
	warn: (msg: string, context?: Record<string, unknown>) => {
		console.warn(`[WARN] ${msg}`, context ? JSON.stringify(context) : "");
	},
	error: (msg: string, context?: Record<string, unknown>) => {
		console.error(`[ERROR] ${msg}`, context ? JSON.stringify(context) : "");
	},
	debug: (msg: string, context?: Record<string, unknown>) => {
		if (process.env.LOG_LEVEL === "debug") {
			console.log(`[DEBUG] ${msg}`, context ? JSON.stringify(context) : "");
		}
	},
};

/**
 * Initialize PostHog client (lazy, call once on first use)
 */
export async function initializePostHog(): Promise<void> {
	if (initialized) {
		return;
	}

	const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
	const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

	if (!apiKey) {
		logger.warn("PostHog not configured - MCP analytics disabled");
		initialized = true;
		return;
	}

	try {
		// Dynamic import to avoid bundling if not used
		const { PostHog } = await import("posthog-node");

		posthogClient = new PostHog(apiKey, {
			host,
			flushAt: 10, // Flush after 10 events (lower for MCP server)
			flushInterval: 30000, // Flush every 30 seconds
		});

		initialized = true;
		logger.info("PostHog MCP analytics initialized", { host });
	} catch (error) {
		logger.error("Failed to initialize PostHog", { error: String(error) });
		initialized = true; // Mark as initialized to avoid retry loops
	}
}

/**
 * Get PostHog client (may be null if not configured)
 */
export function getPostHogClient(): PostHog | null {
	return posthogClient;
}

/**
 * Capture analytics event
 *
 * @param distinctId - User/workspace identifier
 * @param event - Event name
 * @param properties - Event properties
 */
export async function captureEvent(
	distinctId: string,
	event: string,
	properties?: Record<string, unknown>,
): Promise<void> {
	// Ensure initialized
	if (!initialized) {
		await initializePostHog();
	}

	if (!posthogClient) {
		logger.debug("PostHog not configured, skipping event", { event });
		return;
	}

	try {
		posthogClient.capture({
			distinctId,
			event,
			properties: {
				...properties,
				$lib: "mcp-server",
				mcp_version: process.env.MCP_VERSION || "2.0.0",
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		logger.error("Failed to capture PostHog event", { error: String(error), event });
	}
}

/**
 * Shutdown PostHog client (flush pending events)
 */
export async function shutdownPostHog(): Promise<void> {
	if (posthogClient) {
		try {
			await posthogClient.shutdown();
			logger.info("PostHog client shut down");
		} catch (error) {
			logger.error("Failed to shutdown PostHog", { error: String(error) });
		}
	}
}
