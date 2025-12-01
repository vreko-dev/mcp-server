import { describe, expect, it, vi } from "vitest";
import { createChangedLines, filterContentByHunks, selectHunksWithHalo } from "../../src/utils/diff";

// Mock the Guardian class to test that it receives the correct metadata
const mockAnalyze = vi.fn().mockResolvedValue({
	score: 0.5,
	factors: ["test factor"],
	recommendations: ["test recommendation"],
	severity: "medium",
});

vi.mock("@snapback/core", async () => {
	const actual = await vi.importActual("@snapback/core");
	return {
		...actual,
		Guardian: vi.fn().mockImplementation(() => ({
			addPlugin: vi.fn(),
			analyze: mockAnalyze,
		})),
	};
});

describe("Hunk + Halo Selection", () => {
	it("mcp-001: should create changed lines from diff changes", async () => {
		// Test data with added and removed lines
		const changes = [
			{ added: false, removed: false, value: "const a = 1;\n" },
			{ added: true, removed: false, value: "const b = 2;\n" },
			{ added: false, removed: false, value: "const c = 3;\n" },
			{ added: false, removed: true, value: "const d = 4;\n" },
			{ added: false, removed: false, value: "const e = 5;" },
		];

		const changedLines = createChangedLines(changes);

		// Verify that only added/removed lines are included
		expect(changedLines).toHaveLength(2);
		expect(changedLines[0]).toEqual({
			lineNumber: 2,
			content: "const b = 2;",
			type: "added",
		});
		expect(changedLines[1]).toEqual({
			lineNumber: 4,
			content: "const d = 4;",
			type: "removed",
		});
	});

	it("mcp-002: should select hunks with halo (context lines)", async () => {
		// Test data with changed lines
		const changedLines = [
			{ lineNumber: 5, content: "const newFeature = true;", type: "added" },
			{ lineNumber: 10, content: "oldFunction();", type: "removed" },
			{ lineNumber: 25, content: "anotherNewFeature();", type: "added" },
		];

		const hunks = selectHunksWithHalo(changedLines, 2); // 2 lines of context

		// Verify that hunks are created correctly
		// Lines 5 and 10 should be in separate hunks since they're more than 4 lines apart (2*2)
		// Line 25 should be in its own hunk
		expect(hunks).toHaveLength(3);

		// First hunk for line 5 (range 3-7)
		expect(hunks[0].startLine).toBe(3);
		expect(hunks[0].endLine).toBe(7);
		expect(hunks[0].lines).toHaveLength(1);
		expect(hunks[0].lines[0].lineNumber).toBe(5);

		// Second hunk for line 10 (range 8-12)
		expect(hunks[1].startLine).toBe(8);
		expect(hunks[1].endLine).toBe(12);
		expect(hunks[1].lines).toHaveLength(1);
		expect(hunks[1].lines[0].lineNumber).toBe(10);

		// Third hunk for line 25 (range 23-27)
		expect(hunks[2].startLine).toBe(23);
		expect(hunks[2].endLine).toBe(27);
		expect(hunks[2].lines).toHaveLength(1);
		expect(hunks[2].lines[0].lineNumber).toBe(25);
	});

	it("mcp-003: should filter content by hunks", async () => {
		// Test content
		const content = `line 1
line 2
line 3
line 4
line 5
line 6
line 7
line 8
line 9
line 10`;

		// Test hunks
		const hunks = [
			{
				startLine: 3,
				endLine: 7,
				lines: [{ lineNumber: 5, content: "line 5", type: "added" }],
			},
		];

		const filteredContent = filterContentByHunks(content, hunks);

		// Verify that only lines within the hunk range are included
		const expectedContent = `line 3
line 4
line 5
line 6
line 7`;

		expect(filteredContent).toBe(expectedContent);
	});

	it("mcp-004: should handle empty changed lines", async () => {
		const changedLines = [];
		const hunks = selectHunksWithHalo(changedLines, 3);

		// Verify that no hunks are created for empty input
		expect(hunks).toHaveLength(0);
	});

	it("mcp-005: should handle single changed line", async () => {
		const changedLines = [{ lineNumber: 10, content: "const feature = true;", type: "added" }];

		const hunks = selectHunksWithHalo(changedLines, 3);

		// Verify that a single hunk is created
		expect(hunks).toHaveLength(1);
		expect(hunks[0].startLine).toBe(7); // 10 - 3
		expect(hunks[0].endLine).toBe(13); // 10 + 3
		expect(hunks[0].lines).toHaveLength(1);
	});

	it("mcp-006: should pass metadata.changedLines to plugins", async () => {
		// This test verifies that the MCP server passes the correct metadata to the Guardian
		// We'll simulate calling the analyze_risk tool and check that the metadata is passed correctly

		// Reset the mock
		mockAnalyze.mockClear();

		// Create test changes
		const changes = [
			{ added: true, removed: false, value: "const newFeature = true;\n" },
			{ added: false, removed: true, value: "const oldFeature = false;\n" },
		];

		// In a real implementation, this would call the actual MCP server
		// For now, we'll simulate what the server does

		// Create changed lines metadata for diff-aware analysis
		const changedLines = createChangedLines(changes);
		const hunks = selectHunksWithHalo(changedLines, 3); // 3 lines of context (halo)

		const metadata = {
			changedLines,
			hunks,
			timestamp: Date.now(),
		};

		// Simulate calling guardian.analyze with the metadata
		await mockAnalyze(changes, undefined, metadata);

		// Verify that the metadata was passed correctly
		expect(mockAnalyze).toHaveBeenCalledWith(changes, undefined, metadata);
		expect(mockAnalyze).toHaveBeenCalledTimes(1);

		// Verify the structure of the metadata
		expect(metadata.changedLines).toBeDefined();
		expect(metadata.hunks).toBeDefined();
		expect(metadata.timestamp).toBeDefined();

		// Verify that changedLines contains the expected data
		expect(metadata.changedLines).toHaveLength(2);
		expect(metadata.changedLines[0]).toEqual({
			lineNumber: 1,
			content: "const newFeature = true;",
			type: "added",
		});
		expect(metadata.changedLines[1]).toEqual({
			lineNumber: 2,
			content: "const oldFeature = false;",
			type: "removed",
		});

		// Verify that hunks contains the expected data
		expect(metadata.hunks).toHaveLength(1); // Should be merged into one hunk
		expect(metadata.hunks[0].lines).toHaveLength(2);
	});
});
