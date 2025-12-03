/**
 * AI Presence Detector - Detects presence of AI coding assistants
 *
 * This module provides platform-agnostic utilities for detecting the presence
 * of AI coding assistants like GitHub Copilot, Claude, and other popular tools.
 *
 * The detector uses dependency injection to work across different platforms:
 * - VSCode: Uses vscode.extensions API
 * - CLI: Can check process list or config files
 * - Web: Can check browser extensions or API integrations
 *
 * @module AIPresenceDetector
 */

import type { AIPresenceInfo } from "../session/SessionTagger.js";

/**
 * Known AI assistant extension/tool IDs
 *
 * Maps friendly names to their platform-specific identifiers.
 * For VSCode, these are extension IDs. For other platforms, these
 * could be process names, package names, or other identifiers.
 */
export const AI_EXTENSION_IDS = {
	GITHUB_COPILOT: "github.copilot",
	GITHUB_COPILOT_CHAT: "github.copilot-chat",
	CLAUDE: "claude.claude",
	TABNINE: "tabnine.tabnine-vscode",
	CODEIUM: "codeium.codeium",
	AMAZON_Q: "amazonwebservices.aws-toolkit-vscode",
	CONTINUE: "continue.continue",
	BLACKBOX: "blackboxapp.blackbox",
	WINDSURF: "windsurf.windsurf",
} as const;

/**
 * Type for AI assistant names
 */
export type AIAssistantName = keyof typeof AI_EXTENSION_IDS;

/**
 * Interface for extension/tool providers
 *
 * Different platforms implement this interface to provide their
 * specific method of listing installed extensions/tools.
 */
export interface IExtensionProvider {
	/**
	 * Returns a list of all installed extension/tool IDs
	 *
	 * @returns Array of extension/tool identifiers
	 */
	getAllExtensionIds(): string[];
}

/**
 * Human-readable names for AI assistants
 */
const ASSISTANT_DISPLAY_NAMES: Record<AIAssistantName, string> = {
	GITHUB_COPILOT: "GitHub Copilot",
	GITHUB_COPILOT_CHAT: "GitHub Copilot Chat",
	CLAUDE: "Claude",
	TABNINE: "Tabnine",
	CODEIUM: "Codeium",
	AMAZON_Q: "Amazon Q",
	CONTINUE: "Continue",
	BLACKBOX: "Blackbox",
	WINDSURF: "Windsurf",
};

/**
 * AIPresenceDetector - Platform-agnostic AI assistant detection
 *
 * Detects the presence of AI coding assistants across different platforms
 * using dependency injection for platform-specific extension/tool listing.
 *
 * @example
 * ```typescript
 * // VSCode example
 * const vscodeProvider: IExtensionProvider = {
 *   getAllExtensionIds: () => vscode.extensions.all.map(ext => ext.id)
 * };
 * const detector = new AIPresenceDetector(vscodeProvider);
 * const presence = detector.detectAIPresence();
 * // { hasAI: true, detectedAssistants: ['GITHUB_COPILOT'], ... }
 * ```
 */
export class AIPresenceDetector {
	private extensionProvider: IExtensionProvider;

	/**
	 * Creates a new AIPresenceDetector
	 *
	 * @param extensionProvider - Platform-specific extension provider
	 */
	constructor(extensionProvider: IExtensionProvider) {
		this.extensionProvider = extensionProvider;
	}

	/**
	 * Detects the presence of AI coding assistants
	 *
	 * Queries the extension provider and matches against known AI assistant
	 * identifiers to determine which assistants are currently installed.
	 *
	 * @returns Information about detected AI assistants
	 */
	detectAIPresence(): AIPresenceInfo {
		const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
		const detectedAssistants: string[] = [];

		// Check each known AI assistant
		for (const [name, id] of Object.entries(AI_EXTENSION_IDS)) {
			if (installedExtensionIds.includes(id)) {
				// Only add if not already in the list (handles duplicates)
				if (!detectedAssistants.includes(name)) {
					detectedAssistants.push(name);
				}
			}
		}

		return {
			hasAI: detectedAssistants.length > 0,
			detectedAssistants,
			assistantDetails: ASSISTANT_DISPLAY_NAMES,
		};
	}

	/**
	 * Checks if a specific AI assistant is installed
	 *
	 * @param assistantName - Name of the AI assistant to check
	 * @returns True if the assistant is installed
	 */
	isAIAssistantInstalled(assistantName: AIAssistantName): boolean {
		const extensionId = AI_EXTENSION_IDS[assistantName];
		const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
		return installedExtensionIds.includes(extensionId);
	}

	/**
	 * Gets a list of all installed AI assistants
	 *
	 * @returns Array of installed AI assistant names
	 */
	getInstalledAIAssistants(): AIAssistantName[] {
		const installedExtensionIds = this.extensionProvider.getAllExtensionIds();
		const installed: AIAssistantName[] = [];

		for (const [name, id] of Object.entries(AI_EXTENSION_IDS)) {
			if (installedExtensionIds.includes(id)) {
				installed.push(name as AIAssistantName);
			}
		}

		return installed;
	}
}
