"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * IDE Context data structure for detecting VS Code or other IDE context
 * Based on /apps/onboarding/implementation.md specs
 */
export interface IdeContext {
	/** Whether an IDE is currently detected */
	isDetected: boolean;
	/** The detected IDE name (vscode, cursor, windsurf, etc.) */
	ide: string | null;
	/** IDE version if available */
	version: string | null;
	/** Workspace name if available */
	workspace: string | null;
	/** Extension version if available */
	extensionVersion: string | null;
	/** Whether the user came from an extension entry point */
	isExtensionEntry: boolean;
	/** Extension ID from magic link URL if present */
	extensionId: string | null;
	/** Timestamp of last IDE activity */
	lastSeen: number | null;
}

const IDE_CONTEXT_KEY = "snapback_ide_context";
const IDE_ACTIVITY_KEY = "snapback_ide_active";
const EXTENSION_ID_PARAM = "extension_id";
const IDE_CONTEXT_PARAM = "ide_context";

/**
 * Lightweight IDE detection using localStorage flags
 * Per implementation.md: "localStorage flag - lightweight, no extension-to-browser bridge needed"
 */
export function useIdeContext(): IdeContext {
	const [ideContext, setIdeContext] = useState<IdeContext>({
		isDetected: false,
		ide: null,
		version: null,
		workspace: null,
		extensionVersion: null,
		isExtensionEntry: false,
		extensionId: null,
		lastSeen: null,
	});

	const detectIdeContext = useCallback(() => {
		if (typeof window === "undefined") {
			return;
		}

		try {
			// Check URL parameters for extension_id (from magic link)
			const urlParams = new URLSearchParams(window.location.search);
			const extensionId = urlParams.get(EXTENSION_ID_PARAM);
			const ideContextParam = urlParams.get(IDE_CONTEXT_PARAM);

			// Check localStorage for IDE activity flag (set by extension)
			const ideActivityRaw = localStorage.getItem(IDE_ACTIVITY_KEY);
			const ideContextRaw = localStorage.getItem(IDE_CONTEXT_KEY);

			// Parse IDE context from localStorage (set by extension on activation)
			let storedContext: Partial<IdeContext> = {};
			if (ideContextRaw) {
				try {
					storedContext = JSON.parse(ideContextRaw);
				} catch {
					// Invalid JSON, ignore
				}
			}

			// Parse IDE context from URL parameter (encoded by extension in magic link)
			let urlContext: Partial<IdeContext> = {};
			if (ideContextParam) {
				try {
					urlContext = JSON.parse(decodeURIComponent(ideContextParam));
				} catch {
					// Invalid JSON, ignore
				}
			}

			// Check if IDE was recently active (within last 5 minutes)
			const ideActivity = ideActivityRaw ? JSON.parse(ideActivityRaw) : null;
			const isIdeActive = ideActivity && Date.now() - ideActivity.timestamp < 5 * 60 * 1000; // 5 minutes

			// Merge contexts (URL context takes precedence)
			const mergedContext = {
				...storedContext,
				...urlContext,
			};

			const isDetected = Boolean(extensionId || isIdeActive || mergedContext.ide || urlContext.ide);

			setIdeContext({
				isDetected,
				ide: mergedContext.ide || (isIdeActive ? ideActivity?.ide : null),
				version: mergedContext.version || null,
				workspace: mergedContext.workspace || null,
				extensionVersion: mergedContext.extensionVersion || null,
				isExtensionEntry: Boolean(extensionId),
				extensionId: extensionId || null,
				lastSeen: isIdeActive ? ideActivity?.timestamp : null,
			});
		} catch (error) {
			console.error("Failed to detect IDE context:", error);
		}
	}, []);

	// Initial detection on mount
	useEffect(() => {
		detectIdeContext();

		// Listen for storage events (extension updating context)
		const handleStorage = (event: StorageEvent) => {
			if (event.key === IDE_CONTEXT_KEY || event.key === IDE_ACTIVITY_KEY) {
				detectIdeContext();
			}
		};

		window.addEventListener("storage", handleStorage);

		// Also poll periodically to catch context changes
		const pollInterval = setInterval(detectIdeContext, 10000); // 10 seconds

		return () => {
			window.removeEventListener("storage", handleStorage);
			clearInterval(pollInterval);
		};
	}, [detectIdeContext]);

	return ideContext;
}

/**
 * Register IDE context from extension
 * Called by extension when it becomes active to mark presence in browser
 */
export function registerIdeContext(context: {
	ide: string;
	version?: string;
	workspace?: string;
	extensionVersion?: string;
}): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		// Store full context
		localStorage.setItem(
			IDE_CONTEXT_KEY,
			JSON.stringify({
				...context,
				timestamp: Date.now(),
			}),
		);

		// Update activity marker
		localStorage.setItem(
			IDE_ACTIVITY_KEY,
			JSON.stringify({
				ide: context.ide,
				timestamp: Date.now(),
			}),
		);
	} catch (error) {
		console.error("Failed to register IDE context:", error);
	}
}

/**
 * Clear IDE context (when extension deactivates or user logs out)
 */
export function clearIdeContext(): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		localStorage.removeItem(IDE_CONTEXT_KEY);
		localStorage.removeItem(IDE_ACTIVITY_KEY);
	} catch (error) {
		console.error("Failed to clear IDE context:", error);
	}
}

/**
 * Get human-readable IDE name for display
 */
export function getIdeName(ide: string | null): string {
	if (!ide) return "your IDE";

	const ideNames: Record<string, string> = {
		vscode: "VS Code",
		cursor: "Cursor",
		windsurf: "Windsurf",
		qoder: "Qoder",
		codium: "VSCodium",
		"code-insiders": "VS Code Insiders",
	};

	return ideNames[ide.toLowerCase()] || ide;
}
