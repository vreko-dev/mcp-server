# SnapBack MCP Tool Naming Audit
## Evidence-Based Analysis Against 150 LLM Selection Strategies

**Generated**: December 21, 2025
**Purpose**: Optimize MCP tool names and descriptions for higher LLM selection probability
**Sources**: Past conversation history, project knowledge, 150 strategies research

---

## Current Tool Inventory

### Product MCP (`apps/mcp-server`)

| Tool Name | Description | Tier |
|-----------|-------------|------|
| `snapback.analyze_risk` | Analyze code changes for potential risks | Free |
| `snapback.check_dependencies` | Check for dependency-related risks | Free |
| `snapback.create_checkpoint` | Create a code checkpoint before risky changes | Pro |
| `snapback.list_checkpoints` | List all available code checkpoints | Pro |
| `snapback.restore_checkpoint` | Restore code from a checkpoint | Pro |
| `catalog.list_tools` | List tools from connected external MCPs | Free |
| `ctx7.resolve-library-id` | Resolve library name to Context7 ID | Free |
| `ctx7.get-library-docs` | Fetch documentation for a library | Free |

### Internal MCP (`ai_dev_utils/mcp` - codebase server)

| Tool Name | Description |
|-----------|-------------|
| `get_context` | Get architectural context BEFORE implementing |
| `check_patterns` | Validate code BEFORE committing |
| `report_violation` | Learn from mistakes (auto-promotes after 3x) |
| `query_learnings` | Search past learnings |
| `get_violations_summary` | Get violations summary |
| `record_learning` | Capture new patterns |

---

## Strategy-Based Audit

### 🔴 Critical Issues (High Impact)

#### 1. **Tool Names Don't Front-Load Action/Outcome** (Strategies 1-3, 41)

| Current | Problem | Recommended |
|---------|---------|-------------|
| `snapback.analyze_risk` | "analyze" is generic, doesn't trigger protective cognition | `snapback.detect_danger` or `snapback.score_risk` |
| `snapback.check_dependencies` | "check" is passive, unclear outcome | `snapback.validate_deps` or `snapback.prevent_dep_breakage` |
| `snapback.create_checkpoint` | Good action verb, but "checkpoint" is technical | `snapback.save_safety_state` or `snapback.protect_code` |
| `snapback.list_checkpoints` | List is navigation, not action | `snapback.show_restore_points` |
| `snapback.restore_checkpoint` | "checkpoint" jargon | `snapback.recover_code` or `snapback.undo_changes` |

**Strategy Violated**: #1 (Front-load critical info), #2 (Action verbs for attention), #41 (VerbNoun naming)

#### 2. **Descriptions Don't Prime Security Cognition** (Strategies 11-17)

Current `analyze_risk` description:
```
"Analyze the risk level of planned code changes.

Call this BEFORE applying changes to understand potential issues:
- Breaking change detection
- Dependency impact analysis
- Complexity increase warnings
- Test coverage gaps"
```

**Issues**:
- First 5 words are generic ("Analyze the risk level of")
- Doesn't trigger protective/danger cognition
- Bullet points dilute attention (Strategy #26: reduce extraneous load)

**Recommended**:
```
"STOP potential AI mistakes before they happen. Detects breaking changes, risky patterns, and impact analysis for planned modifications.

Use BEFORE applying any code changes from AI assistants like Cursor, Copilot, or Claude."
```

**Why Better**:
- "STOP" triggers protective cognition immediately
- "AI mistakes" primes the exact user scenario
- Front-loads outcome, not mechanism
- Mentions competitor AI tools (semantic priming)

#### 3. **Namespace Inconsistency** (Strategies 71-80)

You have 3 different namespacing conventions:
- `snapback.*` - Core protection tools
- `catalog.*` - Meta-tools
- `ctx7.*` - Documentation tools

**Problem**: LLMs must parse 3 different naming hierarchies, increasing cognitive load.

**Recommendation**: Unify under `snapback.*` with semantic sub-groupings:
- `snapback.protect_*` - Safety tools (protect_code, protect_checkpoint, protect_restore)
- `snapback.inspect_*` - Analysis tools (inspect_risk, inspect_deps, inspect_changes)
- `snapback.docs_*` - Context tools (docs_library, docs_resolve)
- `snapback.meta_list_tools` - Catalog functionality

---

### 🟡 Moderate Issues (Medium Impact)

#### 4. **Tokenization Inefficiency** (Strategies 51-60)

| Current | Tokens (tiktoken) | Optimized | Tokens |
|---------|-------------------|-----------|--------|
| `snapback.analyze_risk` | 4 | `snap_risk` | 2 |
| `snapback.check_dependencies` | 5 | `snap_deps` | 2 |
| `snapback.create_checkpoint` | 5 | `snap_save` | 2 |
| `ctx7.resolve-library-id` | 7 | `snap_docs_find` | 4 |

**Note**: While token efficiency matters, semantic clarity should take priority. The `snapback.` prefix provides brand association worth the tokens.

**Recommendation**: Keep `snapback.` prefix but simplify verb-noun combos.

#### 5. **Missing "WHEN to Use" Signals** (Strategy #9, #25)

Current descriptions lack explicit invocation triggers. LLMs perform better when told **when** to use a tool.

**Current**: `"Create a code checkpoint before risky changes"`
**Enhanced**: `"When you're about to modify auth, config, migrations, or multi-file refactors - call this FIRST. Creates a safety checkpoint you can restore in one click."`

#### 6. **Response Format Lacks Next-Step Guidance** (Strategies 91-100)

From past conversation, your risk analysis returns:
```json
{
  "risk_score": 45,
  "risk_level": "medium",
  "issues": [...],
  "recommendations": [...]
}
```

**Issue**: No explicit "what to do next" that helps the LLM chain tools.

**Enhanced Response**:
```json
{
  "risk_score": 45,
  "risk_level": "medium",
  "issues": [...],
  "recommendations": [...],
  "next_action": {
    "tool": "snapback.protect_code",
    "reason": "Risk score >30 - recommend creating checkpoint first",
    "auto_suggest": true
  }
}
```

---

### 🟢 What's Working Well

#### ✅ Hierarchical Namespacing with `snapback.*`
The `snapback.*` prefix creates clear ownership and brand association. This aligns with Strategy #71 (prefix-based namespacing).

#### ✅ Verb-First Naming
Tools like `create_checkpoint`, `restore_checkpoint` follow Strategy #41 (VerbNoun naming).

#### ✅ Free/Pro Tier Separation
The tier gating is clear and documented, supporting Strategy #131-140 (metadata annotations).

#### ✅ Internal MCP Simplification (Past Work)
From our Dec 20 conversation, you successfully simplified from:
- `snapback-internal:codebase_get_context` → `codebase:get_context`

This follows Strategy #77 (flat hierarchies) and #51 (token efficiency).

---

## Recommended Changes

### Priority 1: Rename Core Tools for Semantic Priming

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| `snapback.analyze_risk` | `snapback.detect_danger` | "danger" triggers protective cognition (#11-17) |
| `snapback.check_dependencies` | `snapback.validate_deps` | "validate" is more decisive than "check" (#2) |
| `snapback.create_checkpoint` | `snapback.protect_now` | "protect" + "now" creates urgency (#17, #38) |
| `snapback.list_checkpoints` | `snapback.show_saves` | "saves" is more familiar than "checkpoints" (#4) |
| `snapback.restore_checkpoint` | `snapback.recover_code` | "recover" implies something was at risk (#16) |

### Priority 2: Rewrite Descriptions (First 25 Words)

**`snapback.detect_danger`** (was analyze_risk):
```
Prevents AI-generated code disasters before they happen. Scans for breaking changes, dependency conflicts, and risky patterns in planned modifications.

ALWAYS call this before applying changes from Cursor, Copilot, Claude, or any AI coding assistant.
```

**`snapback.protect_now`** (was create_checkpoint):
```
Creates an instant recovery point for your code. One-click restore if AI changes break something.

Call BEFORE: auth changes, config edits, migrations, multi-file refactors, or any AI-assisted modifications.
```

**`snapback.recover_code`** (was restore_checkpoint):
```
Instantly undo AI-induced damage by restoring files to a previous safe state.

Use when: code is broken, tests fail after AI changes, or you need to revert a risky modification.
```

### Priority 3: Unify Namespacing

```typescript
// Rename to unified snapback.* namespace
const TOOL_MAPPINGS = {
  // Protection tools
  'snapback.protect_now': 'Create safety checkpoint',
  'snapback.protect_show': 'List available restore points',
  'snapback.protect_recover': 'Restore from checkpoint',
  
  // Analysis tools
  'snapback.inspect_danger': 'Risk analysis before changes',
  'snapback.inspect_deps': 'Dependency validation',
  
  // Documentation tools (was ctx7.*)
  'snapback.docs_find': 'Resolve library to documentation ID',
  'snapback.docs_fetch': 'Get library documentation',
  
  // Meta tools (was catalog.*)
  'snapback.meta_tools': 'List connected MCP tools',
};
```

### Priority 4: Add MCP Annotations

```typescript
// Use MCP annotations for priority hints
{
  name: 'snapback.detect_danger',
  annotations: {
    priority: 0.9,  // High priority for AI-assisted coding
    readOnlyHint: true,  // Safe to call without side effects
    title: '🛡️ Risk Detection',
    tags: ['safety', 'ai-protection', 'code-review'],
  },
}
```

---

## Description Templates

### Template: Protection Tool

```
[OUTCOME in 5 words]. [HOW it helps in 10 words].

Call when: [TRIGGER 1], [TRIGGER 2], [TRIGGER 3].

Works with: Cursor, Copilot, Claude, Windsurf, and other AI coding tools.
```

### Template: Analysis Tool

```
[WHAT it detects] before [BAD THING happens]. [Specific signals checked].

Use BEFORE: [SPECIFIC ACTION 1], [SPECIFIC ACTION 2].

Returns: [OUTPUT SUMMARY] with [NEXT STEPS].
```

### Template: Recovery Tool

```
[ACTION verb] [OBJECT] when [CRISIS SCENARIO].

One-click [BENEFIT] for [SPECIFIC SITUATION].

Safe to call: [SAFETY GUARANTEE].
```

---

## Validation Checklist

Apply to every tool description:

- [ ] **First 5 words** contain action + outcome (not mechanism)
- [ ] **Trigger words** prime security cognition (protect, prevent, danger, safe, risk)
- [ ] **"When to use"** section with specific scenarios
- [ ] **"Works with"** mentions competitor AI tools for semantic priming
- [ ] **Response includes** next-action recommendation
- [ ] **<25 words** before detailed explanation
- [ ] **No bullet points** in first paragraph
- [ ] **Imperative mood** ("Call this" not "This tool")

---

## A/B Test Recommendations

### Test 1: "analyze" vs "detect"
- A: `snapback.analyze_risk`
- B: `snapback.detect_danger`
- Metric: Tool selection rate when user mentions "risky" or "dangerous"

### Test 2: Description Length
- A: Current verbose descriptions
- B: 25-word front-loaded descriptions
- Metric: Time to first tool call, selection accuracy

### Test 3: Namespace Consolidation
- A: `snapback.*`, `catalog.*`, `ctx7.*`
- B: Unified `snapback.*` with sub-categories
- Metric: Tool discovery rate, namespace confusion errors

---

## Implementation Roadmap

### Phase 1 (This Week): Description Rewrites
- Rewrite all 8 product MCP tool descriptions using templates
- Front-load outcomes in first 25 words
- Add "when to use" triggers
- Keep existing tool names (low-risk change)

### Phase 2 (Next Sprint): Tool Renaming
- Rename tools with semantic priming verbs
- Unify namespace under `snapback.*`
- Update all clients (extension, CLI, docs)
- Migration path for existing users

### Phase 3 (Post-Demo): Response Enhancement
- Add `next_action` field to all responses
- Implement tool chaining suggestions
- A/B test different naming conventions

---

## Quick Reference Card

| Strategy Category | Key Principle | Example Application |
|-------------------|---------------|---------------------|
| Neural Architecture | Front-load info in first 5 words | "Prevents AI disasters..." not "This tool analyzes..." |
| Semantic Priming | Use security trigger words | detect, protect, prevent, danger, safe |
| Cognitive Load | <25 words before detail | One sentence = one tool purpose |
| Attention Optimization | "When to use" explicit | "Call BEFORE: auth changes, migrations..." |
| Tokenization | Minimize token count | `snap_risk` (2) vs `snapback.analyze_risk` (4) |
| Response Format | Include next_action | `"next_tool": "snapback.protect_now"` |
| Anthropomorphic | Collaborative framing | "I'll protect your code" not "Code protected" |

---

## Appendix: Full Strategy Mapping

See the 150 strategies document for complete categorization. Top 10 most impactful for SnapBack:

1. **#1** Front-load critical info (first 5 words)
2. **#11** Pre-load with domain triggers (protect, prevent)
3. **#17** Emotionally salient terms (danger, risk, safe)
4. **#23** 15-25 word optimal description length
5. **#41** VerbNoun naming pattern
6. **#71** Prefix-based namespacing
7. **#91** Concise responses by default
8. **#99** Next-step suggestions in responses
9. **#101** Never use "not found" as primary message
10. **#131** Use priority field in annotations
