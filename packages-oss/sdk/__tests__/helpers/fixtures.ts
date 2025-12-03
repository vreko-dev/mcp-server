/**
 * Test fixtures and data generators for SDK tests
 */

export interface TestContext {
	workspaceRoot: string;
	userId?: string;
	sessionId?: string;
}

/**
 * Create a test context with default values
 */
export function createTestContext(overrides?: Partial<TestContext>): TestContext {
	return {
		workspaceRoot: "/tmp/test-workspace",
		userId: "test-user-123",
		sessionId: "test-session-456",
		...overrides,
	};
}

/**
 * Generate test file change events
 */
export interface TestFileChange {
	path: string;
	content: string;
	timestamp: number;
	changeType: "add" | "modify" | "delete";
}

export function createFileChange(overrides?: Partial<TestFileChange>): TestFileChange {
	return {
		path: "src/test.ts",
		content: 'console.log("test")',
		timestamp: Date.now(),
		changeType: "modify",
		...overrides,
	};
}

/**
 * Generate bulk file changes for testing
 */
export function createBulkFileChanges(count: number, baseContent = "test content"): TestFileChange[] {
	return Array.from({ length: count }, (_, i) => ({
		path: `src/file-${i}.ts`,
		content: `${baseContent} ${i}`,
		timestamp: Date.now() + i,
		changeType: "add" as const,
	}));
}

/**
 * Generate rapid typing simulation (for burst detection tests)
 */
export function createRapidTypingEvents(charCount: number, intervalMs = 50): TestFileChange[] {
	const events: TestFileChange[] = [];
	let content = "";

	for (let i = 0; i < charCount; i++) {
		content += "a";
		events.push({
			path: "src/test.ts",
			content,
			timestamp: Date.now() + i * intervalMs,
			changeType: "modify",
		});
	}

	return events;
}

/**
 * Generate slow typing simulation (for burst detection tests)
 */
export function createSlowTypingEvents(charCount: number, intervalMs = 300): TestFileChange[] {
	return createRapidTypingEvents(charCount, intervalMs);
}

/**
 * Session test data
 */
export interface TestSession {
	id: string;
	startTime: number;
	endTime?: number;
	files: string[];
	totalEdits: number;
	linesAdded: number;
	linesDeleted: number;
}

export function createTestSession(overrides?: Partial<TestSession>): TestSession {
	return {
		id: `session-${Date.now()}`,
		startTime: Date.now() - 600000, // 10 minutes ago
		files: ["src/test.ts", "src/utils.ts"],
		totalEdits: 10,
		linesAdded: 50,
		linesDeleted: 20,
		...overrides,
	};
}

/**
 * Risk analysis test data
 */
export interface TestRiskContext {
	filePath: string;
	content: string;
	complexity?: number;
	sensitivity?: number;
}

export function createRiskContext(overrides?: Partial<TestRiskContext>): TestRiskContext {
	return {
		filePath: "src/test.ts",
		content: "const x = 1",
		complexity: 0.5,
		sensitivity: 0.3,
		...overrides,
	};
}

/**
 * High-risk code samples for testing
 */
export const HIGH_RISK_CODE_SAMPLES = {
	secretInCode: `
    const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
    const password = "mySecretPassword123!";
  `,
	dangerousAPI: `
    const result = eval(userInput);
    exec(command, (err, stdout) => {
      console.log(stdout);
    });
  `,
	complexNesting: `
    function deep() {
      if (a) {
        if (b) {
          if (c) {
            if (d) {
              if (e) {
                return true;
              }
            }
          }
        }
      }
    }
  `,
};
