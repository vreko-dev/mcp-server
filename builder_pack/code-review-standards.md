# SnapBack Code Review & Standards Guide

## Comprehensive Blueprint for Implementation Excellence

**Version:** 1.0  
**Last Updated:** October 2025  
**Purpose:** Authoritative guide for code quality, DX, and architecture

---

## 📋 Table of Contents

1. [Testing Standards](#testing-standards)
2. [Web Dashboard DX Standards](#web-dashboard-dx-standards)
3. [Architecture Integration Guide](#architecture-integration-guide)
4. [PostHog Analytics Patterns](#posthog-analytics-patterns)
5. [Logging Strategy](#logging-strategy)
6. [Code Review Checklist](#code-review-checklist)

---

## 🧪 TESTING STANDARDS (2025)

### Philosophy: Tests Should Tell a Story

**Good tests are:**

-   ✅ **Readable** - Anyone can understand what's being tested
-   ✅ **Focused** - One concept per test
-   ✅ **Fast** - Run in milliseconds (< 100ms per test)
-   ✅ **Isolated** - No dependencies on other tests
-   ✅ **Meaningful** - Catch real bugs, not implementation details
-   ✅ **IP-Safe** - Public tests never expose proprietary logic (Open Core)

**Bad tests are:**

-   ❌ Testing implementation details
-   ❌ Requiring extensive mocking
-   ❌ Brittle (break when refactoring)
-   ❌ Slow (>1s per test)
-   ❌ Just for coverage numbers
-   ❌ Exposing proprietary algorithms or business logic in OSS packages

---

### Open Core Testing Strategy (CRITICAL)

**SnapBack uses an open-core architecture with two categories:**

#### 🌍 Public (Open Source) Packages
- `@snapback/sdk` - Client SDK (MIT)
- `@snapback/core` - Core snapshot logic (Apache 2.0) 
- `@snapback/contracts` - TypeScript types (MIT)
- `@snapback/config` - Configuration utilities (MIT)
- `@snapback/events` - Event system (MIT)
- `@snapback/cli` - CLI tool (MIT)
- `snapback-vscode` - VS Code extension (GPL-3.0)

#### 🔒 Proprietary (Commercial) Packages
- `@snapback/api` - API service
- `@snapback/mcp-server` - MCP implementation
- `@snapback/platform` - Database schemas
- `@snapback/infrastructure` - Observability
- `@snapback/integrations` - Stripe, email, feature flags
- `@snapback/auth` - Authentication
- `@snapback/analytics` - PostHog integration
- `@snapback/policy-engine` - Enterprise features
- `@snapback/web` - SaaS UI/UX

#### ⚠️ IP Protection Rules for Tests

**Public Package Tests MUST NOT:**
- ❌ Expose proprietary algorithms or formulas
- ❌ Reference subscription/tier logic
- ❌ Include PostHog event names or analytics schemas
- ❌ Show database schema details
- ❌ Reference Stripe integration patterns
- ❌ Expose pricing tiers or feature flags
- ❌ Include internal service URLs or identifiers
- ❌ Reference proprietary risk scoring formulas
- ❌ Show enterprise-only feature implementations

**Public Package Tests MUST:**
- ✅ Test generic, framework-agnostic behavior
- ✅ Use placeholder values for sensitive data
- ✅ Focus on core functionality, not commercial features
- ✅ Use generic identifiers (e.g., "test-org-123", not real org IDs)
- ✅ Test public APIs only
- ✅ Be safe for community inspection

**Example: ❌ BAD (Exposes IP)**
```typescript
// packages/sdk/test/risk-scoring.test.ts
describe("Risk Scoring", () => {
  it("calculates enterprise risk score", () => {
    // ❌ Exposes proprietary formula
    const score = calculateRiskScore({
      secretDetection: 0.9 * 2.5,  // ❌ Weighted multiplier exposed
      tierMultiplier: isPro ? 1.5 : 1.0,  // ❌ Tier logic exposed
      stripeCustomerId: "cus_123"  // ❌ Stripe reference
    });
    expect(score).toBe(3.375);  // ❌ Reveals exact calculation
  });
});
```

**Example: ✅ GOOD (IP-Safe)**
```typescript
// packages/sdk/test/snapshot-creation.test.ts
describe("Snapshot Creation", () => {
  it("should create snapshot when valid file path provided", async () => {
    // ✅ Tests public API behavior only
    const sdk = new SnapBackSDK({ apiKey: "test-key" });
    
    const result = await sdk.snapshots.create({
      filePath: "/test/file.ts",
      content: "const x = 1;"
    });
    
    // ✅ Generic assertions, no IP exposure
    expect(result.success).toBe(true);
    expect(result.value.id).toBeDefined();
    expect(result.value.timestamp).toBeGreaterThan(0);
  });
});
```

#### 🔍 OSS Sync Process

**Automated Filtering (Lefthook + GitHub Actions):**

Public packages are synced to `github.com/snapback-dev/snapback-oss` with automated IP leak detection:

```bash
# .lefthook.yml (runs on commit)
ip-guard:
  glob: "packages-oss/**/*.{ts,tsx,js,jsx}"
  run: |
    # Scans for forbidden imports
    FORBIDDEN=$(grep -rE "from [\"']@snapback/(auth|infrastructure|platform)" packages-oss/)
    if [ -n "$FORBIDDEN" ]; then
      echo "❌ PROPRIETARY CODE LEAK DETECTED"
      exit 1
    fi
    
    # Scans for sensitive keywords
    SENSITIVE=$(grep -rE "(stripe|posthog|subscription|tier|enterprise)" packages-oss/test/ -i)
    if [ -n "$SENSITIVE" ]; then
      echo "⚠️  Sensitive terms found in tests - review required"
    fi
```

**Manual Review Checklist (Before OSS Sync):**
- [ ] No proprietary algorithm implementations
- [ ] No hardcoded API keys, even if "test-" prefixed
- [ ] No references to internal service names
- [ ] No Stripe/PostHog/analytics integration details
- [ ] No subscription tier checks
- [ ] No database schema references
- [ ] Test data uses generic placeholders
- [ ] All test assertions are behavior-focused, not implementation-focused

---

### Test Organization & Naming (2025 Industry Standard)

**File Naming Convention:**

```
[feature-name].test.ts                    // Unit tests
[feature-name].integration.test.ts        // Integration tests  
[feature-name].e2e.test.ts               // End-to-end tests
[feature-name].perf.test.ts              // Performance tests
```

**Directory Structure (Feature-Based):**

```
packages/core/test/
├── detection/                     # Feature: Detection
│   ├── secret-detection.test.ts   # Unit tests
│   ├── secret-detection.integration.test.ts
│   └── msw/                       # MSW handlers for this feature
│       └── detection-handlers.ts
├── analysis/                      # Feature: Analysis
│   ├── risk-analysis.test.ts
│   └── policy-engine.test.ts
└── helpers/                       # Shared test utilities
    ├── msw/                       # MSW handlers by feature
    ├── factories/                 # Test data factories
    └── fixtures/                  # Static test data
```

**Describe Block Hierarchy (BDD-Inspired):**

```typescript
describe("[Feature Name]", () => {           // Level 1: Feature
  describe("[Component/Method]", () => {      // Level 2: Component
    describe("[Specific Behavior]", () => {   // Level 3: Scenario (optional)
      it("should [behavior] when [condition]", () => {  // Test case
        // Arrange
        // Act  
        // Assert
      });
    });
  });
});
```

**Test Case Naming (MUST Patterns):**
- ✅ `should [verb] [expected result] when [condition]`
- ✅ `should [verb] [expected result] given [precondition]`
- ✅ `should [verb] [expected result] for [input/scenario]`

**Examples:**
```typescript
// ✅ GOOD: Behavior-focused, hierarchical
describe("Secret Detection", () => {
  describe("AWS Credentials", () => {
    // Test ID: SD-AWS-001 (as comment for traceability)
    it("should detect access keys with AKIA prefix", async () => {
      const code = `const awsKey = "AKIA_EXAMPLE_NOT_REAL_KEY_12345";`;
      
      const result = await plugin.analyze(code, "/src/config.ts");
      
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.severity).toBe("critical");
    });

    it("should ignore AWS keys in example configuration files", async () => {
      const code = `AWS_ACCESS_KEY_ID=your-key-here`;
      
      const result = await plugin.analyze(code, "/src/.env.example");
      
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe("False Positive Prevention", () => {
    it("should ignore UUIDs in source code", async () => {
      // ...
    });
  });
});

// ❌ BAD: Implementation-focused
describe("SecretDetectionPlugin", () => {
  it("should detect AWS keys", () => {});
  it("test 1", () => {});  // Non-descriptive
});
```

**Test Grouping Strategy:**

1. **Group by behavior/feature**, not by file structure
2. **Positive cases first**, negative cases second, edge cases last
3. **Max 3 levels** of nested describe blocks for readability
4. **Test IDs as comments** for traceability (e.g., `// Test ID: SD-AWS-001`)
5. **AAA pattern** (Arrange-Act-Assert) within tests

---

### MSW Integration (Industry Best Practice 2025)

**Feature-Specific Handler Organization:**

```typescript
// packages/core/test/msw/snapshot-handlers.ts
import { http, HttpResponse } from "msw";

export const snapshotHandlers = {
  // Success handlers
  success: [
    http.get("https://api.snapback.dev/snapshots/:id", ({ params }) => {
      return HttpResponse.json({
        id: params.id,
        filePath: "/test/file.ts",
        content: "test content",
        timestamp: Date.now(),
      });
    }),
  ],

  // Error handlers
  errors: {
    notFound: [
      http.get("https://api.snapback.dev/snapshots/:id", () => {
        return HttpResponse.json(
          { error: "Snapshot not found" },
          { status: 404 }
        );
      }),
    ],
  },
};

// Helper functions for clean test setup
export function useSnapshotHandlers(server) {
  server.use(...snapshotHandlers.success);
}

export function useSnapshotError(server, errorType) {
  server.use(...snapshotHandlers.errors[errorType]);
}
```

**Usage in Tests:**

```typescript
import { setupServer } from "msw/node";
import { useSnapshotHandlers, useSnapshotError } from "./msw/snapshot-handlers";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SnapshotManager", () => {
  beforeEach(() => {
    useSnapshotHandlers(server); // Clean, declarative setup
  });

  it("should create snapshot successfully", async () => {
    const result = await snapshotManager.create("/path/file.ts");
    
    expect(result.success).toBe(true);
    expect(result.value.id).toBeDefined();
  });

  it("should handle 404 errors gracefully", async () => {
    useSnapshotError(server, "notFound"); // Override for this test

    const result = await snapshotManager.get("nonexistent");
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain("not found");
  });
});
```

**Benefits:**
- Network-level mocking (more realistic than mocking fetch/axios)
- Reusable handlers across tests
- Clean test setup with helper functions
- Easy error scenario testing
- Production-like behavior testing

---

### Test Patterns by Component Type

#### Pattern 1: Pure Logic (SessionManager, IterationTracker)

```typescript
// ✅ GOOD: Clear, focused, tells a story
describe("SessionManager", () => {
	describe("AI edit tracking", () => {
		it("increments consecutive AI edit counter", () => {
			// Arrange
			const manager = new SessionManager();
			const fileUri = "/test.ts";

			// Act
			manager.recordAIEdit(fileUri, mockChange);

			// Assert
			const session = manager.getSession(fileUri);
			expect(session.consecutiveAIEdits).toBe(1);
		});

		it("resets counter when human edits", () => {
			// Arrange
			const manager = new SessionManager();
			const fileUri = "/test.ts";
			manager.recordAIEdit(fileUri, mockChange);
			manager.recordAIEdit(fileUri, mockChange);

			// Act
			manager.recordHumanEdit(fileUri);

			// Assert
			expect(manager.getSession(fileUri).consecutiveAIEdits).toBe(0);
		});

		it("maintains separate counters per file", () => {
			const manager = new SessionManager();

			manager.recordAIEdit("/file1.ts", mockChange);
			manager.recordAIEdit("/file2.ts", mockChange);
			manager.recordAIEdit("/file2.ts", mockChange);

			expect(manager.getSession("/file1.ts").consecutiveAIEdits).toBe(1);
			expect(manager.getSession("/file2.ts").consecutiveAIEdits).toBe(2);
		});
	});

	describe("session expiration", () => {
		it("expires session after 30 minutes of inactivity", () => {
			const manager = new SessionManager();
			const fileUri = "/test.ts";

			manager.recordAIEdit(fileUri, mockChange);
			const session1 = manager.getSession(fileUri);

			// Fast-forward time
			vi.advanceTimersByTime(31 * 60 * 1000);

			const session2 = manager.getSession(fileUri);
			expect(session2.sessionId).not.toBe(session1.sessionId);
		});
	});
});

// ❌ BAD: Testing implementation details
describe("SessionManager", () => {
	it("uses a Map internally", () => {
		const manager = new SessionManager();
		expect(manager["sessions"]).toBeInstanceOf(Map); // Don't do this!
	});

	it("calls getSessionId method", () => {
		const manager = new SessionManager();
		const spy = vi.spyOn(manager as any, "getSessionId");
		manager.getSession("/test.ts");
		expect(spy).toHaveBeenCalled(); // Who cares? Test behavior, not calls
	});
});
```

**Key Points:**

-   Arrange-Act-Assert pattern
-   Descriptive test names (sentences, not "test1")
-   Test behavior, not implementation
-   Use `describe` blocks to group related tests

---

#### Pattern 2: Async Operations (DataMoatLogger, SnapshotManager)

```typescript
// ✅ GOOD: Proper async handling
describe('DataMoatLogger', () => {
    describe('logging AI interactions', () => {
        it('captures AI suggestion and context', async () => {
            const logger = new DataMoatLogger();
            const sessionContext = createMockSession();

            const logId = await logger.logInteraction({
                sessionContext,
                aiSuggestion: 'const x = 1;',
                prompt: 'declare a variable',
                model: 'copilot'
            });

            expect(logId).toMatch(/^log_\d+_/);

            // Verify log was stored
            const logs = await logger.getTrainingData();
            expect(logs).toHaveLength(1);
            expect(logs[0].aiSuggestion.code).toBe('const x = 1;');
        });

        it('records developer decision with timing', async () => {
            const logger = new DataMoatLogger();
            const sessionContext = createMockSession();

            const logId = await logger.logInteraction({
                sessionContext,
                aiSuggestion: 'code',
            });

            await logger.recordDecision(logId, 'accepted', 2500);

            const logs = await logger.getTrainingData();
            expect(logs[0].developerDecision).toBe('accepted');
            expect(logs[0].timeToDecision).toBe(2500);
        });

        it('handles backend failures gracefully', async () => {
            const logger = new DataMoatLogger();
            const sessionContext = createMockSession();

            // Mock backend failure
            vi.spyOn(logger as any, 'sendToBackend').mockRejectedValue(
                new Error('Network error')
            );

            // Should not throw
            await expect(
                logger.logInteraction({ sessionContext, aiSuggestion: 'code' })
            ).resolves.toBeDefined();

            // But should log error
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to send log')
            );
        });
    });
});

// ❌ BAD: Not handling async properly
describe('DataMoatLogger', () => {
    it('logs interaction', () => {
        const logger = new DataMoatLogger();
        logger.logInteraction({ ... }); // Missing await!
        expect(logger.logs).toHaveLength(1); // Flaky test
    });
});
```

**Key Points:**

-   Always use `async/await` for async tests
-   Test error handling (network failures, etc.)
-   Use `resolves` / `rejects` matchers
-   Don't forget to `await` in tests

---

#### Pattern 3: React Components (DegradationWarningUI)

```typescript
// ✅ GOOD: Test user interactions, not implementation
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DegradationWarning } from "./DegradationWarning";

describe("DegradationWarning", () => {
	const mockSession = {
		consecutiveAIEdits: 5,
		qualityTrend: "declining",
		qualityMetrics: [
			{ iteration: 0, complexity: 5, linesOfCode: 45 },
			{ iteration: 1, complexity: 8, linesOfCode: 87 },
			{ iteration: 2, complexity: 12, linesOfCode: 134 },
		],
	};

	it("displays critical warning for 5+ iterations", () => {
		render(<DegradationWarning session={mockSession} />);

		expect(screen.getByText(/🚨 High Iteration Count/)).toBeInTheDocument();
		expect(screen.getByText(/5 consecutive AI edits/)).toBeInTheDocument();
	});

	it("shows quality trend graph", () => {
		render(<DegradationWarning session={mockSession} />);

		const graph = screen.getByTestId("quality-graph");
		expect(graph).toBeInTheDocument();

		// Verify all iterations shown
		expect(screen.getByText(/Iteration 0/)).toBeInTheDocument();
		expect(screen.getByText(/Iteration 1/)).toBeInTheDocument();
		expect(screen.getByText(/Iteration 2/)).toBeInTheDocument();
	});

	it("calls onRestore when user clicks restore button", async () => {
		const onRestore = vi.fn();
		render(
			<DegradationWarning session={mockSession} onRestore={onRestore} />
		);

		const restoreButton = screen.getByText(/Restore to Earlier Snapshot/);
		fireEvent.click(restoreButton);

		await waitFor(() => {
			expect(onRestore).toHaveBeenCalledTimes(1);
		});
	});

	it("requires confirmation before continuing", async () => {
		const onContinue = vi.fn();
		window.confirm = vi.fn(() => false); // User cancels

		render(
			<DegradationWarning session={mockSession} onContinue={onContinue} />
		);

		const continueButton = screen.getByText(/Continue Anyway/);
		fireEvent.click(continueButton);

		expect(window.confirm).toHaveBeenCalled();
		expect(onContinue).not.toHaveBeenCalled(); // Cancelled
	});
});

// ❌ BAD: Testing implementation details
describe("DegradationWarning", () => {
	it("has correct state", () => {
		const wrapper = shallow(<DegradationWarning />);
		expect(wrapper.state("isVisible")).toBe(true); // Don't test state!
	});

	it("calls componentDidMount", () => {
		const spy = vi.spyOn(DegradationWarning.prototype, "componentDidMount");
		render(<DegradationWarning />);
		expect(spy).toHaveBeenCalled(); // Who cares?
	});
});
```

**Key Points:**

-   Test from user's perspective (what they see/do)
-   Use `@testing-library/react` (not Enzyme)
-   Test accessibility (screen readers can find elements)
-   Don't test internal state or lifecycle methods

---

#### Pattern 4: Integration Tests (Full Workflows)

```typescript
// ✅ GOOD: Test complete user workflows
describe("AI Edit Workflow (Integration)", () => {
	it("full flow: 5 AI edits → warning → restore", async () => {
		// Setup
		const snapback = new Snapback({ storage: new MemoryStorage() });
		const fileUri = "/test.ts";
		let warningShown = false;

		// Simulate 5 consecutive AI edits
		for (let i = 1; i <= 5; i++) {
			const result = await snapback.handleAIEdit(fileUri, {
				content: `// AI edit ${i}`,
				additions: 10,
				deletions: 0,
			});

			if (i < 5) {
				// First 4 edits: no warning
				expect(result.shouldWarn).toBe(false);
			} else {
				// 5th edit: critical warning
				expect(result.shouldWarn).toBe(true);
				expect(result.warning?.type).toBe("critical");
				expect(result.warning?.message).toContain("37.6%");
				warningShown = true;
			}
		}

		expect(warningShown).toBe(true);

		// Verify snapshots were created
		const snapshots = await snapback.listSnapshots();
		expect(snapshots).toHaveLength(5);

		// Verify session state
		const session = snapback.session.getSession(fileUri);
		expect(session.consecutiveAIEdits).toBe(5);
		expect(session.qualityTrend).toBe("declining");
	});

	it("resets iteration counter after human edit", async () => {
		const snapback = new Snapback({ storage: new MemoryStorage() });
		const fileUri = "/test.ts";

		// 3 AI edits
		await snapback.handleAIEdit(fileUri, mockChange);
		await snapback.handleAIEdit(fileUri, mockChange);
		await snapback.handleAIEdit(fileUri, mockChange);

		expect(snapback.session.getSession(fileUri).consecutiveAIEdits).toBe(3);

		// Human edit
		snapback.session.recordHumanEdit(fileUri);

		// Counter reset
		expect(snapback.session.getSession(fileUri).consecutiveAIEdits).toBe(0);

		// Next AI edit starts from 1
		await snapback.handleAIEdit(fileUri, mockChange);
		expect(snapback.session.getSession(fileUri).consecutiveAIEdits).toBe(1);
	});
});
```

**Key Points:**

-   Test entire user journeys, not isolated units
-   Use real implementations (not mocks) when possible
-   Verify end-to-end behavior
-   These tests run slower, so have fewer of them

---

### Test Coverage Expectations

**NOT about hitting 100%. About meaningful coverage.**

```yaml
Targets (Realistic):
    - Core Business Logic: 80-90% (SessionManager, IterationTracker)
    - Public APIs: 90%+ (Snapback SDK, SnapshotManager)
    - UI Components: 60-70% (test critical paths only)
    - Integration: 50-60% (expensive, test key workflows)
    - Utils: 40-50% (low-risk code)

What to Skip Testing:
    - Generated code (Drizzle schemas, etc.)
    - Simple getters/setters
    - Console.log statements
    - Types (TypeScript does this)
    - Third-party libraries

Focus On:
    - Edge cases (null, undefined, empty arrays)
    - Error conditions (network failures, invalid inputs)
    - Critical user paths (create snapshot, restore, warnings)
    - Data integrity (session state, quality metrics)
```

---

### Test Organization

```typescript
// File structure mirrors source
packages / core / src / session / SessionManager.ts;
IterationTracker.ts;
__tests__ / SessionManager.test.ts;
IterationTracker.test.ts;
integration / ai - workflow.integration.test.ts;

// Test naming convention
describe("<ComponentName>", () => {
	describe("<method or feature>", () => {
		it("<specific behavior>", () => {
			// test
		});
	});
});

// Example:
describe("SessionManager", () => {
	describe("recordAIEdit", () => {
		it("increments consecutive AI edit counter", () => {
			// ...
		});

		it("updates last activity timestamp", () => {
			// ...
		});

		it("calculates quality metrics", () => {
			// ...
		});
	});
});
```

---

## 🎨 WEB DASHBOARD DX STANDARDS

### Core Principle: "It Should Feel Like Magic"

**Design Philosophy:**

-   **Anticipatory** - UI predicts what user needs
-   **Responsive** - Every action has immediate feedback
-   **Delightful** - Micro-interactions add joy
-   **Professional** - Clean, not gimmicky
-   **Fast** - Perceived performance > actual performance

---

### Component Library Strategy

```typescript
/**
 * Use Aceternity for:
 * - Hero sections
 * - Feature showcases
 * - Landing page elements
 * - Wow-factor components
 */
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { BentoGrid } from "@/components/ui/bento-grid";
import { SparklesCore } from "@/components/ui/sparkles";

/**
 * Use Magic UI for:
 * - Interactive data visualizations
 * - Micro-interactions
 * - Subtle animations
 * - Professional polish
 */
import { AnimatedNumber } from "@/components/magicui/animated-number";
import { Ripple } from "@/components/magicui/ripple";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

/**
 * Use shadcn/ui for:
 * - Forms and inputs
 * - Dialogs and modals
 * - Tables and lists
 * - Everyday UI components
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
```

---

### Micro-Interaction Patterns

#### Pattern 1: Loading States

```tsx
// ✅ GOOD: Skeleton loading with shimmer
import { Skeleton } from "@/components/ui/skeleton";

function SnapshotList() {
	const { data, isLoading } = useSnapshots();

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex items-center space-x-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-[250px]" />
							<Skeleton className="h-4 w-[200px]" />
						</div>
					</div>
				))}
			</div>
		);
	}

	return <div>{/* actual content */}</div>;
}

// ❌ BAD: Generic "Loading..." text
function SnapshotList() {
	const { data, isLoading } = useSnapshots();

	if (isLoading) return <div>Loading...</div>; // Boring!

	return <div>{/* content */}</div>;
}
```

#### Pattern 2: Success Feedback

```tsx
// ✅ GOOD: Animated success with micro-interaction
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

function SnapshotCreated() {
	return (
		<motion.div
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			transition={{ type: "spring", stiffness: 500, damping: 30 }}
			className="flex items-center gap-2 text-green-600"
		>
			<CheckCircle2 className="h-5 w-5" />
			<span>Snapshot created successfully</span>
		</motion.div>
	);
}

// Even better: Use toast with auto-dismiss
import { toast } from "sonner";

function createSnapshot() {
	// ... snapshot logic

	toast.success("Snapshot created", {
		description: "Your code is safely backed up",
		duration: 3000,
		icon: <CheckCircle2 className="h-4 w-4" />,
	});
}
```

#### Pattern 3: Hover States

```tsx
// ✅ GOOD: Subtle hover with transform
<Button
	variant="outline"
	className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
>
	Create Snapshot
</Button>;

// ✅ BETTER: Use Magic UI Shimmer Button for CTAs
import { ShimmerButton } from "@/components/magicui/shimmer-button";

<ShimmerButton className="shadow-2xl" onClick={createSnapshot}>
	<span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
		Create Snapshot
	</span>
</ShimmerButton>;
```

#### Pattern 4: Data Visualization

```tsx
// ✅ GOOD: Animated numbers with Magic UI
import { AnimatedNumber } from "@/components/magicui/animated-number";

function DashboardStats() {
	const stats = useStats();

	return (
		<div className="grid grid-cols-3 gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Total Snapshots</CardTitle>
				</CardHeader>
				<CardContent>
					<AnimatedNumber
						value={stats.totalSnapshots}
						className="text-4xl font-bold"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>AI Interventions</CardTitle>
				</CardHeader>
				<CardContent>
					<AnimatedNumber
						value={stats.interventions}
						className="text-4xl font-bold text-orange-600"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Time Saved</CardTitle>
				</CardHeader>
				<CardContent>
					<AnimatedNumber
						value={stats.timeSaved}
						className="text-4xl font-bold text-green-600"
						suffix=" hrs"
					/>
				</CardContent>
			</Card>
		</div>
	);
}
```

---

### Animation Guidelines

```typescript
/**
 * Animation Timing Standards
 */
const ANIMATION_TIMINGS = {
	instant: 0, // State changes (theme toggle)
	fast: 150, // Hover effects, tooltips
	normal: 300, // Modals, dropdowns
	slow: 500, // Page transitions
	dramatic: 1000, // Onboarding, first-time experiences
};

/**
 * Easing Functions
 */
const EASINGS = {
	// Use for most animations
	default: "cubic-bezier(0.4, 0, 0.2, 1)",

	// Use for entrances
	easeOut: "cubic-bezier(0, 0, 0.2, 1)",

	// Use for exits
	easeIn: "cubic-bezier(0.4, 0, 1, 1)",

	// Use for playful interactions
	spring: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
};

/**
 * Usage Example
 */
<motion.div
	initial={{ opacity: 0, y: 20 }}
	animate={{ opacity: 1, y: 0 }}
	exit={{ opacity: 0, y: -20 }}
	transition={{
		duration: ANIMATION_TIMINGS.normal / 1000,
		ease: EASINGS.default,
	}}
>
	Content
</motion.div>;
```

---

### Responsive Design Standards

```typescript
/**
 * Breakpoint System (Tailwind default)
 */
const BREAKPOINTS = {
    sm: '640px',   // Mobile landscape
    md: '768px',   // Tablet
    lg: '1024px',  // Desktop
    xl: '1280px',  // Large desktop
    '2xl': '1536px' // Ultra-wide
};

/**
 * Component Responsive Pattern
 */
<div className="
    grid
    grid-cols-1     /* Mobile: 1 column */
    md:grid-cols-2  /* Tablet: 2 columns */
    lg:grid-cols-3  /* Desktop: 3 columns */
    gap-4           /* Consistent spacing */
">
    {items.map(item => <Card key={item.id} {...item} />)}
</div>

/**
 * Typography Responsive Pattern
 */
<h1 className="
    text-3xl        /* Mobile */
    md:text-4xl     /* Tablet */
    lg:text-5xl     /* Desktop */
    font-bold
    tracking-tight
">
    Dashboard
</h1>
```

---

### Performance Standards

```typescript
/**
 * Core Web Vitals Targets
 */
const PERFORMANCE_TARGETS = {
	LCP: 2.5, // Largest Contentful Paint (seconds)
	FID: 100, // First Input Delay (milliseconds)
	CLS: 0.1, // Cumulative Layout Shift (score)
};

/**
 * Implementation Strategies
 */

// 1. Image Optimization
import Image from "next/image";

<Image
	src="/snapshot-preview.png"
	alt="Snapshot preview"
	width={800}
	height={600}
	placeholder="blur" // Blur-up effect
	priority={isAboveFold} // Preload if above fold
/>;

// 2. Code Splitting
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
	loading: () => <Skeleton className="h-64 w-full" />,
	ssr: false, // Don't render on server
});

// 3. Lazy Loading
import { lazy, Suspense } from "react";

const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));

function Dashboard() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<AnalyticsDashboard />
		</Suspense>
	);
}

// 4. Debounce Expensive Operations
import { useDebouncedCallback } from "use-debounce";

const debouncedSearch = useDebouncedCallback(
	(query) => searchSnapshots(query),
	300 // Wait 300ms after user stops typing
);
```

---

## 🏗️ ARCHITECTURE INTEGRATION GUIDE

### Critical Integration Points

```typescript
/**
 * 1. SDK → Session Manager Integration
 *
 * CHALLENGE: SessionManager needs to be instantiated once
 * SOLUTION: Singleton pattern via SDK
 */

// ✅ GOOD: Singleton in SDK
export class Snapback {
    private static sessionManager: SessionManager;

    constructor(options: SnapbackOptions) {
        if (!Snapback.sessionManager) {
            Snapback.sessionManager = new SessionManager();
        }
        this.sessionManager = Snapback.sessionManager;
    }
}

// ❌ BAD: New instance each time
export class Snapback {
    constructor(options: SnapbackOptions) {
        this.sessionManager = new SessionManager(); // Lost state!
    }
}

/**
 * 2. VS Code Extension → SDK Integration
 *
 * CHALLENGE: File watching triggers rapid events
 * SOLUTION: Debounce + event batching
 */

// ✅ GOOD: Debounced save handler
import { debounce } from 'lodash';

class SaveHandler {
    private debouncedHandle = debounce(
        (document: vscode.TextDocument) => {
            this.handleSave(document);
        },
        300 // Wait 300ms after last change
    );

    onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
        this.debouncedHandle(event.document);
    }
}

/**
 * 3. Risk Analyzer → Session Context Integration
 *
 * CHALLENGE: RiskAnalyzer needs session context but shouldn't depend on SessionManager
 * SOLUTION: Dependency injection via interfaces
 */

// ✅ GOOD: Interface-based dependency
interface SessionContext {
    consecutiveAIEdits: number;
    qualityTrend: string;
    // ... other fields
}

class RiskAnalyzer {
    analyze(
        changes: FileChange[],
        sessionContext?: SessionContext // Optional, not required
    ): RiskResult {
        // Use context if provided
        if (sessionContext?.consecutiveAIEdits >= 5) {
            return { severity: 'critical', ... };
        }

        // Fallback to basic analysis
        return this.basicAnalysis(changes);
    }
}

// ❌ BAD: Hard dependency
class RiskAnalyzer {
    constructor(private sessionManager: SessionManager) {} // Tight coupling!
}

/**
 * 4. Data Moat Logger → Backend Integration
 *
 * CHALLENGE: Network failures shouldn't break user experience
 * SOLUTION: Queue + retry logic
 */

// ✅ GOOD: Resilient logging
class DataMoatLogger {
    private queue: AIInteractionLog[] = [];
    private retryTimer: NodeJS.Timeout | null = null;

    async logInteraction(data: LogData): Promise<string> {
        const log = this.createLog(data);
        this.queue.push(log);

        // Try to send immediately
        try {
            await this.sendToBackend(log);
            this.removeFromQueue(log.id);
        } catch (error) {
            // Failed, will retry later
            this.scheduleRetry();
        }

        return log.id;
    }

    private scheduleRetry() {
        if (this.retryTimer) return;

        this.retryTimer = setTimeout(() => {
            this.flushQueue();
            this.retryTimer = null;
        }, 5000); // Retry after 5s
    }

    private async flushQueue() {
        const toSend = [...this.queue];
        for (const log of toSend) {
            try {
                await this.sendToBackend(log);
                this.removeFromQueue(log.id);
            } catch {
                // Still failing, will retry later
            }
        }
    }
}
```

---

### Package Boundaries

```typescript
/**
 * RULE: Dependencies flow in one direction
 *
 * contracts → core → sdk → apps
 *
 * NEVER:
 * - sdk imports from apps
 * - core imports from sdk
 * - contracts imports from anywhere
 */

// ✅ GOOD: Proper dependency flow
// packages/core/src/session/SessionManager.ts
import type { SessionContext } from "@snapback/contracts"; // OK

// packages/sdk/src/Snapback.ts
import { SessionManager } from "@snapback/core/session"; // OK

// apps/vscode/src/extension.ts
import { Snapback } from "@snapback/sdk"; // OK

// ❌ BAD: Circular dependencies
// packages/sdk/src/Snapback.ts
import { extension } from "@snapback/vscode"; // WRONG!

// packages/core/src/session.ts
import { Snapback } from "@snapback/sdk"; // WRONG!
```

---

### Event Flow Patterns

```typescript
/**
 * Event Flow Architecture
 *
 * File Change → File Watcher → Save Handler → SDK → Session Manager
 *                                    ↓
 *                              Risk Analyzer → Data Logger
 *                                    ↓
 *                              UI Update
 */

// Implementation with clear event flow
class SaveHandler {
	async onWillSaveTextDocument(event: vscode.TextDocumentWillSaveEvent) {
		const fileUri = event.document.uri.fsPath;

		// 1. Detect if AI edit
		const isAIEdit = await this.detectAIEdit(event.document);

		if (isAIEdit) {
			// 2. Handle via SDK (encapsulates all logic)
			const result = await this.snapback.handleAIEdit(fileUri, {
				content: event.document.getText(),
				additions: this.calculateAdditions(event),
				deletions: this.calculateDeletions(event),
			});

			// 3. Show UI if needed
			if (result.shouldWarn) {
				const action = await this.showWarning(result.warning);

				// 4. Handle user action
				if (action === "restore") {
					await this.snapback.restoreSnapshot(result.snapshotId);
					event.waitUntil(Promise.reject()); // Cancel save
				}
			}
		}
	}
}
```

---

### State Management

```typescript
/**
 * State Location Strategy
 *
 * - Transient UI state → React useState
 * - Session state → SessionManager (in-memory)
 * - Persistent state → Storage adapters (LocalStorage/Cloud)
 * - Analytics state → PostHog (fire-and-forget)
 */

// ✅ GOOD: Clear state boundaries
function SnapshotList() {
	// Transient UI state
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedId, setSelectedId] = useState<string>();

	// Persistent state (via SDK)
	const { data: snapshots, refetch } = useSnapshots();

	// Session state (via SDK)
	const session = useSession(fileUri);

	return (
		<div>
			<Button onClick={() => setIsExpanded(!isExpanded)}>Toggle</Button>

			{snapshots.map((s) => (
				<SnapshotCard
					key={s.id}
					snapshot={s}
					selected={s.id === selectedId}
					onClick={() => setSelectedId(s.id)}
				/>
			))}
		</div>
	);
}

// ❌ BAD: Mixing state concerns
function SnapshotList() {
	// Don't store persistent data in React state!
	const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

	useEffect(() => {
		// Manually fetching and managing state
		loadSnapshots().then(setSnapshots);
	}, []);
}
```

---

### Error Handling Patterns

```typescript
/**
 * Error Handling Strategy
 *
 * - Expected errors → Return error objects (don't throw)
 * - Unexpected errors → Let bubble up, catch at boundaries
 * - User-facing errors → Show helpful messages
 * - Developer errors → Log with context
 */

// ✅ GOOD: Return error objects for expected failures
type Result<T> = { success: true; data: T } | { success: false; error: Error };

async function createSnapshot(files: FileInput[]): Promise<Result<Snapshot>> {
	try {
		// Validate inputs
		if (files.length === 0) {
			return {
				success: false,
				error: new Error("No files provided"),
			};
		}

		const snapshot = await this.storage.save(files);
		return { success: true, data: snapshot };
	} catch (error) {
		// Unexpected error - log and return
		console.error("[SnapshotManager] Failed to create snapshot:", error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error("Unknown error"),
		};
	}
}

// Usage
const result = await snapback.createSnapshot(files);
if (!result.success) {
	toast.error("Failed to create snapshot", {
		description: result.error.message,
	});
	return;
}

// Success path
const snapshot = result.data;

// ❌ BAD: Throwing errors for expected failures
async function createSnapshot(files: FileInput[]): Promise<Snapshot> {
	if (files.length === 0) {
		throw new Error("No files"); // Forces try-catch everywhere!
	}
	// ...
}
```

---

### Race Condition Prevention

```typescript
/**
 * Common Race Conditions to Watch For:
 *
 * 1. Rapid file saves
 * 2. Concurrent snapshot creation
 * 3. Session expiration during operations
 */

// ✅ GOOD: Debounce + locking
class SnapshotManager {
	private operationLock = new Map<string, Promise<any>>();

	async create(files: FileInput[]): Promise<Snapshot> {
		const key = this.getOperationKey(files);

		// Check if operation already in progress
		if (this.operationLock.has(key)) {
			return this.operationLock.get(key)!;
		}

		// Lock and execute
		const promise = this.executeCreate(files);
		this.operationLock.set(key, promise);

		try {
			const result = await promise;
			return result;
		} finally {
			this.operationLock.delete(key);
		}
	}

	private getOperationKey(files: FileInput[]): string {
		return files
			.map((f) => f.path)
			.sort()
			.join("|");
	}
}

// ✅ GOOD: Sequence numbers for ordering
class SessionManager {
	private sequenceNumber = 0;

	recordAIEdit(fileUri: string, change: FileChange) {
		const sequence = ++this.sequenceNumber;

		const session = this.getSession(fileUri);
		session.edits.push({
			sequence,
			timestamp: Date.now(),
			change,
		});

		// Sort by sequence to handle out-of-order events
		session.edits.sort((a, b) => a.sequence - b.sequence);
	}
}
```

---

## 📊 POSTHOG ANALYTICS PATTERNS

### Event Naming Conventions

```typescript
/**
 * Event Naming Structure:
 *
 * <object>_<action>_<detail?>
 *
 * Examples:
 * - snapshot_created
 * - snapshot_restored_success
 * - warning_shown_iteration_high
 * - session_started
 */

// ✅ GOOD: Consistent, descriptive names
posthog.capture("snapshot_created", {
	source: "auto" | "manual",
	file_count: number,
	total_size_bytes: number,
	iteration_count: number,
});

posthog.capture("warning_shown", {
	warning_type: "iteration_high" | "quality_declining",
	severity: "warning" | "critical",
	iteration_count: number,
	user_action: null, // Set later
});

posthog.capture("warning_action_taken", {
	warning_id: string,
	action: "restore" | "continue" | "review",
	time_to_decision_ms: number,
});

// ❌ BAD: Inconsistent, vague names
posthog.capture("created"); // What was created?
posthog.capture("UserClickedButton"); // CamelCase, not snake_case
posthog.capture("high_iterations"); // Missing object
```

---

### Event Organization

```typescript
/**
 * Create a centralized events file
 * packages/analytics/src/events.ts
 */

export const AnalyticsEvents = {
	// Snapshot events
	SNAPSHOT_CREATED: "snapshot_created",
	SNAPSHOT_RESTORED: "snapshot_restored",
	SNAPSHOT_DELETED: "snapshot_deleted",
	SNAPSHOT_VIEWED: "snapshot_viewed",

	// Session events
	SESSION_STARTED: "session_started",
	SESSION_ENDED: "session_ended",
	SESSION_EXPIRED: "session_expired",

	// AI interaction events
	AI_EDIT_DETECTED: "ai_edit_detected",
	AI_EDIT_ACCEPTED: "ai_edit_accepted",
	AI_EDIT_REJECTED: "ai_edit_rejected",

	// Warning events
	WARNING_SHOWN: "warning_shown",
	WARNING_DISMISSED: "warning_dismissed",
	WARNING_ACTION_RESTORE: "warning_action_restore",
	WARNING_ACTION_CONTINUE: "warning_action_continue",

	// Dashboard events
	DASHBOARD_VIEWED: "dashboard_viewed",
	STATS_VIEWED: "stats_viewed",
	REPORT_GENERATED: "report_generated",

	// Onboarding events
	ONBOARDING_STARTED: "onboarding_started",
	ONBOARDING_COMPLETED: "onboarding_completed",
	ONBOARDING_SKIPPED: "onboarding_skipped",

	// Subscription events
	SUBSCRIPTION_STARTED: "subscription_started",
	SUBSCRIPTION_UPGRADED: "subscription_upgraded",
	SUBSCRIPTION_CANCELLED: "subscription_cancelled",
} as const;

/**
 * Type-safe event tracking
 */
type EventProperties = {
	[AnalyticsEvents.SNAPSHOT_CREATED]: {
		source: "auto" | "manual";
		file_count: number;
		total_size_bytes: number;
	};
	[AnalyticsEvents.WARNING_SHOWN]: {
		warning_type: string;
		severity: "warning" | "critical";
		iteration_count: number;
	};
	// ... more event types
};

export function trackEvent<E extends keyof EventProperties>(
	event: E,
	properties: EventProperties[E]
): void {
	posthog.capture(event, properties);
}

/**
 * Usage (type-safe!)
 */
trackEvent(AnalyticsEvents.SNAPSHOT_CREATED, {
	source: "auto",
	file_count: 3,
	total_size_bytes: 15420,
	// TypeScript will error if properties don't match!
});
```

---

### User Properties

```typescript
/**
 * Set user properties once at session start
 */
function identifyUser(userId: string, traits: UserTraits) {
	posthog.identify(userId, {
		// User traits (update infrequently)
		email: traits.email,
		name: traits.name,
		plan: traits.plan, // 'free' | 'pro' | 'team' | 'enterprise'
		created_at: traits.createdAt,

		// Usage metrics (updated periodically)
		total_snapshots: traits.totalSnapshots,
		total_ai_edits: traits.totalAIEdits,
		total_interventions: traits.totalInterventions,

		// Feature flags
		has_mcp_enabled: traits.mcpEnabled,
		has_cli_enabled: traits.cliEnabled,

		// Team context
		team_id: traits.teamId,
		team_role: traits.role, // 'owner' | 'admin' | 'member'
	});
}

/**
 * Update user properties when they change
 */
function updateUserMetrics(userId: string) {
	posthog.people.set({
		total_snapshots: getCurrentCount(),
		last_active: new Date().toISOString(),
	});
}
```

---

### Feature Flag Pattern

```typescript
/**
 * Use PostHog for feature flags
 */
function useFeatureFlag(flag: string): boolean {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		posthog.onFeatureFlags(() => {
			setEnabled(posthog.isFeatureEnabled(flag));
		});
	}, [flag]);

	return enabled;
}

/**
 * Usage
 */
function Dashboard() {
	const showNewChart = useFeatureFlag("new-quality-chart");
	const showTeamFeatures = useFeatureFlag("team-collaboration");

	return (
		<div>
			{showNewChart && <NewQualityChart />}
			{showTeamFeatures && <TeamCollaboration />}
		</div>
	);
}

/**
 * Track feature flag exposure
 */
useEffect(() => {
	if (showNewChart) {
		trackEvent(AnalyticsEvents.FEATURE_EXPOSED, {
			feature_flag: "new-quality-chart",
			variant: "enabled",
		});
	}
}, [showNewChart]);
```

---

### Funnel Tracking

```typescript
/**
 * Track user funnels for conversion optimization
 */

// Onboarding funnel
trackEvent(AnalyticsEvents.ONBOARDING_STARTED);
// ... user completes step 1
trackEvent(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, { step: 1 });
// ... user completes step 2
trackEvent(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, { step: 2 });
// ... user finishes
trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
	time_to_complete_ms: Date.now() - startTime,
	steps_completed: 3,
});

// Upgrade funnel
trackEvent(AnalyticsEvents.PRICING_PAGE_VIEWED);
trackEvent(AnalyticsEvents.PLAN_SELECTED, { plan: "pro" });
trackEvent(AnalyticsEvents.CHECKOUT_STARTED);
trackEvent(AnalyticsEvents.CHECKOUT_COMPLETED, {
	plan: "pro",
	billing_period: "monthly",
	amount_cents: 3900,
});

// Feature adoption funnel
trackEvent(AnalyticsEvents.FEATURE_DISCOVERED, { feature: "mcp-server" });
trackEvent(AnalyticsEvents.FEATURE_SETUP_STARTED, { feature: "mcp-server" });
trackEvent(AnalyticsEvents.FEATURE_SETUP_COMPLETED, {
	feature: "mcp-server",
	time_to_setup_ms: setupDuration,
});
trackEvent(AnalyticsEvents.FEATURE_FIRST_USE, { feature: "mcp-server" });
```

---

## 📝 LOGGING STRATEGY

### Log Levels

```typescript
/**
 * Log Level Guidelines
 *
 * DEBUG: Development only, verbose details
 * INFO: Significant events (snapshot created, session started)
 * WARN: Recoverable errors (network retry, deprecated API usage)
 * ERROR: Unrecoverable errors (save failed, restore failed)
 */

import { logger } from "@snapback/logs";

// DEBUG - Only in development
logger.debug("Session state updated", {
	sessionId: session.sessionId,
	consecutiveAIEdits: session.consecutiveAIEdits,
	qualityTrend: session.qualityTrend,
});

// INFO - Significant events
logger.info("Snapshot created successfully", {
	snapshotId: snapshot.id,
	fileCount: snapshot.files.length,
	source: "auto",
	userId: user.id,
});

// WARN - Recoverable issues
logger.warn("Network request failed, will retry", {
	url: "/api/snapshots",
	attempt: retryCount,
	error: error.message,
});

// ERROR - Critical failures
logger.error("Failed to create snapshot", {
	fileUri: fileUri,
	error: error.message,
	stack: error.stack,
	userId: user.id,
});
```

---

### Structured Logging

```typescript
/**
 * Always use structured logging (objects, not strings)
 */

// ✅ GOOD: Structured
logger.info("Snapshot created", {
	snapshot_id: snapshot.id,
	user_id: user.id,
	file_count: files.length,
	total_size_bytes: totalSize,
	duration_ms: Date.now() - startTime,
});

// Query logs later:
// WHERE snapshot_id = '...'
// WHERE file_count > 10
// WHERE duration_ms > 1000

// ❌ BAD: String concatenation
logger.info(
	`Snapshot ${snapshot.id} created by ${user.id} with ${files.length} files`
);

// Can't query this!
```

---

### Context Propagation

```typescript
/**
 * Add context to all logs in a request/operation
 */

class SnapshotManager {
	async create(files: FileInput[]): Promise<Snapshot> {
		const operationId = generateId();

		// Create child logger with context
		const log = logger.child({
			operation_id: operationId,
			user_id: this.userId,
			file_count: files.length,
		});

		log.info("Starting snapshot creation");

		try {
			const snapshot = await this.storage.save(files);
			log.info("Snapshot created successfully", {
				snapshot_id: snapshot.id,
				duration_ms: Date.now() - startTime,
			});
			return snapshot;
		} catch (error) {
			log.error("Snapshot creation failed", {
				error: error.message,
				stack: error.stack,
			});
			throw error;
		}
	}
}

/**
 * All logs in this operation will have:
 * - operation_id
 * - user_id
 * - file_count
 *
 * Makes debugging much easier!
 */
```

---

### User Signal Capture

```typescript
/**
 * Log user signals for product insights
 */

// User behavior signals
logger.info("User viewed feature", {
	user_id: user.id,
	feature: "degradation-warning",
	session_duration_ms: Date.now() - sessionStart,
	is_first_time: isFirstView,
});

logger.info("User interacted with feature", {
	user_id: user.id,
	feature: "degradation-warning",
	action: "clicked_restore",
	context: {
		iteration_count: session.consecutiveAIEdits,
		warning_severity: "critical",
	},
});

// Feature effectiveness signals
logger.info("User outcome", {
	user_id: user.id,
	feature: "degradation-warning",
	outcome: "prevented_bad_code",
	evidence: {
		iteration_count_before_warning: 5,
		user_action: "restored",
		tests_passed_after_restore: true,
	},
});

// Pain point signals
logger.info("User friction detected", {
	user_id: user.id,
	event: "multiple_restore_attempts",
	context: {
		restore_attempts: 3,
		time_between_attempts_ms: [1200, 800, 2300],
	},
});

/**
 * Use these signals to:
 * - Identify which features work
 * - Spot friction points
 * - Validate product hypotheses
 * - Prioritize roadmap
 */
```

---

### Performance Logging

```typescript
/**
 * Log performance metrics for optimization
 */

class PerformanceLogger {
	measure<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage().heapUsed;

		return fn()
			.then((result) => {
				const duration = performance.now() - startTime;
				const memoryDelta =
					process.memoryUsage().heapUsed - startMemory;

				logger.info("Operation completed", {
					operation: operationName,
					duration_ms: duration,
					memory_delta_bytes: memoryDelta,
					success: true,
				});

				// Alert if slow
				if (duration > 1000) {
					logger.warn("Slow operation detected", {
						operation: operationName,
						duration_ms: duration,
						threshold_ms: 1000,
					});
				}

				return result;
			})
			.catch((error) => {
				logger.error("Operation failed", {
					operation: operationName,
					duration_ms: performance.now() - startTime,
					error: error.message,
				});
				throw error;
			});
	}
}

/**
 * Usage
 */
const perfLogger = new PerformanceLogger();

await perfLogger.measure("snapshot_creation", () =>
	snapback.createSnapshot(files)
);
```

---

## ✅ CODE REVIEW CHECKLIST

### Before Creating PR

```markdown
## Functionality

-   [ ] Feature works as intended
-   [ ] All tests pass (pnpm test)
-   [ ] Manual testing completed
-   [ ] Edge cases handled

## Code Quality

-   [ ] No console.log statements (use logger)
-   [ ] No commented-out code
-   [ ] No TODOs without issue links
-   [ ] TypeScript strict mode passes
-   [ ] No 'any' types (use proper types)

## Testing

-   [ ] Unit tests for new logic
-   [ ] Integration test for new workflow
-   [ ] Test coverage >80% for business logic
-   [ ] Tests follow patterns in this guide

## DX (Web Dashboard Only)

-   [ ] Loading states with skeletons
-   [ ] Error states with helpful messages
-   [ ] Success feedback (toasts, animations)
-   [ ] Hover states on interactive elements
-   [ ] Responsive design (mobile, tablet, desktop)
-   [ ] Animations use standard timings
-   [ ] Aceternity/Magic UI used appropriately
-   [ ] No layout shift (CLS)
-   [ ] Images optimized (next/image)
-   [ ] Code splitting for heavy components

## Architecture

-   [ ] Follows package boundaries (contracts → core → sdk → apps)
-   [ ] No circular dependencies
-   [ ] Proper error handling (return errors, don't throw)
-   [ ] Race conditions prevented (locks, debouncing)
-   [ ] State management appropriate (React vs SDK vs backend)

## Analytics

-   [ ] PostHog events added for new features
-   [ ] Event names follow convention (object_action_detail)
-   [ ] Event properties are descriptive
-   [ ] User properties updated if needed
-   [ ] Feature flags used for risky changes

## Logging

-   [ ] Appropriate log level used
-   [ ] Structured logging (objects, not strings)
-   [ ] Context propagated (operation_id, user_id)
-   [ ] User signals captured
-   [ ] Performance logged for slow operations
-   [ ] No sensitive data logged (passwords, tokens)

## Performance

-   [ ] No unnecessary re-renders
-   [ ] Debouncing on expensive operations
-   [ ] Images lazy loaded
-   [ ] Heavy components code-split
-   [ ] No memory leaks (cleanup useEffect)

## Documentation

-   [ ] JSDoc for public APIs
-   [ ] README updated if needed
-   [ ] Migration guide if breaking change
-   [ ] Examples added for complex features

## Security

-   [ ] No hardcoded secrets
-   [ ] User input sanitized
-   [ ] API routes authenticated
-   [ ] CORS configured correctly
-   [ ] Dependencies up to date (no critical CVEs)
```

---

### During Code Review

**As Reviewer:**

```markdown
## What to Look For

### Critical Issues (Block merge)

-   Security vulnerabilities
-   Data loss bugs
-   Performance regressions (>50% slower)
-   Breaking changes without migration
-   Missing tests for business logic

### Important Issues (Request changes)

-   Poor error handling
-   Missing analytics events
-   Non-standard patterns (deviates from guide)
-   Unclear naming
-   Missing documentation

### Nice to Have (Suggest, don't block)

-   Better variable names
-   More comments
-   Additional tests
-   Code organization
-   Optimization opportunities

## Review Workflow

1. **Understand the context**

    - Read the PR description
    - Understand the problem being solved
    - Check linked issues

2. **Check functionality**

    - Does it solve the problem?
    - Are edge cases handled?
    - What could go wrong?

3. **Check tests**

    - Do tests cover the changes?
    - Are tests meaningful?
    - Can I understand what's being tested?

4. **Check architecture**

    - Follows patterns in this guide?
    - Integrates cleanly with existing code?
    - No hidden dependencies?

5. **Check user experience**

    - Loading states?
    - Error messages helpful?
    - Animations smooth?
    - Responsive design?

6. **Check analytics/logging**

    - Events tracked?
    - Logs useful for debugging?
    - User signals captured?

7. **Approve or request changes**
    - Approve if all critical/important issues resolved
    - Request changes with clear explanations
    - Suggest nice-to-haves without blocking
```

---

## 🎯 TL;DR Quick Reference

### When Writing Tests

1. Test behavior, not implementation
2. Use Arrange-Act-Assert pattern
3. Write readable test names (sentences)
4. Keep tests focused (one concept per test)
5. Make tests fast (<100ms each)

### When Building Web UI

1. Always add loading states (skeletons)
2. Always add error states (helpful messages)
3. Always add success feedback (toasts, animations)
4. Use Aceternity for wow-factor, Magic UI for polish
5. Animations: 150ms hover, 300ms modal, 500ms transition

### When Integrating Components

1. Follow package boundaries (contracts → core → sdk → apps)
2. Use dependency injection (interfaces, not concrete classes)
3. Return errors (don't throw for expected failures)
4. Prevent race conditions (locks, debouncing)
5. Keep state in the right place (React vs SDK vs backend)

### When Adding Analytics

1. Use event constant (AnalyticsEvents.SNAPSHOT_CREATED)
2. Follow naming (object_action_detail)
3. Add descriptive properties
4. Track funnels for conversion
5. Use feature flags for experiments

### When Adding Logs

1. Use appropriate level (DEBUG, INFO, WARN, ERROR)
2. Always structure logs (objects, not strings)
3. Add context (operation_id, user_id)
4. Capture user signals
5. Log performance for slow operations

---

**Remember**: The goal is not perfect code. The goal is **shippable** code that works, is maintainable, and provides value to users.

Ship fast, iterate based on feedback, refactor with revenue.

🚀
