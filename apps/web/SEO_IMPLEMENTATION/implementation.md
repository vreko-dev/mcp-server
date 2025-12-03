# SnapBack SEO Content & Documentation Implementation Prompt

## Mission

Implement the SnapBack SEO content strategy by deploying 5 new documentation pages to `new-docs.snapback.dev` (Fumadocs) and updating linking on `snapback.dev` (marketing site). This creates a bidirectional SEO flywheel where docs rank for educational queries and funnel users to install.

---

## Context

### Current Architecture
```
snapback.dev (Marketing Site - Next.js)
├── / (Landing page with hero)
├── /features (6 feature cards)
├── /pricing (Free/Solo/Team tiers)
└── Links need updating to point to docs

new-docs.snapback.dev (Documentation Site - Fumadocs)
├── /getting-started/quick-start (exists)
├── /reference/shortcuts (exists)
├── /reference/performance (exists)
├── /reference/storage (exists)
├── /about (exists)
└── NEW PAGES NEEDED (5 pages below)
```

### Target State
```
snapback.dev
├── Hero "See How It Works" → docs/getting-started/first-restore
├── Features cards "Learn more" → relevant docs pages
├── Pricing "FAQ" → docs/faq
└── Footer with docs links

new-docs.snapback.dev
├── /why-snapback (NEW - comparison SEO)
├── /getting-started/first-restore (NEW - tutorial SEO)
├── /core-concepts/ai-detection (NEW - technical SEO)
├── /integrations/copilot (NEW - integration SEO)
├── /faq (NEW - featured snippets SEO)
└── All pages link back to snapback.dev/install CTAs
```

---

## Phase 1: Docs Site Implementation (new-docs.snapback.dev)

### Step 1.1: Create Directory Structure

```bash
# Navigate to docs project
cd apps/docs  # or wherever your Fumadocs project lives

# Create required directories
mkdir -p content/docs/getting-started
mkdir -p content/docs/core-concepts
mkdir -p content/docs/integrations
```

### Step 1.2: Deploy MDX Files

Create these 5 files with the exact content provided:

#### File 1: `content/docs/why-snapback.mdx`
**Purpose**: SEO for "SnapBack vs Git", "code snapshot", "recover from AI"

```mdx
---
title: Why SnapBack? Comparison Guide
description: How SnapBack compares to Git, VS Code Local History, and manual backups for recovering from AI code changes.
---

import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'

# Why SnapBack?

You already have Git. You already have VS Code Local History. So why do you need SnapBack?

**Short answer**: Because they solve different problems, and AI-assisted coding created a new one.

## The Real Problem

You're coding with Copilot, Cursor, or Claude. It's amazing for productivity. But then this happens:

```
10:05 AM - AI suggests: "Refactor this authentication flow"
10:06 AM - You accept the suggestion
10:07 AM - TypeScript errors everywhere
10:08 AM - Cmd+Z doesn't work (47 changes in one suggestion)
10:09 AM - Git shows nothing (you haven't committed since 10:00)
10:15 AM - You're manually reverting changes, line by line
```

**This is the gap SnapBack fills.**

## SnapBack vs Git

| Scenario | Git | SnapBack |
|----------|-----|----------|
| **Use case** | Intentional checkpoints | The moments *between* commits |
| **Recovery time** | Minutes (checkout, conflict resolution) | Seconds (one click) |
| **Requires commitment** | Yes, manually | No, automatic |
| **Detects AI changes** | No | Yes (pattern matching) |
| **Workflow interruption** | High (context switching) | None (backgrounded) |
| **Works offline** | Yes | Yes |
| **Good for** | "This feature works" | "Uh, what did Copilot just do?" |

### When to Use Git

Git is still your source of truth for:
- Intentional, meaningful checkpoints
- Code review and collaboration
- Deployment and version control
- Long-term project history

**Git is not designed for micro-recovery.** Asking Git to save you from AI mistakes is like using a version control system as a text editor.

### When to Use SnapBack

Use SnapBack for:
- **The 5-minute window** after you accept an AI suggestion
- **Session-based recovery** without committing
- **Risk mitigation** when experimenting with AI refactors
- **"I didn't commit yet"** moments

**SnapBack doesn't replace Git. It protects you between commits.**

---

## SnapBack vs VS Code Local History

VS Code has a built-in Local History feature. It's passive, it's free, and it creates snapshots. Sounds similar to SnapBack. Here's what's different:

| Aspect | Local History | SnapBack |
|--------|---------------|----------|
| **How it works** | Passive, generic file history | Active, AI-aware snapshots |
| **Stores snapshots** | Yes, timestamps | Yes, by session + trigger type |
| **Knows about AI?** | No | Yes (detects AI patterns) |
| **Search/browse** | By timestamp only | By context (AI-detected, manual, session start) |
| **Restoration** | File-by-file, manual | One click, entire session or single file |
| **Retention policy** | Fixed time window | Smart (keeps more around risky moments) |
| **Keyboard shortcut** | No | ⌘+⇧+Z (or Ctrl+Shift+Z) |
| **Session time-travel** | No | Yes (restore entire session state) |

### Why Local History Isn't Enough

Local History is **event-neutral**—it doesn't understand context. When you're using AI, timing matters:

```
10:00 AM - Regular coding (save, save, save)
         └─ 3 snapshots in Local History

10:05 AM - AI suggestion accepted
         └─ 1 snapshot in Local History (looks like any other save)

10:06 AM - Tests fail
         └─ Now you have to hunt through 4 snapshots to find the right one

With SnapBack:
10:05 AM - AI suggestion accepted
         └─ Flagged as "AI-detected change" in sidebar

10:06 AM - Click it, restore it. Done.
```

**Local History requires you to think like a detective. SnapBack thinks for you.**

---

## SnapBack vs Manual Backups

Some developers use workarounds:
- Duplicate files before trying AI suggestions
- Save copies with timestamps
- Git commit before every AI suggestion

These *work*, but they're:
- ❌ Manual (easy to forget)
- ❌ Cluttered (your project folder is a mess)
- ❌ Not scalable (impossible across multiple files)
- ❌ Workflow interruption (breaks your flow)

**SnapBack automates what manual backups do, without friction.**

---

## The Cost of Switching

### Switching to SnapBack

```
Time to install: 30 seconds
Learning curve: ~2 minutes
Disruption: Zero
```

1. Install from VS Code Marketplace
2. Accept default settings
3. Start saving files
4. SnapBack captures snapshots automatically

### Switching Away From SnapBack

```
Data: All local, easy to export
Dependencies: Zero (it's passive)
Workflow impact: None (just remove the extension)
```

No lock-in, no vendor dependency. Your code stays yours.

---

## Real-World Scenario

### Without SnapBack

```
You're refactoring a payment component.
Cursor suggests a "optimization."
You accept it.
3 files changed. 87 lines modified.
Tests pass. Ship it.

2 days later: "Why is payment failing for split payments?"
Hunt through Git history. Find the bad commit.
Try to understand what changed in 3 files.
3 hours of debugging.
```

### With SnapBack

```
You're refactoring a payment component.
Cursor suggests an "optimization."
SnapBack captures snapshot.
You accept it.
3 files changed. 87 lines modified.
Tests pass. Ship it.

2 days later: "Why is payment failing for split payments?"
SnapBack sidebar shows: "Oct 15, 10:30 AM - AI-detected change"
Click it. Restore it. Compare side-by-side.
Understand exactly what changed.
15 minutes of debugging.
```

---

## FAQ

<Callout type="info" title="Will SnapBack slow down my editor?">
No. Snapshots are captured **asynchronously** after you save. Typical overhead: <50ms. We obsess over keeping this lightweight.

[Learn about performance ↗](/reference/performance)
</Callout>

<Callout type="info" title="Does SnapBack work with Cursor and Copilot?">
Yes. SnapBack works with any VS Code fork: Cursor, VSCodium, Code Server, etc.

[Integration guides ↗](/integrations)
</Callout>

<Callout type="info" title="What if I want to keep using Git commits?">
Perfect. Use SnapBack for sub-commit recovery, Git for intentional checkpoints. They complement each other.

**Recommended workflow**:
- Use SnapBack for: Drafts, experiments, AI suggestions
- Use Git for: Meaningful, tested, ready-to-ship code
</Callout>

---

## Ready to Try It?

You've probably spent more time reading this page than it takes to install and try SnapBack.

[Install SnapBack Now →](https://snapback.dev) – It's free, takes 30 seconds, and requires no configuration.

Then, when an AI assistant next breaks your code, you'll be glad you have it.

### Next Steps

- [Quick Start Guide →](/getting-started/quick-start) – Install and create your first snapshot
- [Your First Restore →](/getting-started/first-restore) – Walk through a recovery scenario
- [How It Works →](/core-concepts/ai-detection) – Understand AI detection
```

---

#### File 2: `content/docs/getting-started/first-restore.mdx`
**Purpose**: SEO for "how to recover code", "undo AI changes", "restore file"

```mdx
---
title: Your First Restore - Step-by-Step Guide
description: Learn how to recover from an AI code change in 2 minutes. Walk through a real scenario with SnapBack.
---

import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Callout } from 'fumadocs-ui/components/callout'

# Your First Restore

In 2 minutes, you'll recover from a simulated AI mistake and understand how SnapBack saves hours of debugging.

**What you'll learn:**
- How to trigger a snapshot
- How to restore your code
- How to read the diff view

---

## Setup: Create a Test File

<Steps>

<Step>
### Create a new JavaScript file

In VS Code, create a new file called `test-snapback.js`:

```javascript
// A simple shopping cart calculator
function calculateTotal(items) {
  let total = 0;

  for (const item of items) {
    total += item.price * item.quantity;
  }

  return total;
}

// Test data
const cart = [
  { name: "Laptop", price: 999, quantity: 1 },
  { name: "Mouse", price: 25, quantity: 2 },
  { name: "Keyboard", price: 75, quantity: 1 }
];

console.log(`Total: $${calculateTotal(cart)}`);
// Expected: $1123
```

**Save the file.** ✅ **SnapBack just created your first snapshot.**

You can see it in the SnapBack sidebar:
```
📁 test-snapback.js
  └── Just now (snapshot: v1)
```
</Step>

<Step>
### Simulate an AI mistake

Now imagine Copilot "optimized" your code. Replace the entire file with this broken version:

```javascript
// "Refactored" by AI (has a bug!)
const calculateTotal = (items) =>
  items.reduce((acc, item) => acc + item.price * item.qty, 0);

// Test data
const cart = [
  { name: "Laptop", price: 999, quantity: 1 },
  { name: "Mouse", price: 25, quantity: 2 },
  { name: "Keyboard", price: 75, quantity: 1 }
];

console.log(`Total: $${calculateTotal(cart)}`);
// Expected: $1123
// Actual: $0 ❌ (AI renamed 'quantity' to 'qty')
```

**Save the file.** ✅ **SnapBack captured the change and flagged it as "AI-detected."**

In the sidebar:
```
📁 test-snapback.js
  └── Just now (AI-detected ⚠️)
  └── 30 seconds ago (snapshot: v1)
```

Notice the warning badge. SnapBack recognized the risky change pattern.
</Step>

<Step>
### Restore your working code

Time to recover:

1. **Open the SnapBack sidebar**
   - Click the SnapBack icon in VS Code's activity bar (left sidebar)
   - Or press `⌘+⇧+X` (or `Ctrl+Shift+X` on Windows)

2. **Find your snapshots**
   ```
   📁 test-snapback.js
      ├── Just now (AI-detected ⚠️) ← The broken version
      └── 30 seconds ago ✓           ← The working version
   ```

3. **Click the earlier snapshot** (the working version)
   - A diff view opens showing what changed
   - Review the changes to understand what AI broke

4. **Click "Restore"** or press `⌘+Enter`
   - Your file instantly returns to working code
   - SnapBack closes the diff view

**Done.** Your working code is back. No manual hunting, no Git history spelunking.
</Step>

</Steps>

---

## What Just Happened?

### Timeline

| Time | Event | SnapBack Action |
|------|-------|-----------------|
| 10:00 | You save working code | Creates snapshot v1 |
| 10:01 | You accept AI suggestion | Creates snapshot v2, flags as "AI-detected" |
| 10:02 | You want to undo | 1 click → restored to v1 |

### Key Insights

**1. Automatic snapshots**
You didn't do anything special. SnapBack captured both saves automatically.

**2. Context awareness**
SnapBack recognized that v2 looked like AI-generated code. It flagged it without needing you to say "this looks bad."

**3. Non-destructive recovery**
When you restore v1, v2 isn't deleted. Both versions stay in history. You can compare them later.

---

## Real-World Scenarios

### Scenario 1: Large Refactor Gone Wrong

```javascript
// Original: Working authentication module
export function login(email, password) {
  if (!email || !password) return null;
  return validateCredentials(email, password);
}

// AI suggestion: "Use async/await and fetch"
// But AI forgot to handle errors, changed parameter names, broke types...
// Result: 47 lines changed, tests fail
```

**Recovery**: Find the snapshot before you accepted the suggestion. Restore in 2 seconds.

### Scenario 2: "I'll Just Undo with Cmd+Z"

```
- You accept AI suggestion (changes 8 files)
- Tests fail
- You press Cmd+Z
- Cmd+Z undoes 1 character in 1 file
- You press Cmd+Z 47 more times
- 5 minutes later: frustrated
```

**With SnapBack**: 1 click, all 8 files restored.

### Scenario 3: Multi-File AI Suggestion

```
Claude suggests: "Refactor this component library"
You accept it.
Changes:
  ├── Button.tsx (broke styling)
  ├── Input.tsx (changed API)
  ├── Form.tsx (renamed props)
  └── utils/validation.ts (logic error)

Your tests catch 2/4 issues. But production might catch the others.
```

**With SnapBack**: Before you push/deploy, restore all 4 files to before the suggestion. You can carefully apply the good changes and reject the bad ones.

---

## Pro Tips

### Tip 1: Restore Specific Files

You don't always want to restore everything. If AI changed 5 files but only 1 is broken:

1. Open the diff view for the bad snapshot
2. Click "Restore" next to only the files you need
3. Leave the good changes in place

### Tip 2: Compare Side-by-Side

Before restoring, study the diff:

```javascript
// LEFT (your original)
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// RIGHT (AI's version)
const calculateTotal = (items) =>
  items.reduce((acc, item) => acc + item.price * item.qty, 0);
  //                                              ^^^ BUG: qty vs quantity
```

Understanding what changed teaches you what AI gets wrong.

### Tip 3: Keep Working Snapshots Starred

If you have a snapshot you want to keep around, you can:
1. Right-click it in the sidebar
2. Select "Keep snapshot" (or star it)

SnapBack won't auto-delete starred snapshots.

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| **Open SnapBack sidebar** | ⌘+⇧+X | Ctrl+Shift+X |
| **Restore snapshot** | ⌘+Enter | Ctrl+Enter |
| **Toggle diff view** | ⌘+\ | Ctrl+\ |
| **Compare with current** | ⌘+Shift+C | Ctrl+Shift+C |

---

## Next Steps

Great! You understand the basics. Now:

- **[Quick Start Guide →](/getting-started/quick-start)** – Install SnapBack for real
- **[How Snapshots Work →](/core-concepts/protection-levels)** – Customize your protection
- **[AI Detection Explained →](/core-concepts/ai-detection)** – Understand how SnapBack detects risky changes
- **[Keyboard Shortcuts Reference →](/reference/shortcuts)** – Master all the shortcuts

---

<Callout type="success">
**You just recovered from an AI mistake in seconds instead of hours.**

This is what SnapBack does every day. Ready to protect your real code?

[Install SnapBack Now →](https://snapback.dev)
</Callout>
```

---

#### File 3: `content/docs/integrations/copilot.mdx`
**Purpose**: SEO for "SnapBack Copilot", "undo Copilot", "Copilot recovery"

```mdx
---
title: SnapBack + Copilot - Undo AI Mistakes Instantly
description: How to use SnapBack with GitHub Copilot to recover from bad code suggestions and AI refactoring mistakes.
---

import { Callout } from 'fumadocs-ui/components/callout'
import { Step, Steps } from 'fumadocs-ui/components/steps'

# SnapBack + Copilot Integration

GitHub Copilot is amazing for productivity. But it also breaks things. SnapBack catches it.

**In this guide:**
- How SnapBack detects Copilot mistakes
- Setting up both extensions together
- Real recovery scenarios

---

## Why You Need SnapBack With Copilot

Copilot excels at:
- ✅ Autocompleting boilerplate
- ✅ Suggesting common patterns
- ✅ Reducing typing

Copilot struggles with:
- ❌ Context-specific logic
- ❌ Edge cases
- ❌ Your project's conventions

**Result**: Sometimes you accept a suggestion that looks right, but breaks something subtle. By the time tests catch it, you've moved on to the next file.

---

## How They Work Together

### The Workflow

```
1. You type a function signature
2. Copilot suggests an implementation
3. You press Tab to accept
   └─ SnapBack captures a snapshot
   └─ Flags it as "Copilot suggestion"
4. Tests fail / you notice an issue
5. SnapBack sidebar shows the suggestion
6. One click to restore
```

### Detection Pattern

SnapBack recognizes Copilot's fingerprints:

```javascript
// Copilot often:
// 1. Generates entire multi-line blocks at once
// 2. Uses consistent formatting
// 3. Follows common patterns closely (sometimes too closely)

// Example: You type a function signature
function formatPhoneNumber(phone) {

// Copilot suggests: (you accept Tab)
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// SnapBack flags this because:
// - Large insertion (multi-line)
// - Consistent indentation
// - Pattern matching (regex, slicing)
```

---

## Installation

<Steps>

<Step>
### Install Both Extensions

**From VS Code:**

1. Open Extensions (⌘+⇧+X on Mac, Ctrl+Shift+X on Windows)

2. Search for "Copilot"
   - Install: **GitHub Copilot** (official)
   - Install: **GitHub Copilot Chat** (optional, for chat features)

3. Search for "SnapBack"
   - Install: **SnapBack** (official)

4. Reload VS Code

Both extensions run automatically with zero configuration.
</Step>

<Step>
### Configure Copilot (Recommended)

Copilot has settings that affect SnapBack's usefulness:

**File → Preferences → Settings** (or ⌘+,)

Search: "copilot"

Recommended settings:
```
Copilot: Enable Code Completions ✓
Copilot: Auto-Suggest  ✓
Copilot: Suggest On Comment  ✓
```

(These are defaults, but worth checking.)
</Step>

<Step>
### Enable SnapBack Telemetry (Optional)

This helps SnapBack improve AI detection:

**File → Preferences → Settings**

Search: "snapback telemetry"

```
SnapBack: Share Anonymous Usage Data  ✓ (recommended)
```

(We never see your code, only event patterns like "snapshot created.")
</Step>

</Steps>

---

## Real Scenarios

### Scenario 1: Copilot Suggests a Shortcut That Breaks Logic

```typescript
// You type: A function to calculate shipping cost
function getShippingCost(weight, distance) {

// Copilot suggests:
  const rate = weight * 0.5 + distance * 0.01;
  return Math.round(rate * 100) / 100;
}

// You accept (looks reasonable)
// Later: Shipping costs are way off
// Reason: Copilot didn't account for your pricing tiers
```

**Without SnapBack**: Hunt through Git history, manually reconstruct what was there.

**With SnapBack**:
- Sidebar shows "Copilot suggestion, 10 min ago"
- Click restore
- See the diff
- Understand Copilot missed the pricing tier logic

### Scenario 2: Copilot Renames Variables Inconsistently

```typescript
// Original: (using your project's convention)
const userEmail = userData.email;
const userName = userData.name;

// Copilot suggests: (uses different convention)
const email = userData.email;
const name = userData.name;

// You accept (subtle change)
// Later: Tests fail because of inconsistent naming
```

**With SnapBack**: Restore to original naming convention instantly. No manual variable renaming.

### Scenario 3: Copilot Suggests Async When Sync Is Needed

```typescript
// You have:
function validateInput(data) {
  return schema.validate(data);
}

// Copilot "helpfully" suggests:
async function validateInput(data) {
  return await schema.validate(data);
}

// You accept
// Later: Every call breaks because function is now async
```

**With SnapBack**: Undo the suggestion. Learn that Copilot sometimes adds async unnecessarily.

---

## Optimization: Multiple File Suggestions

When Copilot changes multiple files at once:

```
function submitForm(data) {
  // Copilot suggests changes to:
  // 1. submitForm() - accepts changes
  // 2. validateForm() - accepts changes
  // 3. api.ts - rejects (looks wrong)

  // Now 2 files are edited, 1 is not
  // How do you undo just the api.ts change?
}
```

**SnapBack's multi-file restore:**

1. Open SnapBack sidebar
2. Find the snapshot with the Copilot suggestion
3. Click to see the diff
4. Checkboxes for each file
5. Restore only the files you want

---

## Workflow Tips

### Tip 1: Don't Accept Every Suggestion

This might seem obvious, but:
- Read Copilot's suggestion before pressing Tab
- Does it match your project's style?
- Does it handle edge cases?
- If unsure, Escape and type it yourself

**SnapBack catches mistakes, but preventing them is better.**

### Tip 2: Commit Before Big Refactors

If you're asking Copilot to refactor 10 functions:

1. Git commit your working code
2. Accept Copilot's suggestions
3. Run tests
4. If broken, SnapBack lets you roll back one suggestion at a time
5. Git commit your refined version

### Tip 3: Use Copilot Chat for Complex Logic

For tricky logic, use Copilot Chat instead of inline autocomplete:

1. Select the code
2. Cmd+I (or Ctrl+I)
3. Ask: "Refactor this to handle edge case X"
4. Read the response first
5. Accept if it looks good

This gives you time to think instead of auto-accepting suggestions.

---

## Common Questions

<Callout type="info" title="Will SnapBack slow down Copilot?">
No. SnapBack doesn't interact with Copilot. When you accept a Copilot suggestion, SnapBack just captures a snapshot asynchronously (~50ms overhead).

Both extensions run independently.
</Callout>

<Callout type="info" title="Does SnapBack work with Copilot Chat?">
Yes. When you use Copilot Chat to generate code:

1. Chat generates code
2. You apply it (paste or button)
3. SnapBack captures the snapshot

The diff might be larger (Chat often generates more code), but recovery works the same way.
</Callout>

<Callout type="info" title="Can I disable AI detection for Copilot?">
Yes. In SnapBack settings:

**File → Preferences → Settings → SnapBack: AI Detection**

- `all` (default) - Detects Copilot, Claude, etc.
- `strict` - High confidence only
- `off` - Disables detection (not recommended)
</Callout>

<Callout type="info" title="What if Copilot's suggestion is actually good?">
Great! Keep it. The snapshot stays in history, but you're not forced to restore it.

SnapBack just flagged it as "potentially risky" so you can review it later if needed.
</Callout>

---

## Comparison: Copilot Alone vs. Copilot + SnapBack

| Moment | Copilot Only | Copilot + SnapBack |
|--------|-------|--------|
| **You accept a Copilot suggestion** | Changes applied immediately | Snapshot created + flagged as "Copilot" |
| **Tests fail** | Undo with Cmd+Z (works for ~5 changes) | Check sidebar, see exactly which suggestion broke it |
| **You want to compare** | Git log (confusing) | SnapBack diff (clear side-by-side) |
| **Recovery time** | 5-15 minutes | 5-15 seconds |
| **You understand what went wrong** | Maybe | Yes (diff shows it) |

---

## Next Steps

- **[Your First Restore →](/getting-started/first-restore)** – Try SnapBack with a test file
- **[Cursor Integration →](/integrations/cursor)** – SnapBack also works great with Cursor
- **[AI Detection Explained →](/core-concepts/ai-detection)** – How SnapBack recognizes AI changes
- **[Keyboard Shortcuts →](/reference/shortcuts)** – Master the controls

---

<Callout type="success">
You're now set up to use Copilot safely. Experiment boldly, recover instantly.

[Get Started →](https://snapback.dev)
</Callout>
```

---

#### File 4: `content/docs/core-concepts/ai-detection.mdx`
**Purpose**: SEO for "AI code detection", "detect AI changes", "Guardian"

```mdx
---
title: How AI Detection Works in SnapBack
description: Understanding how SnapBack detects AI-generated code changes and identifies risky patterns.
---

import { Callout } from 'fumadocs-ui/components/callout'

# How AI Detection Works

SnapBack doesn't just save snapshots—it understands *when* you're taking them.

**Key insight**: When AI writes code, it has recognizable patterns. SnapBack learns to spot them.

---

## Why AI Detection Matters

Imagine this timeline:

```
10:00 AM - Regular coding (save, save, save)
         └─ 5 normal snapshots

10:05 AM - You accept Copilot's suggestion
         └─ Code changes significantly

10:06 AM - Tests fail

10:07 AM - You open SnapBack sidebar
         └─ 6 snapshots. Which one has the broken suggestion?
         └─ Without detection: "Uh... one of them?"
         └─ With detection: ⚠️ "AI-detected change, 10 min ago"
```

**AI detection eliminates the guessing.**

---

## The Patterns SnapBack Recognizes

### Pattern 1: Large Multi-Line Insertions

Human code:
```javascript
function add(a, b) {
  return a + b;
}
```

AI code:
```javascript
// AI often generates entire logical blocks at once
export const calculateTotalPrice = (items: Item[], taxRate: number): number => {
  if (!items || items.length === 0) {
    return 0;
  }

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const discount = item.discountPercent ? itemTotal * (item.discountPercent / 100) : 0;
    return sum + (itemTotal - discount);
  }, 0);

  const tax = subtotal * taxRate;
  return Math.round((subtotal + tax) * 100) / 100;
};
```

**Detection trigger**: 10+ lines inserted in one go, with complete logic flow.

### Pattern 2: Consistent Formatting Across Scope

Humans write inconsistently (sometimes single-line, sometimes multi-line):

```javascript
// Human style
const x = 1;
const veryLongVariableName =
  expensiveCalculation();
```

AI writes with architectural consistency:

```javascript
// AI style (predictable formatting)
const user = await fetchUser(userId);
const posts = await fetchPosts(userId);
const comments = await fetchComments(userId);
```

**Detection trigger**: Repeated patterns (indentation, bracket placement, variable naming).

### Pattern 3: Overly Defensive Code

Humans trust their code (sometimes too much):

```javascript
function getUser(id) {
  return users[id];
}
```

AI often generates defensive code:

```javascript
export function getUser(id: number): User | null {
  if (typeof id !== 'number' || id < 0) {
    throw new Error('Invalid user ID');
  }

  if (!users || !Array.isArray(users)) {
    console.warn('Users array not initialized');
    return null;
  }

  const user = users[id];
  return user ?? null;
}
```

**Detection trigger**: Excess type checking, guard clauses, null checks.

### Pattern 4: Common AI Pitfalls

AI sometimes:
- ❌ Renames variables inconsistently with project convention
- ❌ Adds unnecessary async/await
- ❌ Uses patterns from different frameworks
- ❌ Changes naming conventions mid-file

Example:
```typescript
// Your project uses camelCase for properties
const userData = { firstName: 'John', lastName: 'Doe' };

// AI suggestion uses snake_case (different convention)
const user_data = { first_name: 'John', last_name: 'Doe' };
```

**Detection trigger**: Naming pattern shifts, inconsistent conventions.

### Pattern 5: Scope Creep

You asked AI to: "Add validation to this function"

AI did: "Here's a completely refactored authentication module with new types, error handling, logging, and session management"

**Detection trigger**: Changes span multiple concerns, or changes appear in unexpected files.

---

## The Detection Algorithm

SnapBack's detection isn't magic. It's probabilistic:

```
For each snapshot, calculate a risk score:

  if (lines_inserted > 5) → +20 points
  if (formatting_consistent) → +15 points
  if (defensive_code_detected) → +10 points
  if (naming_convention_shift) → +25 points
  if (scope_creep) → +20 points
  if (common_ai_patterns) → +15 points

  if (total_score > 50) → Flag as "AI-detected"
  if (total_score > 80) → Flag as "High confidence AI"
```

**This isn't trying to be 100% accurate.** It's trying to be helpful.

---

## What AI Detection Can't Do

<Callout type="warning">
SnapBack's AI detection is **pattern-based, not semantic**. It catches obvious AI changes, not subtle ones.

**It will miss:**
- Small AI-generated changes (1-2 lines)
- AI changes that match your code style perfectly
- Legitimate refactors that happen to look "AI-like"

**It will have false positives:**
- Large refactors you did yourself
- Copying code from Stack Overflow
- Generated boilerplate

**This is intentional.** A false positive (flagging your code as AI) is better than a false negative (missing real AI changes).
</Callout>

---

## Why This Approach?

You might think: "Why not use ML/neural networks/transformer models to detect AI?"

Because:

1. **Overkill**: Pattern matching catches 95% of real problems
2. **Local**: SnapBack runs locally, no cloud needed
3. **Fast**: Pattern matching is instant (<1ms)
4. **Transparent**: You can understand why it flagged something
5. **Private**: No need to send code to an API

---

## How to Use Detection Effectively

### Use Detection As a Guide, Not Gospel

When SnapBack flags something as "AI-detected":
- It might be AI
- It might be you copy-pasting
- It might be a legitimate refactor

**Action**: Review the diff. If it looks safe, keep it. If not, restore.

### Configure Detection Sensitivity

**File → Preferences → Settings → SnapBack: AI Detection Sensitivity**

```
Sensitivity: "strict"    - Only flag obvious AI changes
Sensitivity: "balanced"  - Default (recommended)
Sensitivity: "relaxed"   - Flag anything suspicious
```

If you use AI a lot and want fewer false positives, choose `relaxed`.

### Create a Git Workflow That Uses Detection

```bash
# Recommended workflow:
1. Code with AI (Copilot, Cursor, Claude)
2. Accept AI suggestions
3. SnapBack flags risky changes automatically
4. Before git commit, review flagged snapshots
5. If broken, restore. If OK, continue.
6. git commit the final version
```

This catches mistakes before they reach Git.

---

## Manual Override

Don't trust the detection?

**Override it manually:**

1. Open SnapBack sidebar
2. Right-click a snapshot
3. Select "Mark as AI" or "Unmark as AI"
4. SnapBack remembers your preference

---

## Real-World Impact

### Without AI Detection

```
You have 50 snapshots from today.
Tests fail.
You open SnapBack: "Which one broke it?"
You manually review 5-10 diffs.
10 minutes later: Found it.
```

### With AI Detection

```
You have 50 snapshots from today.
Tests fail.
You open SnapBack: See 2 "AI-detected" flags
Click the most recent one.
Review diff: "Yep, that's the problem."
Restore it.
2 minutes later: Fixed.
```

**5x faster recovery.**

---

## The Vision

AI detection is SnapBack's secret sauce. As more developers use AI, SnapBack learns:

- What patterns actually cause problems
- How different AI tools (Copilot vs. Claude vs. Cursor) signature their code
- What risky patterns you specifically care about

Eventually, detection becomes *predictive*: "This pattern usually breaks X, be careful."

---

## Next Steps

- **[Your First Restore →](/getting-started/first-restore)** – See AI detection in action
- **[SnapBack + Copilot →](/integrations/copilot)** – Use detection with Copilot
- **[Keyboard Shortcuts →](/reference/shortcuts)** – Fast snapshot navigation

---

<Callout type="success">
Now you understand the AI detection system. It's not magic—it's just pattern matching, helping you catch mistakes faster.

[Install SnapBack and try it →](https://snapback.dev)
</Callout>
```

---

#### File 5: `content/docs/faq.mdx`
**Purpose**: SEO for Q&A style queries, featured snippets

```mdx
---
title: SnapBack FAQ - Answers to Common Questions
description: Frequently asked questions about SnapBack installation, pricing, privacy, features, and troubleshooting.
---

import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Callout } from 'fumadocs-ui/components/callout'

# Frequently Asked Questions

---

## Getting Started

<Accordions>

<Accordion title="What is SnapBack?">
SnapBack is a VS Code extension that automatically creates snapshots of your code when you save. It intelligently detects when AI assistants (like Copilot, Cursor, or Claude) make risky changes, and lets you restore your code with one click.

**In short**: Undo for the AI era.
</Accordion>

<Accordion title="How do I install SnapBack?">
1. Open VS Code
2. Go to Extensions (⌘+⇧+X on Mac, Ctrl+Shift+X on Windows)
3. Search for "SnapBack"
4. Click Install

That's it. No configuration needed. SnapBack starts capturing snapshots immediately.
</Accordion>

<Accordion title="Is SnapBack free?">
Yes, completely free during beta. No account required, no credit card, no limits on snapshots.

We'll introduce paid team plans (Pro and Team tiers) in Q1 2025. Individual developers will always have free access to core features.
</Accordion>

<Accordion title="Do I need an account or login?">
No. SnapBack works completely offline with zero account requirements. Your code never leaves your machine.
</Accordion>

<Accordion title="Will SnapBack slow down my editor?">
No. Snapshots are captured asynchronously after you save. Typical overhead is <50ms—imperceptible even on slower machines.

[See performance benchmarks →](/reference/performance)
</Accordion>

</Accordions>

---

## Features & Functionality

<Accordions>

<Accordion title="How do snapshots work?">
Every time you save a file, SnapBack creates an instant backup. It stores this locally using content-addressable storage (identical files aren't duplicated).

When you restore, you get the exact version of your code from that moment.
</Accordion>

<Accordion title="How much disk space do snapshots use?">
Typical usage: 10-500MB depending on your project size and activity.

SnapBack uses **deduplication**, so:
- Same file saved 10 times = stored once
- 1000-line file with 1-character change = only the diff is stored (not the whole file)

You can see your storage usage in SnapBack settings.
</Accordion>

<Accordion title="How far back can I restore?">
By default, SnapBack keeps snapshots for:
- **Same session**: All snapshots
- **Previous sessions**: Last 30 days (configurable)
- **Storage limit**: Until you hit your disk space limit

You can manually "star" snapshots to keep them indefinitely.
</Accordion>

<Accordion title="Can I restore only part of a file?">
Not individual lines, but you can:
1. Restore the entire file
2. See the diff
3. Manually keep/remove changes

Or, for multiple files: restore only the files you want from a multi-file snapshot.
</Accordion>

<Accordion title="What if I restore something by accident?">
Don't panic. Restoring creates a new snapshot automatically. So:
1. You restore old code (creates snapshot)
2. You realize you made a mistake
3. Restore the snapshot from step 1

You can always undo a restore.
</Accordion>

<Accordion title="How does AI detection work?">
SnapBack analyzes code changes for patterns common in AI-generated code:
- Large multi-line insertions
- Consistent formatting
- Defensive code patterns
- Naming convention shifts

It flags suspicious changes as "AI-detected" so you can review them first.

[Learn more about AI detection →](/core-concepts/ai-detection)
</Accordion>

<Accordion title="Is AI detection accurate?">
No algorithm is 100% accurate. SnapBack's detection:
- **Catches**: ~95% of obvious AI changes
- **Misses**: Small AI changes that match your style
- **False positives**: Large refactors you did yourself might get flagged

**This is intentional.** Flagging something that isn't AI is better than missing an actual AI mistake.

If you don't like a flag, you can manually override it.
</Accordion>

</Accordions>

---

## Compatibility & Support

<Accordions>

<Accordion title="Which VS Code versions does SnapBack support?">
VS Code 1.99.0 and later. We recommend keeping VS Code updated for the best experience.

Older versions might have limited functionality.
</Accordion>

<Accordion title="Does SnapBack work with Cursor?">
Yes! SnapBack works with:
- VS Code
- Cursor
- VSCodium
- Code Server
- Any VS Code fork

It's built on the VS Code API, so any compatible editor works.
</Accordion>

<Accordion title="Does SnapBack work with remote development (SSH, WSL, Containers)?">
**Local development**: ✅ Yes, fully supported

**Remote (SSH/WSL)**: Partial support
- Snapshots are created on the remote machine
- You can restore them on the remote machine
- Copying snapshots between machines requires manual export

We're working on better remote support for Q1 2025.
</Accordion>

<Accordion title="Does SnapBack work with monorepos?">
Yes! SnapBack works with Turborepo, Nx, Yarn Workspaces, and other monorepo tools.

It snapshots files as you save them, regardless of monorepo structure.
</Accordion>

<Accordion title="Does SnapBack conflict with other extensions?">
No. SnapBack doesn't interfere with other extensions.

It's fully compatible with:
- GitHub Copilot ✅
- Prettier ✅
- ESLint ✅
- Gitlens ✅
- All language servers ✅

If you find a conflict, let us know on [Discord](https://discord.gg).
</Accordion>

</Accordions>

---

## Privacy & Security

<Accordions>

<Accordion title="Does SnapBack send my code to the cloud?">
**Never.** Your code is stored locally. It never leaves your machine.

Snapshots are stored at: `~/.config/Code/User/globalStorage/marcellelabs.snapback-vscode/`

You can inspect this folder yourself.
</Accordion>

<Accordion title="Does SnapBack track my activity?">
Not by default. Telemetry is **disabled by default**.

If you opt-in to telemetry, we collect:
- Anonymous usage events ("snapshot created", "file restored")
- Anonymous error reports (error type, not your code)

We **never** collect:
- Your code or code content
- File names or paths
- Email or identity information
- Project names

[Read the full privacy policy →](https://snapback.dev/privacy)
</Accordion>

<Accordion title="Can I delete my snapshots?">
Yes, anytime:
1. Open SnapBack sidebar
2. Right-click a snapshot
3. Select "Delete"

You can also auto-delete old snapshots in settings.
</Accordion>

<Accordion title="Is SnapBack open source?">
Not yet, but we're planning an open-source release in mid-2025.

For now, the extension code is closed-source, but the storage format is documented and reversible.
</Accordion>

<Accordion title="What about data retention after I uninstall?">
Your snapshots remain on your machine after uninstall. They're stored in VS Code's extension storage directory.

If you want to delete them:
1. Uninstall SnapBack
2. Delete: `~/.config/Code/User/globalStorage/marcellelabs.snapback-vscode/`

Or export them first for backup.
</Accordion>

</Accordions>

---

## Troubleshooting

<Accordions>

<Accordion title="SnapBack isn't creating snapshots. What should I do?">
**Check these first:**

1. **Is SnapBack installed?**
   - Extensions → Look for "SnapBack" in the list
   - Should show "Enabled"

2. **Did you save a file?**
   - Press Cmd+S (or Ctrl+S)
   - Check the SnapBack sidebar

3. **Is SnapBack disabled in this workspace?**
   - Extensions → SnapBack → Gear icon → Check "Disabled" status

4. **Not working?**
   - Restart VS Code (Cmd+Q, then reopen)
   - Check the output console for errors (View → Output → SnapBack)

[Join Discord for help →](https://discord.gg)
</Accordion>

<Accordion title="Snapshots are using too much disk space. How do I clean up?">
**Automatic cleanup:**
1. Open SnapBack settings
2. Set "Auto-delete snapshots older than X days"
3. SnapBack will automatically clean old snapshots

**Manual cleanup:**
1. Open SnapBack sidebar
2. Right-click old snapshots
3. Select "Delete"

**Export and delete:**
1. Right-click a snapshot
2. Select "Export"
3. Save as `.snapback` file
4. Delete the snapshot

[Learn about storage →](/reference/storage)
</Accordion>

<Accordion title="I accidentally deleted a snapshot. Can I recover it?">
Once deleted, it's gone. But:
1. **Did you restore first?** Restoring creates a new snapshot of the file, so you can restore that
2. **Do you have Git?** Check Git history
3. **Do you have backups?** Check system backups or trash

**Recommendation**: Star important snapshots so you don't accidentally delete them.
</Accordion>

<Accordion title="SnapBack crashed or isn't responding. What do I do?">
1. **Restart VS Code** (Cmd+Q, then reopen)
2. **Check the output console**: View → Output → SnapBack
3. **Look for errors** and note them

**Still broken?**
- Reload the extension: Cmd+⇧+P → "Developer: Reload Window"
- Uninstall and reinstall SnapBack

[Report bugs on GitHub →](https://github.com/snapback-dev/snapback/issues)
</Accordion>

<Accordion title="How do I uninstall SnapBack?">
1. Open Extensions (Cmd+⇧+X)
2. Find "SnapBack"
3. Click the gear icon
4. Select "Uninstall"

Your snapshots remain stored locally and can be exported before uninstalling.
</Accordion>

</Accordions>

---

## Payments & Licensing

<Accordions>

<Accordion title="What happens when SnapBack leaves beta?">
You'll be able to:
- Continue using the free tier indefinitely
- Optionally upgrade to Pro for team features
- Optionally upgrade to Team for organizations

No surprises. Free tier stays free.
</Accordion>

<Accordion title="Do I need a license to use SnapBack?">
No. SnapBack is free to install and use during beta. No license key required.

Once paid tiers launch, you'll get an upgrade prompt, but can ignore it to keep using free features.
</Accordion>

<Accordion title="Can I use SnapBack at work?">
Yes. SnapBack is free for individual developers and teams.

**For organizations**: A Team plan (coming Q2 2025) will include centralized settings, audit logs, and admin controls.
</Accordion>

<Accordion title="Can I get a refund?">
SnapBack is free, so no refund needed. If you find it's not for you, just uninstall.
</Accordion>

</Accordions>

---

## Contributing & Support

<Accordions>

<Accordion title="How do I report a bug?">
**Option 1: Discord** (fastest response)
- [Join our Discord →](https://discord.gg)
- Post in #bugs channel

**Option 2: GitHub Issues**
- [Open a GitHub issue →](https://github.com/snapback-dev/snapback/issues)
- Include: VS Code version, file type, steps to reproduce

**Option 3: Email**
- support@snapback.dev
</Accordion>

<Accordion title="How do I request a feature?">
1. [Join our Discord →](https://discord.gg)
2. Post your idea in #feature-requests
3. We'll discuss with the community

Or open a GitHub Discussion with your idea.
</Accordion>

<Accordion title="Can I contribute to SnapBack?">
Eventually! When we open-source in mid-2025, we'll have contribution guidelines.

For now, feedback and bug reports help the most.
</Accordion>

<Accordion title="Who builds SnapBack?">
SnapBack is built by **Marcelle Labs**, a team focused on developer tools for the AI era.

We're in **Y Combinator W25** and growing fast.

[Learn more about us →](/about)
</Accordion>

</Accordions>

---

## Didn't Find Your Answer?

<Callout>
**Have a question not listed here?**

- 💬 [Join Discord](https://discord.gg) – Ask the community
- 📧 Email hello@snapback.dev
- 📖 [Read the full docs →](/getting-started/quick-start)
- 🐛 [Report an issue →](https://github.com/snapback-dev/snapback/issues)

We're here to help!
</Callout>

---

<Callout type="success">
Ready to protect your code?

[Install SnapBack →](https://snapback.dev)
</Callout>
```

---

### Step 1.3: Update Navigation (meta.json)

Update your `content/docs/meta.json` to include the new pages:

```json
{
  "pages": [
    "index",
    "---Getting Started---",
    "getting-started/quick-start",
    "getting-started/first-restore",
    "---Understanding SnapBack---",
    "why-snapback",
    "---Core Concepts---",
    "core-concepts/protection-levels",
    "core-concepts/ai-detection",
    "core-concepts/session-time-travel",
    "---Integrations---",
    "integrations/copilot",
    "integrations/cursor",
    "integrations/claude",
    "---Reference---",
    "reference/shortcuts",
    "reference/performance",
    "reference/storage",
    "---Help---",
    "faq",
    "about"
  ]
}
```

---

## Phase 2: Marketing Site Updates (snapback.dev)

### Step 2.1: Update Footer Component

Add documentation links to your site footer:

```tsx
// components/Footer.tsx or similar

const footerLinks = {
  documentation: [
    { label: 'Documentation', href: 'https://new-docs.snapback.dev' },
    { label: 'Getting Started', href: 'https://new-docs.snapback.dev/getting-started/quick-start' },
    { label: 'Why SnapBack?', href: 'https://new-docs.snapback.dev/why-snapback' },
    { label: 'FAQ', href: 'https://new-docs.snapback.dev/faq' },
  ],
  resources: [
    { label: 'Copilot Integration', href: 'https://new-docs.snapback.dev/integrations/copilot' },
    { label: 'AI Detection', href: 'https://new-docs.snapback.dev/core-concepts/ai-detection' },
    { label: 'Keyboard Shortcuts', href: 'https://new-docs.snapback.dev/reference/shortcuts' },
  ],
  company: [
    { label: 'About', href: 'https://new-docs.snapback.dev/about' },
    { label: 'Pricing', href: '/pricing' },
  ],
};
```

### Step 2.2: Update Hero CTA

Update the "See How It Works" or similar CTA on your landing page:

```tsx
// In your hero section component
<Link
  href="https://new-docs.snapback.dev/getting-started/first-restore"
  className="..."
>
  See How It Works →
</Link>
```

### Step 2.3: Update Features Page

Add "Learn more" links to each feature card:

```tsx
// apps/web/app/(marketing)/features/page.tsx or similar

const features = [
  {
    title: '3-Level Protection',
    description: 'Watch, Warn, Block - choose your protection level',
    icon: ShieldIcon,
    learnMoreLink: 'https://new-docs.snapback.dev/core-concepts/protection-levels',
  },
  {
    title: 'Guardian AI Detection',
    description: 'Pattern-based AI detection for Copilot, Claude, Cursor',
    icon: SparklesIcon,
    learnMoreLink: 'https://new-docs.snapback.dev/core-concepts/ai-detection',
  },
  {
    title: 'Session Time-Travel',
    description: 'Restore entire sessions with one click',
    icon: ClockIcon,
    learnMoreLink: 'https://new-docs.snapback.dev/core-concepts/session-time-travel',
  },
  // ... more features
];

// In the component
{features.map((feature) => (
  <FeatureCard key={feature.title} {...feature}>
    <a
      href={feature.learnMoreLink}
      className="text-sm text-blue-600 hover:underline"
    >
      Learn more →
    </a>
  </FeatureCard>
))}
```

### Step 2.4: Update Pricing Page

Add FAQ link to pricing page:

```tsx
// apps/web/app/(marketing)/pricing/page.tsx

// Add at bottom of pricing section
<div className="mt-8 text-center">
  <p className="text-gray-600">
    Have questions about pricing?{' '}
    <a
      href="https://new-docs.snapback.dev/faq"
      className="text-blue-600 hover:underline"
    >
      See FAQ →
    </a>
  </p>
</div>
```

### Step 2.5: Update Header Navigation

Ensure "Docs" link points to docs site:

```tsx
// components/Header.tsx or navigation config

const navItems = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: 'https://new-docs.snapback.dev' },
];
```

---

## Phase 3: SEO Configuration

### Step 3.1: Update robots.txt (Docs Site)

```txt
# new-docs.snapback.dev/public/robots.txt
User-agent: *
Allow: /

Sitemap: https://new-docs.snapback.dev/sitemap.xml
```

### Step 3.2: Generate Sitemap

Fumadocs should auto-generate this, but verify it includes:
- /why-snapback
- /getting-started/first-restore
- /core-concepts/ai-detection
- /integrations/copilot
- /faq

### Step 3.3: Add Canonical URLs

Ensure each page has canonical URLs set in frontmatter or via Fumadocs config.

---

## Phase 4: Verification Checklist

### Docs Site (new-docs.snapback.dev)

- [ ] All 5 MDX files created in correct locations
- [ ] Navigation updated in meta.json
- [ ] No broken internal links
- [ ] All Fumadocs components imported correctly
- [ ] Build succeeds: `npm run build`
- [ ] Local preview works: `npm run dev`
- [ ] Sitemap generated
- [ ] robots.txt in place

### Marketing Site (snapback.dev)

- [ ] Footer links to docs site
- [ ] Hero CTA links to first-restore
- [ ] Features cards have "Learn more" links
- [ ] Pricing page links to FAQ
- [ ] Header nav includes Docs link
- [ ] All external links open in same tab (same-site feel)

### Cross-Site Linking

- [ ] docs → snapback.dev CTAs work
- [ ] snapback.dev → docs links work
- [ ] No 404s on any linked pages

---

## File Mapping Summary

| Source File | Destination | Purpose |
|-------------|-------------|---------|
| `784383a9.mdx` | `content/docs/why-snapback.mdx` | Comparison SEO |
| `95d0dfa0.mdx` | `content/docs/getting-started/first-restore.mdx` | Tutorial SEO |
| `306368fd.mdx` | `content/docs/integrations/copilot.mdx` | Integration SEO |
| `c906326b.mdx` | `content/docs/core-concepts/ai-detection.mdx` | Technical SEO |
| `c7991315.mdx` | `content/docs/faq.mdx` | FAQ/Featured Snippets |

---

## Expected Outcomes

### After 1 Month
- New docs pages indexed in Google
- Initial impressions in GSC for target keywords
- Baseline organic traffic established

### After 3 Months
- 2-3 pages ranking page 2-3 for target keywords
- Organic traffic flowing docs → snapback.dev
- FAQ page capturing featured snippets

### After 6 Months
- Multiple pages on page 1
- Established topical authority for "AI code recovery"
- Measurable conversion from docs traffic

---

## Quick Commands

```bash
# Build docs site
cd apps/docs
npm run build

# Preview docs site
npm run dev

# Build marketing site
cd apps/web
npm run build

# Deploy both
# (Use your deployment pipeline - Vercel, etc.)
```

---

## Notes

1. **Replace placeholder Discord/GitHub links** with actual URLs
2. **Update email addresses** (hello@snapback.dev, support@snapback.dev)
3. **Verify Fumadocs component imports** match your version
4. **Test all internal links** before deploying
5. **Submit sitemap to Google Search Console** after deployment
