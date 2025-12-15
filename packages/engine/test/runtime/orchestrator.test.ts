/**
 * Orchestrator Tests
 *
 * Tests the main orchestrator class that:
 * - Runs signal scripts in parallel
 * - Runs validator scripts in parallel
 * - Aggregates results into a decision
 * - Tracks session health
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventBus } from "../../src/runtime/events";
import { Orchestrator } from "../../src/runtime/orchestrator";
import type { FileChange } from "../../src/types";

// =============================================================================
// MOCKS
// =============================================================================

// Mock child_process to avoid actually spawning scripts
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
}));

import type { ChildProcess } from "node:child_process";
// Import after mocking
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a mock ChildProcess that emits success
 */
function createMockProcess(stdout: string, exitCode = 0): Partial<ChildProcess> {
	const proc = new EventEmitter() as Partial<ChildProcess>;

	proc.stdout = new EventEmitter() as any;
	proc.stderr = new EventEmitter() as any;
	proc.stdin = {
		write: vi.fn(),
		end: vi.fn(),
	} as any;

	// Emit output asynchronously
	setTimeout(() => {
		proc.stdout?.emit("data", Buffer.from(stdout));
		proc.emit("close", exitCode);
	}, 10);

	return proc;
}

/**
 * Create sample file changes for testing
 */
function createFileChanges(): FileChange[] {
	return [
		{
			path: "/workspace/src/auth.ts",
			type: "modify",
			content: 'export function login() { return "token"; }',
		},
	];
}

// =============================================================================
// TESTS
// =============================================================================

describe("Orchestrator", () => {
	let orchestrator: Orchestrator;

	beforeEach(() => {
		orchestrator = new Orchestrator();
		vi.clearAllMocks();
	});

	afterEach(() => {
		eventBus.removeAllListeners();
	});

	// -------------------------------------------------------------------------
	// INITIALIZATION TESTS
	// -------------------------------------------------------------------------

	describe("initialization", () => {
		it("initializes with healthy baseline", () => {
			const health = orchestrator.getHealth();

			expect(health.score).toBe(100);
			expect(health.warnings).toEqual([]);
			expect(health.suggestions).toEqual([]);
			expect(health.filesModified).toEqual([]);
			expect(health.cyclesIntroduced).toBe(0);
			expect(health.complexityDelta).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// SIGNAL EXECUTION TESTS
	// -------------------------------------------------------------------------

	describe("signal execution", () => {
		it("runs signal scripts in parallel", async () => {
			const mockSpawn = vi.mocked(spawn);

			// Mock successful signal outputs
			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 3.5 })) as ChildProcess;
				}

				if (scriptPath.includes("complexity")) {
					return createMockProcess(JSON.stringify({ signal: "complexity", value: 0.2 })) as ChildProcess;
				}

				if (scriptPath.includes("cycles")) {
					return createMockProcess(JSON.stringify({ signal: "cycles", value: 0 })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({})) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			// Should run all signal scripts
			const signalCalls = mockSpawn.mock.calls.filter((call) => {
				const scriptPath = call[1]?.[1] || "";
				return scriptPath.includes("signals/");
			});

			expect(signalCalls.length).toBeGreaterThan(0);

			// Should collect signal results
			expect(result.signals).toBeDefined();
			expect(result.signals.length).toBeGreaterThan(0);
		});

		it("handles signal script failures gracefully", async () => {
			const mockSpawn = vi.mocked(spawn);

			// Mock one failing signal
			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					// Failing script
					return createMockProcess("", 1) as ChildProcess;
				}

				// Other scripts succeed
				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			// Should still return a result
			expect(result.outcome).toBeDefined();

			// Should emit error event
			const errorEmitted = new Promise((resolve) => {
				eventBus.once("error.occurred", (payload) => {
					expect(payload.component).toBe("orchestrator");
					expect(payload.recoverable).toBe(true);
					resolve(true);
				});
			});

			// Trigger another analysis to emit the error
			await orchestrator.analyze(createFileChanges());
			await errorEmitted;
		});
	});

	// -------------------------------------------------------------------------
	// VALIDATOR EXECUTION TESTS
	// -------------------------------------------------------------------------

	describe("validator execution", () => {
		it("runs validator scripts in parallel", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("validators/types")) {
					return createMockProcess(JSON.stringify({ validator: "types", status: "pass" })) as ChildProcess;
				}

				if (scriptPath.includes("validators/cycles")) {
					return createMockProcess(JSON.stringify({ validator: "cycles", status: "pass" })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({})) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			// Should run all validator scripts
			const validatorCalls = mockSpawn.mock.calls.filter((call) => {
				const scriptPath = call[1]?.[1] || "";
				return scriptPath.includes("validators/");
			});

			expect(validatorCalls.length).toBeGreaterThan(0);

			// Should collect validator results
			expect(result.validators).toBeDefined();
			expect(result.validators.length).toBeGreaterThan(0);
		});

		it("emits validation.passed event for passing validators", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation(() => {
				return createMockProcess(JSON.stringify({ validator: "types", status: "pass" })) as ChildProcess;
			});

			const eventPromise = new Promise((resolve) => {
				eventBus.once("validation.passed", (payload) => {
					expect(payload.validator).toBe("types");
					// Duration is injected by runScript, should be > 0
					expect(payload.duration).toBeGreaterThanOrEqual(0);
					resolve(true);
				});
			});

			await orchestrator.analyze(createFileChanges());
			await eventPromise;
		});

		it("emits validation.failed event for failing validators", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation(() => {
				return createMockProcess(
					JSON.stringify({
						validator: "cycles",
						status: "fail",
						errors: [{ message: "Cycle detected" }],
					}),
				) as ChildProcess;
			});

			const eventPromise = new Promise((resolve) => {
				eventBus.once("validation.failed", (payload) => {
					expect(payload.validator).toBe("cycles");
					expect(payload.errorCount).toBe(1);
					// Duration is injected by runScript, should be > 0
					expect(payload.duration).toBeGreaterThanOrEqual(0);
					resolve(true);
				});
			});

			await orchestrator.analyze(createFileChanges());
			await eventPromise;
		});
	});

	// -------------------------------------------------------------------------
	// OUTCOME DETERMINATION TESTS
	// -------------------------------------------------------------------------

	describe("outcome determination", () => {
		it("returns pass when all validators pass and risk is low", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 3 })) as ChildProcess;
				}

				if (scriptPath.includes("validators/")) {
					return createMockProcess(JSON.stringify({ validator: "test", status: "pass" })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({})) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			expect(result.outcome).toBe("pass");
		});

		it("returns warn when risk score is high but validators pass", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 8.5 })) as ChildProcess;
				}

				if (scriptPath.includes("validators/")) {
					return createMockProcess(JSON.stringify({ validator: "test", status: "pass" })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({})) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			expect(result.outcome).toBe("warn");
			expect(result.riskScore).toBeGreaterThan(7);
		});

		it("returns fail when any validator fails", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 2 })) as ChildProcess;
				}

				if (scriptPath.includes("validators/types")) {
					return createMockProcess(
						JSON.stringify({
							validator: "types",
							status: "fail",
							errors: [{ message: "Type error" }],
						}),
					) as ChildProcess;
				}

				if (scriptPath.includes("validators/cycles")) {
					return createMockProcess(JSON.stringify({ validator: "cycles", status: "pass" })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({})) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			expect(result.outcome).toBe("fail");
		});
	});

	// -------------------------------------------------------------------------
	// SESSION HEALTH TESTS
	// -------------------------------------------------------------------------

	describe("session health tracking", () => {
		it("updates health when cycles are detected", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("cycles")) {
					return createMockProcess(JSON.stringify({ signal: "cycles", value: 2 })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			await orchestrator.analyze(createFileChanges());

			const health = orchestrator.getHealth();

			expect(health.cyclesIntroduced).toBe(2);
			expect(health.warnings).toContainEqual(expect.stringContaining("circular dependencies"));
			expect(health.score).toBeLessThan(100);
		});

		it("updates health when complexity increases", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("complexity")) {
					return createMockProcess(JSON.stringify({ signal: "complexity", value: 0.4 })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			await orchestrator.analyze(createFileChanges());

			const health = orchestrator.getHealth();

			expect(health.complexityDelta).toBe(0.4);
			expect(health.warnings).toContainEqual(expect.stringContaining("Complexity increased"));
			expect(health.score).toBeLessThan(100);
		});

		it("adds suggestions from failed validators", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("validators/")) {
					return createMockProcess(
						JSON.stringify({
							validator: "test",
							status: "fail",
							suggestion: "Extract shared logic to break the cycle",
						}),
					) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			await orchestrator.analyze(createFileChanges());

			const health = orchestrator.getHealth();

			expect(health.suggestions).toContainEqual(expect.stringContaining("Extract shared logic"));
		});

		it("generates coaching message based on health score", async () => {
			const mockSpawn = vi.mocked(spawn);

			// Simulate high cycles to lower health score
			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("cycles")) {
					return createMockProcess(JSON.stringify({ signal: "cycles", value: 5 })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			await orchestrator.analyze(createFileChanges());

			const health = orchestrator.getHealth();

			expect(health.score).toBeLessThan(50);
			expect(health.coaching).toContain("STOP");
			expect(health.coaching).toContain("critical");
		});

		it("limits warnings and suggestions to recent items", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation(() => {
				return createMockProcess(JSON.stringify({ signal: "cycles", value: 1 })) as ChildProcess;
			});

			// Run multiple analyses to generate many warnings
			for (let i = 0; i < 5; i++) {
				await orchestrator.analyze(createFileChanges());
			}

			const health = orchestrator.getHealth();

			// Should keep only last 3 warnings
			expect(health.warnings.length).toBeLessThanOrEqual(3);
		});
	});

	// -------------------------------------------------------------------------
	// SESSION MANAGEMENT TESTS
	// -------------------------------------------------------------------------

	describe("session management", () => {
		it("resets session health", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation(() => {
				return createMockProcess(JSON.stringify({ signal: "cycles", value: 3 })) as ChildProcess;
			});

			// Degrade health
			await orchestrator.analyze(createFileChanges());

			let health = orchestrator.getHealth();
			expect(health.score).toBeLessThan(100);

			// Reset
			orchestrator.resetSession();

			health = orchestrator.getHealth();
			expect(health.score).toBe(100);
			expect(health.warnings).toEqual([]);
			expect(health.suggestions).toEqual([]);
			expect(health.filesModified).toEqual([]);
			expect(health.cyclesIntroduced).toBe(0);
			expect(health.complexityDelta).toBe(0);
		});

		it("emits session.started event on reset", async () => {
			const eventPromise = new Promise((resolve) => {
				eventBus.once("session.started", (payload) => {
					expect(payload.sessionId).toBeDefined();
					expect(payload.sessionId).toMatch(/^session_/);
					resolve(true);
				});
			});

			orchestrator.resetSession();
			await eventPromise;
		});
	});

	// -------------------------------------------------------------------------
	// EVENT EMISSION TESTS
	// -------------------------------------------------------------------------

	describe("event emissions", () => {
		it("emits risk.analyzed event", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 4.5 })) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			const eventPromise = new Promise((resolve) => {
				eventBus.once("risk.analyzed", (payload) => {
					expect(payload.score).toBe(4.5);
					expect(payload.factorCount).toBeGreaterThanOrEqual(0);
					resolve(true);
				});
			});

			await orchestrator.analyze(createFileChanges());
			await eventPromise;
		});

		it("emits session.health_changed event on health updates", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation(() => {
				return createMockProcess(JSON.stringify({ signal: "cycles", value: 2 })) as ChildProcess;
			});

			const eventPromise = new Promise((resolve) => {
				eventBus.once("session.health_changed", (payload) => {
					expect(payload.sessionId).toBe("current");
					expect(payload.currentScore).toBeLessThan(100);
					expect(payload.trigger).toBe("analysis");
					resolve(true);
				});
			});

			await orchestrator.analyze(createFileChanges());
			await eventPromise;
		});
	});

	// -------------------------------------------------------------------------
	// INTEGRATION TESTS
	// -------------------------------------------------------------------------

	describe("end-to-end analysis", () => {
		it("completes full analysis pipeline", async () => {
			const mockSpawn = vi.mocked(spawn);

			mockSpawn.mockImplementation((_cmd, args) => {
				const scriptPath = args?.[1] || "";

				if (scriptPath.includes("risk-score")) {
					return createMockProcess(JSON.stringify({ signal: "risk-score", value: 5.5 })) as ChildProcess;
				}

				if (scriptPath.includes("complexity")) {
					return createMockProcess(JSON.stringify({ signal: "complexity", value: 0.15 })) as ChildProcess;
				}

				if (scriptPath.includes("cycles")) {
					return createMockProcess(JSON.stringify({ signal: "cycles", value: 1 })) as ChildProcess;
				}

				if (scriptPath.includes("validators/types")) {
					return createMockProcess(
						JSON.stringify({ validator: "types", status: "pass", duration: 120 }),
					) as ChildProcess;
				}

				if (scriptPath.includes("validators/cycles")) {
					return createMockProcess(
						JSON.stringify({ validator: "cycles", status: "pass", duration: 80 }),
					) as ChildProcess;
				}

				return createMockProcess(JSON.stringify({ signal: "test", value: 0 })) as ChildProcess;
			});

			const result = await orchestrator.analyze(createFileChanges());

			// Verify result structure
			expect(result.outcome).toBeDefined();
			expect(["pass", "warn", "fail"]).toContain(result.outcome);

			expect(result.signals).toBeDefined();
			expect(Array.isArray(result.signals)).toBe(true);

			expect(result.validators).toBeDefined();
			expect(Array.isArray(result.validators)).toBe(true);

			expect(result.riskScore).toBeDefined();
			expect(typeof result.riskScore).toBe("number");

			expect(result.health).toBeDefined();
			expect(result.health.score).toBeDefined();

			expect(result.duration).toBeDefined();
			expect(typeof result.duration).toBe("number");

			// Verify health was updated
			const health = orchestrator.getHealth();
			expect(health.filesModified).toContain("/workspace/src/auth.ts");
		});
	});
});
