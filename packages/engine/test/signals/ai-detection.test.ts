import { beforeEach, describe, expect, it } from "vitest";
import type { AIDetectionInput } from "../../src/signals/ai-detection";
import { AIDetector } from "../../src/signals/ai-detection";

describe("AIDetector", () => {
	let detector: AIDetector;

	beforeEach(() => {
		detector = new AIDetector();
	});

	describe("extension-based detection", () => {
		it("should detect GitHub Copilot extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["github.copilot"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
			expect(result.confidence).toBe(0.95);
			expect(result.method).toBe("extension");
			expect(result.indicators).toContain("GitHub Copilot extension active");
		});

		it("should detect Cursor extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["cursor.cursor"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Cursor");
			expect(result.confidence).toBe(0.95);
			expect(result.method).toBe("extension");
		});

		it("should detect Codeium extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["codeium.codeium"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Codeium");
			expect(result.confidence).toBe(0.95);
		});

		it("should detect Tabnine extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["tabnine.tabnine-vscode"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Tabnine");
		});

		it("should detect Amazon Q extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["amazonwebservices.aws-toolkit-vscode"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Amazon Q");
		});

		it("should detect Sourcegraph Cody extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["sourcegraph.cody-ai"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Sourcegraph Cody");
		});

		it("should detect JetBrains AI extension", () => {
			const input: AIDetectionInput = {
				extensionIds: ["jetbrains.jetbrains-ai"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("JetBrains AI");
		});

		it("should handle multiple extensions (first match wins)", () => {
			const input: AIDetectionInput = {
				extensionIds: ["github.copilot", "cursor.cursor"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
			expect(result.confidence).toBe(0.95);
		});

		it("should be case-insensitive for extension IDs", () => {
			const input: AIDetectionInput = {
				extensionIds: ["GITHUB.COPILOT"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
		});

		it("should return null for non-AI extensions", () => {
			const input: AIDetectionInput = {
				extensionIds: ["ms-python.python", "dbaeumer.vscode-eslint"],
			};

			const result = detector.detect(input);

			expect(result.tool).toBeNull();
			expect(result.confidence).toBe(0);
			expect(result.method).toBeNull();
		});
	});

	describe("velocity-based detection", () => {
		it("should detect high-velocity paste (instant large change)", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 500, // 500 chars/ms = 500,000 chars/sec
				charCount: 1000,
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("AI Tool (Unknown)");
			expect(result.confidence).toBeGreaterThan(0.6);
			expect(result.method).toBe("velocity");
			expect(result.indicators?.[0]).toContain("High velocity");
		});

		it("should detect moderate velocity with large character count", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 15, // 15 chars/ms = 15,000 chars/sec
				charCount: 500,
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("AI Tool (Unknown)");
			expect(result.confidence).toBeGreaterThan(0.6);
			expect(result.method).toBe("velocity");
		});

		it("should not detect low velocity typing", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 0.5, // 0.5 chars/ms = 500 chars/sec (normal typing)
				charCount: 100,
			};

			const result = detector.detect(input);

			expect(result.tool).toBeNull();
			expect(result.confidence).toBe(0);
		});

		it("should require minimum character count", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 50, // High velocity
				charCount: 10, // But too few characters
			};

			const result = detector.detect(input);

			expect(result.tool).toBeNull(); // Should not trigger
		});

		it("should scale confidence with velocity", () => {
			const lowVelocity: AIDetectionInput = {
				extensionIds: [],
				velocity: 10,
				charCount: 200,
			};

			const highVelocity: AIDetectionInput = {
				extensionIds: [],
				velocity: 100,
				charCount: 200,
			};

			const lowResult = detector.detect(lowVelocity);
			const highResult = detector.detect(highVelocity);

			expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
		});

		it("should cap velocity confidence at 0.85", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 1000, // Extremely high velocity
				charCount: 5000,
			};

			const result = detector.detect(input);

			expect(result.confidence).toBeLessThanOrEqual(0.85);
		});
	});

	describe("pattern-based detection", () => {
		it("should detect Copilot in import statement", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: 'import { CopilotClient } from "@github/copilot-sdk";',
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
			expect(result.confidence).toBe(0.6);
			expect(result.method).toBe("pattern");
			expect(result.indicators?.[0]).toContain("Pattern match");
		});

		it("should detect Claude in comment", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Generated by Claude AI\nfunction hello() {}",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Claude");
			expect(result.method).toBe("pattern");
		});

		it("should detect Cursor reference", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Edited with Cursor\nconst x = 1;",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Cursor");
		});

		it("should detect Codeium pattern", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Suggested by Codeium",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Codeium");
		});

		it("should detect Amazon CodeWhisperer", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Amazon CodeWhisperer suggestion",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Amazon Q");
		});

		it("should detect Sourcegraph Cody", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Cody AI autocomplete",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Sourcegraph Cody");
		});

		it("should be case-insensitive for patterns", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// COPILOT generated this code",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
		});

		it("should not detect patterns when disabled", () => {
			const customDetector = new AIDetector({ enablePatternMatching: false });

			const input: AIDetectionInput = {
				extensionIds: [],
				content: "// Generated by Copilot",
			};

			const result = customDetector.detect(input);

			expect(result.tool).toBeNull();
		});

		it("should return null for non-AI content", () => {
			const input: AIDetectionInput = {
				extensionIds: [],
				content: "function add(a: number, b: number) { return a + b; }",
			};

			const result = detector.detect(input);

			expect(result.tool).toBeNull();
		});
	});

	describe("combined detection", () => {
		it("should combine extension + velocity detection", () => {
			const input: AIDetectionInput = {
				extensionIds: ["github.copilot"],
				velocity: 50,
				charCount: 500,
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
			expect(result.confidence).toBeGreaterThanOrEqual(0.95); // Extension confidence or higher
			expect(result.method).toBe("combined");
			expect(result.indicators?.length).toBeGreaterThanOrEqual(2);
		});

		it("should combine extension + pattern detection", () => {
			const input: AIDetectionInput = {
				extensionIds: ["cursor.cursor"],
				content: "// Edited with Cursor AI",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("Cursor");
			expect(result.confidence).toBeGreaterThan(0.95); // Boosted confidence
			expect(result.method).toBe("combined");
		});

		it("should combine all three detection methods", () => {
			const input: AIDetectionInput = {
				extensionIds: ["github.copilot"],
				velocity: 100,
				charCount: 1000,
				content: "// Copilot suggestion",
			};

			const result = detector.detect(input);

			expect(result.tool).toBe("GitHub Copilot");
			expect(result.confidence).toBeGreaterThan(0.95);
			expect(result.method).toBe("combined");
			expect(result.indicators?.length).toBeGreaterThanOrEqual(2);
		});

		it("should cap combined confidence at 0.98", () => {
			const input: AIDetectionInput = {
				extensionIds: ["github.copilot"],
				velocity: 1000,
				charCount: 5000,
				content: "// Generated by Copilot",
			};

			const result = detector.detect(input);

			expect(result.confidence).toBeLessThanOrEqual(0.98);
		});
	});

	describe("configuration", () => {
		it("should use custom velocity threshold", () => {
			const customDetector = new AIDetector({ velocityThreshold: 50 });

			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 40, // Below custom threshold
				charCount: 200,
			};

			const result = customDetector.detect(input);

			expect(result.tool).toBeNull();
		});

		it("should use custom minimum characters", () => {
			const customDetector = new AIDetector({ minCharsForVelocity: 500 });

			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 50,
				charCount: 300, // Below custom minimum
			};

			const result = customDetector.detect(input);

			expect(result.tool).toBeNull();
		});

		it("should update velocity threshold dynamically", () => {
			detector.updateVelocityThreshold(50);

			const input: AIDetectionInput = {
				extensionIds: [],
				velocity: 40,
				charCount: 200,
			};

			const result = detector.detect(input);

			expect(result.tool).toBeNull();
		});

		it("should reject invalid threshold values", () => {
			expect(() => detector.updateVelocityThreshold(0)).toThrow("Velocity threshold must be positive");
			expect(() => detector.updateVelocityThreshold(-10)).toThrow("Velocity threshold must be positive");
		});

		it("should return current configuration", () => {
			const config = detector.getConfig();

			expect(config.velocityThreshold).toBe(10);
			expect(config.minCharsForVelocity).toBe(100);
			expect(config.enablePatternMatching).toBe(true);
		});
	});
});
