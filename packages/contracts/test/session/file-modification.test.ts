/**
 * FileModification Contract Tests
 *
 * Red-Green-Refactor: These tests define the contract behavior.
 */

import { describe, expect, it } from "vitest";
import {
	countAIAttributedModifications,
	type FileModification,
	type FileModificationInput,
	FileModificationSchema,
	filterModificationsSince,
	fromMCPFileChange,
	getTotalLinesChanged,
	getUniqueModifiedPaths,
	groupByAITool,
	type MCPFileChange,
	parseFileModification,
	toMCPFileChange,
} from "../../src/session/file-modification";

describe("FileModificationSchema", () => {
	describe("validation", () => {
		it("should accept valid modification with all fields", () => {
			const input = {
				path: "/src/index.ts",
				timestamp: 1703620800000,
				type: "update" as const,
				linesChanged: 25,
				aiAttributed: true,
				aiTool: "copilot",
				source: "extension" as const,
			};

			const result = FileModificationSchema.parse(input);

			expect(result.path).toBe("/src/index.ts");
			expect(result.timestamp).toBe(1703620800000);
			expect(result.type).toBe("update");
			expect(result.linesChanged).toBe(25);
			expect(result.aiAttributed).toBe(true);
			expect(result.aiTool).toBe("copilot");
			expect(result.source).toBe("extension");
		});

		it("should apply defaults for optional fields", () => {
			const input = {
				path: "/src/index.ts",
				timestamp: 1703620800000,
				type: "create" as const,
				source: "mcp" as const,
			};

			const result = FileModificationSchema.parse(input);

			expect(result.linesChanged).toBe(0);
			expect(result.aiAttributed).toBe(false);
			expect(result.aiTool).toBeNull();
		});

		it("should reject empty path", () => {
			const input = {
				path: "",
				timestamp: 1703620800000,
				type: "update" as const,
				source: "extension" as const,
			};

			expect(() => FileModificationSchema.parse(input)).toThrow("Path cannot be empty");
		});

		it("should reject negative timestamp", () => {
			const input = {
				path: "/src/index.ts",
				timestamp: -1,
				type: "update" as const,
				source: "extension" as const,
			};

			expect(() => FileModificationSchema.parse(input)).toThrow();
		});

		it("should reject invalid type", () => {
			const input = {
				path: "/src/index.ts",
				timestamp: 1703620800000,
				type: "modified" as const, // Wrong - should be 'update'
				source: "extension" as const,
			};

			expect(() => FileModificationSchema.parse(input)).toThrow();
		});

		it("should reject invalid source", () => {
			const input = {
				path: "/src/index.ts",
				timestamp: 1703620800000,
				type: "update" as const,
				source: "vscode" as const, // Wrong - should be 'extension'
			};

			expect(() => FileModificationSchema.parse(input)).toThrow();
		});
	});
});

describe("parseFileModification", () => {
	it("should parse valid input", () => {
		const input: FileModificationInput = {
			path: "/src/test.ts",
			timestamp: Date.now(),
			type: "create",
			source: "extension",
		};

		const result = parseFileModification(input);

		expect(result.path).toBe("/src/test.ts");
		expect(result.type).toBe("create");
		expect(result.source).toBe("extension");
	});

	it("should throw on invalid input", () => {
		const input = {
			path: "",
			timestamp: -1,
			type: "update",
			source: "extension",
		} as FileModificationInput;

		expect(() => parseFileModification(input)).toThrow();
	});
});

describe("MCP adapters", () => {
	describe("fromMCPFileChange", () => {
		it("should convert 'created' to 'create'", () => {
			const mcpChange: MCPFileChange = {
				file: "/src/new.ts",
				type: "created",
				timestamp: 1703620800000,
				aiAttributed: false,
				linesChanged: 50,
			};

			const result = fromMCPFileChange(mcpChange);

			expect(result.path).toBe("/src/new.ts");
			expect(result.type).toBe("create");
			expect(result.source).toBe("mcp");
		});

		it("should convert 'modified' to 'update'", () => {
			const mcpChange: MCPFileChange = {
				file: "/src/existing.ts",
				type: "modified",
				timestamp: 1703620800000,
				aiAttributed: true,
				linesChanged: 10,
			};

			const result = fromMCPFileChange(mcpChange);

			expect(result.type).toBe("update");
			expect(result.aiAttributed).toBe(true);
			expect(result.linesChanged).toBe(10);
		});

		it("should convert 'deleted' to 'delete'", () => {
			const mcpChange: MCPFileChange = {
				file: "/src/old.ts",
				type: "deleted",
				timestamp: 1703620800000,
				aiAttributed: false,
				linesChanged: 0,
			};

			const result = fromMCPFileChange(mcpChange);

			expect(result.type).toBe("delete");
		});
	});

	describe("toMCPFileChange", () => {
		it("should convert 'create' to 'created'", () => {
			const mod: FileModification = {
				path: "/src/new.ts",
				timestamp: 1703620800000,
				type: "create",
				linesChanged: 50,
				aiAttributed: true,
				aiTool: "cursor",
				source: "extension",
			};

			const result = toMCPFileChange(mod);

			expect(result.file).toBe("/src/new.ts");
			expect(result.type).toBe("created");
			expect(result.aiAttributed).toBe(true);
		});

		it("should convert 'update' to 'modified'", () => {
			const mod: FileModification = {
				path: "/src/existing.ts",
				timestamp: 1703620800000,
				type: "update",
				linesChanged: 10,
				aiAttributed: false,
				aiTool: null,
				source: "extension",
			};

			const result = toMCPFileChange(mod);

			expect(result.type).toBe("modified");
		});

		it("should convert 'delete' to 'deleted'", () => {
			const mod: FileModification = {
				path: "/src/old.ts",
				timestamp: 1703620800000,
				type: "delete",
				linesChanged: 0,
				aiAttributed: false,
				aiTool: null,
				source: "daemon",
			};

			const result = toMCPFileChange(mod);

			expect(result.type).toBe("deleted");
		});

		it("should be reversible (round-trip)", () => {
			const original: MCPFileChange = {
				file: "/src/test.ts",
				type: "modified",
				timestamp: 1703620800000,
				aiAttributed: true,
				linesChanged: 25,
			};

			const canonical = fromMCPFileChange(original);
			const roundTrip = toMCPFileChange(canonical);

			expect(roundTrip.file).toBe(original.file);
			expect(roundTrip.type).toBe(original.type);
			expect(roundTrip.timestamp).toBe(original.timestamp);
			expect(roundTrip.aiAttributed).toBe(original.aiAttributed);
			expect(roundTrip.linesChanged).toBe(original.linesChanged);
		});
	});
});

describe("utility functions", () => {
	const testMods: FileModification[] = [
		{
			path: "/src/a.ts",
			timestamp: 1000,
			type: "update",
			linesChanged: 10,
			aiAttributed: true,
			aiTool: "copilot",
			source: "extension",
		},
		{
			path: "/src/b.ts",
			timestamp: 2000,
			type: "create",
			linesChanged: 50,
			aiAttributed: false,
			aiTool: null,
			source: "extension",
		},
		{
			path: "/src/a.ts", // Same file, different modification
			timestamp: 3000,
			type: "update",
			linesChanged: 5,
			aiAttributed: true,
			aiTool: "cursor",
			source: "extension",
		},
		{
			path: "/src/c.ts",
			timestamp: 4000,
			type: "delete",
			linesChanged: 0,
			aiAttributed: false,
			aiTool: null,
			source: "mcp",
		},
	];

	describe("filterModificationsSince", () => {
		it("should return modifications >= timestamp", () => {
			const result = filterModificationsSince(testMods, 2000);

			expect(result).toHaveLength(3);
			expect(result[0].path).toBe("/src/b.ts");
			expect(result[1].path).toBe("/src/a.ts");
			expect(result[2].path).toBe("/src/c.ts");
		});

		it("should return empty for future timestamp", () => {
			const result = filterModificationsSince(testMods, 9999);

			expect(result).toHaveLength(0);
		});

		it("should return all for timestamp 0", () => {
			const result = filterModificationsSince(testMods, 0);

			expect(result).toHaveLength(4);
		});
	});

	describe("getUniqueModifiedPaths", () => {
		it("should return unique paths", () => {
			const result = getUniqueModifiedPaths(testMods);

			expect(result).toHaveLength(3);
			expect(result).toContain("/src/a.ts");
			expect(result).toContain("/src/b.ts");
			expect(result).toContain("/src/c.ts");
		});

		it("should return empty for empty input", () => {
			const result = getUniqueModifiedPaths([]);

			expect(result).toHaveLength(0);
		});
	});

	describe("countAIAttributedModifications", () => {
		it("should count AI-attributed modifications", () => {
			const result = countAIAttributedModifications(testMods);

			expect(result).toBe(2); // a.ts (first) and a.ts (second)
		});

		it("should return 0 for no AI modifications", () => {
			const noAI: FileModification[] = [
				{
					path: "/src/x.ts",
					timestamp: 1000,
					type: "update",
					linesChanged: 10,
					aiAttributed: false,
					aiTool: null,
					source: "extension",
				},
			];

			const result = countAIAttributedModifications(noAI);

			expect(result).toBe(0);
		});
	});

	describe("getTotalLinesChanged", () => {
		it("should sum all lines changed", () => {
			const result = getTotalLinesChanged(testMods);

			expect(result).toBe(65); // 10 + 50 + 5 + 0
		});

		it("should return 0 for empty input", () => {
			const result = getTotalLinesChanged([]);

			expect(result).toBe(0);
		});
	});

	describe("groupByAITool", () => {
		it("should group modifications by AI tool", () => {
			const result = groupByAITool(testMods);

			expect(result.size).toBe(3); // copilot, cursor, null

			expect(result.get("copilot")).toHaveLength(1);
			expect(result.get("cursor")).toHaveLength(1);
			expect(result.get(null)).toHaveLength(2);
		});

		it("should handle all null AI tools", () => {
			const noAI: FileModification[] = [
				{
					path: "/src/x.ts",
					timestamp: 1000,
					type: "update",
					linesChanged: 10,
					aiAttributed: false,
					aiTool: null,
					source: "extension",
				},
			];

			const result = groupByAITool(noAI);

			expect(result.size).toBe(1);
			expect(result.get(null)).toHaveLength(1);
		});
	});
});
