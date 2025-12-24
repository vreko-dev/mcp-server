# SnapBack MCP UX Improvements

**Date**: 2025-12-23
**Purpose**: LLM-friendly tool descriptions and workflow clarity

## Executive Summary

Implemented comprehensive UX improvements to make SnapBack MCP tools more discoverable and easier for LLMs to use correctly. All recommendations from the UX audit have been implemented.

---

## 1. New Positioning Statement

### Before
> "Give your AI agent access to SnapBack's pattern memory."

### After
> **"Your AI guardrails and undo button"**
>
> Prevents "oh no" moments in AI-assisted development through risk assessment, workspace health monitoring, and instant recovery.

**Rationale**: The new positioning emphasizes SnapBack's unique value (safety net, prevention + recovery) rather than overlapping features. More concrete and memorable.

---

## 2. Signal Words Added to All Tools

Every tool now includes a **"Signal Words (when to auto-trigger)"** section with pattern-matchable phrases that help LLMs recognize when to use each tool.

### Examples

#### snapback.assess_risk
```
Signal Words:
- "is this safe", "safe to apply", "risky"
- "before I accept", "should I accept"
- "AI suggested", "Copilot suggested", "Claude suggested"
- "breaking change", "major refactor"
- User mentions: auth, security, payments, database, migrations
```

#### snapback.validate_recommendation
```
Signal Words:
- "should I install", "should I add", "should I upgrade"
- "AI suggested installing", "Copilot recommended"
- "what about using", "try using", "switch to"
- "npm install", "pnpm add", "yarn add"
- User asks about a specific package/library
```

#### snapback.restore_snapshot
```
Signal Words:
- "undo", "revert", "roll back", "go back"
- "restore", "broke everything", "this broke"
- "need to undo", "that didn't work"
- "bring back", "previous version"
```

---

## 3. Protection Score Emphasis

### prepare_workspace - Before
```
**Brand-Compliant "Peace of Mind" UX:**
- 🟢🟡🔴 Protection Score (0-100%): Simple risk assessment
```

### prepare_workspace - After
```
**Brand-Compliant "Peace of Mind" UX:**
- **🟢 Protection Score > 70%**: Safe to proceed
- **🟡 Protection Score 40-70%**: Moderate risk, consider snapshot
- **🔴 Protection Score < 40%**: High risk, create snapshot first!
- 📸 Snapshot Recommendation: Clear guidance on when to create safety checkpoint
```

**Rationale**: The 🟢🟡🔴 badges are now emphasized as decision-making aids with clear thresholds, not just features.

---

## 4. Tool Differentiation

### Problem
Overlapping tool names caused confusion about when to use which tool:
- `prepare_workspace` vs `start_session`
- `check_patterns` vs `validate_code`

### Solution
Added **"Key Difference from X"** sections to each tool:

#### prepare_workspace vs start_session
```
**Key Difference from start_session:**
- prepare_workspace: RISK ASSESSMENT (protection score, snapshot decision support)
- start_session: PERSONALIZATION (user preferences, past learnings)
```

#### check_patterns vs validate_code
```
**Key Difference from validate_code:**
- check_patterns: LIGHTWEIGHT - architectural patterns only (~100ms)
- validate_code: COMPREHENSIVE - 7-layer validation pipeline (~200ms)
```

**Rationale**: Clear differentiation in descriptions helps LLMs choose the right tool for the context.

---

## 5. Workflow Decision Tree

Added to README.md to guide tool selection:

```
User Request →
  ├─ Involves dependencies? → snapback.validate_recommendation
  │
  ├─ Major/risky change? → snapback.prepare_workspace
  │   └─ Protection score 🟡 or 🔴? → snapback.create_snapshot
  │
  ├─ Something broke? → snapback.list_snapshots → snapback.restore_snapshot
  │
  ├─ Ready to commit? → snapback.check_patterns (quick)
  │   OR snapback.validate_code (comprehensive)
  │
  └─ AI suggesting code? → snapback.assess_risk
```

**Rationale**: Provides a visual decision flow showing when to use each tool and how they chain together.

---

## 6. Quick Start Workflows

Added 4 comprehensive workflow scenarios showing tool usage in context:

### Scenario 1: "Should I install this package?"
Shows `validate_recommendation` usage for dependency decisions.

### Scenario 2: "Is it safe to refactor auth?"
Shows full workflow: `prepare_workspace` → `create_snapshot` → make changes → `check_patterns`

### Scenario 3: "Oh no, I broke everything"
Shows recovery workflow: `list_snapshots` → `restore_snapshot`

### Scenario 4: "Before accepting AI suggestion"
Shows `assess_risk` usage for AI-generated code validation.

**Rationale**: Concrete examples are more effective than abstract descriptions for teaching LLMs when/how to use tools.

---

## 7. Files Modified

### Tool Definitions
- ✅ `apps/mcp-server/src/tools/tool-definitions-v2.ts`
  - Added signal words to: assess_risk, validate_recommendation, create_snapshot, list_snapshots, restore_snapshot

- ✅ `apps/mcp-server/src/tools/context-tools.ts`
  - Enhanced prepare_workspace with protection score thresholds
  - Differentiated prepare_workspace from start_session
  - Differentiated check_patterns from validate_code
  - Added signal words to all context tools

- ✅ `apps/mcp-server/src/tools/learning-tools.ts`
  - Enhanced start_session with differentiation from prepare_workspace
  - Added signal words

### Documentation
- ✅ `apps/mcp-server/README.md`
  - Updated positioning statement
  - Added workflow decision tree
  - Added 4 Quick Start workflow scenarios

- ✅ `apps/mcp-server/src/index.ts`
  - Updated server initialization (metadata only)

---

## Impact Assessment

### For LLMs
- **Pattern Matching**: Signal words provide clear triggers for tool selection
- **Decision Support**: Protection score thresholds guide snapshot decisions
- **Differentiation**: Clear comparisons prevent tool confusion
- **Workflow Clarity**: Decision tree shows tool relationships and sequencing

### For Users
- **Faster Onboarding**: Quick Start scenarios show real-world usage
- **Better Results**: LLMs will select the right tool more often
- **Clear Value Prop**: "Your AI guardrails and undo button" is memorable and specific
- **Decision Confidence**: Protection scores give clear go/no-go signals

---

## Metrics to Track

### LLM Behavior
1. **Tool Selection Accuracy**: Are LLMs choosing the right tool for the context?
2. **Signal Word Effectiveness**: Do specific phrases trigger correct tools?
3. **Protection Score Usage**: Are LLMs correctly interpreting 🟢🟡🔴 badges?

### User Outcomes
1. **Reduced "Oh No" Moments**: Fewer users needing to restore snapshots due to bad decisions
2. **Higher Snapshot Adoption**: More users creating snapshots when recommended
3. **Faster Time-to-Value**: Users get value from correct tool usage sooner

---

## Next Steps

### Potential Enhancements
1. **A/B Testing**: Test "Your AI guardrails and undo button" vs alternatives
2. **Telemetry**: Track which signal words are most effective
3. **More Scenarios**: Add Quick Start workflows for edge cases
4. **Video Walkthroughs**: Create demos showing tool usage in Claude/Cursor

### Validation
1. **LLM Testing**: Test tool selection with various prompts
2. **User Feedback**: Gather feedback on clarity improvements
3. **Metrics Dashboard**: Monitor tool selection accuracy over time

---

## 8. Tool Consolidation (2025-12-23)

**Objective**: Reduce cognitive load by consolidating redundant tools

### Changes Made

#### Removed Tools
1. **`snapback.validate_dependencies`**
   - Replaced by: `snapback.validate_recommendation` (more comprehensive)
   - Rationale: validate_recommendation already handles dependency validation plus breaking change detection

2. **`snapback.docs_find` + `snapback.docs_fetch`**
   - Removed entirely (Context7 dependency eliminated)
   - Rationale: Two-step workflow was unnecessarily complex for LLMs
   - Context7 replaced with free npm registry + GitHub API

3. **`snapback.get_library_docs`**
   - Removed as duplicative of `snapback.validate_recommendation`
   - Rationale: Migration guidance from validate_recommendation already provides usage patterns and API changes
   - LLMs can use validate_recommendation for both safety analysis AND documentation needs

### Impact

**For LLMs:**
- Reduced tool count from 16 to 12 tools
- Eliminated confusing two-step documentation workflow
- `validate_recommendation` now handles both validation AND documentation via migration guidance
- Clearer tool purposes (validate_recommendation vs validate_dependencies)
- Removed Context7 dependency entirely (replaced with free npm registry + GitHub API)

**For Users:**
- Faster documentation lookups (one call instead of two)
- More comprehensive dependency validation (breaking changes + conflicts)
- Better tool naming consistency

### Files Modified
- ✅ `src/tools/tool-definitions-v2.ts` - Added getLibraryDocsTool, removed old tools
- ✅ `src/index.ts` - Added get_library_docs handler, removed old handlers
- ✅ `README.md` - Updated tool documentation
- ✅ Backward compatibility mappings updated

---

## Conclusion

All UX recommendations have been implemented:
- ✅ New positioning emphasizing "safety net" value
- ✅ Signal words for pattern-matching
- ✅ Protection score emphasis with clear thresholds
- ✅ Tool differentiation for overlapping names
- ✅ Workflow decision tree
- ✅ Quick Start scenarios
- ✅ Tool consolidation (16 → 12 tools)
- ✅ Context7 dependency completely removed (replaced with free APIs)

The improvements make SnapBack MCP significantly more LLM-friendly while maintaining professional quality for human readers.
