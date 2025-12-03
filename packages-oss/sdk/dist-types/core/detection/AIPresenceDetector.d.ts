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
export declare const AI_EXTENSION_IDS: {
	readonly GITHUB_COPILOT: "github.copilot";
	readonly GITHUB_COPILOT_CHAT: "github.copilot-chat";
	readonly CLAUDE: "claude.claude";
	readonly TABNINE: "tabnine.tabnine-vscode";
	readonly CODEIUM: "codeium.codeium";
	readonly AMAZON_Q: "amazonwebservices.aws-toolkit-vscode";
	readonly CONTINUE: "continue.continue";
	readonly BLACKBOX: "blackboxapp.blackbox";
	readonly WINDSURF: "windsurf.windsurf";
};
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
export declare class AIPresenceDetector {
	private extensionProvider;
	/**
	 * Creates a new AIPresenceDetector
	 *
	 * @param extensionProvider - Platform-specific extension provider
	 */
	constructor(extensionProvider: IExtensionProvider);
	/**
	 * Detects the presence of AI coding assistants
	 *
	 * Queries the extension provider and matches against known AI assistant
	 * identifiers to determine which assistants are currently installed.
	 *
	 * @returns Information about detected AI assistants
	 */
	detectAIPresence(): AIPresenceInfo;
	/**
	 * Checks if a specific AI assistant is installed
	 *
	 * @param assistantName - Name of the AI assistant to check
	 * @returns True if the assistant is installed
	 */
	isAIAssistantInstalled(assistantName: AIAssistantName): boolean;
	/**
	 * Gets a list of all installed AI assistants
	 *
	 * @returns Array of installed AI assistant names
	 */
	getInstalledAIAssistants(): AIAssistantName[];
}
//# sourceMappingURL=AIPresenceDetector.d.ts.map
