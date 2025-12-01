# Snapback Prompt System - Quick Start Checklist

## ⚡ 5-Minute Setup

### Step 1: Create Directory (30 seconds)

```bash
cd /path/to/your/turborepo
mkdir .snapback
cd .snapback
```

### Step 2: Place Files (1 minute)

```bash
# Move downloaded files to .snapback/
mv ~/Downloads/SNAPBACK_AGENT_PROMPT.md ./AGENT_PROMPT.md
mv ~/Downloads/SNAPBACK_QUICK_REFERENCE.md ./QUICK_REFERENCE.md
mv ~/Downloads/USAGE_GUIDE.md ./USAGE_GUIDE.md
mv ~/Downloads/DECISION_LOG_TEMPLATE.md ./DECISION_LOG.md
```

### Step 3: Initialize Decision Log (30 seconds)

```bash
# Edit DECISION_LOG.md
code DECISION_LOG.md

# Add at top:
# Snapback Decision Log
# Last Updated: [Today's Date]
# Maintainers: [Your Name]
```

### Step 4: Verify Context7 MCP (1 minute)

```bash
# Check if context7 is available
# (If using Claude Desktop/API with MCP)

# Verify in your MCP config that context7 can read .snapback/
```

### Step 5: Test with Agent (2 minutes)

```
You to Agent:
---
Following Snapback Agent Prompt located at .snapback/AGENT_PROMPT.md

Task: Show me your understanding of the protocol.
---

Expected Response:
- Agent should summarize key directives
- Should mention stop points
- Should reference TDD approach
- Should acknowledge lefthook validation
```

## ✅ First Session Checklist

### Pre-Session

-   [ ] Lefthook is passing (`lefthook run pre-commit`)
-   [ ] You know what feature/bug to work on
-   [ ] Quick Reference open in another window
-   [ ] Ready to stop agent at checkpoints

### During Session

-   [ ] Started with "Following Snapback Agent Prompt"
-   [ ] Agent used context7 for discovery
-   [ ] Agent stopped at checkpoints
-   [ ] Tests written before implementation
-   [ ] Lefthook validated after green phase
-   [ ] Performance within budgets

### Post-Session

-   [ ] Lefthook still passing
-   [ ] Decision logged (if architectural)
-   [ ] Code review doc validated
-   [ ] Changes committed with clear message

## 🎯 Week 1 Training Protocol

### Session 1: Simple Feature

**Goal:** Teach discovery phase

```
Task: Add a simple detection pattern

Agent Response Should:
1. Use context7 to check existing patterns
2. Stop after discovery
3. Wait for your confirmation
4. Proceed with TDD

Your Job:
- Confirm discoveries are accurate
- Correct if agent skips discovery
- Validate stop points are respected
```

### Session 2: Library Integration

**Goal:** Teach deep research

```
Task: Integrate a new utility library

Agent Response Should:
1. Check package.json first
2. Analyze bundle size
3. Verify compatibility
4. Map integration points
5. Stop for review

Your Job:
- Validate research depth
- Check for missed conflicts
- Ensure performance considered
```

### Session 3: Performance Optimization

**Goal:** Teach budget awareness

```
Task: Optimize a slow operation

Agent Response Should:
1. Profile current implementation
2. Identify bottleneck with data
3. Propose optimization
4. Validate against budget
5. Benchmark improvement

Your Job:
- Verify profiling accuracy
- Confirm budget compliance
- Ensure no functionality lost
```

### Session 4: Complex Integration

**Goal:** Teach multi-system thinking

```
Task: Integrate 2-3 systems

Agent Response Should:
1. Map complete data flow
2. Identify all handoff points
3. Research each separately
4. Test incrementally
5. Validate end-to-end

Your Job:
- Verify flow diagram accuracy
- Check for race conditions
- Ensure error handling complete
```

### Session 5: Free Practice

**Goal:** Validate protocol internalized

```
Task: [Any real feature you need]

Agent Should:
- Automatically use context7
- Stop without being told
- Follow TDD naturally
- Validate lefthook proactively
- Stay within budgets

Your Job:
- Just monitor
- Correct only if deviation
- Celebrate if smooth
```

## 🚨 Common Issues & Fixes

### Issue: Agent Not Using Context7

```
Your Response:
"STOP. You must use context7 to verify what exists in the
codebase before making suggestions. Show me what you found."
```

### Issue: Agent Being Verbose

```
Your Response:
"Follow Quick Reference format. Concise responses only.
Use the response templates from the prompt."
```

### Issue: Agent Skipping Tests

```
Your Response:
"STOP. TDD is mandatory. Write the failing test first.
Show me the test before any implementation."
```

### Issue: Agent Adding Speculative Features

```
Your Response:
"STOP. This violates YAGNI principle. Implement only what's
needed for the current test to pass."
```

### Issue: Agent Proceeding with Lefthook Failing

```
Your Response:
"STOP. Lefthook must pass before proceeding. Fix the
critical path issue first. Show me the fix."
```

## 📊 Success Indicators

### After Session 1

✓ Agent starts using context7 automatically
✓ You feel more in control of the process

### After Session 3

✓ Agent stops at checkpoints naturally
✓ TDD rhythm feels smooth
✓ Lefthook passes first try

### After Session 5

✓ Agent suggests minimal solutions
✓ Performance budgets respected
✓ You trust the agent's judgment

## 🎓 Graduation Criteria

Agent has internalized the protocol when:

1. **Discovery First**

    - Always checks existing code
    - Never assumes
    - Reports findings before suggesting

2. **Stop Points Natural**

    - Stops without prompting
    - Waits for confirmation
    - Respects your judgment

3. **TDD Automatic**

    - Test before code
    - Minimal implementation
    - Refactor only after green

4. **Lefthook Respected**

    - Validates proactively
    - Fixes breaks immediately
    - Never proceeds if failing

5. **Performance Aware**

    - Checks budgets unprompted
    - Profiles when optimizing
    - Documents impact

6. **Minimal by Default**
    - YAGNI enforced
    - No speculation
    - Focused solutions

## 🎁 Bonus: Keyboard Shortcuts

Create these aliases for speed:

```bash
# In your .bashrc or .zshrc

alias snapback-check="cat .snapback/QUICK_REFERENCE.md"
alias snapback-log="code .snapback/DECISION_LOG.md"
alias snapback-guide="cat .snapback/USAGE_GUIDE.md"
alias snapback-test="lefthook run pre-commit"
```

## 📝 Next Steps

1. **Complete 5-minute setup** ✓
2. **Do Session 1** (teach discovery)
3. **Print Quick Reference** (keep visible)
4. **Start Decision Log** (first entry today)
5. **Share wins** (document successes)

## 🎯 Your First Command

```
Following Snapback Agent Prompt at .snapback/AGENT_PROMPT.md

Task: [Your first task here]
```

---

**That's it! You're ready to go. The prompt system will guide the agent, and you'll see the difference immediately.**

---

_Estimated time to proficiency: 5 sessions (3-5 hours total)_
_Estimated time savings: 50-70% on future development_
_Complexity reduction: 60-80% less code per feature_

**Good luck! 🚀**
