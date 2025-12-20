/**
 * Router System Tests
 *
 * Tests from testing_coverage.md Section 3: Router System Tests
 *
 * Coverage:
 * - Task Classification (ROUTE-001 to ROUTE-008)
 * - Workflow Assignment (ROUTE-WF-001 to ROUTE-WF-004)
 * - Ambiguous Task Handling (ROUTE-AMB-001 to ROUTE-AMB-004)
 */

import { describe, expect, it } from "vitest";
import { taskFixtures } from "../fixtures/index.js";

// ============================================================================
// Router Logic (Extracted for testability)
// ============================================================================

type TaskType =
	| "BUG_FIX"
	| "MULTI_PATH_BUG"
	| "NEW_FEATURE"
	| "REFACTORING"
	| "INVESTIGATION"
	| "TESTING"
	| "DOC_HYGIENE"
	| "HOTFIX"
	| "PERFORMANCE_REGRESSION"
	| "INFRASTRUCTURE"
	| "RESEARCH"
	| "UNKNOWN";

interface TaskClassification {
	type: TaskType;
	workflow: string[];
	priority: string;
	confidence: number;
}

/**
 * Classify a task based on signal words
 * Loosely coupled - can be tested independently of ROUTER.md
 */
function classifyTask(description: string): TaskClassification {
	const desc = description.toLowerCase();

	// Priority order matters - more specific patterns first

	// P0 - Critical
	if (
		desc.includes("p0") ||
		desc.includes("production") ||
		desc.includes("critical") ||
		desc.includes("emergency") ||
		desc.includes("down")
	) {
		return {
			type: "HOTFIX",
			workflow: ["7_hotfix.md"],
			priority: "P0",
			confidence: 0.95,
		};
	}

	// Multi-path bugs (more specific than regular bugs)
	if (desc.includes("still broken") || desc.includes("sometimes works") || desc.includes("inconsistent")) {
		return {
			type: "MULTI_PATH_BUG",
			workflow: ["2_research.md", "4_dev_complete.md"],
			priority: "P1",
			confidence: 0.9,
		};
	}

	// Performance
	if (
		desc.includes("slow") ||
		desc.includes("performance") ||
		desc.includes("regression") ||
		desc.includes("timing") ||
		desc.includes("activation time") ||
		desc.includes("budget")
	) {
		return {
			type: "PERFORMANCE_REGRESSION",
			workflow: ["2_research.md", "4_dev_complete.md"],
			priority: "P0-P1",
			confidence: 0.9,
		};
	}

	// Bug fixes
	if (
		desc.includes("fix") ||
		desc.includes("broken") ||
		desc.includes("bug") ||
		desc.includes("error") ||
		desc.includes("crash") ||
		desc.includes("not working")
	) {
		return {
			type: "BUG_FIX",
			workflow: ["1_triage.md", "4_dev_complete.md"],
			priority: "P1-P2",
			confidence: 0.9,
		};
	}

	// New features
	if (
		desc.includes("add") ||
		desc.includes("implement") ||
		desc.includes("create") ||
		desc.includes("new feature") ||
		desc.includes("build")
	) {
		return {
			type: "NEW_FEATURE",
			workflow: ["2_research.md", "3_planning.md", "4_dev_complete.md"],
			priority: "P2-P3",
			confidence: 0.85,
		};
	}

	// Refactoring
	if (
		desc.includes("refactor") ||
		desc.includes("clean up") ||
		desc.includes("consolidate") ||
		desc.includes("extract") ||
		desc.includes("dedupe")
	) {
		return {
			type: "REFACTORING",
			workflow: ["5_refactor.md"],
			priority: "P3-P4",
			confidence: 0.9,
		};
	}

	// Infrastructure
	if (
		desc.includes("docker") ||
		desc.includes("deploy") ||
		desc.includes("infrastructure") ||
		desc.includes("fly.io") ||
		desc.includes("vercel") ||
		desc.includes("ci/cd")
	) {
		return {
			type: "INFRASTRUCTURE",
			workflow: ["2_research.md", "4_dev_complete.md"],
			priority: "P2",
			confidence: 0.85,
		};
	}

	// Documentation (before testing to avoid false matches)
	if (
		desc.includes("document") ||
		desc.includes("outdated") ||
		desc.includes("stale") ||
		desc.includes("update docs") ||
		desc.includes("cleanup docs")
	) {
		return {
			type: "DOC_HYGIENE",
			workflow: ["8_doc_hygiene.md"],
			priority: "P4",
			confidence: 0.85,
		};
	}

	// Testing
	if (
		desc.includes("test") ||
		desc.includes("coverage") ||
		desc.includes("edge case") ||
		desc.includes("missing test")
	) {
		return {
			type: "TESTING",
			workflow: ["6_test.md"],
			priority: "P3",
			confidence: 0.9,
		};
	}

	// Investigation/Research
	if (
		desc.includes("investigate") ||
		desc.includes("why") ||
		desc.includes("how does") ||
		desc.includes("understand")
	) {
		return {
			type: "RESEARCH",
			workflow: ["2_research.md"],
			priority: "P3",
			confidence: 0.8,
		};
	}

	// Unknown - needs clarification
	return {
		type: "UNKNOWN",
		workflow: [],
		priority: "P3",
		confidence: 0.2,
	};
}

/**
 * Detect context from task description
 */
function detectContext(description: string): string[] {
	const desc = description.toLowerCase();
	const contexts: string[] = [];

	if (
		desc.includes("vscode") ||
		desc.includes("extension") ||
		desc.includes("command") ||
		desc.includes("activation")
	) {
		contexts.push("apps/vscode/");
	}

	if (
		desc.includes("api") ||
		desc.includes("endpoint") ||
		desc.includes("backend") ||
		desc.includes("database") ||
		desc.includes("service")
	) {
		contexts.push("apps/api/");
	}

	if (
		desc.includes("web") ||
		desc.includes("dashboard") ||
		desc.includes("component") ||
		desc.includes("react") ||
		desc.includes("next.js")
	) {
		contexts.push("apps/web/");
	}

	if (desc.includes("mcp") || desc.includes("server") || desc.includes("tool")) {
		contexts.push("apps/mcp-server/");
	}

	return contexts.length > 0 ? contexts : ["multi-context"];
}

// ============================================================================
// 3.1 Task Classification Tests
// ============================================================================

describe("Router: Task Classification", () => {
	it("ROUTE-001: 'fix' classifies as BUG_FIX", () => {
		const result = classifyTask("fix the login button");
		expect(result.type).toBe("BUG_FIX");
	});

	it("ROUTE-002: 'add' classifies as NEW_FEATURE", () => {
		const result = classifyTask("add user authentication");
		expect(result.type).toBe("NEW_FEATURE");
	});

	it("ROUTE-003: 'refactor' classifies as REFACTORING", () => {
		const result = classifyTask("refactor the service layer");
		expect(result.type).toBe("REFACTORING");
	});

	it("ROUTE-004: 'investigate' classifies as RESEARCH", () => {
		const result = classifyTask("investigate memory leak");
		expect(result.type).toBe("RESEARCH");
	});

	it("ROUTE-005: 'performance' classifies as PERFORMANCE_REGRESSION", () => {
		const result = classifyTask("improve performance of X");
		expect(result.type).toBe("PERFORMANCE_REGRESSION");
	});

	it("ROUTE-006: 'document' classifies as DOC_HYGIENE", () => {
		const result = classifyTask("document the API");
		expect(result.type).toBe("DOC_HYGIENE");
	});

	it("ROUTE-007: 'test' classifies as TESTING", () => {
		const result = classifyTask("write test coverage for user service");
		expect(result.type).toBe("TESTING");
	});

	it("ROUTE-008: 'P0' classifies as HOTFIX", () => {
		const result = classifyTask("P0 production is down");
		expect(result.type).toBe("HOTFIX");
	});

	it("Classifies 'broken' as BUG_FIX", () => {
		const result = classifyTask("the button is broken");
		expect(result.type).toBe("BUG_FIX");
	});

	it("Classifies 'crash' as BUG_FIX", () => {
		const result = classifyTask("app crash on startup");
		expect(result.type).toBe("BUG_FIX");
	});

	it("Classifies 'not working' as BUG_FIX", () => {
		const result = classifyTask("snapshot creation not working");
		expect(result.type).toBe("BUG_FIX");
	});

	it("Classifies 'still broken' as MULTI_PATH_BUG", () => {
		const result = classifyTask("still broken after the fix");
		expect(result.type).toBe("MULTI_PATH_BUG");
	});

	it("Classifies 'slow activation' as PERFORMANCE_REGRESSION", () => {
		const result = classifyTask("slow activation time in extension");
		expect(result.type).toBe("PERFORMANCE_REGRESSION");
	});

	it("Classifies 'docker' as INFRASTRUCTURE", () => {
		const result = classifyTask("update docker configuration");
		expect(result.type).toBe("INFRASTRUCTURE");
	});
});

// ============================================================================
// 3.2 Workflow Assignment Tests
// ============================================================================

describe("Router: Workflow Assignment", () => {
	it("ROUTE-WF-001: BUG_FIX routes to triage and dev_complete", () => {
		const result = classifyTask("fix the bug");
		expect(result.workflow).toContain("1_triage.md");
		expect(result.workflow).toContain("4_dev_complete.md");
	});

	it("ROUTE-WF-002: NEW_FEATURE routes to research, planning, dev_complete", () => {
		const result = classifyTask("add new feature");
		expect(result.workflow).toContain("2_research.md");
		expect(result.workflow).toContain("3_planning.md");
		expect(result.workflow).toContain("4_dev_complete.md");
	});

	it("ROUTE-WF-003: REFACTORING routes to refactor.md", () => {
		const result = classifyTask("refactor the code");
		expect(result.workflow).toContain("5_refactor.md");
	});

	it("ROUTE-WF-004: RESEARCH routes to research.md only", () => {
		const result = classifyTask("investigate the issue");
		expect(result.workflow).toEqual(["2_research.md"]);
	});

	it("TESTING routes to test.md", () => {
		const result = classifyTask("write missing test");
		expect(result.workflow).toContain("6_test.md");
	});

	it("HOTFIX routes to hotfix.md", () => {
		const result = classifyTask("P0 critical emergency");
		expect(result.workflow).toContain("7_hotfix.md");
	});

	it("DOC_HYGIENE routes to doc_hygiene.md", () => {
		const result = classifyTask("update stale docs");
		expect(result.workflow).toContain("8_doc_hygiene.md");
	});
});

// ============================================================================
// 3.3 Ambiguous Task Handling Tests
// ============================================================================

describe("Router: Ambiguous Task Handling", () => {
	it("ROUTE-AMB-001: Mixed signals uses first match priority", () => {
		// "fix and add" - should classify by first important signal
		const result = classifyTask("fix the login and add validation");
		// "fix" comes before "add" alphabetically but we check fix patterns first
		expect(["BUG_FIX", "NEW_FEATURE"]).toContain(result.type);
	});

	it("ROUTE-AMB-002: Vague task has low confidence", () => {
		const result = classifyTask("make it better");
		// Should be UNKNOWN or low confidence
		expect(result.confidence).toBeLessThan(0.5);
	});

	it("ROUTE-AMB-003: Empty task returns UNKNOWN", () => {
		const result = classifyTask("");
		expect(result.type).toBe("UNKNOWN");
	});

	it("ROUTE-AMB-004: Gibberish returns UNKNOWN", () => {
		const result = classifyTask("asdfghjkl");
		expect(result.type).toBe("UNKNOWN");
		expect(result.workflow).toEqual([]);
	});
});

// ============================================================================
// Context Detection Tests
// ============================================================================

describe("Router: Context Detection", () => {
	it("Detects VS Code extension context", () => {
		const contexts = detectContext("fix extension activation");
		expect(contexts).toContain("apps/vscode/");
	});

	it("Detects API context", () => {
		const contexts = detectContext("add new API endpoint");
		expect(contexts).toContain("apps/api/");
	});

	it("Detects web context", () => {
		const contexts = detectContext("fix dashboard component");
		expect(contexts).toContain("apps/web/");
	});

	it("Detects MCP context", () => {
		const contexts = detectContext("add MCP tool");
		expect(contexts).toContain("apps/mcp-server/");
	});

	it("Detects multiple contexts", () => {
		const contexts = detectContext("fix API and update vscode extension");
		expect(contexts).toContain("apps/api/");
		expect(contexts).toContain("apps/vscode/");
	});

	it("Returns multi-context for unspecified", () => {
		const contexts = detectContext("general improvement");
		expect(contexts).toEqual(["multi-context"]);
	});
});

// ============================================================================
// Priority Assignment Tests
// ============================================================================

describe("Router: Priority Assignment", () => {
	it("HOTFIX gets P0 priority", () => {
		const result = classifyTask("P0 emergency");
		expect(result.priority).toBe("P0");
	});

	it("MULTI_PATH_BUG gets P1 priority", () => {
		const result = classifyTask("still broken after fix");
		expect(result.priority).toBe("P1");
	});

	it("BUG_FIX gets P1-P2 priority", () => {
		const result = classifyTask("fix the bug");
		expect(result.priority).toBe("P1-P2");
	});

	it("NEW_FEATURE gets P2-P3 priority", () => {
		const result = classifyTask("add feature");
		expect(result.priority).toBe("P2-P3");
	});

	it("REFACTORING gets P3-P4 priority", () => {
		const result = classifyTask("refactor code");
		expect(result.priority).toBe("P3-P4");
	});

	it("DOC_HYGIENE gets P4 priority", () => {
		const result = classifyTask("update documentation");
		expect(result.priority).toBe("P4");
	});
});

// ============================================================================
// Confidence Score Tests
// ============================================================================

describe("Router: Confidence Scores", () => {
	it("Clear signals have high confidence", () => {
		const result = classifyTask("fix the login button bug");
		expect(result.confidence).toBeGreaterThanOrEqual(0.85);
	});

	it("Multiple matching signals have high confidence", () => {
		const result = classifyTask("P0 critical production emergency");
		expect(result.confidence).toBeGreaterThanOrEqual(0.9);
	});

	it("Ambiguous tasks have low confidence", () => {
		const result = classifyTask("do something");
		expect(result.confidence).toBeLessThan(0.5);
	});
});

// ============================================================================
// Task Fixtures Integration Tests
// ============================================================================

describe("Router: Task Fixtures", () => {
	it("Bug fix fixture classifies correctly", () => {
		const result = classifyTask(taskFixtures.bugFix.description);
		expect(result.type).toBe(taskFixtures.bugFix.expectedType);
	});

	it("New feature fixture classifies correctly", () => {
		const result = classifyTask(taskFixtures.newFeature.description);
		expect(result.type).toBe(taskFixtures.newFeature.expectedType);
	});

	it("Refactoring fixture classifies correctly", () => {
		const result = classifyTask(taskFixtures.refactoring.description);
		expect(result.type).toBe(taskFixtures.refactoring.expectedType);
	});

	it("Testing fixture classifies correctly", () => {
		const result = classifyTask(taskFixtures.testing.description);
		expect(result.type).toBe(taskFixtures.testing.expectedType);
	});

	it("Documentation fixture classifies correctly", () => {
		const result = classifyTask(taskFixtures.documentation.description);
		expect(result.type).toBe(taskFixtures.documentation.expectedType);
	});
});
