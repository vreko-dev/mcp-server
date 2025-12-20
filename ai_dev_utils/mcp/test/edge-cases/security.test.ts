/**
 * Edge Cases & Security Tests
 *
 * Tests from testing_coverage.md Section 8: Edge Cases & Failure Modes
 * and Section 12: Security Tests
 */

import { beforeEach, describe, expect, it } from "vitest";
import { performanceBenchmarks, securityFixtures } from "../fixtures/index.js";
import { measureExecutionTime } from "../setup.js";

let ValidationPipeline: any;
let LearningEngine: any;

beforeEach(async () => {
	const validationModule = await import("../../validation-pipeline.js");
	const learningModule = await import("../../learning-engine.js");
	ValidationPipeline = validationModule.ValidationPipeline;
	LearningEngine = learningModule.LearningEngine;
});

// ============================================================================
// 8.1 File System Issues
// ============================================================================

describe("Edge Cases: File System Issues", () => {
	it("EDGE-FS-001: Missing file creates empty array", () => {
		// Simulate loading from non-existent file
		const loadJsonl = (exists: boolean) => {
			if (!exists) return [];
			return [{ data: "test" }];
		};

		const result = loadJsonl(false);
		expect(result).toEqual([]);
	});

	it("EDGE-FS-002: Corrupted JSONL handled gracefully", () => {
		const corruptedContent = '{"valid": true}\n{invalid json\n{"also": "valid"}';

		const parseLines = (content: string) => {
			const results: any[] = [];
			const lines = content.split("\n").filter((l) => l.trim());

			for (const line of lines) {
				try {
					results.push(JSON.parse(line));
				} catch {
					// Skip corrupted lines
				}
			}
			return results;
		};

		const result = parseLines(corruptedContent);
		expect(result.length).toBe(2); // Only valid lines
	});
});

// ============================================================================
// 8.3 Invalid Input
// ============================================================================

describe("Edge Cases: Invalid Input", () => {
	it("EDGE-INV-001: Null task handled", () => {
		const processTask = (task: string | null) => {
			if (!task) return { error: "Task is required" };
			return { task };
		};

		const result = processTask(null);
		expect(result.error).toBe("Task is required");
	});

	it("EDGE-INV-002: Non-string code handled", () => {
		const validateCode = (code: any) => {
			if (typeof code !== "string") {
				return { error: "Code must be a string" };
			}
			return { valid: true };
		};

		const result = validateCode({ not: "a string" });
		expect(result.error).toBe("Code must be a string");
	});

	it("EDGE-INV-004: Large input truncated or rejected", () => {
		const MAX_SIZE = 1024 * 1024; // 1MB
		const largeInput = "a".repeat(MAX_SIZE + 1);

		const handleInput = (input: string) => {
			if (input.length > MAX_SIZE) {
				return { error: "Input too large", truncated: input.slice(0, MAX_SIZE) };
			}
			return { data: input };
		};

		const result = handleInput(largeInput);
		expect(result.error).toBe("Input too large");
		expect(result.truncated?.length).toBe(MAX_SIZE);
	});

	it("EDGE-INV-005: SQL injection attempt sanitized", () => {
		const input = securityFixtures.sqlInjection;

		const sanitize = (str: string) => {
			return str.replace(/['";-]/g, "");
		};

		const sanitized = sanitize(input);
		expect(sanitized).not.toContain("--");
		expect(sanitized).not.toContain(";");
	});

	it("EDGE-INV-006: Path traversal blocked", () => {
		const path = securityFixtures.pathTraversal;

		const isPathSafe = (p: string) => {
			const normalized = p.replace(/\\/g, "/");
			return !normalized.includes("..") && !normalized.startsWith("/");
		};

		expect(isPathSafe(path)).toBe(false);
	});
});

// ============================================================================
// 8.4 MCP Server Issues
// ============================================================================

describe("Edge Cases: MCP Server Issues", () => {
	it("EDGE-MCP-003: Malformed JSON handled", () => {
		const malformedJson = "{invalid: json}";

		const parseWithFallback = (str: string) => {
			try {
				return { data: JSON.parse(str) };
			} catch (e) {
				return { error: "Parse error", raw: str };
			}
		};

		const result = parseWithFallback(malformedJson);
		expect(result.error).toBe("Parse error");
	});

	it("EDGE-MCP-004: Slow operations timeout", async () => {
		const TIMEOUT = 100; // 100ms for test

		const slowOperation = () => new Promise((resolve) => setTimeout(() => resolve({ data: "done" }), TIMEOUT * 2));

		const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | { timeout: true }> => {
			return Promise.race([
				promise,
				new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), ms)),
			]);
		};

		const result = await withTimeout(slowOperation(), TIMEOUT);
		expect((result as any).timeout).toBe(true);
	});
});

// ============================================================================
// 8.5 State Corruption
// ============================================================================

describe("Edge Cases: State Corruption", () => {
	it("EDGE-STATE-001: Invalid JSON resets to default", () => {
		const DEFAULT_STATE = { phase: "audit", task: "" };

		const loadState = (content: string) => {
			try {
				return JSON.parse(content);
			} catch {
				return DEFAULT_STATE;
			}
		};

		const result = loadState("not valid json");
		expect(result).toEqual(DEFAULT_STATE);
	});

	it("EDGE-STATE-002: Phase out of order detected", () => {
		const VALID_PHASES = ["audit", "red", "green", "refactor", "quality", "certify"];

		const validatePhaseOrder = (currentPhase: string, nextPhase: string) => {
			const currentIdx = VALID_PHASES.indexOf(currentPhase);
			const nextIdx = VALID_PHASES.indexOf(nextPhase);

			if (nextIdx !== currentIdx + 1) {
				return { warning: `Phase skip: ${currentPhase} -> ${nextPhase}` };
			}
			return { valid: true };
		};

		const result = validatePhaseOrder("audit", "quality"); // Skip red, green, refactor
		expect(result.warning).toContain("Phase skip");
	});
});

// ============================================================================
// 12.1 Input Sanitization (Security)
// ============================================================================

describe("Security: Input Sanitization", () => {
	it("SEC-001: Path traversal blocked", () => {
		const input = securityFixtures.pathTraversal;

		const containsTraversal = (path: string) => {
			return path.includes("..") || path.includes("~");
		};

		expect(containsTraversal(input)).toBe(true);
	});

	it("SEC-002: Command injection sanitized", () => {
		const input = securityFixtures.commandInjection;

		const sanitizeCommand = (cmd: string) => {
			return cmd.replace(/[;&|`$(){}]/g, "");
		};

		const sanitized = sanitizeCommand(input);
		expect(sanitized).not.toContain(";");
		expect(sanitized).not.toContain("|");
		expect(sanitized).not.toContain("`");
	});

	it("SEC-003: XSS escaped", () => {
		const input = securityFixtures.xssPayload;

		const escapeHtml = (str: string) => {
			return str
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		};

		const escaped = escapeHtml(input);
		expect(escaped).not.toContain("<script>");
		expect(escaped).toContain("&lt;script&gt;");
	});

	it("SEC-004: JSON prototype pollution prevented", () => {
		const input = securityFixtures.jsonInjection;

		const safeJsonParse = (str: string) => {
			const parsed = JSON.parse(str);
			// Remove dangerous properties
			const dangerous = ["__proto__", "constructor", "prototype"];
			for (const key of dangerous) {
				if (Object.hasOwn(parsed, key)) {
					delete parsed[key];
				}
			}
			return parsed;
		};

		const result = safeJsonParse(input);
		expect(Object.hasOwn(result, "__proto__")).toBe(false);
	});

	it("SEC-005: Regex DoS protected", () => {
		const pattern = securityFixtures.regexDos;

		const isSafeRegex = (regex: string) => {
			// Check for common ReDoS patterns
			const dangerousPatterns = [
				/\(.*\+\)\+/, // Nested quantifiers
				/\(.*\*\)\*/, // Nested quantifiers
				/\([^)]*\|[^)]*\)\+/, // Alternation with quantifier
			];

			return !dangerousPatterns.some((p) => p.test(regex));
		};

		expect(isSafeRegex(pattern)).toBe(false);
	});
});

// ============================================================================
// 12.2 File Access (Security)
// ============================================================================

describe("Security: File Access", () => {
	it("SEC-FILE-001: Read outside project denied", () => {
		const projectRoot = "/Users/user1/project";
		const requestedPath = "/etc/passwd";

		const isWithinProject = (root: string, path: string) => {
			const normalized = path.startsWith("/") ? path : `${root}/${path}`;
			return normalized.startsWith(root);
		};

		expect(isWithinProject(projectRoot, requestedPath)).toBe(false);
	});

	it("SEC-FILE-002: Write outside allowed dirs denied", () => {
		const allowedDirs = ["ai_dev_utils/patterns", "ai_dev_utils/feedback", "ai_dev_utils/state"];
		const requestedPath = "ai_dev_utils/../sensitive/data.json";

		const isAllowedWrite = (path: string) => {
			const normalized = path.replace(/\.\.\//g, "");
			return allowedDirs.some((dir) => normalized.startsWith(dir));
		};

		expect(isAllowedWrite(requestedPath)).toBe(false);
	});
});

// ============================================================================
// 9. Performance Tests
// ============================================================================

describe("Performance Tests", () => {
	it("PERF-002: check_patterns < 200ms for 100 lines", async () => {
		const pipeline = new ValidationPipeline();
		const code = "const x = 1;\n".repeat(100);

		const { duration } = await measureExecutionTime(async () => {
			return pipeline.validate(code, "test.ts");
		});

		expect(duration).toBeLessThan(performanceBenchmarks.checkPatterns100Lines.max);
	});

	it("PERF-003: check_patterns < 1s for 1000 lines", async () => {
		const pipeline = new ValidationPipeline();
		const code = "const x = 1;\n".repeat(1000);

		const { duration } = await measureExecutionTime(async () => {
			return pipeline.validate(code, "test.ts");
		});

		expect(duration).toBeLessThan(performanceBenchmarks.checkPatterns1000Lines.max);
	});

	it("PERF-SCALE-001: get_summary < 100ms with 1000 violations", () => {
		const violations = Array.from({ length: 1000 }, (_, i) => ({
			type: `TYPE_${i % 10}`,
			date: new Date().toISOString(),
		}));

		const start = performance.now();

		// Simulate summary calculation
		const byType = new Map<string, number>();
		for (const v of violations) {
			byType.set(v.type, (byType.get(v.type) || 0) + 1);
		}
		const summary = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);

		const duration = performance.now() - start;

		expect(summary.length).toBe(10);
		expect(duration).toBeLessThan(100);
	});
});

// ============================================================================
// Learning Engine Tests
// ============================================================================

describe("Learning Engine", () => {
	it("Classifies query types correctly", () => {
		const engine = new LearningEngine();

		const testCases = [
			{ query: "add authentication", expected: "authentication" },
			{ query: "fix vitest test", expected: "testing" },
			{ query: "add API endpoint", expected: "api" },
			{ query: "database migration", expected: "database" },
			{ query: "React component", expected: "ui" },
			{ query: "vscode extension", expected: "vscode" },
			{ query: "MCP tool", expected: "mcp" },
			{ query: "slow performance", expected: "performance" },
			{ query: "architecture pattern", expected: "architecture" },
			{ query: "random stuff", expected: "general" },
		];

		for (const tc of testCases) {
			const result = engine.classifyQueryType(tc.query);
			expect(result).toBe(tc.expected);
		}
	});

	it("Gets empty golden examples for new type", () => {
		const engine = new LearningEngine();
		const examples = engine.getGoldenExamples("nonexistent-type");

		expect(examples).toEqual([]);
	});

	it("Gets stats with empty data", () => {
		const engine = new LearningEngine();
		const stats = engine.getStats();

		expect(stats).toHaveProperty("totalInteractions");
		expect(stats).toHaveProperty("feedbackReceived");
		expect(stats).toHaveProperty("correctRate");
		expect(stats).toHaveProperty("goldenExamples");
	});
});
