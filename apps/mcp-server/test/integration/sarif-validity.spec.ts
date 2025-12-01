import { describe, expect, it } from "vitest";
import { addResult, createSarifLog } from "../../src/utils/sarif";

describe("SARIF Validity", () => {
	it("mcp-001: should create valid SARIF log with correct version", () => {
		const sarifLog = createSarifLog("test-tool", "1.0.0");

		// Verify SARIF version
		expect(sarifLog.version).toBe("2.1.0");

		// Verify schema URL
		expect(sarifLog.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");

		// Verify runs array exists
		expect(sarifLog.runs).toBeDefined();
		expect(Array.isArray(sarifLog.runs)).toBe(true);
		expect(sarifLog.runs.length).toBe(1);

		// Verify tool information
		const run = sarifLog.runs[0];
		expect(run.tool.driver.name).toBe("test-tool");
		expect(run.tool.driver.version).toBe("1.0.0");
	});

	it("mcp-002: should add results to SARIF log with ruleId", () => {
		const sarifLog = createSarifLog("test-tool", "1.0.0");

		// Add a result
		addResult(sarifLog, "test-rule-001", "This is a test result", "/path/to/file.js", {
			startLine: 10,
			endLine: 15,
			startColumn: 5,
			endColumn: 20,
		});

		// Verify result was added
		const run = sarifLog.runs[0];
		expect(run.results).toBeDefined();
		expect(Array.isArray(run.results)).toBe(true);
		expect(run.results.length).toBe(1);

		// Verify result properties
		const result = run.results[0];
		expect(result.ruleId).toBe("test-rule-001");
		expect(result.message.text).toBe("This is a test result");

		// Verify location information
		expect(result.locations).toBeDefined();
		expect(Array.isArray(result.locations)).toBe(true);
		expect(result.locations.length).toBe(1);

		const location = result.locations[0];
		expect(location.physicalLocation).toBeDefined();
		expect(location.physicalLocation.artifactLocation.uri).toBe("/path/to/file.js");

		const region = location.physicalLocation.region;
		expect(region.startLine).toBe(10);
		expect(region.endLine).toBe(15);
		expect(region.startColumn).toBe(5);
		expect(region.endColumn).toBe(20);
	});

	it("mcp-003: should handle multiple results in SARIF log", () => {
		const sarifLog = createSarifLog("test-tool", "1.0.0");

		// Add multiple results
		addResult(sarifLog, "rule-001", "First result");
		addResult(sarifLog, "rule-002", "Second result");
		addResult(sarifLog, "rule-003", "Third result");

		// Verify all results were added
		const run = sarifLog.runs[0];
		expect(run.results.length).toBe(3);

		// Verify each result has a ruleId
		expect(run.results[0].ruleId).toBe("rule-001");
		expect(run.results[1].ruleId).toBe("rule-002");
		expect(run.results[2].ruleId).toBe("rule-003");

		// Verify each result has a message
		expect(run.results[0].message.text).toBe("First result");
		expect(run.results[1].message.text).toBe("Second result");
		expect(run.results[2].message.text).toBe("Third result");
	});

	it("mcp-004: should create valid SARIF without location information", () => {
		const sarifLog = createSarifLog("test-tool", "1.0.0");

		// Add a result without location
		addResult(sarifLog, "test-rule", "Result without location");

		// Verify result was added
		const run = sarifLog.runs[0];
		const result = run.results[0];

		// Verify basic properties
		expect(result.ruleId).toBe("test-rule");
		expect(result.message.text).toBe("Result without location");

		// Verify no location when not provided
		expect(result.locations).toBeUndefined();
	});

	it("mcp-005: should convert SARIF log to valid JSON", () => {
		const sarifLog = createSarifLog("test-tool", "1.0.0");

		// Add some results
		addResult(sarifLog, "rule-001", "Test result");

		// Convert to JSON
		const jsonString = JSON.stringify(sarifLog, null, 2);

		// Parse back to verify it's valid JSON
		const parsed = JSON.parse(jsonString);

		// Verify structure is preserved
		expect(parsed.version).toBe("2.1.0");
		expect(parsed.runs.length).toBe(1);
		expect(parsed.runs[0].tool.driver.name).toBe("test-tool");
		expect(parsed.runs[0].results.length).toBe(1);
		expect(parsed.runs[0].results[0].ruleId).toBe("rule-001");
	});
});
