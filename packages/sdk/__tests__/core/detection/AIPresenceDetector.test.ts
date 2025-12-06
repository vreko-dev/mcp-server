/**
 * Tests for AI Presence Detector
 *
 * This test suite validates the platform-agnostic AI presence detection
 * functionality that detects AI coding assistants across different environments.
 */

import { describe, expect, it } from "vitest";
import type { IExtensionProvider } from "../../../src/core/detection/AIPresenceDetector";
import { AIPresenceDetector } from "../../../src/core/detection/AIPresenceDetector";

describe("AIPresenceDetector", () => {
	describe("Constructor and initialization", () => {
		it("should create detector with no extensions", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => [],
			};

			const detector = new AIPresenceDetector(mockProvider);
			expect(detector).toBeDefined();
		});

		it("should create detector with extension provider", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot", "some.other.extension"],
			};

			const detector = new AIPresenceDetector(mockProvider);
			expect(detector).toBeDefined();
		});
	});

	describe("AI presence detection", () => {
		it("should detect no AI when no extensions installed", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => [],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(false);
			expect(result.detectedAssistants).toEqual([]);
		});

		it("should detect GitHub Copilot", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot", "some.other.extension"],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(true);
			expect(result.detectedAssistants).toContain("GITHUB_COPILOT");
			expect(result.assistantDetails.GITHUB_COPILOT).toBe("GitHub Copilot");
		});

		it("should detect multiple AI assistants", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => [
					"github.copilot",
					"github.copilot-chat",
					"tabnine.tabnine-vscode",
					"some.other.extension",
				],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(true);
			expect(result.detectedAssistants).toContain("GITHUB_COPILOT");
			expect(result.detectedAssistants).toContain("GITHUB_COPILOT_CHAT");
			expect(result.detectedAssistants).toContain("TABNINE");
			expect(result.detectedAssistants.length).toBe(3);
		});

		it("should detect all known AI assistants", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => [
					"github.copilot",
					"github.copilot-chat",
					"claude.claude",
					"tabnine.tabnine-vscode",
					"codeium.codeium",
					"amazonwebservices.aws-toolkit-vscode",
					"continue.continue",
					"blackboxapp.blackbox",
					"windsurf.windsurf",
				],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(true);
			expect(result.detectedAssistants.length).toBe(9);
			expect(result.detectedAssistants).toContain("GITHUB_COPILOT");
			expect(result.detectedAssistants).toContain("CLAUDE");
			expect(result.detectedAssistants).toContain("TABNINE");
			expect(result.detectedAssistants).toContain("CODEIUM");
			expect(result.detectedAssistants).toContain("AMAZON_Q");
			expect(result.detectedAssistants).toContain("CONTINUE");
			expect(result.detectedAssistants).toContain("BLACKBOX");
			expect(result.detectedAssistants).toContain("WINDSURF");
		});
	});

	describe("Specific assistant checks", () => {
		it("should check if specific assistant is installed", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot", "tabnine.tabnine-vscode"],
			};

			const detector = new AIPresenceDetector(mockProvider);

			expect(detector.isAIAssistantInstalled("GITHUB_COPILOT")).toBe(true);
			expect(detector.isAIAssistantInstalled("TABNINE")).toBe(true);
			expect(detector.isAIAssistantInstalled("CLAUDE")).toBe(false);
			expect(detector.isAIAssistantInstalled("CODEIUM")).toBe(false);
		});

		it("should return list of installed assistants", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot", "codeium.codeium", "some.other.extension"],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const installed = detector.getInstalledAIAssistants();

			expect(installed).toContain("GITHUB_COPILOT");
			expect(installed).toContain("CODEIUM");
			expect(installed).not.toContain("CLAUDE");
			expect(installed.length).toBe(2);
		});
	});

	describe("Assistant details", () => {
		it("should provide human-readable names for all assistants", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot"],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.assistantDetails.GITHUB_COPILOT).toBe("GitHub Copilot");
			expect(result.assistantDetails.GITHUB_COPILOT_CHAT).toBe("GitHub Copilot Chat");
			expect(result.assistantDetails.CLAUDE).toBe("Claude");
			expect(result.assistantDetails.TABNINE).toBe("Tabnine");
			expect(result.assistantDetails.CODEIUM).toBe("Codeium");
			expect(result.assistantDetails.AMAZON_Q).toBe("Amazon Q");
			expect(result.assistantDetails.CONTINUE).toBe("Continue");
			expect(result.assistantDetails.BLACKBOX).toBe("Blackbox");
			expect(result.assistantDetails.WINDSURF).toBe("Windsurf");
		});
	});

	describe("Edge cases", () => {
		it("should handle case-sensitive extension IDs", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["GitHub.Copilot"], // Wrong case
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(false);
			expect(result.detectedAssistants).toEqual([]);
		});

		it("should handle empty string extension IDs", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["", "github.copilot", ""],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(true);
			expect(result.detectedAssistants).toContain("GITHUB_COPILOT");
		});

		it("should handle duplicate extension IDs", () => {
			const mockProvider: IExtensionProvider = {
				getAllExtensionIds: () => ["github.copilot", "github.copilot", "github.copilot"],
			};

			const detector = new AIPresenceDetector(mockProvider);
			const result = detector.detectAIPresence();

			expect(result.hasAI).toBe(true);
			// Should only appear once despite duplicates
			expect(result.detectedAssistants.filter((a) => a === "GITHUB_COPILOT").length).toBe(1);
		});
	});
});
