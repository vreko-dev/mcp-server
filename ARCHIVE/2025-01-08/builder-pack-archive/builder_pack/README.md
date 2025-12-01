# Snapback Agent Prompt System

## 🎯 What You're Getting

A **production-grade LLM agent prompt system** that turns your AI assistant into a disciplined, efficient development partner for your Snapback project. This eliminates the verbosity, complexity, and backwards motion you've experienced.

## 📦 Complete Package

### 4 Core Files

1. **SNAPBACK_AGENT_PROMPT.md** (3,200 words)

    - Complete agent instruction manual
    - Sequential thinking protocol with stop points
    - Context7 MCP integration
    - TDD enforcement
    - Lefthook validation
    - Performance budgets
    - Anti-patterns to avoid

2. **SNAPBACK_QUICK_REFERENCE.md** (600 words)

    - One-page cheat sheet
    - Critical checkpoints
    - Performance budgets table
    - Quick decision frameworks
    - Instant red flags

3. **USAGE_GUIDE.md** (2,500 words)

    - How to integrate with your workflow
    - File placement instructions
    - Example conversation patterns
    - Troubleshooting guide
    - Success metrics

4. **DECISION_LOG_TEMPLATE.md** (1,800 words)
    - Track architectural decisions
    - Document rejected approaches
    - Record performance changes
    - Lessons learned format

## ✨ Why This is 10x Better

### 1. **Eliminates Verbosity** ❌ → ✅

**Before:**

```
Agent: "There are several approaches we could consider. TypeScript
offers multiple patterns for this use case. We could use classes,
which provide encapsulation and inheritance capabilities, or we
could use functional patterns which are more composable..."

[5 more paragraphs of explanation]
```

**After:**

```
Agent:
✓ PHASE 1: DISCOVERY
Found: src/snapshot/engine.ts has capture logic
Missing: diff comparison
Using: Existing pattern from config-files.ts

STOP: Confirm findings?
```

**Improvement:** Response templates enforce conciseness. No speculation, no alternatives unless asked.

---

### 2. **Prevents Backwards Motion** 🔄 → ⏭️

**Before:**

-   Agent suggests refactoring existing code
-   Breaks recent improvements
-   No awareness of codebase state

**After:**

-   **ALWAYS starts with discovery** using context7
-   Verifies what exists before suggesting
-   "Recent refactors are sacred. Build forward only."

**Improvement:** Mandatory discovery phase with context7 prevents revisiting solved problems.

---

### 3. **Enforces TDD Discipline** 🤷 → ✅

**Before:**

-   Code first, tests later (maybe)
-   Lefthook failures surprise you
-   Hard to validate behavior

**After:**

-   **Red → Green → Refactor → Validate**
-   Explicit stop points between phases
-   Lefthook validation mandatory before proceeding

**Improvement:** Stop points force validation. Can't proceed to Green until test fails correctly.

---

### 4. **Maximizes DX Through Constraint** 🗣️ → 🤫

**Before:**

-   Noisy notifications
-   Over-engineered abstractions
-   Features "just in case"

**After:**

-   **"Invisible = Success"** principle
-   YAGNI enforcement
-   Minimal viable implementation

**Improvement:** Explicit anti-patterns section prevents over-engineering. DX patterns codified.

---

### 5. **Deep Integration Understanding** 🌊 → 🎯

**Before:**

```
Agent: "You could use library X for this."
You: "Does it work with our stack?"
Agent: "It should work fine."
[Doesn't work, conflicts discovered later]
```

**After:**

```
Agent:
✓ PHASE 2: RESEARCH CHECKPOINT
Evaluating ts-morph:
- Bundle: 24kb (under 50kb budget) ✓
- VS Code compat: Documented ✓
- Integration: Maps to LanguageServer API
- Performance: 15ms parse (under 25ms budget) ✓
- Conflicts: None detected with existing TS usage

STOP: Review integration analysis?
```

**Improvement:** Multi-library integration protocol forces deep analysis before recommendation.

---

### 6. **Context7 MCP Integration** 🔍 → 🎯

**Before:**

-   Agent makes assumptions about codebase
-   Suggests duplicate implementations
-   No verification of existing patterns

**After:**

-   **Mandatory context7 checks** before suggestions
-   Explicit research stopping points
-   Verification protocol for every phase

**Improvement:** Context7 becomes a requirement, not an option. No guessing allowed.

---

### 7. **Performance Budgets** ⏱️ → 📊

**Before:**

```
Agent: "This should be fast enough."
[Ships 200ms operation]
```

**After:**

```typescript
const PERFORMANCE_BUDGETS = {
	snapshotCapture: 50, // ms
	diffAnalysis: 100, // ms
	patternMatching: 25, // ms
};

Agent: "Snapshot capture: 48ms ✓ (under 50ms budget)";
```

**Improvement:** Concrete budgets. Agent must validate and report against them.

---

### 8. **Lefthook as Bouncer** 🚪 → 🛡️

**Before:**

-   Lefthook failures discovered at commit
-   "I'll fix it later" → never fixed
-   Critical path breaks unnoticed

**After:**

-   **Lefthook validation after every phase**
-   Critical path breaks STOP all work
-   "LEFTHOOK IS LAW" prime directive

**Improvement:** Lefthook becomes a checkpoint, not an afterthought.

---

### 9. **Decision Tracking** 🤔 → 📝

**Before:**

-   Why did we choose library X?
-   Why 300ms debounce?
-   Lost tribal knowledge

**After:**

-   **Structured decision log template**
-   Concrete rationale with metrics
-   Rejected approaches documented

**Improvement:** Architectural decisions preserved. No repeating mistakes.

---

### 10. **Stop Point Discipline** 🏃 → 🚦

**Before:**

```
Agent: [Generates 500 lines of code]
You: "Wait, I wanted to review the approach first..."
```

**After:**

```
Discovery → STOP → Research → STOP → Red → STOP →
Green → STOP → Lefthook → STOP → Refactor → STOP
```

**Improvement:** Explicit stop points. Agent must wait for confirmation at checkpoints.

---

## 🎮 Quick Start

### 1. Setup (2 minutes)

```bash
# At turborepo root
mkdir .snapback
cd .snapback

# Place the 4 files
mv ~/SNAPBACK_AGENT_PROMPT.md ./AGENT_PROMPT.md
mv ~/SNAPBACK_QUICK_REFERENCE.md ./QUICK_REFERENCE.md
mv ~/USAGE_GUIDE.md ./USAGE_GUIDE.md
mv ~/DECISION_LOG_TEMPLATE.md ./DECISION_LOG.md
```

### 2. First Session (5 minutes)

```
You: "Following Snapback Agent Prompt.

Task: Add detection for rapid multi-file changes."

Agent: "✓ PHASE 1: DISCOVERY
Using context7 to check existing implementation..."
```

### 3. Let It Learn (2-3 sessions)

-   Correct when it skips discovery
-   Require stops at checkpoints
-   Validate TDD is followed

After 3 sessions, agent will internalize the protocol.

---

## 📊 Success Metrics

Track these to measure effectiveness:

### Immediate (Week 1)

-   ✓ Agent uses context7 before suggestions
-   ✓ Stops at checkpoints without prompting
-   ✓ Lefthook passes on first try
-   ✓ No speculative features added

### Short-term (Month 1)

-   ✓ Code complexity decreasing
-   ✓ Test coverage stable/increasing
-   ✓ Performance budgets respected
-   ✓ Decision log growing

### Long-term (Quarter 1)

-   ✓ No backwards motion on refactors
-   ✓ Contributors onboard faster
-   ✓ DX feedback positive
-   ✓ Maintenance burden low

---

## 🎯 What Makes This "10x Better"

### Efficiency Gains

| Aspect              | Before             | After            | Improvement         |
| ------------------- | ------------------ | ---------------- | ------------------- |
| Response length     | 500+ words         | 50-100 words     | 5-10x shorter       |
| Discovery time      | Never/inconsistent | Always first     | ∞ (prevented bugs)  |
| Rework cycles       | 2-3 per feature    | 0-1 per feature  | 2-3x faster         |
| Lefthook failures   | Surprise at commit | None (validated) | Zero surprises      |
| Library integration | Surface level      | Deep analysis    | Prevented conflicts |
| Decision clarity    | Tribal knowledge   | Documented       | Permanent record    |

### Quality Improvements

1. **No More Guessing**

    - Context7 verification mandatory
    - Existing code discovered first
    - Assumptions eliminated

2. **No More Rework**

    - TDD prevents behavior mismatches
    - Lefthook catches breaks immediately
    - Stop points allow course correction

3. **No More Complexity Creep**

    - YAGNI enforced
    - Minimal implementations required
    - Anti-patterns explicitly forbidden

4. **No More Lost Context**
    - Decision log captures rationale
    - Performance budgets documented
    - Rejected approaches preserved

---

## 🚀 Advanced Usage

### Multi-Package Changes (Turborepo)

The prompt handles workspace-level changes intelligently:

```
Agent discovers all packages first →
Proposes workspace-level dependencies →
Tests in one package →
Rolls out after validation
```

### Complex Integrations

For multi-system interfaces (Git + FileSystem + UI):

```
Agent maps complete data flow →
Identifies handoff points →
Researches each separately →
Integrates incrementally →
Validates end-to-end
```

### Performance Optimization

When optimizing critical paths:

```
Agent profiles current implementation →
Identifies bottleneck with data →
Researches optimization approaches →
Tests in isolation →
Validates with benchmarks
```

---

## 🔧 Customization

### Adding Project-Specific Patterns

Edit `.snapback/AGENT_PROMPT.md`:

```typescript
// Add to Performance Budgets section
const PROJECT_BUDGETS = {
	...PERFORMANCE_BUDGETS,
	customOperation: 75, // Your specific operation
};
```

### Adding New Stop Points

```markdown
## Phase 2.5: Security Review (NEW)

For authentication/sensitive code:

1. Review security implications
2. Check for common vulnerabilities
3. Validate input sanitization
4. Document security decisions

STOP: Security review required.
```

### Team-Specific Workflows

```markdown
## Integration with Team Workflow

Before PR:

-   [ ] Tech lead review (for architecture changes)
-   [ ] Security review (for auth/data handling)
-   [ ] Performance review (if >10% budget change)
```

---

## 📚 File Organization

```
.snapback/
├── AGENT_PROMPT.md           ← Agent reads this EVERY session
├── QUICK_REFERENCE.md        ← Keep open while working
├── USAGE_GUIDE.md            ← Reference when stuck
└── DECISION_LOG.md           ← Update after major decisions

README.md                     ← You're here
CONTRIBUTING.md               ← Reference .snapback/ for guidelines
```

---

## 🎓 Learning Path

### Week 1: Fundamentals

-   Agent learns to use context7
-   Stop points become automatic
-   TDD rhythm established

### Week 2: Integration

-   Deep library analysis natural
-   Performance budgets respected
-   Decision logging habitual

### Week 3: Mastery

-   Minimal suggestions by default
-   Proactive performance validation
-   Architectural decisions well-reasoned

---

## 💡 Pro Tips

1. **Keep Quick Reference Open**

    - Visual reminder of budgets
    - Fast pattern lookup
    - Stop point checklist

2. **Update Decision Log Weekly**

    - Fresh context while debugging
    - Patterns emerge over time
    - Historical reference invaluable

3. **Validate Agent Understanding**

    ```
    You: "Summarize the Snapback protocol."
    Agent: [Should hit key points]
    ```

4. **Course Correct Immediately**

    ```
    You: "STOP. You skipped discovery. Use context7 first."
    Agent: "✓ Using context7 to verify..."
    ```

5. **Celebrate Wins**
    ```
    You: "Log this decision. It worked perfectly."
    [Update DECISION_LOG.md with what worked]
    ```

---

## 🆘 Getting Help

### Agent Misbehaving?

1. Check if it read the prompt (ask it to confirm)
2. Reference Quick Reference explicitly
3. Use STOP command to reset

### Prompt Not Working?

1. Verify file placement (`.snapback/` at repo root)
2. Check context7 MCP is installed
3. Ensure lefthook is configured

### Need to Modify Prompt?

1. Document why in DECISION_LOG.md
2. Test changes with agent
3. Update this README with learnings

---

## 🎊 Success Stories

Document your wins here as you go:

### Example:

```markdown
**Feature:** Multi-file cascade detection
**Date:** 2024-01-15
**Time:** 30 minutes (vs. 2 hours before)
**Outcome:**

-   Agent found existing pattern in 2 minutes
-   TDD prevented edge case bug
-   Lefthook passed first try
-   Performance: 18ms (under 25ms budget)
```

---

## 🙏 Maintenance

### Monthly Review

-   Check decision log for patterns
-   Update performance budgets if needed
-   Add common anti-patterns discovered
-   Celebrate what's working

### Quarterly Audit

-   Review rejected approaches (still correct?)
-   Validate agent is following protocol
-   Gather team feedback on DX
-   Update prompt with learnings

---

## 📈 Roadmap

### Phase 1: Stabilization (Current)

-   ✓ Prompt system established
-   ✓ Stop points enforced
-   ✓ TDD mandatory
-   ✓ Lefthook as bouncer

### Phase 2: Optimization (Month 2)

-   [ ] Identify common patterns
-   [ ] Create reusable templates
-   [ ] Optimize decision log
-   [ ] Team training

### Phase 3: Scale (Quarter 2)

-   [ ] Multi-agent coordination
-   [ ] Cross-project patterns
-   [ ] Performance benchmarking
-   [ ] Community contributions

---

## 🎯 Final Thoughts

This isn't just a prompt—it's a **development protocol** that:

-   ✅ Eliminates verbosity through constraint
-   ✅ Prevents backwards motion through discovery
-   ✅ Enforces discipline through stop points
-   ✅ Maximizes DX through simplicity
-   ✅ Preserves knowledge through decision logs

**The result:** A development partner that feels like an extension of your workflow—unobtrusive, efficient, and trustworthy.

---

**Ready to start? Jump to USAGE_GUIDE.md for setup instructions.**

---

_Last Updated: [Date]_
_Version: 1.0_
_Status: Production Ready_
