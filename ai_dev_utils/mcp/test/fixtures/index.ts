/**
 * Test Fixtures - Sample data from testing_coverage.md
 *
 * Loosely coupled fixtures that can be used across all test files.
 * Based on Appendix: Test Data Fixtures from the spec.
 */

// ============================================================================
// VIOLATION FIXTURES
// ============================================================================

export const sampleViolations = {
	vagueAssertion: {
		date: "2025-12-20",
		type: "VAGUE_ASSERTION",
		file: "test.ts",
		message: "Used toBeTruthy",
		prevention: "Use toEqual with specific value",
	},
	missingServiceLocation: {
		date: "2025-12-20",
		type: "MISSING_SERVICE_LOCATION",
		file: "api.ts",
		message: "Service not in services/",
		prevention: "Check services/ first",
	},
	layerBoundary: {
		date: "2025-12-20",
		type: "LAYER_BOUNDARY_VIOLATION",
		file: "apps/vscode/src/snapshot.ts",
		message: "Extension cannot import @snapback/infrastructure",
		prevention: "Use @snapback/core instead",
	},
	consoleLog: {
		date: "2025-12-20",
		type: "NO_CONSOLE",
		file: "apps/api/src/service.ts",
		message: "Found console.log in production code",
		prevention: "Use logger from @snapback/core instead",
	},
	serviceBypass: {
		date: "2025-12-20",
		type: "SERVICE_BYPASS",
		file: "apps/api/src/procedures/user.ts",
		message: "Direct database access in procedure file",
		prevention: "Move business logic to apps/api/src/services/",
	},
};

// ============================================================================
// LEARNING FIXTURES
// ============================================================================

export const sampleLearnings = {
	vitestConfig: {
		id: "L001",
		context: "extension",
		type: "pattern",
		trigger: "vitest config",
		action: "Use @snapback/vitest-config",
		source: "test-infrastructure-consolidation",
	},
	serviceLocation: {
		id: "L002",
		context: "api",
		type: "architecture",
		trigger: "service location",
		action: "Services in apps/api/src/services/",
		source: "service-layer-audit",
	},
	deterministicTime: {
		id: "L003",
		context: "testing",
		type: "efficiency",
		trigger: "test uses Date.now()",
		action: "use DeterministicTime from test utilities",
		source: "timer-test-flakiness",
	},
};

// ============================================================================
// CODE FIXTURES
// ============================================================================

export const codeFixtures = {
	cleanCode: `
import { logger } from "@snapback/core";
import { User } from "@snapback/contracts";

export async function getUser(id: string): Promise<User | null> {
  logger.info("Fetching user", { id });
  return db.users.findById(id);
}`,

	codeWithViolations: `
import { db } from "@snapback/infrastructure"; // Layer violation!
import { logger } from "@snapback/core";

export function createSnapshot(): any { // any type!
  console.log("Creating snapshot"); // console.log!
  eval("danger()"); // eval!
  return db.query("SELECT * FROM snapshots");
}`,

	testWithVagueAssertions: `
import { describe, it, expect } from "vitest";

describe("User", () => {
  it("should exist", () => {
    const user = getUser("123");
    expect(user).toBeTruthy(); // Vague assertion!
    expect(user).toBeDefined(); // Vague assertion!
  });
});`,

	cleanTestCode: `
import { describe, it, expect } from "vitest";

describe("UserService", () => {
  it("should return user by id", async () => {
    const user = await userService.getById("123");
    expect(user).toEqual({ id: "123", name: "Test User" });
  });
  
  it("should return null for invalid id", async () => {
    const user = await userService.getById("invalid");
    expect(user).toBeNull();
  });
  
  it("should handle empty id gracefully", async () => {
    const user = await userService.getById("");
    expect(user).toBeNull();
  });
  
  it("should throw on database error", async () => {
    await expect(userService.getById("error-trigger")).rejects.toThrow();
  });
});`,

	directDbInProcedure: `
// apps/api/src/procedures/user.ts
export async function createUser(input: CreateUserInput) {
  // BAD: Direct DB access in procedure
  const user = await db.select().from(users).where(eq(users.id, input.id));
  return user;
}`,

	properServiceLayerCode: `
// apps/api/src/services/user-service.ts
export class UserService {
  async createUser(input: CreateUserInput) {
    const user = await db.select().from(users).where(eq(users.id, input.id));
    return user;
  }
}

// apps/api/src/procedures/user.ts
export async function createUser(input: CreateUserInput) {
  return userService.createUser(input);
}`,
};

// ============================================================================
// TASK FIXTURES
// ============================================================================

export const taskFixtures = {
	bugFix: {
		description: "fix the login button",
		expectedType: "BUG_FIX",
		expectedWorkflow: ["1_triage.md", "4_dev_complete.md"],
	},
	newFeature: {
		description: "add user authentication",
		expectedType: "NEW_FEATURE",
		expectedWorkflow: ["2_research.md", "3_planning.md", "4_dev_complete.md"],
	},
	refactoring: {
		description: "refactor the service layer",
		expectedType: "REFACTORING",
		expectedWorkflow: ["5_refactor.md"],
	},
	investigation: {
		description: "investigate memory leak",
		expectedType: "INVESTIGATION",
		expectedWorkflow: ["2_research.md"],
	},
	testing: {
		description: "write missing test coverage",
		expectedType: "TESTING",
		expectedWorkflow: ["6_test.md"],
	},
	documentation: {
		description: "document the API",
		expectedType: "DOC_HYGIENE",
		expectedWorkflow: ["8_doc_hygiene.md"],
	},
	hotfix: {
		description: "P0 production down emergency",
		expectedType: "HOTFIX",
		expectedWorkflow: ["7_hotfix.md"],
	},
	performance: {
		description: "slow activation time regression",
		expectedType: "PERFORMANCE_REGRESSION",
		expectedWorkflow: ["2_research.md", "4_dev_complete.md"],
	},
};

// ============================================================================
// CONTEXT QUERY FIXTURES
// ============================================================================

export const contextQueryFixtures = {
	authTask: {
		task: "add authentication to MCP server",
		files: ["apps/mcp-server/src/auth.ts"],
		keywords: ["auth", "api-key"],
		expectedSections: ["authentication", "security"],
	},
	snapshotTask: {
		task: "fix snapshot creation",
		files: ["packages/core/src/snapshot/"],
		keywords: ["snapshot", "create"],
		expectedSections: ["snapshot"],
	},
	testTask: {
		task: "fix failing vitest tests",
		files: ["apps/api/test/"],
		keywords: ["vitest", "test", "config"],
		expectedSections: ["test", "vitest"],
	},
	vscodeTask: {
		task: "fix extension activation",
		files: ["apps/vscode/src/"],
		keywords: ["activation", "extension"],
		expectedSections: ["vscode", "activation"],
	},
};

// ============================================================================
// FILE PATH FIXTURES
// ============================================================================

export const filePathFixtures = {
	vscodePaths: [
		"apps/vscode/src/extension.ts",
		"apps/vscode/src/commands/snapshot.ts",
		"apps/vscode/src/providers/tree.ts",
	],
	apiPaths: [
		"apps/api/src/services/user-service.ts",
		"apps/api/src/procedures/user.ts",
		"apps/api/modules/snapshots/procedures/create.ts",
	],
	webPaths: ["apps/web/src/components/Dashboard.tsx", "apps/web/src/hooks/useUser.ts"],
	corePaths: ["packages/core/src/snapshot/manager.ts", "packages/sdk/src/client.ts"],
	testPaths: ["apps/api/test/user.test.ts", "packages/core/test/snapshot.test.ts"],
};

// ============================================================================
// SECURITY TEST FIXTURES
// ============================================================================

export const securityFixtures = {
	pathTraversal: "../../../etc/passwd",
	commandInjection: "; rm -rf /",
	xssPayload: "<script>alert(1)</script>",
	jsonInjection: '{"__proto__": {}}',
	sqlInjection: "'; DROP TABLE users; --",
	regexDos: "(a+)+$",

	hardcodedSecrets: {
		apiKey: 'api_key = "sk_live_abc123def456"',
		password: 'password: "supersecret123"',
		token: 'token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"',
	},
};

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

export const performanceBenchmarks = {
	getContext: { target: 100, max: 500 },
	checkPatterns100Lines: { target: 50, max: 200 },
	checkPatterns1000Lines: { target: 200, max: 1000 },
	reportViolation: { target: 50, max: 200 },
	getViolationsSummary: { target: 50, max: 200 },
	queryLearnings: { target: 50, max: 200 },
	gateRunnerPhase: { target: 2000, max: 5000 },
	fullPromotionCheck: { target: 500, max: 2000 },
};
