# SnapBack VS Code Extension - Architectural Assessment Report

**Date**: 2025-10-01
**Assessment Type**: System Architecture Investigation
**Severity**: CRITICAL - Extension Non-Functional at Runtime

---

## Executive Summary

The SnapBack VS Code extension exhibits **systemic architectural gaps** that prevent it from functioning at runtime despite comprehensive code implementation and extensive test coverage. The root cause is a **missing activation contract** between the extension manifest (package.json) and VS Code's extension lifecycle.

**Critical Finding**: The extension will **NEVER activate** in VS Code because the `activationEvents` field is completely missing from package.json.

---

## 1. Architectural Root Cause Analysis

### 1.1 Primary Issue: Missing Activation Contract

**Problem**: `package.json` lacks the `activationEvents` field entirely.

**Impact**:

-   Extension code never executes
-   All 17 registered commands remain dormant
-   All 7 tree view providers never initialize
-   Users cannot interact with any SnapBack functionality

**Evidence**:

```bash
$ jq '.activationEvents // "NOT_FOUND"' package.json
"NOT_FOUND"
```

### 1.2 VS Code Extension Lifecycle Failure

```
┌─ Expected Lifecycle ────────────────────────────────────────────────────┐
│ User triggers activation event (onStartupFinished, onCommand:*, etc.)   │
│                           ↓                                              │
│ VS Code checks activationEvents in package.json                         │
│                           ↓                                              │
│ VS Code loads extension.js and calls activate()                         │
│                           ↓                                              │
│ Extension initializes components and registers commands                 │
│                           ↓                                              │
│ Extension ready for user interaction                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Actual Current State ──────────────────────────────────────────────────┐
│ User installs extension                                                 │
│                           ↓                                              │
│ VS Code finds NO activationEvents in package.json                       │
│                           ↓                                              │
│ ❌ Extension NEVER activates (activate() never called)                  │
│                           ↓                                              │
│ All commands return "command not found" errors                          │
│ All views show empty or missing                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Secondary Issue: Context Variable Not Set

**Problem**: Views depend on `snapback.isActive` context variable that's never set.

**Code Location**: `/apps/vscode/src/extension.ts`

-   No call to `vscode.commands.executeCommand('setContext', 'snapback.isActive', true)`

**Impact**:

-   Even IF activation worked, views would be hidden
-   Package.json declares views with `"when": "snapback.isActive"` condition
-   6 out of 7 views become invisible to users

**Evidence from package.json**:

```json
{
	"id": "snapback.checkpointTimeline",
	"name": "Checkpoint Timeline",
	"when": "snapback.isActive" // ← This condition is NEVER true
}
```

### 1.4 Tertiary Issue: Missing Command Registration

**Analysis**: 21 commands declared in package.json vs 17 actually registered in code.

**Missing Command Implementations**:

1. `snapback.helloWorld` - Declared but never registered
2. `snapback.initialize` - Registered but NOT added to subscriptions initially
3. `snapback.showCheckpointDetails` - Registered but usage unclear
4. `snapback.showRiskDetails` - Registered but usage unclear

**Orphaned Command**: `snapback.snapBack` handler registered but NOT in subscription list

---

## 2. Extension Initialization Flow Analysis

### 2.1 Current Initialization Sequence

```typescript
┌─ Phase 1: Core Services (Lines 160-160) ───────────────────────────────┐
│ ✅ ServiceFederation initialized                                        │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 2: Foundation UI Components (Lines 173-175) ────────────────────┐
│ ✅ StatusBar, FileProtectionView, WelcomeView created                   │
│ ⚠️  BUT: Never visible because extension never activates                │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 3: Core Service Initialization (Lines 191-200) ─────────────────┐
│ ✅ NotificationManager, WorkspaceMemory, OperationCoordinator           │
│ ⚠️  BUT: Never instantiated because activate() never called             │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 4: Predictive Intelligence (Lines 214-220) ─────────────────────┐
│ ✅ SmartContextDetector, WorkflowIntegration, WorkflowView              │
│ ⚠️  BUT: Never created because extension never activates                │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 5: Analytics Views (Lines 229-230) ─────────────────────────────┐
│ ✅ CheckpointTimelineView, RiskDashboardView                            │
│ ⚠️  BUT: Never exist at runtime                                         │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 6: File Save Events (Lines 239-293) ────────────────────────────┐
│ ✅ onWillSaveTextDocument event handler                                 │
│ ⚠️  BUT: Event listener never registered                                │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 7: View Registration (Lines 321-342) ───────────────────────────┐
│ ✅ 7 TreeDataProviders and WebviewViewProviders registered              │
│ ⚠️  BUT: Registration never happens, views never appear                 │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 8: Status Configuration (Line 354) ─────────────────────────────┐
│ ✅ statusBar.setProtectionStatus("protected")                           │
│ ⚠️  BUT: Status bar never created                                       │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 9: MCP Service Registration (Lines 376-384) ────────────────────┐
│ ✅ Federation services registered                                       │
│ ⚠️  BUT: Federation never initialized                                   │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 10: Command Registration (Lines 426-1084) ──────────────────────┐
│ ✅ 17 commands registered with handlers                                 │
│ ⚠️  BUT: Commands never registered with VS Code                         │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Phase 11: Subscription Registration (Lines 962-1084) ─────────────────┐
│ ✅ Commands added to context.subscriptions                              │
│ ⚠️  BUT: context never exists because activate() never called           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency Chain Analysis

The extension implements a **well-architected dependency injection pattern**, but it's completely orphaned:

```
ServiceFederation (independent)
    ↓
StatusBar (independent) → Used by toggleAIMonitoring
    ↓
FileProtectionView (independent) → Depends on NO setContext call
    ↓
WelcomeView (independent) → Calls snapback.initialize (which exists!)
    ↓
NotificationManager (independent)
    ↓
WorkspaceMemoryManager (depends on: Storage)
    ↓
OperationCoordinator (depends on: WorkspaceMemory, NotificationManager, Storage)
    ↓
SmartContextDetector (depends on: WorkspaceMemory)
    ↓
WorkflowIntegration (depends on: SmartContextDetector, OperationCoordinator, NotificationManager)
    ↓
WorkflowView (depends on: WorkflowIntegration)
    ↓
CheckpointTimelineView (independent)
    ↓
RiskDashboardView (independent)
```

**Assessment**: Dependencies are properly ordered. The architecture is sound. **But none of it ever runs.**

---

## 3. Registration Pattern Analysis

### 3.1 Command Registration Pattern

**Current Pattern** (Lines 426-1084):

```typescript
const commandName = vscode.commands.registerCommand(
	"snapback.command",
	handler
);
context.subscriptions.push(commandName);
```

**Assessment**: ✅ Pattern is CORRECT and follows VS Code best practices

**Problem**: Pattern never executes because `activate()` never called

### 3.2 View Registration Pattern

**Current Pattern** (Lines 323-342):

```typescript
context.subscriptions.push(
	vscode.window.registerTreeDataProvider("snapback.viewId", viewProvider)
);
```

**Assessment**: ✅ Pattern is CORRECT

**Problem**: Views never appear because:

1. Registration never happens (no activation)
2. Even if registered, `when: "snapback.isActive"` prevents visibility

### 3.3 Systematic Registration Gap

**Analysis**: The registration architecture is **exemplary**. The problem is purely in the **activation contract**.

| Component Type | Declared | Implemented | Registered | Visible |
| -------------- | -------- | ----------- | ---------- | ------- |
| Commands       | 21       | 17          | 16         | ❌ 0    |
| TreeViews      | 6        | 6           | 6          | ❌ 0    |
| WebviewViews   | 1        | 1           | 1          | ❌ 0    |
| Status Bar     | 1        | 1           | 1          | ❌ 0    |

---

## 4. Component Integration Analysis

### 4.1 Package.json → Code Mapping

**Gap Analysis**:

```
┌─ Commands Declared but Not Registered ──────────────────────────────────┐
│ snapback.helloWorld                    → ❌ No implementation           │
│ snapback.showCheckpointDetails         → ⚠️  Implemented but unused     │
│ snapback.showRiskDetails               → ⚠️  Implemented but unused     │
│ snapback.snapBack                      → ⚠️  Implemented, not in subs   │
└──────────────────────────────────────────────────────────────────────────┘

┌─ Views Declared with Visibility Issues ─────────────────────────────────┐
│ snapback.checkpointTimeline            → when: "snapback.isActive"      │
│ snapback.riskDashboard                 → when: "snapback.isActive"      │
│ snapback.notifications                 → when: "snapback.isActive"      │
│ snapback.workspaceContext              → when: "snapback.isActive"      │
│ snapback.workflow                      → when: "snapback.isActive"      │
│ snapback.fileProtection                → when: "snapback.isActive"      │
│ snapback.welcome                       → when: "!snapback.isActive"     │
│                                                                          │
│ ⚠️  snapback.isActive is NEVER set to true anywhere in the code         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Architectural Integrity Assessment

**Component Quality**: ✅ EXCELLENT

-   Well-documented with JSDoc
-   Clear separation of concerns
-   Proper dependency injection
-   Comprehensive error handling
-   Good memory management patterns

**Integration Quality**: ❌ BROKEN

-   Activation contract missing
-   Context variables not set
-   Some commands orphaned
-   Views permanently hidden

---

## 5. System-Wide Impact Assessment

### 5.1 User Experience Impact

**Current State**: Extension appears to install successfully but is completely non-functional.

```
User Action                          → Result
────────────────────────────────────────────────────────────────────────────
Install extension                    → ✅ Success (but does nothing)
Open SnapBack sidebar                → ❌ Sidebar not available
Run command: "Create Checkpoint"     → ❌ "Command not found"
Try to see views                     → ❌ All views hidden/empty
Click status bar                     → ❌ No status bar item
File save triggers                   → ❌ No automatic protection
Use keyboard shortcuts               → ❌ Commands not bound
```

### 5.2 Ripple Effect Analysis

**Primary Failure**: Missing `activationEvents` in package.json

**Cascading Failures**:

1. Extension never loads → activate() never called
2. No components initialized → All services dormant
3. No commands registered → All commands return "not found"
4. No views registered → Sidebar remains empty
5. No event listeners → File protection inactive
6. Context never set → Views would be hidden even if registered
7. User confusion → Extension appears broken

### 5.3 Testing Architecture Implications

**Critical Gap**: Tests don't actually validate activation contract

**Test Coverage Analysis**:

```typescript
// From test/extension.test.ts:38-79
it("should register all expected commands on activation", async () => {
  const extension = await import("../src/extension");
  const mockContext = { ... };

  await extension.activate(mockContext);  // ← Directly calls activate()

  // Tests pass because we MANUALLY call activate()
  // In real VS Code: activate() NEVER called without activationEvents
});
```

**Why Tests Pass But Extension Fails**:

-   Tests manually invoke `activate()` function
-   Tests bypass VS Code's activation system
-   Tests don't validate package.json configuration
-   No integration test validates actual VS Code loading

**Test Architecture Flaw**: Tests validate **code correctness** but not **manifest correctness**

---

## 6. Root Cause: Architectural Pattern Mismatch

### 6.1 The Fundamental Problem

The extension uses **modern VS Code extension patterns** (excellent code) but has an **incomplete extension manifest** (broken packaging).

```
┌─ What Was Built ────────────────────────────────────────────────────────┐
│ ✅ Sophisticated service-oriented architecture                          │
│ ✅ Dependency injection with proper ordering                            │
│ ✅ Comprehensive error handling                                         │
│ ✅ MCP integration with fallback patterns                               │
│ ✅ Well-documented code with architectural diagrams                     │
│ ✅ Extensive test coverage (236 tests, 98% coverage)                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─ What Was Missing ──────────────────────────────────────────────────────┐
│ ❌ activationEvents in package.json                                     │
│ ❌ setContext call for view visibility                                  │
│ ❌ Complete command registration                                        │
│ ❌ Manifest validation in test suite                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 How This Happened

**Hypothesis**: Recent refactoring removed activation events:

Evidence from git history (commit e5505e4):

```
commit e5505e4 Improves VS Code extension architecture and features
```

**Likely Scenario**:

1. Initial package.json had `activationEvents`
2. Major refactoring ("Improves architecture") was performed
3. Someone regenerated or cleaned up package.json
4. `activationEvents` was removed in the process
5. Tests still passed (because they manually call activate())
6. No one noticed until runtime testing

---

## 7. Recommended Architecture

### 7.1 Required Fixes (Critical - Must Implement)

#### Fix 1: Add activationEvents to package.json

**Location**: `/apps/vscode/package.json` (after line 8)

```json
{
  "engines": {
    "vscode": "^1.75.0"
  },
  "activationEvents": [
    "onStartupFinished",
    "onView:snapback.welcome",
    "onView:snapback.checkpointTimeline",
    "onView:snapback.riskDashboard",
    "onView:snapback.notifications",
    "onView:snapback.workspaceContext",
    "onView:snapback.workflow",
    "onView:snapback.fileProtection",
    "onCommand:snapback.testMCPFederation",
    "onCommand:snapback.showStatus",
    "onCommand:snapback.createCheckpoint"
  ],
  "categories": [
    "Other",
```

**Rationale**:

-   `onStartupFinished` ensures extension activates when VS Code is ready
-   `onView:*` ensures extension activates when user opens any SnapBack view
-   `onCommand:*` ensures extension activates before command execution

#### Fix 2: Set snapback.isActive Context

**Location**: `/apps/vscode/src/extension.ts` (after line 354)

```typescript
statusBar.setProtectionStatus("protected");

// ← ADD THIS:
await vscode.commands.executeCommand("setContext", "snapback.isActive", true);
```

**Rationale**: Makes views visible after successful activation

#### Fix 3: Register Missing Commands

**Location**: `/apps/vscode/src/extension.ts` (after line 962)

```typescript
context.subscriptions.push(showStatus);
context.subscriptions.push(createCheckpoint);
context.subscriptions.push(snapBack); // ← ADD THIS LINE
context.subscriptions.push(showProtectionStatus);
```

**Rationale**: Ensures snapback.snapBack command is actually available

#### Fix 4: Remove or Implement snapback.helloWorld

**Option A**: Remove from package.json (lines 61-64)

```json
// DELETE THESE LINES:
{
  "command": "snapback.helloWorld",
  "title": "Hello World"
},
```

**Option B**: Implement in extension.ts (add after line 442)

```typescript
const helloWorld = vscode.commands.registerCommand(
	"snapback.helloWorld",
	() => {
		vscode.window.showInformationMessage("Hello from SnapBack!");
	}
);
context.subscriptions.push(helloWorld);
```

**Recommendation**: Remove (it's a template artifact)

### 7.2 Registration Architecture Best Practices

#### Pattern 1: Centralized Command Registration

**Current**: Commands scattered throughout activate() function
**Recommended**: Create command registration map

```typescript
// NEW: Add to extension.ts
const COMMAND_HANDLERS = {
	"snapback.showStatus": () =>
		vscode.window.showInformationMessage("SnapBack Status: Protected"),
	"snapback.createCheckpoint": async () => {
		/* handler */
	},
	"snapback.snapBack": async () => {
		/* handler */
	},
	// ... all commands
} as const;

// In activate():
for (const [command, handler] of Object.entries(COMMAND_HANDLERS)) {
	context.subscriptions.push(
		vscode.commands.registerCommand(command, handler)
	);
}
```

**Benefits**:

-   Single source of truth for all commands
-   Easy to validate against package.json
-   Prevents missing subscriptions
-   Simplifies testing

#### Pattern 2: View Registration Factory

**Current**: Individual view registrations
**Recommended**: Registration factory with validation

```typescript
// NEW: Add to extension.ts
interface ViewConfig {
	id: string;
	provider: vscode.TreeDataProvider<any> | vscode.WebviewViewProvider;
	type: "tree" | "webview";
}

const VIEWS: ViewConfig[] = [
	{
		id: "snapback.fileProtection",
		provider: fileProtectionView,
		type: "tree",
	},
	{ id: "snapback.notifications", provider: notificationsView, type: "tree" },
	// ... all views
];

function registerViews(context: vscode.ExtensionContext, views: ViewConfig[]) {
	for (const view of views) {
		if (view.type === "tree") {
			context.subscriptions.push(
				vscode.window.registerTreeDataProvider(view.id, view.provider)
			);
		} else {
			context.subscriptions.push(
				vscode.window.registerWebviewViewProvider(
					view.id,
					view.provider
				)
			);
		}
	}
}
```

**Benefits**:

-   Type-safe view registration
-   Easy to iterate and validate
-   Prevents missing registrations
-   Supports programmatic testing

#### Pattern 3: Activation Event Validation

**NEW: Add validation helper**

```typescript
// NEW FILE: src/utils/manifestValidator.ts
import packageJson from "../../package.json";

export function validateManifest(): string[] {
	const errors: string[] = [];

	// Validate activationEvents exist
	if (
		!packageJson.activationEvents ||
		packageJson.activationEvents.length === 0
	) {
		errors.push("Missing activationEvents in package.json");
	}

	// Validate all commands have activation events
	const commands =
		packageJson.contributes?.commands?.map((c) => c.command) || [];
	const activationCommands =
		packageJson.activationEvents?.filter((e) =>
			e.startsWith("onCommand:")
		) || [];

	for (const command of commands) {
		if (!activationCommands.includes(`onCommand:${command}`)) {
			// OK if onStartupFinished exists
			if (!packageJson.activationEvents?.includes("onStartupFinished")) {
				errors.push(`Command ${command} has no activation event`);
			}
		}
	}

	return errors;
}
```

**Usage in activate()**:

```typescript
export async function activate(context: vscode.ExtensionContext) {
	// Validate manifest at activation time
	const manifestErrors = validateManifest();
	if (manifestErrors.length > 0) {
		console.error("Manifest validation errors:", manifestErrors);
		vscode.window.showErrorMessage(
			`SnapBack: Configuration errors - ${manifestErrors.join(", ")}`
		);
	}

	// ... rest of activation
}
```

---

## 8. Testing Strategy Recommendations

### 8.1 Add Manifest Validation Tests

**NEW FILE**: `test/manifest-validation.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import * as extension from "../src/extension";

describe("Extension Manifest Validation", () => {
	it("should have activationEvents defined", () => {
		expect(packageJson.activationEvents).toBeDefined();
		expect(packageJson.activationEvents.length).toBeGreaterThan(0);
	});

	it("should have onStartupFinished activation event", () => {
		expect(packageJson.activationEvents).toContain("onStartupFinished");
	});

	it("should declare all views with activation events", () => {
		const views = packageJson.contributes?.views?.snapback || [];
		const viewActivations =
			packageJson.activationEvents?.filter((e) =>
				e.startsWith("onView:")
			) || [];

		for (const view of views) {
			const expectedActivation = `onView:${view.id}`;
			expect(
				viewActivations,
				`Missing activation for view ${view.id}`
			).toContain(expectedActivation);
		}
	});

	it("should have matching command declarations and implementations", () => {
		const declaredCommands =
			packageJson.contributes?.commands?.map((c) => c.command) || [];

		// This requires runtime introspection - see next test pattern
		expect(declaredCommands.length).toBeGreaterThan(0);
	});
});
```

### 8.2 Add Runtime Registration Validation Tests

**ENHANCEMENT**: `test/extension.test.ts`

```typescript
it("should set snapback.isActive context after activation", async () => {
	const extension = await import("../src/extension");
	const mockContext = createMockContext();

	await extension.activate(mockContext);

	// Verify setContext was called
	const setContextCalls = mockCommands.executeCommand.mock.calls.filter(
		(call) => call[0] === "setContext" && call[1] === "snapback.isActive"
	);

	expect(setContextCalls.length).toBe(1);
	expect(setContextCalls[0][2]).toBe(true);
});

it("should register all views declared in package.json", async () => {
	const extension = await import("../src/extension");
	const mockContext = createMockContext();

	await extension.activate(mockContext);

	const expectedViews = [
		"snapback.fileProtection",
		"snapback.notifications",
		"snapback.workspaceContext",
		"snapback.workflow",
		"snapback.checkpointTimeline",
		"snapback.riskDashboard",
		"snapback.welcome",
	];

	for (const viewId of expectedViews) {
		const registrationCall =
			mockWindow.registerTreeDataProvider.mock.calls.find(
				(call) => call[0] === viewId
			) ||
			mockWindow.registerWebviewViewProvider.mock.calls.find(
				(call) => call[0] === viewId
			);

		expect(
			registrationCall,
			`View ${viewId} should be registered`
		).toBeDefined();
	}
});
```

### 8.3 Add E2E Activation Tests

**NEW FILE**: `test/e2e/activation.e2e.test.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Extension Activation", () => {
	test("should activate when VS Code starts", async ({ page }) => {
		// This requires VS Code E2E test setup
		await page.goto("vscode://");

		// Check that SnapBack views are available
		const sidebar = await page.locator('[aria-label="SnapBack"]');
		await expect(sidebar).toBeVisible();

		// Check that commands are registered
		await page.keyboard.press("F1"); // Open command palette
		await page.fill("input", "SnapBack: Show Status");
		const statusCommand = await page.locator("text=SnapBack: Show Status");
		await expect(statusCommand).toBeVisible();
	});

	test("should show welcome view on first activation", async ({ page }) => {
		// Clear any existing state
		// Open SnapBack sidebar
		// Verify welcome view is visible
	});
});
```

### 8.4 Add CI/CD Validation

**NEW FILE**: `.github/workflows/validate-manifest.yml`

```yaml
name: Validate Extension Manifest

on: [push, pull_request]

jobs:
    validate:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: 20

            - name: Validate activationEvents exist
              run: |
                  if ! jq -e '.activationEvents' apps/vscode/package.json > /dev/null; then
                    echo "ERROR: activationEvents missing from package.json"
                    exit 1
                  fi

            - name: Validate command count matches
              run: |
                  DECLARED=$(jq '.contributes.commands | length' apps/vscode/package.json)
                  echo "Declared commands: $DECLARED"
                  # Add validation logic to check against implementation

            - name: Run manifest validation tests
              run: npm test -- manifest-validation.test.ts
```

---

## 9. Quality Assurance Recommendations

### 9.1 Pre-Deployment Checklist

**Manual Validation Steps**:

```bash
# 1. Validate activationEvents exist
jq '.activationEvents' package.json

# 2. Count declared vs implemented commands
DECLARED=$(jq '.contributes.commands | length' package.json)
IMPLEMENTED=$(grep -c "registerCommand" src/extension.ts)
echo "Declared: $DECLARED, Implemented: $IMPLEMENTED"

# 3. Validate view registrations
jq '.contributes.views.snapback[].id' package.json | sort > /tmp/declared-views
grep "registerTreeDataProvider\|registerWebviewViewProvider" src/extension.ts | \
  sed 's/.*"\(snapback\.[^"]*\)".*/\1/' | sort > /tmp/registered-views
diff /tmp/declared-views /tmp/registered-views

# 4. Check for setContext calls
grep -n "setContext.*snapback.isActive" src/extension.ts

# 5. Test package in dev mode
vsce package
# Install .vsix in VS Code Dev Host and test manually
```

### 9.2 Automated Validation Tools

**Package Script Addition** (`package.json`):

```json
{
	"scripts": {
		"validate": "node scripts/validate-manifest.js",
		"validate:watch": "nodemon --watch src --watch package.json --exec npm run validate"
	}
}
```

**NEW FILE**: `scripts/validate-manifest.js`

```javascript
const fs = require("fs");
const path = require("path");

const packageJson = require("../package.json");
const extensionTs = fs.readFileSync(
	path.join(__dirname, "../src/extension.ts"),
	"utf8"
);

let errors = 0;

// Check 1: activationEvents exist
if (
	!packageJson.activationEvents ||
	packageJson.activationEvents.length === 0
) {
	console.error("❌ CRITICAL: Missing activationEvents in package.json");
	errors++;
} else {
	console.log(
		"✅ activationEvents found:",
		packageJson.activationEvents.length,
		"events"
	);
}

// Check 2: Commands declared vs implemented
const declaredCommands =
	packageJson.contributes?.commands?.map((c) => c.command) || [];
const implementedCommands = [
	...extensionTs.matchAll(/registerCommand\("([^"]+)"/g),
].map((m) => m[1]);

console.log("\n📋 Command Analysis:");
console.log("  Declared:", declaredCommands.length);
console.log("  Implemented:", implementedCommands.length);

for (const cmd of declaredCommands) {
	if (!implementedCommands.includes(cmd)) {
		console.error(`  ❌ Declared but not implemented: ${cmd}`);
		errors++;
	}
}

// Check 3: setContext for view visibility
if (
	!extensionTs.includes("setContext") ||
	!extensionTs.includes("snapback.isActive")
) {
	console.warn("⚠️  WARNING: No setContext call for snapback.isActive found");
	errors++;
}

console.log("\n" + "=".repeat(60));
if (errors === 0) {
	console.log("✅ Manifest validation passed!");
	process.exit(0);
} else {
	console.error(`❌ Manifest validation failed with ${errors} error(s)`);
	process.exit(1);
}
```

---

## 10. Migration Plan

### 10.1 Immediate Actions (Priority 1 - Critical)

1. **Add activationEvents to package.json** [30 minutes]

    - Location: After engines field
    - Include: onStartupFinished, onView:_, key onCommand:_ entries

2. **Add setContext call to extension.ts** [15 minutes]

    - Location: After line 354
    - Call: `vscode.commands.executeCommand('setContext', 'snapback.isActive', true)`

3. **Fix snapback.snapBack registration** [10 minutes]

    - Location: Line 963
    - Add: `context.subscriptions.push(snapBack)`

4. **Test in VS Code Dev Host** [1 hour]
    - Package extension with vsce
    - Install in dev VS Code instance
    - Validate all commands work
    - Validate all views appear

**Total Time**: ~2 hours
**Risk**: Low (purely additive changes)
**Impact**: Extension becomes functional

### 10.2 Follow-Up Actions (Priority 2 - Important)

1. **Add manifest validation tests** [2 hours]

    - Create test/manifest-validation.test.ts
    - Add runtime registration tests
    - Update CI/CD pipeline

2. **Remove/Implement snapback.helloWorld** [30 minutes]

    - Decision: Remove from package.json (recommended)
    - Or: Implement simple handler

3. **Implement snapback.showCheckpointDetails usage** [1 hour]

    - Connect to CheckpointTimelineView
    - Add context menu items
    - Test interaction flow

4. **Implement snapback.showRiskDetails usage** [1 hour]
    - Connect to RiskDashboardView
    - Add context menu items
    - Test interaction flow

**Total Time**: ~5 hours
**Risk**: Low
**Impact**: Complete feature set, improved testing

### 10.3 Long-Term Improvements (Priority 3 - Enhancement)

1. **Centralized command registration** [4 hours]

    - Refactor to command map pattern
    - Add type safety
    - Improve testability

2. **View registration factory** [3 hours]

    - Create registration abstraction
    - Add validation logic
    - Improve error handling

3. **E2E activation tests** [6 hours]

    - Set up Playwright for VS Code
    - Add activation scenarios
    - Add command execution tests

4. **CI/CD manifest validation** [2 hours]
    - Add GitHub Actions workflow
    - Add pre-commit hooks
    - Add package validation script

**Total Time**: ~15 hours
**Risk**: Low-Medium (refactoring)
**Impact**: Better maintainability, prevent future issues

---

## 11. Conclusion

### 11.1 Summary of Findings

The SnapBack VS Code extension exhibits a **paradoxical state**:

-   **Code Quality**: Excellent - sophisticated architecture, comprehensive testing
-   **Runtime Functionality**: Zero - extension never activates

**Root Cause**: Missing `activationEvents` in package.json prevents VS Code from ever calling the activation function.

**Systemic Issues**:

1. No activation contract in manifest
2. Context variables never set for view visibility
3. Some commands incompletely registered
4. Tests don't validate manifest correctness

### 11.2 Architectural Assessment Rating

| Category                 | Rating | Notes                                               |
| ------------------------ | ------ | --------------------------------------------------- |
| Code Architecture        | A+     | Excellent DI, separation of concerns, documentation |
| Component Quality        | A+     | Well-designed, comprehensive error handling         |
| Integration Architecture | F      | Missing activation contract, broken at runtime      |
| Registration Patterns    | A      | Correct patterns, but never execute                 |
| Testing Architecture     | B-     | Good code coverage, missing manifest validation     |
| Overall System           | F      | Non-functional due to manifest issues               |

### 11.3 Path Forward

**Immediate Fix** (Critical):

-   Add activationEvents to package.json
-   Add setContext call
-   Fix missing command subscription
-   Test in VS Code Dev Host

**Estimated Time to Functional**: 2-3 hours
**Complexity**: Low
**Risk**: Minimal

**Long-Term Improvements**:

-   Add manifest validation
-   Refactor registration architecture
-   Enhance test coverage
-   Add CI/CD validation

**Estimated Time for Complete Remediation**: 20-25 hours over 1-2 sprints

### 11.4 Key Takeaways

1. **Testing Gap**: Unit tests can pass while extension is completely broken
2. **Manifest Criticality**: VS Code extensions are only as good as their package.json
3. **Validation Importance**: Need both code AND manifest validation
4. **E2E Testing**: Essential for catching runtime activation issues

**Recommendation**: Treat package.json as critical infrastructure code requiring validation.

---

## Appendix A: File Locations

### Files Requiring Changes

**Critical**:

-   `/apps/vscode/package.json` - Add activationEvents
-   `/apps/vscode/src/extension.ts` - Add setContext call, fix subscriptions

**Important**:

-   `/apps/vscode/test/manifest-validation.test.ts` - NEW: Add validation tests
-   `/apps/vscode/scripts/validate-manifest.js` - NEW: Add validation script

**Enhancement**:

-   `/apps/vscode/.github/workflows/validate-manifest.yml` - NEW: Add CI validation
-   `/apps/vscode/src/utils/manifestValidator.ts` - NEW: Add runtime validation

### Key Line Numbers

-   `package.json:8` - Add activationEvents after engines
-   `extension.ts:354` - Add setContext call after statusBar.setProtectionStatus
-   `extension.ts:963` - Add snapBack to subscriptions
-   `package.json:61-64` - Remove snapback.helloWorld command

---

## Appendix B: Complete activationEvents Recommendation

```json
"activationEvents": [
  "*",
  "onStartupFinished",
  "onView:snapback.welcome",
  "onView:snapback.checkpointTimeline",
  "onView:snapback.riskDashboard",
  "onView:snapback.notifications",
  "onView:snapback.workspaceContext",
  "onView:snapback.workflow",
  "onView:snapback.fileProtection",
  "onCommand:snapback.testMCPFederation",
  "onCommand:snapback.testMCPFederationComprehensive",
  "onCommand:snapback.showStatus",
  "onCommand:snapback.createCheckpoint",
  "onCommand:snapback.snapBack",
  "onCommand:snapback.showProtectionStatus",
  "onCommand:snapback.protectCurrentFile",
  "onCommand:snapback.analyzeRisk",
  "onCommand:snapback.autoCheckpointBranch",
  "onCommand:snapback.refreshViews",
  "onCommand:snapback.applyWorkflowSuggestion",
  "onCommand:snapback.autoApplySuggestions",
  "onCommand:snapback.toggleAIMonitoring",
  "onCommand:snapback.showAIMonitoringStatus"
]
```

**Note**: The `"*"` activation event ensures extension activates for all workspaces. Consider if this is desired behavior or if specific triggers are preferred.

---

**Report End**
