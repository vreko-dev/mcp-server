/**
 * Critical User Journeys Integration Tests
 *
 * End-to-end tests for the most critical user workflows:
 * 1. Result Pattern Usage
 * 2. Snapshot Retry & Diagnosis
 * 3. Validation Pipeline Integration (Mocked)
 *
 * These tests verify the complete flow across the SDK packages.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Direct imports from packages-oss/sdk
import {
	andThen,
	applyAutomaticFix,
	diagnoseSnapshotFailure,
	err,
	formatDiagnosis,
	fromPromise,
	isErr,
	isOk,
	map,
	mapErr,
	match,
	ok,
	type Result,
	type SnapshotDiagnosis,
	sequence,
	tap,
	tapErr,
	tryAll,
	unwrap,
	unwrapOr,
} from "../../packages-oss/sdk/src";

// =============================================================================
// TEST SETUP
// =============================================================================

const TEST_WORKSPACE = join(process.cwd(), ".test-integration-workspace");

function setupTestWorkspace(): void {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
	mkdirSync(TEST_WORKSPACE, { recursive: true });
	mkdirSync(join(TEST_WORKSPACE, ".snapback"), { recursive: true });
	mkdirSync(join(TEST_WORKSPACE, "src"), { recursive: true });

	// Create test files
	writeFileSync(
		join(TEST_WORKSPACE, "src", "auth.ts"),
		`export function authenticate(user: string, password: string): boolean {
	return user === "admin" && password === "secret";
}
`,
	);

	writeFileSync(
		join(TEST_WORKSPACE, "src", "utils.ts"),
		`export function formatDate(date: Date): string {
	return date.toISOString();
}

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
`,
	);
}

function cleanupTestWorkspace(): void {
	if (existsSync(TEST_WORKSPACE)) {
		rmSync(TEST_WORKSPACE, { recursive: true, force: true });
	}
}

// =============================================================================
// JOURNEY 1: RESULT PATTERN USAGE
// =============================================================================

describe("Journey 1: Result Pattern Usage", () => {
	it("j1-001: should create success and error Results", () => {
		// Create success result
		const successResult = ok({ id: "123", name: "Test" });
		expect(isOk(successResult)).toBe(true);
		expect(successResult.success).toBe(true);
		if (successResult.success) {
			expect(successResult.value.id).toBe("123");
		}

		// Create error result
		const errorResult = err(new Error("Something went wrong"));
		expect(isErr(errorResult)).toBe(true);
		expect(errorResult.success).toBe(false);
		if (!errorResult.success) {
			expect(errorResult.error.message).toBe("Something went wrong");
		}
	});

	it("j1-002: should transform Results with map", () => {
		const result = ok(5);
		const doubled = map(result, (x) => x * 2);

		expect(isOk(doubled)).toBe(true);
		if (doubled.success) {
			expect(doubled.value).toBe(10);
		}

		// Map on error should pass through
		const errResult = err(new Error("fail"));
		const mappedErr = map(errResult, (x: number) => x * 2);
		expect(isErr(mappedErr)).toBe(true);
	});

	it("j1-003: should chain Results with andThen", () => {
		const getUser = (id: string) => ok({ id, name: "Alice" });
		const getProfile = (user: { id: string }) => ok({ userId: user.id, bio: "Developer" });

		// Chain operations
		const result = andThen(getUser("123"), getProfile);

		expect(isOk(result)).toBe(true);
		if (result.success) {
			expect(result.value.bio).toBe("Developer");
		}
	});

	it("j1-004: should use fromPromise to convert throwing code", async () => {
		// Success case
		const successResult = await fromPromise(Promise.resolve("hello"));
		expect(isOk(successResult)).toBe(true);
		if (successResult.success) {
			expect(successResult.value).toBe("hello");
		}

		// Error case
		const errorResult = await fromPromise(Promise.reject(new Error("failed")));
		expect(isErr(errorResult)).toBe(true);
	});

	it("j1-005: should unwrap Results with default values", () => {
		const successResult = ok(42);
		const value = unwrapOr(successResult, 0);
		expect(value).toBe(42);

		const errorResult = err(new Error("fail"));
		const defaultValue = unwrapOr(errorResult, 0);
		expect(defaultValue).toBe(0);
	});

	it("j1-006: should use tap for side effects", () => {
		let sideEffectCalled = false;

		const result = ok("test");
		tap(result, () => {
			sideEffectCalled = true;
		});

		expect(sideEffectCalled).toBe(true);
	});

	it("j1-007: should pattern match with match", () => {
		const successResult = ok({ name: "Test" }) as Result<{ name: string }, Error>;
		const message = match(successResult, {
			ok: (value) => `Success: ${value.name}`,
			err: (error) => `Error: ${error.message}`,
		});
		expect(message).toBe("Success: Test");

		const errorResult = err(new Error("Oops")) as Result<unknown, Error>;
		const errorMessage = match(errorResult, {
			ok: (value: unknown) => `Success: ${value}`,
			err: (error) => `Error: ${error.message}`,
		});
		expect(errorMessage).toBe("Error: Oops");
	});

	it("j1-008: should sequence multiple Results", () => {
		const results = [ok(1), ok(2), ok(3)] as Result<number, Error>[];
		const combined = sequence(results);

		expect(isOk(combined)).toBe(true);
		if (combined.success) {
			expect(combined.value).toEqual([1, 2, 3]);
		}

		// If any fails, the whole thing fails
		const withError = [ok(1), err(new Error("fail")), ok(3)] as Result<number, Error>[];
		const failedCombine = sequence(withError);
		expect(isErr(failedCombine)).toBe(true);
	});
});

// =============================================================================
// JOURNEY 2: SNAPSHOT RETRY & DIAGNOSIS
// =============================================================================

describe("Journey 2: Snapshot Retry & Diagnosis", () => {
	beforeEach(() => setupTestWorkspace());
	afterEach(() => cleanupTestWorkspace());

	it("j2-001: should diagnose absolute path errors", () => {
		const diagnosis = diagnoseSnapshotFailure(
			new Error("Absolute paths not allowed"),
			["/absolute/path/file.ts"],
			"/workspace",
		);

		expect(diagnosis.type).toBe("ABSOLUTE_PATH_REJECTED");
		expect(diagnosis.canAutoFix).toBe(true);
		expect(diagnosis.confidence).toBe(1.0);
		expect(diagnosis.suggestedFix).toContain("relative");
	});

	it("j2-002: should diagnose file not found errors", () => {
		const diagnosis = diagnoseSnapshotFailure(
			new Error("File not found: src/missing.ts"),
			["src/missing.ts"],
			TEST_WORKSPACE,
		);

		expect(diagnosis.type).toBe("FILE_NOT_FOUND");
		expect(diagnosis.canAutoFix).toBe(false);
		expect(diagnosis.confidence).toBeGreaterThan(0.5);
		expect(diagnosis.affectedFiles).toContain("src/missing.ts");
	});

	it("j2-003: should diagnose permission denied errors", () => {
		const diagnosis = diagnoseSnapshotFailure(
			new Error("EACCES: permission denied"),
			["protected/file.ts"],
			TEST_WORKSPACE,
		);

		expect(diagnosis.type).toBe("PERMISSION_DENIED");
		expect(diagnosis.canAutoFix).toBe(false);
	});

	it("j2-004: should diagnose workspace mismatch errors", () => {
		const diagnosis = diagnoseSnapshotFailure(
			new Error("File outside workspace"),
			["../outside/file.ts"],
			TEST_WORKSPACE,
		);

		expect(diagnosis.type).toBe("WORKSPACE_MISMATCH");
		expect(diagnosis.canAutoFix).toBe(true);
	});

	it("j2-005: should format diagnosis for display", () => {
		const diagnosis: SnapshotDiagnosis = {
			type: "FILE_NOT_FOUND",
			message: "File does not exist",
			cause: "The specified file path could not be resolved",
			suggestedFix: "Verify the file exists and path is correct",
			userAction: "Check the file path and try again",
			canAutoFix: false,
			confidence: 0.9,
			affectedFiles: ["src/missing.ts"],
		};

		const formatted = formatDiagnosis(diagnosis);

		expect(formatted).toContain("FILE_NOT_FOUND");
		expect(formatted).toContain("File does not exist");
		expect(formatted).toContain("src/missing.ts");
	});

	it("j2-006: should apply automatic fix for absolute paths", async () => {
		const diagnosis: SnapshotDiagnosis = {
			type: "ABSOLUTE_PATH_REJECTED",
			message: "Absolute paths not allowed",
			cause: "Paths must be relative to workspace",
			suggestedFix: "Convert to relative paths",
			userAction: "Use relative paths instead",
			canAutoFix: true,
			confidence: 1.0,
			affectedFiles: ["/workspace/src/file.ts"],
		};

		const context = {
			files: ["/workspace/src/file.ts"],
			workspaceRoot: "/workspace",
		};

		const fixed = await applyAutomaticFix(diagnosis, context);

		expect(fixed).toBe(true);
		// Files should be converted to relative
		expect(context.files[0]).toBe("src/file.ts");
	});
});

// =============================================================================
// JOURNEY 3: INTEGRATION VERIFICATION
// =============================================================================

describe("Journey 3: Integration Verification", () => {
	it("j3-001: should export all Result utilities from SDK", () => {
		// Verify all expected exports exist
		expect(typeof ok).toBe("function");
		expect(typeof err).toBe("function");
		expect(typeof isOk).toBe("function");
		expect(typeof isErr).toBe("function");
		expect(typeof map).toBe("function");
		expect(typeof mapErr).toBe("function");
		expect(typeof andThen).toBe("function");
		expect(typeof unwrap).toBe("function");
		expect(typeof unwrapOr).toBe("function");
		expect(typeof fromPromise).toBe("function");
		expect(typeof sequence).toBe("function");
		expect(typeof tryAll).toBe("function");
		expect(typeof tap).toBe("function");
		expect(typeof tapErr).toBe("function");
		expect(typeof match).toBe("function");
	});

	it("j3-002: should export diagnosis utilities from SDK", () => {
		expect(typeof diagnoseSnapshotFailure).toBe("function");
		expect(typeof applyAutomaticFix).toBe("function");
		expect(typeof formatDiagnosis).toBe("function");
	});

	it("j3-003: should handle complex Result chains", async () => {
		// Simulate a real workflow: fetch → validate → transform → save
		const fetchData = async (id: string): Promise<Result<{ id: string; data: string }, Error>> => {
			if (id === "invalid") {
				return err(new Error("Not found"));
			}
			return ok({ id, data: "raw data" });
		};

		const validateData = (input: { data: string }): Result<{ validated: string }, Error> => {
			if (input.data.length === 0) {
				return err(new Error("Empty data"));
			}
			return ok({ validated: input.data.toUpperCase() });
		};

		// Success path
		const result1 = await fetchData("123");
		const validated1 = isOk(result1) ? validateData(result1.value) : result1;
		expect(isOk(validated1)).toBe(true);
		if (validated1.success) {
			expect(validated1.value.validated).toBe("RAW DATA");
		}

		// Error path
		const result2 = await fetchData("invalid");
		expect(isErr(result2)).toBe(true);
	});

	it("j3-004: should collect all results from concurrent operations", async () => {
		const op1 = fromPromise(Promise.resolve(1));
		const op2 = fromPromise(Promise.resolve(2));
		const op3 = fromPromise(Promise.resolve(3));

		const results = await Promise.all([op1, op2, op3]);

		expect(results.every(isOk)).toBe(true);
		expect(results.map((r) => (r.success ? r.value : null))).toEqual([1, 2, 3]);
	});
});
