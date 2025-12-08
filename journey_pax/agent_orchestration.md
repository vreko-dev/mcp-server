## LLM Agent Orchestration Strategy

### Problem with Current Approach
- Agents lack bounded context → hallucination, drift
- No coordination protocol → file conflicts
- Ad-hoc prompting → inconsistent quality
- No verification gates → bugs compound

---

## Proposed Architecture: Journey-Driven Development (JDD)

```
.claude/
├── journeys/                    # User journeys (work units)
│   ├── 01-waitlist-signup/
│   ├── 02-oauth-activation/
│   ├── 03-api-key-generation/
│   └── ...
├── standards/                   # Shared constraints
│   ├── typescript.md
│   ├── testing.md
│   ├── error-handling.md
│   └── security.md
├── architecture/                # System context
│   ├── token-flow.md
│   ├── data-model.md
│   └── component-map.md
├── patterns/                    # Extracted from codebase
│   ├── api-route.example.ts
│   ├── server-action.example.ts
│   ├── orpc-procedure.example.ts
│   └── test.example.ts
└── coordination/                # Agent sync
    ├── LOCK.md                  # Currently locked files
    ├── DONE.md                  # Completed work units
    └── BLOCKED.md               # Dependencies
```

---

## Journey Kit Structure

Each journey directory contains everything an agent needs:

```
journeys/03-api-key-generation/
├── SPEC.md                      # What to build
├── SCOPE.md                     # Files to touch (explicit boundaries)
├── DEPENDENCIES.md              # Must be complete first
├── ACCEPTANCE.md                # How to verify success
├── CONTEXT.md                   # Architecture excerpts relevant to this
├── tests/
│   └── cases.md                 # Test cases (RED phase input)
└── STATUS.md                    # Current state (PENDING/RED/GREEN/REFACTOR/DONE)
```

### SPEC.md Example
```markdown
# Journey: API Key Generation

## User Story
As a Pro user, I can create an API key from the dashboard
so that I can authenticate MCP/CLI.

## Actors
- User (authenticated, Pro+ tier)
- Web Dashboard
- API Server

## Flow
1. User clicks "Create API Key" on /app/api-keys
2. Modal opens, user enters name
3. Submit calls createApiKeyAction
4. Action validates session + tier
5. Action calls ORPC apiKeys.create
6. Backend generates key, stores hash
7. Returns { key, id, prefix }
8. UI shows key ONCE (not stored)

## Constraints
- Free tier: REJECT with upgrade prompt
- Key shown once, never retrievable
- Name: 1-50 chars, alphanumeric + dash
```

### SCOPE.md Example
```markdown
# Scope: API Key Generation

## Files to CREATE
- apps/web/app/(saas)/app/api-keys/actions.test.ts

## Files to MODIFY
- apps/web/app/(saas)/app/api-keys/actions.ts

## Files to READ (context only)
- apps/web/modules/shared/lib/orpc-client.ts
- apps/api/modules/apikeys/procedures/create-api-key.ts
- packages/auth/src/index.ts

## Files OFF-LIMITS
- Everything else
```

### ACCEPTANCE.md Example
```markdown
# Acceptance: API Key Generation

## Automated
- [ ] `pnpm test apps/web/app/(saas)/app/api-keys/actions.test.ts` passes
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean

## Manual
- [ ] Login as Pro user → Create key → Key displayed
- [ ] Login as Free user → Create key → Upgrade prompt
- [ ] Database has new row in api_keys with hashed key

## Integration
- [ ] Use generated key with MCP → authenticated
- [ ] Use generated key with CLI → authenticated
```

---

## Agent Coordination Protocol

### File Locking via Comments
```typescript
// @agent:lock owner=agent-3 journey=03-api-key expires=2024-12-07T18:00:00Z
// @agent:wip RED phase - tests written, implementation pending
export async function createApiKeyAction(name: string) {
  // @agent:todo Implement ORPC call - see SPEC.md#flow-step-5
  throw new Error("Not implemented");
}
// @agent:unlock
```

### Status Protocol
```markdown
# STATUS.md

current: RED
started: 2024-12-07T16:30:00Z
agent: claude-agent-3
blockers: none
notes: Tests written, 8/8 failing as expected

## History
- 2024-12-07T16:00:00Z - PENDING → RED (agent-3)
```

---

## Parallel Work Strategy

### Dependency Graph
```
01-waitlist-signup ──────────────────────────┐
                                             │
02-oauth-activation ─────────────────────────┼──→ 07-dashboard-data
                                             │
03-api-key-generation ───┬───────────────────┘
                         │
                         ├──→ 08-mcp-analyze-risk
                         ├──→ 09-mcp-checkpoints
                         ├──→ 14-cli-check-staged
                         └──→ 15-cli-snapshot-create
```

### Parallelization Rules
1. **No shared files** → Full parallel
2. **Read-only overlap** → Full parallel
3. **Write overlap** → Sequential with lock
4. **Dependency chain** → Wait for DONE status

---

## Agent Prompt Template

```markdown
# Task: Implement Journey [NUMBER]

## Your Identity
You are implementing ONE user journey for SnapBack.
You have BOUNDED SCOPE - do not touch files outside SCOPE.md.

## Inputs (read these first)
1. journeys/[NUMBER]/SPEC.md - What to build
2. journeys/[NUMBER]/SCOPE.md - File boundaries
3. journeys/[NUMBER]/tests/cases.md - Test cases
4. standards/testing.md - Test patterns
5. patterns/[relevant].example.ts - Code patterns

## Protocol
1. Update STATUS.md → RED
2. Write failing tests per cases.md
3. Run tests, confirm all fail
4. Update STATUS.md with test count
5. Implement minimal code to pass
6. Run tests, confirm all pass
7. Update STATUS.md → GREEN
8. Refactor (no new functionality)
9. Run tests, confirm still pass
10. Update STATUS.md → DONE
11. Remove @agent:lock comments

## Constraints
- NO changes outside SCOPE.md files
- NO skipping test phase
- NO @agent:todo left in final code
- MATCH patterns exactly from patterns/
- STOP if you hit a blocker, update BLOCKED.md

## Output
Reply with:
1. Files created/modified (with content)
2. Test results (pass/fail count)
3. STATUS.md update
```

---

## Quality Gates

### Per-Journey Gates
```yaml
gate_red:
  - tests exist
  - tests fail
  - test count matches cases.md

gate_green:
  - all tests pass
  - no typescript errors
  - no lint errors

gate_refactor:
  - tests still pass
  - no @agent:todo comments
  - no @agent:lock comments
  - matches patterns/*
```

### Cross-Journey Gates
```yaml
gate_integration:
  - dependent journeys DONE
  - e2e flow works
  - no regressions in other journeys
```

---

## Bootstrap Sequence

### Phase 1: Scaffold (You do this once)
```bash
mkdir -p .claude/{journeys,standards,architecture,patterns,coordination}

# Create journey directories
for i in 01-waitlist-signup 02-oauth-activation 03-api-key-generation \
         08-mcp-analyze-risk 09-mcp-checkpoints 14-cli-check-staged; do
  mkdir -p .claude/journeys/$i/tests
  touch .claude/journeys/$i/{SPEC,SCOPE,DEPENDENCIES,ACCEPTANCE,CONTEXT,STATUS}.md
done

# Extract patterns from existing code
cp apps/web/app/api/*/route.ts .claude/patterns/api-route.example.ts
cp apps/web/app/(saas)/**/actions.ts .claude/patterns/server-action.example.ts
```

### Phase 2: Populate Standards (I can help)
- Extract from your existing project instructions
- Codify testing patterns from existing tests
- Document error handling conventions

### Phase 3: Populate Journeys (I can help)
- Write SPEC.md for each journey
- Define SCOPE.md boundaries
- Write test cases

### Phase 4: Execute (Agents do this)
- Assign journeys to agents based on dependency graph
- Monitor STATUS.md files
- Resolve blockers

---

## Efficiency Gains

| Current | Proposed |
|---------|----------|
| Agent reads entire codebase | Agent reads 5-6 focused files |
| Conflicts on shared files | Explicit locks + boundaries |
| Quality varies | Patterns enforce consistency |
| No verification | Gates at each phase |
| Serial execution | Parallel by dependency graph |

**Estimated speedup: 3-5x** with reduced rework.

---

Want me to create the initial journey kits for your demo-critical paths (waitlist, API key, MCP analyze_risk)?
