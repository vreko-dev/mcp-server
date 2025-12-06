# SnapBack Messaging Quick Reference

**For copywriters, product managers, and designers updating website/docs**

---

## The ONE Thing

**Every piece of marketing copy must answer this question:**

> What does the developer SEE happening when they use SnapBack?

Not: "What technology is running?"
Yes: "What problem gets solved?"

---

## Before You Write Anything

### ✅ This is Developer-Native Language
- "SnapBack noticed Copilot broke your auth flow twice."
- "Next time, you catch it before it ships."
- "Seen this refactor pattern fail? SnapBack remembers."
- "Day 1: 94% accurate. Day 30: It knows YOUR codebase."
- "Every recovery makes the next detection more accurate."

### ❌ This is Spec-Speak (Don't Use)
- "Dynamic trust calibration"
- "Continuous outcome-driven feedback loops"
- "Predictive intelligence engine"
- "Per-tool, per-context confidence scoring"
- "Multi-dimensional behavioral analysis"
- "Ground truth learning"
- "Pattern library synchronization"

---

## The 3-Part Message Structure

**Use this template for EVERY update:**

```
WHAT YOU SEE (The behavior)
    ↓
WHAT IT MEANS (The consequence)
    ↓
WHY IT MATTERS (The benefit)
```

### Example:
**What you see:** "SnapBack noticed Copilot broke your auth flow twice."
**What it means:** "It's watching that folder closer now."
**Why it matters:** "Next time, you catch it before it ships."

---

## 5 Core Narrative Themes

Use these as your foundation for ALL messaging:

### 1. Pattern Memory
- "Seen a refactor go wrong? SnapBack remembers."
- "The last time an AI tool touched your tsconfig, it didn't end well."
- "SnapBack is learning what breaks in your codebase."

### 2. Per-Tool Learning
- "SnapBack learns that Cursor is reckless with configs but careful with tests."
- "Copilot committed code that broke twice. Cursor code has never failed. SnapBack knows the difference."

### 3. Collective Immunity (Now: "Learn from Everyone's Mistakes")
- "Seen this pattern fail in 200 repos? SnapBack warns you before you ship it."
- "When 500 devs hit the same AI-generated bug, you get the shortcut to the fix."
- "The network effect: Your repo learns from 1,000+ others. You learn from all of them."

### 4. Ground Truth Loop
- "SnapBack sees your commits. When a Co-authored-by: GitHub Copilot commit causes a rollback, SnapBack remembers."
- "Your merge history is the truth. SnapBack uses it to get smarter about what to flag."

### 5. Progressive Improvement
- "Day 1: 94% accurate. Day 30: It knows YOUR codebase. Month 3: It's caught patterns you didn't know existed."
- "Every recovery makes the next detection more accurate."
- "It gets sharper the longer you use it."

---

## Term Translation Dictionary

| Internal Term | Developer-Native Version |
|---------------|--------------------------|
| "Trust calibration" | "Learns what breaks" |
| "Trust score" | "Confidence" (be specific: "95% confident this will break") |
| "Per-tool trust calibration" | "Learns per-tool behavior" |
| "Continuous calibration" | "Gets smarter over time" |
| "Dynamic intelligence" | "Pattern memory" |
| "Predictive intelligence" | "Remembers what happened" |
| "Pattern library" | "Pattern memory" |
| "Global pattern sync" | "Shared warnings from 1,000+ repos" |
| "Outcome-driven feedback" | "Learns from what actually breaks" |
| "Confidence normalization" | "Adjusts how sure we are" |
| "Ground truth learning" | "Learns from your commits" |
| "Multi-repo pattern analysis" | "Seen this fail in 47 other repos" |

---

## FAQ Template

**Always write problem-centric questions, NOT company-centric:**

### ❌ Don't Write:
- "How does SnapBack improve its accuracy?"
- "What is continuous calibration?"
- "How does the pattern library work?"

### ✅ Write Instead:
- "Why did SnapBack flag this when it was fine last week?"
- "Can I teach SnapBack to ignore false positives?"
- "Does SnapBack share my code with other users?"
- "Will SnapBack catch things I'm not thinking about?"
- "How do I know SnapBack is getting better?"

---

## Accuracy Claims: The Right Way

### ❌ Wrong:
> "94% accuracy with continuous calibration"
> "Dynamic confidence scoring"

### ✅ Right:
> "94% accurate out of the box. Gets sharper the longer you use it."
> "Day 1: 94% accurate. Month 3: It's caught patterns you didn't know existed."

**Why?** Developers care about progression and real-world improvement, not precision metrics.

---

## Home Page / Hero Section Formula

**Headline (5 words max):**
> "SnapBack learns your codebase."

**Value Prop (1 sentence):**
> "Every recovery, every merge, every rollback—SnapBack watches what AI tools actually break, so it catches the next disaster before it ships."

**3 Proof Points:**
1. **Pattern Memory**: Seen a refactor go wrong? SnapBack remembers.
2. **Per-Tool Learning**: Learns that Cursor is reckless with configs, careful with tests.
3. **Learn from Everyone's Mistakes**: Opt-in to learn from 1,000+ repos' disasters.

---

## Feature Description Formula

**For each feature, answer:**

1. What behavior does the user see?
2. What problem does it solve?
3. Why should they care?

### Example: Pattern Memory Feature

**What they see:**
"You restore a failed Copilot change to your config file."

**What the behavior is:**
"SnapBack remembers this pattern broke before."

**Why they care:**
"Next time Copilot tries to touch that config, SnapBack flags it first."

---

## Red Flags in Your Copy

If you see ANY of these, rewrite it:

- ❌ "Real-time risk analysis" → Use "SnapBack watches..." instead
- ❌ "94% accuracy" (without context) → Add "Day 1" framing
- ❌ "Detects AI patterns" → Say "Remembers what broke"
- ❌ "Dynamic trust system" → Say "Learns from outcomes"
- ❌ "Feedback loops" → Say "Learns from what you ignore"
- ❌ "Confidence scoring" → Say "How sure we are"
- ❌ "Multi-dimensional analysis" → Say "Learns your patterns"

---

## Key Reminders

✅ **Show the behavior.** Not the mechanism.
✅ **Use concrete examples.** "Copilot broke auth twice" not "multi-pattern detection."
✅ **Make it personal.** "Your codebase" and "your commits," not generic language.
✅ **Use developer vocabulary.** Repos, branches, commits, merges—not "data points."
✅ **Ground progress in time.** Day 1 vs Day 30, not "continuous improvement."

---

## 💲 Pricing References

**Use these numbers in ALL pricing copy:**

| Tier | Price | Annual |
|------|-------|--------|
| Free | Free forever | - |
| Pro | $12/mo | $120/yr |
| Team | $29/mo | $290/yr |

**Copy guidance:**
- Free: "Everything you need for local protection"
- Pro: "Personal protection with community pattern learning"
- Team: "Team protection, centralized policies, shared learning"

---

## 🏗️ Architecture.md: The Jargon Safety Valve

Technical terms belong ONLY in `docs/architecture.mdx`. When you DO use them, add a one-line developer translation:

### ✅ Example:
```markdown
## Trust Calibration Engine
*How SnapBack learns which AI tools cause problems in your specific codebase.*

## Pattern Library
*The memory of patterns SnapBack has seen across your repo and optionally, from the community.*
```

This creates a bridge for power users who read both marketing copy and technical docs.

---

**Ask yourself:** Can I explain this feature to a developer in one sentence using words they use every day?

- If YES → You're ready to ship.
- If NO → Rewrite using the 3-Part Structure.

---

**Last Updated:** December 6, 2025
**Status:** Ready for implementation
**Questions?** Refer to MESSAGING_AUDIT_INVENTORY.md for full context
