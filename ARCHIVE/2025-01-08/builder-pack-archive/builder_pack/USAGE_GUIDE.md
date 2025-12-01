# Snapback Agent Prompt - Usage Guide

## 📁 File Placement

Place these files at the **root of your turborepo**:

```
your-turborepo/
├── .snapback/
│   ├── AGENT_PROMPT.md          ← Main prompt
│   ├── QUICK_REFERENCE.md       ← Cheat sheet
│   └── DECISION_LOG.md          ← Track decisions (create this)
├── apps/
├── packages/
├── lefthook.yml
└── turbo.json
```

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Create snapback directory at repo root
mkdir .snapback

# Move the prompt files
mv SNAPBACK_AGENT_PROMPT.md .snapback/AGENT_PROMPT.md
mv SNAPBACK_QUICK_REFERENCE.md .snapback/QUICK_REFERENCE.md

# Create decision log
touch .snapback/DECISION_LOG.md
```

### 2. Using with Your LLM Agent

#### Option A: Claude Projects (Recommended)

1. Create a new Claude Project for Snapback
2. Add `.snapback/AGENT_PROMPT.md` to project knowledge
3. Reference in every conversation start:

    ```
    Following the Snapback Agent Prompt for this task.

    Task: [Your specific request]
    ```

#### Option B: Direct Prompt Injection

Prepend every request with:

```
Context: You are operating under the Snapback Development Agent protocol.
Read .snapback/AGENT_PROMPT.md for full guidelines.

Task: [Your specific request]
```

#### Option C: Context7 MCP Integration

```json
// In your MCP config
{
	"mcpServers": {
		"context7": {
			"args": ["--include", ".snapback/**"],
			"autoAttach": true
		}
	}
}
```

## 🎯 Example Usage Sessions

### Session 1: Adding New Detection Pattern

```markdown
**You to Agent:**
Following Snapback Agent Prompt.

Task: Add detection for rapid multi-file changes (>5 files in <2 seconds)

**Agent Response:**
✓ PHASE 1: DISCOVERY
Using context7 to check existing implementation...

[Discovery findings...]

STOP: Confirm these findings match your understanding?

**You to Agent:**
Confirmed. Proceed.

**Agent:**
✓ PHASE 2: RESEARCH
No new libraries needed. Using existing FileSystemWatcher pattern.

STOP: Research complete. Proceed to tests?

**You to Agent:**
Yes.

[Agent continues through phases...]
```

### Session 2: Integrating New Library

```markdown
**You to Agent:**
Following Snapback Agent Prompt.

Task: Add semantic diffing for TypeScript AST changes

**Agent:**
✓ PHASE 1: DISCOVERY
[Findings...]

✓ PHASE 2: RESEARCH CHECKPOINT
Evaluating libraries for TypeScript AST:

1. typescript (already in package.json) ✓
2. ts-morph (24kb, good DX)
3. babel-parser (87kb, too heavy)

Deep Integration Analysis:

-   ts-morph interfaces with VS Code LanguageServer
-   Performance: ~15ms parse time for avg file
-   Memory: ~8KB per AST cached

STOP: Review integration analysis. Approve ts-morph?

**You to Agent:**
Yes, but verify it doesn't conflict with existing TS usage.

[Agent verifies, then continues...]
```

## 📋 Best Practices

### Start Every Session With Context

```
Following Snapback Agent Prompt.
Current lefthook status: [passing/failing]
Working on: [feature/bug]
```

### Use Explicit Stop Points

```
Agent should stop after discovery.
I'll validate findings before proceeding.
```

### Reference Code Review Doc

```
Task: Implement feature X from code review doc section 3.2
Validate against acceptance criteria after implementation.
```

### Track Decisions

Log important decisions in `.snapback/DECISION_LOG.md`:

```markdown
## 2024-01-15: Chose ts-morph over babel-parser

**Reason:** Better VS Code integration, smaller bundle
**Trade-off:** Less mature, but sufficient for our needs
**Performance:** 15ms avg parse time (within 25ms budget)
```

## 🔄 Workflow Integration

### With Git

```bash
# Before starting work
git checkout -b feature/new-detection-pattern

# Work with agent following prompts
[Agent generates code via TDD]

# Agent ensures lefthook passes
lefthook run pre-commit  # ✓ Should pass

# Commit when green
git commit -m "feat: add rapid multi-file detection"
```

### With PR Reviews

```markdown
**PR Description Template:**

## Changes

-   [List changes]

## Snapback Protocol Compliance

-   [x] TDD followed (tests first)
-   [x] Lefthook passing
-   [x] Performance budgets met
-   [x] Code review doc validated
-   [x] DX maintained (unobtrusive)

## Decision Log

See `.snapback/DECISION_LOG.md` entry: [date]
```

## 🐛 Troubleshooting

### Agent Skipping Discovery Phase

```
STOP. You must use context7 to verify existing implementation
before proceeding. Show me what you found in the codebase.
```

### Agent Being Too Verbose

```
Follow Quick Reference format. Concise responses only.
Don't explain TypeScript features I already know.
```

### Agent Adding Speculative Code

```
STOP. This code isn't needed yet. Follow YAGNI principle.
Implement only what's required for the current test.
```

### Lefthook Failing Mid-Development

```
STOP all feature work. Fix lefthook failure first.
Critical path must be green before continuing.
```

## 📊 Measuring Success

### Good Indicators

-   ✓ Agent asks to verify existing code before suggesting
-   ✓ Stops at checkpoints for validation
-   ✓ Tests written before implementation
-   ✓ Lefthook passes on first try
-   ✓ Code is minimal and focused
-   ✓ No unnecessary dependencies added

### Warning Signs

-   ⚠ Agent skips discovery phase
-   ⚠ Suggests multiple solutions without checking codebase
-   ⚠ Implements features not in tests
-   ⚠ Adds "nice to have" features unprompted
-   ⚠ Ignores performance budgets
-   ⚠ Doesn't stop at checkpoints

## 🎓 Training Your Agent

### First 5 Sessions

Focus on **enforcing the protocol**:

1. Correct when agent skips discovery
2. Require stops at checkpoints
3. Validate TDD is followed
4. Ensure lefthook is respected

### After Protocol is Learned

Agent should:

-   Automatically use context7 first
-   Stop without being told
-   Suggest minimal solutions
-   Reference existing patterns
-   Maintain performance budgets

## 🔄 Updating the Prompt

When you discover better patterns:

```markdown
// .snapback/DECISION_LOG.md

## 2024-01-20: Updated debounce timing

Changed file watch debounce from 300ms → 200ms
Reason: Users expect faster feedback
Validated: Performance still within budget
Update: Add to AGENT_PROMPT.md performance section
```

Then update `.snapback/AGENT_PROMPT.md` with new guidance.

## 📚 Advanced Patterns

### Multi-Package Changes (Turborepo)

```
Task: Add snapshot support across all packages

Agent should:
1. Discover existing package structure
2. Identify shared dependencies in root
3. Propose workspace-level changes
4. Test in one package first (TDD)
5. Roll out to others after validation
```

### Complex Integrations

```
Task: Integrate with 3+ systems (Git + FileSystem + UI)

Agent must:
1. Map complete data flow diagram
2. Identify all handoff points
3. Research each integration separately
4. Implement and test one at a time
5. Integration test after all parts work
```

### Performance Optimization

```
Task: Reduce snapshot capture time from 80ms → 50ms

Agent should:
1. Profile current implementation
2. Identify bottleneck (discovery)
3. Research optimization approaches
4. Test optimization in isolation
5. Validate performance improvement
6. Ensure no functionality regression
```

## 🎯 Quick Commands Reference

```bash
# Verify agent has context
Agent: "Show me your understanding of existing codebase"

# Force stop at checkpoint
"STOP. I need to review this before proceeding."

# Validate lefthook
"Run lefthook now and show results"

# Check performance
"Profile this operation. Is it within budget?"

# Simplify response
"Follow Quick Reference format. Be concise."

# Verify test quality
"Does this test validate ONE specific behavior?"
```

## 🌟 Success Story Template

Document successful implementations:

```markdown
## Feature: [Name]

**Date:** 2024-01-15
**Phases:** Discovery → Research → Red → Green → Refactor → Validate
**Time:** 45 minutes
**Lefthook:** ✓ Passed first try
**Performance:** Within all budgets
**Complexity:** Low (80 lines added)
**DX Impact:** Positive (invisible when working)

**What Went Well:**

-   Agent found existing pattern in codebase
-   Used context7 effectively
-   TDD prevented rework

**What to Improve:**

-   Could have cached intermediate results
```

## 📖 Related Documentation

-   **Main Prompt:** `.snapback/AGENT_PROMPT.md`
-   **Quick Ref:** `.snapback/QUICK_REFERENCE.md`
-   **Decision Log:** `.snapback/DECISION_LOG.md` (you create)
-   **Code Review:** [Your existing doc location]
-   **Lefthook Config:** `lefthook.yml`

---

**Remember:** The prompt is a tool to keep the agent focused, efficient, and aligned with your codebase. Use it consistently for best results!
