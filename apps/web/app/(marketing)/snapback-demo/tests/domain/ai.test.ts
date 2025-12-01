import { describe, expect, it } from "vitest";
import { getAiSuggestions } from "../../domain/ai.js";

describe("AI Domain Functions", () => {
	describe("getAiSuggestions", () => {
		it("should return no suggestions for safe content", () => {
			const context = {
				content: "const x = 1;\nconsole.log(x);",
				filePath: "src/utils/helpers.ts",
				protectionLevel: "watch" as const,
			};

			const suggestions = getAiSuggestions(context);

			expect(suggestions).toHaveLength(0);
		});

		it("should detect destructive commands and suggest checkpoint", () => {
			const context = {
				content: "const x = 1;\nconsole.log(x);\nrm -rf /",
				filePath: "scripts/cleanup.sh",
				protectionLevel: "watch" as const,
			};

			const suggestions = getAiSuggestions(context);

			expect(suggestions).toHaveLength(1);
			expect(suggestions[0].requireCheckpoint).toBe(true);
			expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.8);
		});

		it("should detect process exit and suggest review", () => {
			const context = {
				content: "process.exit(0);",
				filePath: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			const suggestions = getAiSuggestions(context);

			expect(suggestions).toHaveLength(1);
			expect(suggestions[0].requireCheckpoint).toBe(false);
			expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.5);
		});

		it("should detect credential exposure and suggest upgrade", () => {
			const context = {
				content: 'const password = "secret123";',
				filePath: "src/config/auth.js",
				protectionLevel: "watch" as const,
			};

			const suggestions = getAiSuggestions(context);

			expect(suggestions).toHaveLength(2);
			// Should have both a checkpoint suggestion and an upgrade suggestion
			const checkpointSuggestion = suggestions.find((s) => s.requireCheckpoint);
			const upgradeSuggestion = suggestions.find((s) => s.suggestLevelUpgrade);

			expect(checkpointSuggestion).toBeDefined();
			expect(upgradeSuggestion).toBeDefined();
			expect(upgradeSuggestion?.suggestLevelUpgrade).toBe("warn");
		});

		it("should detect changes between versions", () => {
			const context = {
				content: "const x = 1;\nconsole.log(x);\nprocess.exit(0);",
				previousContent: "const x = 1;\nconsole.log(x);",
				filePath: "src/index.ts",
				protectionLevel: "watch" as const,
			};

			const suggestions = getAiSuggestions(context);

			expect(suggestions).toHaveLength(1);
			expect(suggestions[0].requireCheckpoint).toBe(false);
			expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.5);
		});
	});
});
