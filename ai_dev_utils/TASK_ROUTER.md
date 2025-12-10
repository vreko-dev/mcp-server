# Intelligent Task Router

**Purpose:** Automatic context detection and workflow routing for TDD tasks

**Entry Point:** Use this instead of manually loading TDD_CORE.md

---

## How It Works

```
User Input → Context Detection → Task Classification → Auto-Route → Execute Workflow
```

---

## Step 1: Analyze Your Task Description

**Provide your task in natural language:**

```
Examples:
- "Fix the sign-in button not working in VS Code extension"
- "Add user analytics to the web dashboard"
- "The API returns 500 when creating snapshots"
- "Extract duplicated auth logic into a shared helper"
```

**I will automatically detect:**

### Context Signals

| Signal | Detected Context | Workflow |
|--------|-----------------|----------|
| "VS Code", "extension", "command", "activation" | `apps/vscode/` | Extension Workflow |
| "API", "endpoint", "backend", "database", "service" | `apps/api/` | Backend Workflow |
| "web", "dashboard", "component", "React", "Next.js" | `apps/web/` | Frontend Workflow |
| Multiple contexts mentioned | Full-stack | Multi-Context Workflow |

### Task Type Signals

| Signal | Task Type | Priority |
|--------|-----------|----------|
| "fix", "broken", "not working", "error", "bug" | BUG_FIX | P1-P2 |
| "add", "implement", "create", "new feature" | NEW_FEATURE | P2-P3 |
| "extract", "refactor", "clean up", "consolidate" | REFACTORING | P3-P4 |
| "production", "critical", "P0", "emergency" | HOTFIX | P0 |

---

## Step 2: Auto-Generated Workflow Configuration

Based on detection, I create:

```json
{
  "task": "[YOUR_DESCRIPTION]",
  "detectedContext": "apps/vscode" | "apps/api" | "apps/web" | "multi-context",
  "taskType": "BUG_FIX" | "NEW_FEATURE" | "REFACTORING" | "HOTFIX",
  "priority": "P0" | "P1" | "P2" | "P3" | "P4",
  "workflowConfig": {
    "phase0": {
      "skipServiceSearch": true | false,
      "focusAreas": ["commands", "services", "components"],
      "contextRules": "Extension | Backend | Frontend"
    },
    "phase1": {
      "testPattern": "VSCode | API | React",
      "testLocation": "apps/vscode/test/unit | apps/api/src/services/__tests__ | apps/web/components/__tests__"
    },
    "phase2": {
      "implementationScope": "apps/vscode/src | apps/api/src | apps/web"
    },
    "phase4": {
      "contextChecks": ["activation-race", "service-layer", "component-logic"]
    }
  }
}
```

---

## Step 3: Conveyor Belt Execution

### Automatic Phase Progression

```
PHASE 0 (Architecture Audit)
    ↓ Auto-apply context rules
    ↓ Auto-search canonical locations
    ↓ Auto-detect if already fixed
    ↓ GATE: audit
    ↓
PHASE 1 (RED - Failing Test)
    ↓ Auto-select test pattern (VSCode/API/React)
    ↓ Auto-create test file in correct location
    ↓ Guide you through writing failing test
    ↓ Auto-capture evidence
    ↓ GATE: red
    ↓
PHASE 2 (GREEN - Implementation)
    ↓ Auto-detect minimal change threshold
    ↓ Guide implementation in correct location
    ↓ Auto-verify test passes
    ↓ Auto-capture evidence
    ↓ GATE: green
    ↓
PHASE 3 (REFACTOR)
    ↓ Auto-detect duplication
    ↓ Auto-suggest extractions
    ↓ Verify tests still pass
    ↓ GATE: refactor
    ↓
PHASE 4 (Quality Verification)
    ↓ Auto-run context-specific checks
    ↓ Auto-verify 4-path coverage
    ↓ Auto-check for pitfalls
    ↓ GATE: quality
    ↓
PHASE 5 (Certification)
    ↓ Auto-generate coverage matrix
    ↓ Auto-collect all evidence
    ↓ Auto-create certification
    ↓ GATE: certify
    ↓
DONE ✅
```

---

## Context-Specific Workflows

### 🔌 Extension Workflow (`apps/vscode/`)

**Auto-configured for:**
- Command registration patterns
- Extension activation order
- Disposable cleanup
- VS Code API testing (unit tests, not integration)

**Auto-loaded rules:**
```markdown
✅ Commands in apps/vscode/src/commands/
✅ Services in apps/vscode/src/services/
✅ Test pattern: Vitest with mocked VS Code API
✅ Check: No activation races
✅ Check: Disposables registered
```

**Example auto-routing:**
```
Input: "Fix sign-in command not registered"
→ Context: Extension
→ Type: BUG_FIX
→ Phase 0: Skip service search, check commands/authCommands.ts
→ Phase 1: Use VSCode test pattern
→ Phase 4: Check activation order, disposables
```

---

### 🖥️ Backend Workflow (`apps/api/`)

**Auto-configured for:**
- Service layer architecture
- Database access patterns
- Procedure vs. service separation
- Drizzle ORM patterns

**Auto-loaded rules:**
```markdown
✅ Business logic in apps/api/src/services/
✅ No DB queries in procedures
✅ Test pattern: Vitest with setupTestDatabase()
✅ Check: Service layer compliance
✅ Check: No inline queries
```

**Example auto-routing:**
```
Input: "Add user analytics endpoint to API"
→ Context: Backend
→ Type: NEW_FEATURE
→ Phase 0: Search for existing analytics service
→ Phase 1: Use API service test pattern
→ Phase 4: Verify no procedure bypasses
```

---

### 🌐 Frontend Workflow (`apps/web/`)

**Auto-configured for:**
- Component structure
- Hook patterns
- Server actions
- Client/Server separation

**Auto-loaded rules:**
```markdown
✅ Components in apps/web/components/
✅ Business logic in hooks or server actions
✅ Test pattern: React Testing Library
✅ Check: No business logic in components
✅ Check: Server-side validation
```

**Example auto-routing:**
```
Input: "Create dashboard metrics widget"
→ Context: Frontend
→ Type: NEW_FEATURE
→ Phase 0: Check for existing components
→ Phase 1: Use React test pattern
→ Phase 4: Verify component structure
```

---

### 🔄 Multi-Context Workflow (Full-Stack)

**Auto-configured for:**
- API + Frontend coordination
- Contract/type sharing
- End-to-end flow testing

**Auto-loaded rules:**
```markdown
✅ Start with contracts (@snapback/contracts)
✅ Backend service first, then frontend
✅ Test each layer independently
✅ Integration test for E2E flow
```

**Example auto-routing:**
```
Input: "Add real-time notifications to dashboard"
→ Context: Multi-context (API + Web)
→ Type: NEW_FEATURE
→ Phase 0: Plan both backend event system + frontend component
→ Phase 1: Tests for both layers
→ Phases 2-5: Execute for each context sequentially
```

---

## Usage Examples

### Example 1: Extension Bug Fix

**Your input:**
```
"The auth listener fires before UserIdentityService is initialized, causing crashes"
```

**My auto-detection:**
```json
{
  "context": "apps/vscode/",
  "taskType": "BUG_FIX",
  "priority": "P1",
  "signals": ["auth", "listener", "initialized", "crashes"],
  "workflowConfig": {
    "phase0": {
      "skipServiceSearch": true,
      "checkFiles": ["extension.ts", "services/UserIdentityService.ts"],
      "knownIssue": "Activation race pattern"
    }
  }
}
```

**Auto-executed workflow:**
1. ✅ Phase 0: Check activation order in extension.ts
2. ✅ Phase 1: Create test proving listener fires before service
3. ✅ Phase 2: Move listener registration after service init
4. ✅ Phase 3: No refactoring needed (minimal change)
5. ✅ Phase 4: Verify activation order
6. ✅ Phase 5: Certify fix

---

### Example 2: Backend Feature

**Your input:**
```
"Add endpoint to get AI tool usage counts for dashboard metrics"
```

**My auto-detection:**
```json
{
  "context": "apps/api/",
  "taskType": "NEW_FEATURE",
  "priority": "P2",
  "signals": ["endpoint", "AI tool", "dashboard metrics"],
  "workflowConfig": {
    "phase0": {
      "searchServices": ["metrics-aggregator", "analytics-service"],
      "checkContracts": true
    }
  }
}
```

**Auto-executed workflow:**
1. ✅ Phase 0: Search for MetricsAggregator service
2. ✅ Phase 1: Create service test for getAIToolCounts()
3. ✅ Phase 2: Implement in service, add procedure
4. ✅ Phase 3: Extract constants, clean up
5. ✅ Phase 4: Verify no service bypasses
6. ✅ Phase 5: Certify with 4-path coverage

---

### Example 3: Frontend Component

**Your input:**
```
"Build a snapshot timeline component for the dashboard"
```

**My auto-detection:**
```json
{
  "context": "apps/web/",
  "taskType": "NEW_FEATURE",
  "priority": "P3",
  "signals": ["component", "dashboard"],
  "workflowConfig": {
    "phase0": {
      "checkComponents": true,
      "checkHooks": true
    }
  }
}
```

**Auto-executed workflow:**
1. ✅ Phase 0: Check for existing timeline components
2. ✅ Phase 1: React Testing Library test
3. ✅ Phase 2: Create component + hook
4. ✅ Phase 3: Extract shared utilities
5. ✅ Phase 4: Verify no business logic in component
6. ✅ Phase 5: Certify

---

### Example 4: Multi-Context

**Your input:**
```
"Add live collaboration feature - users can see each other's cursors"
```

**My auto-detection:**
```json
{
  "context": "multi-context",
  "taskType": "NEW_FEATURE",
  "priority": "P2",
  "signals": ["live", "collaboration", "users"],
  "contexts": ["apps/api", "apps/web"],
  "workflowConfig": {
    "execution": "sequential",
    "order": ["contracts", "backend", "frontend"]
  }
}
```

**Auto-executed workflow:**
1. ✅ Phase 0: Plan contracts, WebSocket service, React component
2. ✅ Execute full TDD for backend (Phases 1-5)
3. ✅ Execute full TDD for frontend (Phases 1-5)
4. ✅ Integration test for E2E flow
5. ✅ Final certification

---

## Activation

**Instead of manually loading files, just say:**

```
"Route my task: [YOUR DESCRIPTION]"
```

**I will:**
1. Analyze your description
2. Detect context + task type
3. Show you the auto-configuration
4. Ask for confirmation
5. Execute the conveyor belt workflow

**Example conversation:**

**You:** "Route my task: Fix the dashboard loading spinner that never stops"

**Me:**
```
🔍 Task Analysis:
   Context: Frontend (apps/web/)
   Type: BUG_FIX
   Priority: P2

📋 Auto-Configuration:
   Phase 0: Check loading state management, API calls
   Phase 1: React Testing Library (render + waitFor)
   Phase 4: Verify no business logic in component

▶️ Execute this workflow? (yes/no)
```

**You:** "yes"

**Me:** *Proceeds through entire TDD workflow automatically*

---

## Benefits

✅ **No manual file loading** - Auto-loads correct phase docs
✅ **No context confusion** - Auto-applies correct rules
✅ **No missed steps** - Conveyor belt ensures completeness
✅ **Faster execution** - Pre-configured for your context
✅ **Consistent quality** - Same rigorous process every time

---

## Future Enhancements

**Planned:**
- [ ] Auto-detect urgency from keywords (P0/P1/P2)
- [ ] Auto-create GitHub issue from task description
- [ ] Auto-link related tasks
- [ ] Auto-suggest test cases based on context
- [ ] Auto-generate PR description from certification

---

**Ready to use:** Just say "Route my task: [description]"

**Last Updated:** 2025-12-10
