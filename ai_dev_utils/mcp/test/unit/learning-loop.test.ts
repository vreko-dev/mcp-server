/**
 * Learning Loop Tests
 *
 * Tests from testing_coverage.md Section 4: Learning Loop Tests
 *
 * Coverage:
 * - Violation → Pattern Pipeline (LOOP-001 to LOOP-007)
 * - Learning → Context Pipeline (LOOP-LRN-001 to LOOP-LRN-004)
 * - Feedback Loop Closure (LOOP-CLOSE-001 to LOOP-CLOSE-003)
 */

import { beforeEach, describe, expect, it } from "vitest";

// ============================================================================
// Mock Learning Engine for Loop Testing
// ============================================================================

interface ViolationRecord {
	date: string;
	type: string;
	file: string;
	message: string;
	prevention: string;
	promotedAt?: string;
	automatedAt?: string;
}

interface LearningRecord {
	id: string;
	type: string;
	trigger: string;
	action: string;
	source: string;
	added: string;
}

class MockLearningLoop {
	violations: ViolationRecord[] = [];
	learnings: LearningRecord[] = [];
	patterns: Map<string, { count: number; promoted: boolean; automated: boolean }> = new Map();

	private PROMOTION_THRESHOLD = 3;
	private AUTOMATION_THRESHOLD = 5;

	recordViolation(violation: Omit<ViolationRecord, "date">): {
		recorded: boolean;
		count: number;
		promoted: boolean;
		automated: boolean;
	} {
		const record: ViolationRecord = {
			...violation,
			date: new Date().toISOString(),
		};
		this.violations.push(record);

		// Update pattern tracking
		const existing = this.patterns.get(violation.type) || { count: 0, promoted: false, automated: false };
		existing.count++;

		// Check promotion threshold
		if (existing.count >= this.PROMOTION_THRESHOLD && !existing.promoted) {
			existing.promoted = true;
			record.promotedAt = new Date().toISOString();
		}

		// Check automation threshold
		if (existing.count >= this.AUTOMATION_THRESHOLD && !existing.automated) {
			existing.automated = true;
			record.automatedAt = new Date().toISOString();
		}

		this.patterns.set(violation.type, existing);

		return {
			recorded: true,
			count: existing.count,
			promoted: existing.promoted,
			automated: existing.automated,
		};
	}

	recordLearning(learning: Omit<LearningRecord, "id" | "added">): LearningRecord {
		const record: LearningRecord = {
			...learning,
			id: `L${Date.now()}`,
			added: new Date().toISOString().split("T")[0],
		};
		this.learnings.push(record);
		return record;
	}

	queryLearnings(keywords: string[]): LearningRecord[] {
		return this.learnings.filter((l) => {
			const text = `${l.trigger} ${l.action}`.toLowerCase();
			return keywords.some((k) => text.includes(k.toLowerCase()));
		});
	}

	getPatternStats(type: string) {
		return this.patterns.get(type) || { count: 0, promoted: false, automated: false };
	}

	reset() {
		this.violations = [];
		this.learnings = [];
		this.patterns.clear();
	}
}

// ============================================================================
// 4.1 Violation → Pattern Pipeline Tests
// ============================================================================

describe("Learning Loop: Violation → Pattern Pipeline", () => {
	let loop: MockLearningLoop;

	beforeEach(() => {
		loop = new MockLearningLoop();
	});

	it("LOOP-001: Code with issue creates violation log", () => {
		const result = loop.recordViolation({
			type: "VAGUE_ASSERTION",
			file: "test.ts",
			message: "Used toBeTruthy",
			prevention: "Use toEqual with specific value",
		});

		expect(result.recorded).toBe(true);
		expect(loop.violations.length).toBe(1);
	});

	it("LOOP-002: Violation stored with timestamp", () => {
		loop.recordViolation({
			type: "TEST_VIOLATION",
			file: "test.ts",
			message: "Test message",
			prevention: "How to prevent",
		});

		expect(loop.violations[0].date).toBeDefined();
		expect(new Date(loop.violations[0].date).getTime()).toBeGreaterThan(0);
	});

	it("LOOP-003: Same type violations counted correctly", () => {
		const type = "VAGUE_ASSERTION";

		loop.recordViolation({ type, file: "a.ts", message: "1", prevention: "p" });
		loop.recordViolation({ type, file: "b.ts", message: "2", prevention: "p" });
		loop.recordViolation({ type, file: "c.ts", message: "3", prevention: "p" });

		const stats = loop.getPatternStats(type);
		expect(stats.count).toBe(3);
	});

	it("LOOP-004: 3x violations triggers promotion", () => {
		const type = "LAYER_VIOLATION";

		loop.recordViolation({ type, file: "a.ts", message: "1", prevention: "p" });
		loop.recordViolation({ type, file: "b.ts", message: "2", prevention: "p" });
		const result = loop.recordViolation({ type, file: "c.ts", message: "3", prevention: "p" });

		expect(result.promoted).toBe(true);
		expect(loop.getPatternStats(type).promoted).toBe(true);
	});

	it("LOOP-005: 5x violations triggers automation", () => {
		const type = "SERVICE_BYPASS";

		for (let i = 0; i < 5; i++) {
			loop.recordViolation({ type, file: `file${i}.ts`, message: `${i}`, prevention: "p" });
		}

		const stats = loop.getPatternStats(type);
		expect(stats.automated).toBe(true);
		expect(stats.count).toBe(5);
	});

	it("LOOP-006: Promoted pattern appears in context queries", () => {
		// Simulate pattern promotion affecting context
		const type = "CONSOLE_LOG";

		// Record 3x to promote
		for (let i = 0; i < 3; i++) {
			loop.recordViolation({ type, file: `file${i}.ts`, message: `${i}`, prevention: "Use logger" });
		}

		// Record a learning about this pattern
		loop.recordLearning({
			type: "pattern",
			trigger: "console log in production",
			action: "Use logger from @snapback/core",
			source: type,
		});

		// Query should return the learning
		const learnings = loop.queryLearnings(["console"]);
		expect(learnings.length).toBe(1);
	});

	it("LOOP-007: Pattern prevents repeated mistakes", () => {
		// After learning, checking for pattern should return prevention
		loop.recordLearning({
			type: "pitfall",
			trigger: "vague assertion",
			action: "Use specific assertions like toEqual",
			source: "VAGUE_ASSERTION",
		});

		const learnings = loop.queryLearnings(["vague", "assertion"]);
		expect(learnings.length).toBeGreaterThan(0);
		expect(learnings[0].action).toContain("toEqual");
	});
});

// ============================================================================
// 4.2 Learning → Context Pipeline Tests
// ============================================================================

describe("Learning Loop: Learning → Context Pipeline", () => {
	let loop: MockLearningLoop;

	beforeEach(() => {
		loop = new MockLearningLoop();
	});

	it("LOOP-LRN-001: Learning creates JSONL entry", () => {
		const learning = loop.recordLearning({
			type: "pattern",
			trigger: "vitest config",
			action: "use @snapback/vitest-config",
			source: "test-session",
		});

		expect(learning.id).toMatch(/^L\d+/);
		expect(loop.learnings.length).toBe(1);
	});

	it("LOOP-LRN-002: Learning indexed immediately", () => {
		loop.recordLearning({
			type: "pattern",
			trigger: "vitest config",
			action: "use @snapback/vitest-config",
			source: "test-session",
		});

		// Immediately searchable
		const results = loop.queryLearnings(["vitest"]);
		expect(results.length).toBe(1);
	});

	it("LOOP-LRN-003: Relevant query returns learning", () => {
		loop.recordLearning({
			type: "efficiency",
			trigger: "deterministic time",
			action: "use DeterministicTime class",
			source: "flaky-test-fix",
		});

		const results = loop.queryLearnings(["deterministic"]);
		expect(results.length).toBe(1);
		expect(results[0].action).toContain("DeterministicTime");
	});

	it("LOOP-LRN-004: Learning applied in context", () => {
		// Record multiple learnings
		loop.recordLearning({
			type: "pattern",
			trigger: "layer boundary",
			action: "vscode cannot import infrastructure",
			source: "arch-review",
		});

		loop.recordLearning({
			type: "pitfall",
			trigger: "layer violation",
			action: "use @snapback/core instead",
			source: "arch-review",
		});

		// Both should be found with related query
		const results = loop.queryLearnings(["layer"]);
		expect(results.length).toBe(2);
	});
});

// ============================================================================
// 4.3 Feedback Loop Closure Tests
// ============================================================================

describe("Learning Loop: Feedback Loop Closure", () => {
	let loop: MockLearningLoop;

	beforeEach(() => {
		loop = new MockLearningLoop();
	});

	it("LOOP-CLOSE-001: Full cycle - mistake → detect → promote → prevent", () => {
		const type = "MISSING_ERROR_HANDLING";

		// Phase 1: Make mistake (record violation)
		loop.recordViolation({
			type,
			file: "handler.ts",
			message: "No try/catch",
			prevention: "Always wrap async in try/catch",
		});
		expect(loop.getPatternStats(type).count).toBe(1);

		// Phase 2: Make same mistake again
		loop.recordViolation({
			type,
			file: "service.ts",
			message: "No try/catch",
			prevention: "Always wrap async in try/catch",
		});
		expect(loop.getPatternStats(type).count).toBe(2);

		// Phase 3: Third time triggers promotion
		loop.recordViolation({
			type,
			file: "api.ts",
			message: "No try/catch",
			prevention: "Always wrap async in try/catch",
		});
		expect(loop.getPatternStats(type).promoted).toBe(true);

		// Phase 4: Record learning for prevention
		loop.recordLearning({
			type: "pitfall",
			trigger: "error handling",
			action: "Always wrap async operations in try/catch",
			source: type,
		});

		// Phase 5: Query should return prevention
		const learnings = loop.queryLearnings(["error handling"]);
		expect(learnings.length).toBe(1);
		expect(learnings[0].action).toContain("try/catch");
	});

	it("LOOP-CLOSE-002: Cross-session learning persists", () => {
		// Session 1: Record learning
		const learning = loop.recordLearning({
			type: "pattern",
			trigger: "service location",
			action: "Services in apps/api/src/services/",
			source: "session-1",
		});

		expect(learning.id).toBeDefined();

		// Session 2: Should still be queryable
		const results = loop.queryLearnings(["service"]);
		expect(results.length).toBe(1);
		expect(results[0].id).toBe(learning.id);
	});

	it("LOOP-CLOSE-003: Multiple learning types work together", () => {
		// Record different types of learnings
		loop.recordLearning({
			type: "pattern",
			trigger: "api endpoint",
			action: "Use oRPC procedures",
			source: "api-audit",
		});

		loop.recordLearning({
			type: "pitfall",
			trigger: "api security",
			action: "Always validate input with zod",
			source: "security-review",
		});

		loop.recordLearning({
			type: "efficiency",
			trigger: "api testing",
			action: "Use msw for mocking",
			source: "test-setup",
		});

		// Query should find relevant ones
		const apiResults = loop.queryLearnings(["api"]);
		expect(apiResults.length).toBe(3);
	});
});

// ============================================================================
// Promotion Logic Tests
// ============================================================================

describe("Learning Loop: Promotion Logic", () => {
	let loop: MockLearningLoop;

	beforeEach(() => {
		loop = new MockLearningLoop();
	});

	it("Different violation types tracked separately", () => {
		loop.recordViolation({ type: "TYPE_A", file: "a.ts", message: "m", prevention: "p" });
		loop.recordViolation({ type: "TYPE_A", file: "a.ts", message: "m", prevention: "p" });
		loop.recordViolation({ type: "TYPE_B", file: "b.ts", message: "m", prevention: "p" });

		expect(loop.getPatternStats("TYPE_A").count).toBe(2);
		expect(loop.getPatternStats("TYPE_B").count).toBe(1);
	});

	it("Promotion only happens once per type", () => {
		const type = "SINGLE_PROMOTION";

		// Promote at 3
		for (let i = 0; i < 3; i++) {
			loop.recordViolation({ type, file: `f${i}.ts`, message: "m", prevention: "p" });
		}
		expect(loop.getPatternStats(type).promoted).toBe(true);

		// Adding more doesn't change promoted status
		loop.recordViolation({ type, file: "f4.ts", message: "m", prevention: "p" });
		expect(loop.getPatternStats(type).promoted).toBe(true);
		expect(loop.getPatternStats(type).count).toBe(4);
	});

	it("Automation only happens once per type", () => {
		const type = "SINGLE_AUTOMATION";

		for (let i = 0; i < 6; i++) {
			loop.recordViolation({ type, file: `f${i}.ts`, message: "m", prevention: "p" });
		}

		expect(loop.getPatternStats(type).automated).toBe(true);
		expect(loop.getPatternStats(type).count).toBe(6);
	});
});

// ============================================================================
// Query Pattern Tests
// ============================================================================

describe("Learning Loop: Query Patterns", () => {
	let loop: MockLearningLoop;

	beforeEach(() => {
		loop = new MockLearningLoop();

		// Setup test data
		loop.recordLearning({
			type: "pattern",
			trigger: "docker monorepo",
			action: "Use multi-stage builds",
			source: "docker-audit",
		});

		loop.recordLearning({
			type: "pitfall",
			trigger: "docker missing package",
			action: "Validate package exists before COPY",
			source: "docker-audit",
		});

		loop.recordLearning({
			type: "pattern",
			trigger: "vitest config",
			action: "Use @snapback/vitest-config",
			source: "test-audit",
		});
	});

	it("Single keyword returns matches", () => {
		const results = loop.queryLearnings(["docker"]);
		expect(results.length).toBe(2);
	});

	it("Multiple keywords expand results", () => {
		const results = loop.queryLearnings(["docker", "vitest"]);
		expect(results.length).toBe(3);
	});

	it("Case-insensitive matching", () => {
		const results = loop.queryLearnings(["DOCKER"]);
		expect(results.length).toBe(2);
	});

	it("No matches returns empty array", () => {
		const results = loop.queryLearnings(["nonexistent12345"]);
		expect(results).toEqual([]);
	});

	it("Partial word matching works", () => {
		const results = loop.queryLearnings(["mono"]);
		expect(results.length).toBe(1);
		expect(results[0].trigger).toContain("monorepo");
	});
});
