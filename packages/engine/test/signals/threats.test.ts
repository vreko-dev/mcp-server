/**
 * Threats Signal Tests
 *
 * Tests for threats.ts script that detects security threat patterns.
 * SOURCE: packages/core/src/threat-detection.ts
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { detectThreats, THREAT_PATTERNS } from "../../src/signals/threats.js";

const THREATS_SCRIPT = "src/signals/threats.ts";

// ============================================================================
// Direct Import Tests (for coverage)
// ============================================================================

describe("detectThreats (direct import)", () => {
	describe("Happy Path", () => {
		it("should return empty array for clean code", () => {
			const threats = detectThreats("const x = 1; function add(a, b) { return a + b; }");
			expect(threats).toEqual([]);
		});

		it("should detect critical threat: rm -rf", () => {
			const threats = detectThreats("rm -rf /production");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats[0].description).toBe("rm -rf");
			expect(threats[0].severity).toBe(1.0);
		});

		it("should detect critical threat: DROP TABLE", () => {
			const threats = detectThreats("DROP TABLE users;");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats[0].description).toBe("DROP TABLE");
		});

		it("should detect critical threat: eval()", () => {
			const threats = detectThreats("eval(userInput)");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats[0].description).toBe("eval() usage");
		});
	});

	describe("Sad Path", () => {
		it("should detect high severity: hardcoded password", () => {
			const threats = detectThreats('const password = "secret123"');
			expect(threats.length).toBeGreaterThan(0);
			expect(threats.some((t) => t.description === "hardcoded password")).toBe(true);
		});

		it("should detect high severity: exposed API key", () => {
			const threats = detectThreats('const apiKey = "sk-1234567890"');
			expect(threats.length).toBeGreaterThan(0);
			expect(threats.some((t) => t.description === "exposed API key")).toBe(true);
		});

		it("should detect medium severity: exec() usage", () => {
			const threats = detectThreats("exec(command)");
			expect(threats.length).toBeGreaterThan(0);
			expect(threats.some((t) => t.description === "exec() usage")).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty string", () => {
			const threats = detectThreats("");
			expect(threats).toEqual([]);
		});

		it("should detect multiple threats in same content", () => {
			const threats = detectThreats('rm -rf /; password = "secret"; eval(x)');
			expect(threats.length).toBeGreaterThanOrEqual(3);
		});

		it("should be case-insensitive for patterns", () => {
			const threats = detectThreats("RM -RF / and DROP table Users");
			expect(threats.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Error Path", () => {
		it("should handle content with special characters", () => {
			const threats = detectThreats("const x = /regex.*pattern/g;");
			expect(Array.isArray(threats)).toBe(true);
		});
	});
});

describe("THREAT_PATTERNS export", () => {
	it("should export critical patterns", () => {
		expect(THREAT_PATTERNS.critical).toBeDefined();
		expect(THREAT_PATTERNS.critical.length).toBeGreaterThan(0);
	});

	it("should export high patterns", () => {
		expect(THREAT_PATTERNS.high).toBeDefined();
		expect(THREAT_PATTERNS.high.length).toBeGreaterThan(0);
	});

	it("should export medium patterns", () => {
		expect(THREAT_PATTERNS.medium).toBeDefined();
		expect(THREAT_PATTERNS.medium.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Subprocess Tests (original integration tests)

describe("Threats Signal Script", () => {
	describe("JSON output contract", () => {
		it("should output valid JSON with signal schema", () => {
			const input = {
				files: [{ path: "test.ts", content: "const x = 1;" }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result).toHaveProperty("signal", "threats");
			expect(result).toHaveProperty("value");
			expect(typeof result.value).toBe("number");
			expect(result).toHaveProperty("metadata");
		});

		it("should include threat count in metadata", () => {
			const input = {
				files: [{ path: "test.ts", content: "const x = 1;" }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata).toHaveProperty("threatCount");
			expect(typeof result.metadata.threatCount).toBe("number");
		});
	});

	describe("critical threat detection", () => {
		it("should detect rm -rf commands", () => {
			const input = {
				files: [{ path: "cleanup.sh", content: "rm -rf /production" }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.value).toBeGreaterThan(5);
			expect(result.metadata.threatCount).toBeGreaterThan(0);
			expect(result.metadata.patterns).toContain("rm -rf");
		});

		it("should detect DROP TABLE statements", () => {
			const input = {
				files: [{ path: "migration.sql", content: "DROP TABLE users;" }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.value).toBeGreaterThan(5);
			expect(result.metadata.patterns).toContain("DROP TABLE");
		});
	});

	describe("high severity threat detection", () => {
		it("should detect hardcoded passwords", () => {
			const input = {
				files: [{ path: "config.ts", content: 'const password = "secret123"' }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.threatCount).toBeGreaterThan(0);
			expect(result.metadata.patterns).toContain("hardcoded password");
		});

		it("should detect exposed API keys", () => {
			const input = {
				files: [{ path: "config.ts", content: 'const apiKey = "sk-1234567890"' }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.threatCount).toBeGreaterThan(0);
			expect(result.metadata.patterns).toContain("exposed API key");
		});
	});

	describe("edge cases", () => {
		it("should handle clean files with no threats", () => {
			const input = {
				files: [{ path: "clean.ts", content: "function add(a, b) { return a + b; }" }],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("threats");
			expect(result.value).toBe(0);
			expect(result.metadata.threatCount).toBe(0);
			expect(result.metadata.severity).toBe("none");
		});

		it("should handle empty files list", () => {
			const output = execSync(`echo '{"files":[]}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.signal).toBe("threats");
			expect(result.value).toBe(0);
		});

		it("should handle multiple files with mixed threats", () => {
			const input = {
				files: [
					{ path: "clean.ts", content: "const x = 1;" },
					{ path: "dangerous.sh", content: "rm -rf /tmp" },
					{ path: "config.ts", content: 'password = "secret"' },
				],
			};

			const output = execSync(`echo '${JSON.stringify(input)}' | npx tsx ${THREATS_SCRIPT}`, {
				encoding: "utf-8",
			});

			const result = JSON.parse(output);
			expect(result.metadata.threatCount).toBeGreaterThanOrEqual(2);
		});
	});

	describe("error handling", () => {
		it("should output valid JSON for invalid input", () => {
			try {
				execSync(`echo 'invalid json' | npx tsx ${THREATS_SCRIPT}`, {
					encoding: "utf-8",
				});
			} catch (error: any) {
				const output = error.stdout || error.stderr;
				expect(() => JSON.parse(output)).not.toThrow();
			}
		});
	});
});
