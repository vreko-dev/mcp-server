# SnapBack Marketing Site
## Complete Copy & Design Guide v1.0

**Document Purpose:** Production-ready copy, design specifications, and microinteraction guidelines for the SnapBack marketing site rebuild.

**Target Launch:** Beta Q1 2026 | Full Release Q2 2026

**Design Philosophy:** Honest, technical, engaging. A developer tool that respects developers—no dark patterns, no fake urgency, no manufactured social proof.

---

# Part 1: Complete Copy Document

## 1.1 Global Elements

### Navigation

```
Logo: {S} SnapBack

Primary Nav:
- Features
- Pricing
- Docs (external link)
- Roadmap (new)

CTA Button: "Join Beta Waitlist"
```

### Footer

```
{S} SnapBack

Ship fast. Break things. SnapBack instantly.
Built by Marcelle Labs in Chattanooga, TN.

[GitHub Icon] [Discord Icon] [X/Twitter Icon]

─────────────────────────────────────────────────

Product           Resources         Company          Legal
────────          ─────────         ───────          ─────
Home              Documentation     About            Privacy Policy
Features          Blog              Contact          Terms of Service
Pricing           Changelog                          Security
Roadmap           GitHub Discussions

─────────────────────────────────────────────────

Stay Updated
[Email input: "you@example.com"] [Subscribe]

No spam. Just monthly build updates and early access announcements.

─────────────────────────────────────────────────

Building in public since 2024
Beta: Q1 2026 · Full Launch: Q2 2026

© 2025 Marcelle Labs. All rights reserved.
Code breaks. SnapBack. 🧢
```

---

## 1.2 Homepage Copy

### Hero Section

**Badge (above headline):**
```
💸 Born from a $12,000 AI disaster → Read the story
```

**Headline:**
```
Code Breaks.
Snap Back.
```

**Subheadline:**
```
AI coding assistants are powerful—until they delete your configs,
break your dependencies, or refactor your working code into oblivion.

We're building automatic snapshots that let you recover instantly.
```

**Key Benefits (horizontal pills):**
```
🔒 100% Local-First     ⚡ <200ms Snapshots     🆓 Free & Open Core
```

**Primary CTA:**
```
[Join the Beta Waitlist]
```

**Secondary CTA:**
```
[See How It Works ↓]
```

**Trust Line:**
```
Beta launching Q1 2026 · VS Code + Cursor + Windsurf
```

---

### Origin Story Section

**Section Label:**
```
THE ORIGIN STORY
```

**Headline:**
```
The $12,000 Mistake That Started Everything
```

**Body:**
```
In 2024, we asked an AI assistant to "clean up" our config files.

It deleted production database credentials. Overwrote environment
variables. "Simplified" our webpack config into something that
couldn't build.

By the time we noticed, we'd already saved. Git couldn't help—
the AI had made commits. Time Machine was too slow. Three days
and $12,000 later, we were back online.

We built SnapBack so this never happens to anyone again.
```

**CTA:**
```
[Read the Full Story →]
```

---

### Interactive Demo Section

**Section Label:**
```
HOW IT WORKS
```

**Headline:**
```
See Your Coding Session as a Timeline
```

**Subheadline:**
```
Every save captured. Every AI change tracked.
Any moment recoverable with one click.
```

**Demo Description (next to interactive element):**
```
SnapBack Timeline

Watch what happens when AI modifies your code:

1. You're coding normally
2. AI assistant makes changes
3. SnapBack auto-captures snapshot
4. Something breaks
5. One click → restored

Try it yourself ↓
```

**Interactive Demo States:**

State 1 - Normal:
```
index.ts — All good
──────────────────────
export const config = {
  database: "postgres://...",
  apiKey: process.env.API_KEY,
  debug: false
}

[Snapshot] 2:34:12 PM · Manual save
```

State 2 - AI Editing:
```
index.ts — 🤖 AI is editing...
──────────────────────
export const config = {
  // Simplified configuration
  database: getDbUrl(),
  apiKey: "sk-...", // TODO: move to env
  debug: true
}

[⚡ Auto-snapshot created] 2:34:45 PM
```

State 3 - Broken:
```
index.ts — ❌ Build failed
──────────────────────
TypeError: getDbUrl is not defined
  at Object.<anonymous> (index.ts:3:13)

Build failed with 1 error.

[🔴 Error detected] Want to restore?
```

State 4 - Restored:
```
index.ts — ✅ Restored
──────────────────────
export const config = {
  database: "postgres://...",
  apiKey: process.env.API_KEY,
  debug: false
}

[✅ Restored to 2:34:12 PM] Took 47ms
```

**Demo CTA:**
```
[Try the VS Code Extension] Currently in alpha testing
```

---

### Problem/Solution Section

**Section Label:**
```
THE PROBLEM
```

**Headline:**
```
AI Moves Fast. So Do Mistakes.
```

**Problem Cards:**

Card 1:
```
🔄 AI Refactored Too Much

"Make this cleaner" turned into "rewrite everything."
Cursor deleted 200 lines of working code in 3 seconds.
Your undo history? Gone after you closed the tab.
```

Card 2:
```
✅ Tests Were Passing—Then They Weren't

Copilot "fixed" a test by changing the assertion.
The code was still broken. The test just stopped catching it.
You found out in production.
```

Card 3:
```
💾 You Don't Want to Lose the Good Work

AI wrote something brilliant in the middle of a disaster.
You need surgical recovery—not all-or-nothing restore.
Git can't give you that granularity.
```

**Transition Line:**
```
Git is essential. But it can't save you from AI changes
you haven't committed yet. SnapBack sits underneath,
creating recovery points automatically.
```

---

### Git Comparison Section

**Section Label:**
```
HONEST COMPARISON
```

**Headline:**
```
Git vs SnapBack: Different Tools, Different Jobs
```

**Subheadline:**
```
"Why not just use Git?" — Fair question. Here's the honest answer.
```

**Comparison Table:**

```
                          Git                    SnapBack
─────────────────────────────────────────────────────────────────
When it saves             Manual commits         Every file save
Granularity               Commit-level           Save-level
Multi-file atomic         ✓ Yes                  ✓ Yes
                          restore
Works offline             ✓ Yes                  ✓ Yes
AI activity               ✗ No awareness         ✓ Detects patterns
detection
Recovery speed            Seconds-minutes        <200ms
Requires thinking         Yes—you have to        No—automatic
                          remember to commit
History pollution         Can clutter history    Separate timeline
Replaces the other?       —                      No, complements Git
```

**Clarification:**
```
We're not replacing Git. We're adding a safety net underneath it.

Think of it like auto-save in Google Docs—you still save
intentionally, but you're protected between saves.
```

**CTA:**
```
[Read the Technical Deep-Dive →]
```

---

### Core Principles Section

**Section Label:**
```
CORE PRINCIPLES
```

**Headline:**
```
Simple. Automatic. Local.
```

**Subheadline:**
```
Three principles we won't compromise on—ever.
```

**Principle Cards:**

Card 1:
```
Icon: 💾
Title: Auto-Snapshots on Save
Status: ✅ Working in Beta

Every save triggers a lightweight snapshot.
No commands to remember. No habits to build.
Protection happens in the background.

Technical detail: <50ms overhead per save
```

Card 2:
```
Icon: 🔒
Title: 100% Local-First
Status: ✅ Core Architecture

Your code never leaves your machine unless
you explicitly enable cloud backup.

We can't see your code. We don't want to.
Your snapshots, your machine, your control.

Technical detail: SQLite + filesystem storage
```

Card 3:
```
Icon: ⚡
Title: One-Click Restore
Status: 🚧 In Development

Click any point in your timeline to restore.
Atomic multi-file recovery—all or nothing,
no corrupted half-states.

Technical detail: Target <200ms restore time
```

---

### Metrics Section

**Section Label:**
```
BY THE NUMBERS
```

**Headline:**
```
Real Numbers, No Fluff
```

**Metrics (with honest context):**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    [LIVE COUNT]          100%              <200ms           │
│    Beta Waitlist         Local Storage     Snapshot Target  │
│                                                             │
│    Real signups,         Your code never   Performance      │
│    updated daily         leaves your       goal we're       │
│                          machine           consistently     │
│                                            hitting          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Note:** The waitlist number should be a live count from your database. Start at whatever it actually is—even if it's 47.

---

### Roadmap Preview Section

**Section Label:**
```
THE ROADMAP
```

**Headline:**
```
What We're Building—And When
```

**Subheadline:**
```
We develop in the open. Here's our timeline.
Track our progress or request features on GitHub.
```

**Timeline:**

```
Q4 2025 — Alpha (Current)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Local snapshot engine
✅ VS Code extension (basic)
✅ Session timeline view
✅ Manual restore
🚧 Multi-file atomic restore

Q1 2026 — Beta Launch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Cloud backup & sync
📋 Guardian AI detection
📋 Cursor integration
📋 CLI tool
📋 Team sharing (basic)

Q2 2026 — Version 1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 MCP integration
📋 SSO for teams
📋 Usage analytics
📋 Windsurf integration
📋 JetBrains plugin
```

**Legend:**
```
✅ Complete   🚧 In Progress   📋 Planned
```

**CTAs:**
```
[View Full Roadmap on GitHub]  [Request a Feature]
```

---

### Community Section

**Section Label:**
```
BUILD WITH US
```

**Headline:**
```
We're Building This in Public
```

**Subheadline:**
```
No stealth mode. No surprise launches.
Just honest development with community input.
```

**Engagement Options:**

```
┌──────────────────────┐  ┌──────────────────────┐
│ 💬 Discord           │  │ 📖 Dev Blog          │
│                      │  │                      │
│ Join 200+ developers │  │ Weekly updates on    │
│ discussing AI safety │  │ what we're building  │
│ and testing builds   │  │ and why              │
│                      │  │                      │
│ [Join Discord →]     │  │ [Read the Blog →]    │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ 🐙 GitHub            │  │ 🎙️ Office Hours      │
│                      │  │                      │
│ Open issues, feature │  │ Monthly video calls  │
│ requests, and full   │  │ with the team. Ask   │
│ source transparency  │  │ anything.            │
│                      │  │                      │
│ [View Repository →]  │  │ [Next: Jan 15 →]     │
└──────────────────────┘  └──────────────────────┘
```

---

### Final CTA Section

**Headline:**
```
Be Part of the Build
```

**Subheadline:**
```
Join developers who are tired of losing work to AI mistakes.
Beta launching Q1 2026.
```

**Value Props:**
```
What beta testers get:

→ Direct access to the founding team
→ Input on feature priorities
→ Locked-in pricing forever
→ First 100 testers: Free Pro tier for life
→ Limited edition snapback cap 🧢
```

**Email Capture:**
```
[Your email]  [Join the Beta]

No spam. Monthly updates only. Unsubscribe anytime.
```

**Current Count:**
```
[XXX] developers already waiting
```

---

## 1.3 Features Page Copy

### Hero Section

**Headline:**
```
Powerful Protection Features
```

**Subheadline:**
```
Built for developers who use AI tools.
Every feature designed to keep you safe while moving fast.

Here's what's working today—and what's coming.
```

**CTAs:**
```
[Read Documentation]  [View Pricing]
```

**Legend:**
```
✅ In Beta    🚧 In Development    📋 Planned Q2 2026
```

---

### Feature Cards

**Feature 1: 3-Level Protection**
```
Status: ✅ In Beta

Icon: 🛡️
Title: 3-Level Protection
Subtitle: Watch · Warn · Block

Description:
Granular control over how SnapBack protects different files.
Watch silently, warn before risky saves, or require confirmation.
Team policies sync via .snapbackrc files.

Capabilities:
• Silent auto-snapshots for low-risk files
• Confirmation dialogs for sensitive changes
• Required notes for critical files (audit trail)
• Team-wide policy enforcement via .snapbackrc

[See Configuration Guide →]
```

**Feature 2: Session Time-Travel**
```
Status: ✅ In Beta

Icon: ⏱️
Title: Session Time-Travel
Subtitle: Multi-File Rollback

Description:
AI often changes 5+ files at once. Sessions group related
snapshots with atomic restore—rollback entire features,
not just individual files.

Capabilities:
• Auto-grouped snapshots (idle, blur, commit triggers)
• Atomic multi-file restore in one click
• Session timeline with visual diff preview
• 10s idle detection for automatic finalization

[View Demo →]
```

**Feature 3: Guardian AI Detection**
```
Status: 🚧 In Development (87% accuracy, targeting 94%)

Icon: 🤖
Title: Guardian AI Detection
Subtitle: Pattern Recognition

Description:
Multi-pattern risk engine detects when AI assistants are
making changes. Higher confidence = more aggressive
snapshot frequency.

Capabilities:
• Detects Cursor, Copilot, Windsurf, Claude patterns
• Behavioral analysis (rapid multi-file changes)
• Confidence scoring per change
• Automatic protection level escalation

Current Status: Hitting 87% detection accuracy in testing.
Targeting 94% for beta launch.

[Follow Development Progress →]
```

**Feature 4: Severity Analysis**
```
Status: 🚧 In Development

Icon: ⚠️
Title: Severity Analysis
Subtitle: Risk-Based Workflows

Description:
Each detected change includes severity classification
(low/medium/high/critical) with actionable recommendations.
Never miss critical issues.

Capabilities:
• Color-coded risk levels in VS Code
• Contextual recommendations per severity
• Integration with protection levels (auto-block critical)
• Real-time notifications with progressive disclosure

[Learn About Risk Scoring →]
```

**Feature 5: MCP Integration**
```
Status: 📋 Planned Q2 2026

Icon: 🔌
Title: MCP Integration
Subtitle: AI-Native Protection

Description:
Model Context Protocol server exposes Guardian, dependency
checks, and snapshot creation to AI assistants. Let Claude
and Cursor check risk before making changes.

Planned Capabilities:
• analyze_risk tool for Guardian detection (<200ms)
• check_dependencies for phantom detection (<300ms)
• create_checkpoint for manual snapshots (<500ms)
• JSON-RPC 2.0 stdio transport (universal compatibility)

[Vote for This Feature →]
```

**Feature 6: Performance Budgets**
```
Status: ✅ In Beta

Icon: ⚡
Title: Performance Budgets
Subtitle: Lightning Fast

Description:
Every operation measured. <200ms snapshot creation, <10ms
protection checks, <50ms session finalization avg.
Performance tests enforce budgets in CI.

Technical Specs:
• SQLite WAL mode for concurrent reads
• Hash-based deduplication (>90% space savings)
• Event bus pub/sub <10ms latency
• Indexed queries <10ms (sessions, manifests, snapshots)

[View Benchmarks →]
```

---

### Integration Section

**Headline:**
```
Works Where You Work
```

**Subheadline:**
```
One tool, every AI assistant, all your editors.
```

**Integration Grid:**

```
VS Code                    Cursor
✅ Available in Beta       ✅ Available in Beta
─────────────────────      ─────────────────────
Full extension with        Native integration
sidebar, timeline,         detecting Cursor's
and inline restore.        AI patterns.

[Install Extension]        [Install Extension]


Windsurf                   JetBrains
📋 Planned Q2 2026         📋 Planned Q2 2026
─────────────────────      ─────────────────────
Cascade-aware              IntelliJ, WebStorm,
detection coming.          PyCharm plugin.

[Get Notified]             [Get Notified]


CLI Tool                   MCP Server
🚧 In Development          📋 Planned Q2 2026
─────────────────────      ─────────────────────
snapback status            Protocol server for
snapback restore           AI-native integration
snapback history

[View CLI Docs]            [Learn About MCP]
```

---

### Documentation CTA Section

**Headline:**
```
Ready to Dive Deeper?
```

**Options:**
```
┌─────────────────────────────────────────────────────────────┐
│  📖 Documentation                                           │
│  Complete guides for setup, configuration, and recovery.    │
│  [Read the Docs →]                                          │
├─────────────────────────────────────────────────────────────┤
│  🐙 Source Code                                             │
│  Open source core. See how it works.                        │
│  [View on GitHub →]                                         │
├─────────────────────────────────────────────────────────────┤
│  💬 Community                                               │
│  Get help, share feedback, report bugs.                     │
│  [Join Discord →]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

### Final CTA Banner

**Headline:**
```
Ready to Protect Your Code?
```

**Subheadline:**
```
Install the VS Code extension and start snapshotting in seconds.
```

**CTAs:**
```
[Get Started Free]  [View Pricing]
```

---

## 1.4 Pricing Page Copy

### Hero Section

**Headline:**
```
Simple, Transparent Pricing
```

**Subheadline:**
```
Start free, forever. Upgrade when you need cloud backup and team features.
Beta pricing locked in—these rates won't increase for early supporters.
```

**Toggle:**
```
[Monthly]  [Annual (Save 17%)]
```

---

### Pricing Tiers

**Free Tier:**
```
Free
$0/month forever
─────────────────────────────────────

Open Source Core

The full local experience. No catches,
no trials, no credit card.

Includes:
✓ VS Code extension
✓ Cursor integration
✓ CLI tool
✓ Unlimited local snapshots
✓ Session timeline
✓ One-click restore
✓ Community support (Discord)

Perfect for: Solo developers who want
local-only protection.

[Get Started Free]

🔓 Open source core—see the code on GitHub
```

**Solo Tier:**
```
⭐ MOST POPULAR

Solo
$29/month  ($290/year—save $58)
─────────────────────────────────────

Enhanced Protection

For developers who want cloud backup,
advanced detection, and priority support.

Everything in Free, plus:
☁️ Cloud backup & sync
🤖 Guardian AI detection (94% accuracy)
📊 Session analytics
⚡ Priority support (24hr response)
🧢 Free snapback cap shipped to you

Perfect for: Professional developers
who can't afford to lose work.

[Start 14-Day Free Trial]

✓ No credit card for trial
✓ Cancel anytime
✓ Beta pricing locked forever
```

**Team Tier:**
```
Team
$79/seat/month
─────────────────────────────────────

Collaborative Safety

Shared protection and policies across
your entire development team.

Everything in Solo, plus:
👥 Shared team snapshots
📋 Team-wide .snapbackrc policies
📈 Team usage analytics dashboard
🔐 SSO integration (coming Q2 2026)
📞 Dedicated support channel
👔 Admin controls & audit logs

Perfect for: Teams of 3+ developers
using AI tools together.

[Start Team Trial]

or have questions?
[Schedule a 15-min Call →]
```

---

### Trust Indicators

```
✓ 30-day money-back guarantee    ✓ Cancel anytime    ✓ No credit card for Free
```

---

### FAQ Section

**Headline:**
```
Frequently Asked Questions
```

**Subheadline:**
```
Got questions? Check our full documentation or reach out to support.
```

**FAQs:**

```
Q: Do I need a credit card to start?
─────────────────────────────────────────────────────────────
No. The Free plan is completely free forever—no credit card,
no trial period, no catch. You only need a card if you choose
to upgrade to Solo or Team.


Q: What's included in the Free plan?
─────────────────────────────────────────────────────────────
Everything you need for local protection: VS Code extension,
Cursor integration, CLI tool, unlimited local snapshots,
session timeline, and one-click restore. The core functionality
is free and open source.


Q: How does Guardian AI detection work?
─────────────────────────────────────────────────────────────
Guardian analyzes file change patterns to detect when AI
assistants are making modifications. It looks for rapid
multi-file changes, specific tool signatures, and behavioral
patterns. Currently at 87% accuracy, targeting 94% for launch.


Q: Can I switch plans later?
─────────────────────────────────────────────────────────────
Yes, upgrade or downgrade anytime. If you upgrade, you'll be
credited for the unused portion of your current billing period.
If you downgrade, your current features remain until the period ends.


Q: What's the difference between Solo and Team?
─────────────────────────────────────────────────────────────
Solo is for individual developers—you get cloud backup and
Guardian AI detection for your own projects. Team adds shared
snapshots across team members, centralized policies, admin
controls, and a team analytics dashboard.


Q: Do you offer refunds?
─────────────────────────────────────────────────────────────
Yes. 30-day money-back guarantee, no questions asked. If
SnapBack doesn't work for you, we'll refund your payment.


Q: How does MCP integration work?
─────────────────────────────────────────────────────────────
MCP (Model Context Protocol) is coming in Q2 2026. It will
allow AI assistants like Claude to check with SnapBack before
making changes—enabling AI-aware protection at the protocol level.


Q: What happens to my data if I downgrade to Free?
─────────────────────────────────────────────────────────────
Your local snapshots remain on your machine forever—we can't
touch them. Cloud backups are retained for 30 days after
downgrade, giving you time to export. After that, cloud data
is deleted, but nothing local is affected.


Q: When will SnapBack be ready?
─────────────────────────────────────────────────────────────
Beta launches Q1 2026 with core snapshot, restore, and cloud
backup functionality. Full feature set including Guardian AI
detection and MCP targets Q2 2026. We're building in public—
follow our progress on GitHub.


Q: Is this vaporware?
─────────────────────────────────────────────────────────────
Fair question. The VS Code extension with local snapshots
works today in alpha. You can join the beta waitlist and
try it when it launches. We're a real team (Marcelle Labs)
solving a problem we personally experienced.


Q: What if SnapBack shuts down?
─────────────────────────────────────────────────────────────
Your local snapshots are on your machine—they stay with you
regardless of what happens to us. Cloud backups can be
exported anytime. The core is open source, so the community
can continue development. Your data is always yours.


Q: Why should I trust you with my code?
─────────────────────────────────────────────────────────────
You shouldn't have to—that's why SnapBack is local-first.
Your code never leaves your machine unless you explicitly
enable cloud backup. Even then, we use end-to-end encryption.
We can't read your code even if we wanted to.
```

**Support CTA:**
```
Still have questions? Our team is here to help.
[Visit Documentation →]  [Contact Support →]
```

---

### Final CTA Banner

**Headline:**
```
Ready to Protect Your Code?
```

**Subheadline:**
```
Start with the free plan. Upgrade anytime for cloud backup and team features.
```

**CTAs:**
```
[Install Free Extension]  [Join Beta Waitlist]
```

---

## 1.5 New Page: Roadmap (Suggested)

### Hero

**Headline:**
```
The SnapBack Roadmap
```

**Subheadline:**
```
What we're building, when it's coming, and how you can help shape it.
Updated monthly. Last update: [DATE].
```

---

### Timeline View

```
2025
════════════════════════════════════════════════════════════════

Q4 2025 · ALPHA (Current)
────────────────────────────────────────────────────────────────
✅ Nov 1    Local snapshot engine
✅ Nov 15   VS Code extension v0.1
✅ Dec 1    Session timeline view
✅ Dec 15   Basic restore functionality
🚧 Dec 30   Multi-file atomic restore         ← We are here


2026
════════════════════════════════════════════════════════════════

Q1 2026 · BETA LAUNCH
────────────────────────────────────────────────────────────────
📋 Jan 15   Cloud backup infrastructure
📋 Jan 30   Guardian AI detection v1
📋 Feb 15   Cursor-specific integration
📋 Feb 28   CLI tool release
📋 Mar 15   Team sharing (basic)
📋 Mar 31   PUBLIC BETA LAUNCH

Q2 2026 · VERSION 1.0
────────────────────────────────────────────────────────────────
📋 Apr 15   MCP integration
📋 Apr 30   SSO for teams
📋 May 15   Usage analytics dashboard
📋 May 31   Windsurf integration
📋 Jun 15   JetBrains plugin
📋 Jun 30   VERSION 1.0 RELEASE
```

---

### Feature Voting Section

**Headline:**
```
Help Us Prioritize
```

**Subheadline:**
```
What should we build next? Vote on features or suggest your own.
```

**Top Requested:**
```
1. Neovim plugin                    [🔼 247 votes]  [Vote]
2. GitLens integration              [🔼 189 votes]  [Vote]
3. Snapshot diffing in terminal     [🔼 156 votes]  [Vote]
4. Branch-aware snapshots           [🔼 134 votes]  [Vote]
5. Remote development support       [🔼 98 votes]   [Vote]
```

**CTA:**
```
[Suggest a Feature on GitHub →]
```

---

# Part 2: Design System Specifications

## 2.1 Color System

### Primary Palette

```css
/* Brand Colors */
--snapback-green: #10B981;        /* Emerald - primary brand */
--snapback-green-light: #34D399;  /* Hover states */
--snapback-green-dark: #059669;   /* Active states */
--snapback-green-glow: rgba(16, 185, 129, 0.4);  /* Glow effects */

/* Accent Colors */
--snapback-orange: #F97316;       /* Primary CTA */
--snapback-orange-light: #FB923C; /* CTA hover */
--snapback-coral: #F87171;        /* Team tier accent */

/* Semantic Colors */
--status-success: #22C55E;        /* Success states */
--status-warning: #EAB308;        /* Warning states */
--status-error: #EF4444;          /* Error states */
--status-info: #3B82F6;           /* Info states */

/* Neutral Palette */
--bg-primary: #000000;            /* Main background */
--bg-secondary: #0A0A0A;          /* Elevated surfaces */
--bg-tertiary: #111111;           /* Cards, modals */
--bg-quaternary: #171717;         /* Hover states */

--border-subtle: #1F1F1F;         /* Subtle borders */
--border-default: #262626;        /* Default borders */
--border-strong: #404040;         /* Emphasized borders */

--text-primary: #FAFAFA;          /* Primary text */
--text-secondary: #A1A1AA;        /* Secondary text */
--text-tertiary: #71717A;         /* Muted text */
--text-disabled: #52525B;         /* Disabled text */
```

### Gradient Definitions

```css
/* Hero gradient (subtle) */
--gradient-hero: radial-gradient(
  ellipse 80% 50% at 50% -20%,
  rgba(16, 185, 129, 0.15) 0%,
  transparent 70%
);

/* Card highlight gradient */
--gradient-card-highlight: linear-gradient(
  135deg,
  rgba(16, 185, 129, 0.1) 0%,
  transparent 50%
);

/* CTA gradient */
--gradient-cta: linear-gradient(
  135deg,
  #F97316 0%,
  #FB923C 100%
);

/* Text gradient (for headlines) */
--gradient-text: linear-gradient(
  135deg,
  #10B981 0%,
  #34D399 50%,
  #6EE7B7 100%
);
```

---

## 2.2 Typography System

### Font Stack

```css
/* Primary font */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, sans-serif;

/* Mono font (for code, terminal, technical elements) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono',
             Consolas, monospace;
```

### Type Scale

```css
/* Display (hero headlines) */
--text-display: clamp(3rem, 8vw, 5rem);     /* 48-80px */
--leading-display: 1.1;
--tracking-display: -0.02em;

/* Headline 1 */
--text-h1: clamp(2.25rem, 5vw, 3.5rem);     /* 36-56px */
--leading-h1: 1.15;
--tracking-h1: -0.02em;

/* Headline 2 */
--text-h2: clamp(1.75rem, 4vw, 2.5rem);     /* 28-40px */
--leading-h2: 1.2;
--tracking-h2: -0.01em;

/* Headline 3 */
--text-h3: clamp(1.25rem, 3vw, 1.75rem);    /* 20-28px */
--leading-h3: 1.3;
--tracking-h3: -0.01em;

/* Body Large */
--text-lg: 1.125rem;                         /* 18px */
--leading-lg: 1.7;

/* Body Default */
--text-base: 1rem;                           /* 16px */
--leading-base: 1.6;

/* Body Small */
--text-sm: 0.875rem;                         /* 14px */
--leading-sm: 1.5;

/* Caption */
--text-xs: 0.75rem;                          /* 12px */
--leading-xs: 1.4;
--tracking-xs: 0.02em;
```

### Font Weights

```css
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 2.3 Spacing System

### Base Unit: 4px

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

### Section Spacing

```css
/* Between major sections */
--section-gap: clamp(5rem, 10vw, 8rem);     /* 80-128px */

/* Between subsections */
--subsection-gap: clamp(3rem, 6vw, 5rem);   /* 48-80px */

/* Container padding */
--container-padding-x: clamp(1rem, 5vw, 3rem);
```

---

## 2.4 Border & Shadow System

### Border Radius

```css
--radius-sm: 0.375rem;    /* 6px - buttons, inputs */
--radius-md: 0.5rem;      /* 8px - cards */
--radius-lg: 0.75rem;     /* 12px - modals, large cards */
--radius-xl: 1rem;        /* 16px - hero elements */
--radius-2xl: 1.5rem;     /* 24px - feature cards */
--radius-full: 9999px;    /* Pills, avatars */
```

### Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);

/* Card elevation */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5),
             0 2px 4px -2px rgba(0, 0, 0, 0.5);

/* Modal elevation */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5),
             0 4px 6px -4px rgba(0, 0, 0, 0.5);

/* Glow effects (for brand accent) */
--shadow-glow-green: 0 0 20px rgba(16, 185, 129, 0.3),
                     0 0 40px rgba(16, 185, 129, 0.1);

--shadow-glow-orange: 0 0 20px rgba(249, 115, 22, 0.3),
                      0 0 40px rgba(249, 115, 22, 0.1);
```

---

## 2.5 Animation Tokens

### Durations

```css
--duration-instant: 50ms;
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--duration-slower: 600ms;
```

### Easings

```css
/* Standard easing */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Entrance (elements appearing) */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Exit (elements leaving) */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Bounce (playful interactions) */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Elastic (snap effect - brand signature) */
--ease-snap: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

# Part 3: Component Design Specifications

## 3.1 Navigation

### Default State (Top of Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│  {S} SnapBack     Features  Pricing  Docs  Roadmap    [Join Beta]  │
└─────────────────────────────────────────────────────────────────────┘

Background: transparent
Border: none
Blur: none
```

### Scrolled State (Glass Island)

```
                ┌────────────────────────────────────────────┐
                │  {S}   Features  Pricing  Docs  [Join ▸]  │
                └────────────────────────────────────────────┘

Background: rgba(0, 0, 0, 0.7)
Border: 1px solid rgba(255, 255, 255, 0.1)
Blur: backdrop-blur(16px)
Border-radius: 9999px (pill)
Shadow: 0 4px 30px rgba(0, 0, 0, 0.3)
Max-width: 600px
Margin: 0 auto
Margin-top: 24px (appears to float)
```

### Microinteraction: Scroll Transition

```
Trigger: scroll > 100px
Duration: 300ms
Easing: ease-out

Animations:
1. Background fades in (opacity 0 → 0.7)
2. Container shrinks (max-width 100% → 600px)
3. Border radius morphs (0 → 9999px)
4. Padding decreases (24px → 12px vertical)
5. Logo text hides (opacity 1 → 0, width collapses)
6. CTA text shortens ("Join Beta Waitlist" → "Join")

Implementation: Use CSS transitions with transforms
for GPU acceleration. Avoid layout shifts.
```

---

## 3.2 Hero Section

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│     💸 Born from a $12,000 AI disaster → Read the story            │
│                                                                     │
│                    Code Breaks.                                     │
│                    Snap Back.                                       │
│                                                                     │
│        AI coding assistants are powerful—until they delete          │
│        your configs, break your dependencies, or refactor           │
│        your working code into oblivion.                             │
│                                                                     │
│        🔒 100% Local    ⚡ <200ms    🆓 Free & Open Core            │
│                                                                     │
│           [Join Beta Waitlist]    [See How It Works ↓]              │
│                                                                     │
│                Beta launching Q1 2026                               │
│                                                                     │
│               ┌─────────────────────────┐                           │
│               │                         │                           │
│               │   [Terminal Demo/Video] │                           │
│               │                         │                           │
│               └─────────────────────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Badge Component

```jsx
<Badge variant="story" href="/story">
  💸 Born from a $12,000 AI disaster
  <ArrowRight className="w-4 h-4" />
</Badge>
```

**Styling:**
```css
.badge-story {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
  border-radius: 9999px;
  font-size: 14px;
  color: var(--snapback-orange);
  transition: all 200ms ease;
}

.badge-story:hover {
  background: rgba(249, 115, 22, 0.15);
  border-color: rgba(249, 115, 22, 0.5);
  transform: translateY(-1px);
}
```

**Microinteraction:**
```
On hover:
- Background lightens (opacity 0.1 → 0.15)
- Border brightens (opacity 0.3 → 0.5)
- Subtle lift (translateY -1px)
- Arrow icon shifts right 2px
Duration: 200ms
```

### Headline Animation

```
Entrance animation (on page load):

Frame 0 (0ms):
  "Code Breaks." - opacity: 0, y: 20px
  "Snap Back."   - opacity: 0, y: 20px

Frame 1 (300ms):
  "Code Breaks." - opacity: 1, y: 0
  "Snap Back."   - opacity: 0, y: 20px

Frame 2 (500ms):
  "Code Breaks." - opacity: 1, y: 0
  "Snap Back."   - opacity: 1, y: 0

Frame 3 (700ms):
  "Snap Back." gets gradient color fill
  (text-fill animated from white to gradient)

Easing: ease-out
Stagger: 200ms between lines
```

### Benefit Pills

```jsx
<div className="benefit-pills">
  <Pill icon="🔒" text="100% Local-First" />
  <Pill icon="⚡" text="<200ms Snapshots" />
  <Pill icon="🆓" text="Free & Open Core" />
</div>
```

**Styling:**
```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  font-size: 13px;
  color: var(--text-secondary);
}
```

**Microinteraction - Hover Reveal:**
```
On hover over any pill:
- That pill glows with brand color
- Icon scales slightly (1 → 1.1)
- Background brightens

On hover over "100% Local-First":
- Brief tooltip: "Your code never leaves your machine"
- Tooltip appears below, fades in 150ms
```

### Primary CTA Button

```jsx
<Button variant="primary" size="lg">
  Join Beta Waitlist
</Button>
```

**Styling:**
```css
.button-primary-lg {
  padding: 16px 32px;
  background: var(--gradient-cta);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.button-primary-lg:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-orange);
}

.button-primary-lg:active {
  transform: translateY(0);
}
```

**Microinteraction - Shimmer Effect:**
```css
.button-primary-lg::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 500ms ease;
}

.button-primary-lg:hover::before {
  left: 100%;
}
```

---

## 3.3 Interactive Demo Component

### Container Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  ●  ●  ●    snapback-demo                                     ─ □ x │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐  │
│  │                              │  │  SnapBack Timeline         │  │
│  │  // index.ts                 │  │                            │  │
│  │                              │  │  ● 2:34:52 PM              │  │
│  │  export const config = {     │  │    AI refactored config    │  │
│  │    database: "postgres://",  │  │                            │  │
│  │    apiKey: process.env.KEY,  │  │  ○ 2:34:45 PM              │  │
│  │    debug: false              │  │    Auto-snapshot           │  │
│  │  }                           │  │                            │  │
│  │                              │  │  ○ 2:34:12 PM              │  │
│  │                              │  │    Manual save             │  │
│  │                              │  │                            │  │
│  │                              │  │  [Restore to 2:34:12]      │  │
│  └──────────────────────────────┘  └────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Status: 🤖 AI editing detected    [Create Snapshot]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Demo States & Transitions

**State Machine:**
```
IDLE → AI_EDITING → ERROR → RESTORED → IDLE

Transitions:
- IDLE (3s) → AI_EDITING
- AI_EDITING (2s) → ERROR
- ERROR (click "Restore") → RESTORED
- RESTORED (2s) → IDLE (loop or stop)
```

**State: IDLE**
```
Code panel:
- Syntax highlighted, stable
- Cursor blinking at end

Timeline panel:
- Last entry: "Manual save"
- Status: "✅ Protected"

Status bar:
- "Ready"
- Green indicator
```

**State: AI_EDITING**
```
Code panel:
- Code actively changing (typewriter effect)
- Lines being deleted (strikethrough then remove)
- New lines appearing
- Orange border pulse

Timeline panel:
- New entry slides in: "🤖 AI editing..."
- Auto-snapshot entry appears below

Status bar:
- "🤖 AI editing detected" (orange)
- Pulsing indicator
- "Snapshot created" toast appears
```

**State: ERROR**
```
Code panel:
- Red border
- Error overlay at bottom
- Shake animation (subtle)

Timeline panel:
- Error entry: "❌ Build failed"
- "Restore" button highlighted

Status bar:
- "Build failed" (red)
- "Click timeline to restore"
```

**State: RESTORED**
```
Code panel:
- Code snaps back (elastic animation)
- Green flash overlay
- "Restored" badge appears

Timeline panel:
- Selected entry highlighted green
- Checkmark animation

Status bar:
- "✅ Restored in 47ms"
- Celebration confetti (subtle)
```

### Microinteractions

**Code Typewriter Effect:**
```javascript
// Characters appear one by one for AI typing
const typeSpeed = 30; // ms per character
const deleteSpeed = 15; // faster for deletion

// Add variation for realism
const jitter = () => Math.random() * 20 - 10;
```

**Timeline Entry Animation:**
```css
.timeline-entry {
  animation: slideInFromTop 300ms ease-out;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Restore "Snap" Animation:**
```css
.code-restored {
  animation: snapBack 400ms var(--ease-snap);
}

@keyframes snapBack {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Success Flash:**
```css
.restore-flash {
  animation: flashGreen 400ms ease-out;
}

@keyframes flashGreen {
  0% {
    box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0);
  }
  50% {
    box-shadow: inset 0 0 30px 10px rgba(16, 185, 129, 0.3);
  }
  100% {
    box-shadow: inset 0 0 0 0 rgba(16, 185, 129, 0);
  }
}
```

---

## 3.4 Feature Cards

### Card Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🛡️                                               ✅ In Beta        │
│                                                                     │
│  3-Level Protection                                                 │
│  Watch · Warn · Block                                              │
│                                                                     │
│  Granular control over how SnapBack protects different files.       │
│  Watch silently, warn before risky saves, or require confirmation.  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  • Silent auto-snapshots for low-risk files                        │
│  • Confirmation dialogs for sensitive changes                       │
│  • Required notes for critical files                                │
│  • Team-wide policy enforcement                                     │
│                                                                     │
│  See Configuration Guide →                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Badge Variants

```jsx
// In Beta - working, can use now
<Badge variant="beta">✅ In Beta</Badge>
// Background: rgba(34, 197, 94, 0.1)
// Border: rgba(34, 197, 94, 0.3)
// Text: #22C55E

// In Development - actively being built
<Badge variant="dev">🚧 In Development</Badge>
// Background: rgba(234, 179, 8, 0.1)
// Border: rgba(234, 179, 8, 0.3)
// Text: #EAB308

// Planned - on roadmap
<Badge variant="planned">📋 Planned Q2 2026</Badge>
// Background: rgba(59, 130, 246, 0.1)
// Border: rgba(59, 130, 246, 0.3)
// Text: #3B82F6
```

### Card Hover Effect

```css
.feature-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 32px;
  transition: all 300ms ease;
  position: relative;
  overflow: hidden;
}

/* Gradient highlight on hover */
.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gradient-text);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 300ms ease;
}

.feature-card:hover {
  border-color: var(--border-default);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.feature-card:hover::before {
  transform: scaleX(1);
}
```

### Icon Animation

```css
.feature-icon {
  font-size: 32px;
  transition: transform 300ms var(--ease-bounce);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1) rotate(-5deg);
}
```

### Progressive Disclosure (Expandable Details)

```jsx
<FeatureCard
  icon="🛡️"
  title="3-Level Protection"
  subtitle="Watch · Warn · Block"
  status="beta"
  description="Granular control over how SnapBack..."
  features={[
    "Silent auto-snapshots for low-risk files",
    "Confirmation dialogs for sensitive changes",
    "Required notes for critical files",
    "Team-wide policy enforcement"
  ]}
  expandable={true}  // Shows first 2 features, "Show more" expands
  link={{ text: "See Configuration Guide", href: "/docs/config" }}
/>
```

**Expand Animation:**
```css
.feature-list {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease;
}

.feature-list.expanded {
  grid-template-rows: 1fr;
}

.feature-list-inner {
  overflow: hidden;
}
```

---

## 3.5 Pricing Cards

### Layout

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │  ⭐ MOST POPULAR│  │                 │
│  Free           │  │                 │  │  Team           │
│  $0/month       │  │  Solo           │  │  $79/seat       │
│                 │  │  $29/month      │  │                 │
│  ───────────    │  │                 │  │  ───────────    │
│                 │  │  ───────────    │  │                 │
│  ✓ Feature 1    │  │                 │  │  ✓ Feature 1    │
│  ✓ Feature 2    │  │  ✓ Feature 1    │  │  ✓ Feature 2    │
│  ✓ Feature 3    │  │  ✓ Feature 2    │  │  ✓ Feature 3    │
│                 │  │  ✓ Feature 3    │  │                 │
│  [Get Started]  │  │  ☁️ Cloud backup │  │  [Start Trial]  │
│                 │  │  🤖 AI detection │  │                 │
│                 │  │                 │  │                 │
│                 │  │  [Free Trial]   │  │                 │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     Default             Highlighted            Default
```

### Solo Card (Highlighted)

```css
.pricing-card-solo {
  position: relative;
  background: var(--bg-tertiary);
  border: 2px solid var(--snapback-green);
  border-radius: 20px;
  padding: 32px;
  transform: scale(1.05);
  box-shadow: var(--shadow-glow-green);
}

/* "Most Popular" badge */
.pricing-card-solo::before {
  content: '⭐ MOST POPULAR';
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  background: var(--snapback-green);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  color: black;
  letter-spacing: 0.05em;
}
```

### Pricing Toggle Animation

```jsx
<PricingToggle
  options={['Monthly', 'Annual (Save 17%)']}
  value={billingPeriod}
  onChange={setBillingPeriod}
/>
```

**Toggle Component:**
```css
.pricing-toggle {
  display: inline-flex;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 9999px;
  padding: 4px;
  position: relative;
}

.pricing-toggle-option {
  padding: 8px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 200ms ease;
}

.pricing-toggle-option.active {
  color: var(--text-primary);
}

/* Sliding indicator */
.pricing-toggle-indicator {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background: var(--bg-quaternary);
  border-radius: 9999px;
  transition: all 300ms var(--ease-bounce);
}
```

**Price Change Animation:**
```javascript
// When toggling between monthly/annual
const priceVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 }
};

// Use Framer Motion AnimatePresence
<AnimatePresence mode="wait">
  <motion.span key={price} variants={priceVariants}>
    ${price}
  </motion.span>
</AnimatePresence>
```

### CTA Button States

**Free Tier:**
```css
.btn-free {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.btn-free:hover {
  background: var(--bg-quaternary);
  border-color: var(--border-strong);
}
```

**Solo Tier (Primary):**
```css
.btn-solo {
  background: var(--gradient-cta);
  border: none;
  color: white;
  box-shadow: var(--shadow-glow-orange);
}

.btn-solo:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(249, 115, 22, 0.4);
}
```

**Team Tier:**
```css
.btn-team {
  background: var(--snapback-coral);
  border: none;
  color: white;
}

.btn-team:hover {
  background: #F87171;
  transform: translateY(-2px);
}
```

---

## 3.6 FAQ Accordion

### Component Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  Do I need a credit card to start?                              ▼  │
└─────────────────────────────────────────────────────────────────────┘

        ↓ Click to expand ↓

┌─────────────────────────────────────────────────────────────────────┐
│  Do I need a credit card to start?                              ▲  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  No. The Free plan is completely free forever—no credit card,       │
│  no trial period, no catch. You only need a card if you choose      │
│  to upgrade to Solo or Team.                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Styling

```css
.faq-item {
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 200ms ease;
}

.faq-item:hover {
  border-color: var(--border-default);
}

.faq-item.open {
  border-color: var(--snapback-green);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: var(--bg-tertiary);
  cursor: pointer;
  font-weight: 500;
}

.faq-answer {
  padding: 0 24px;
  max-height: 0;
  overflow: hidden;
  transition: all 300ms ease;
}

.faq-item.open .faq-answer {
  padding: 0 24px 20px;
  max-height: 500px;
}
```

### Arrow Animation

```css
.faq-arrow {
  transition: transform 300ms var(--ease-bounce);
}

.faq-item.open .faq-arrow {
  transform: rotate(180deg);
}
```

### Keyboard Navigation

```javascript
// Handle keyboard events
const handleKeyDown = (e, index) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      toggleItem(index);
      break;
    case 'ArrowDown':
      e.preventDefault();
      focusItem(index + 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      focusItem(index - 1);
      break;
  }
};
```

---

## 3.7 Stats/Metrics Section

### Design with Animated Counters

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│    │             │    │             │    │             │           │
│    │    847      │    │    100%     │    │   <200ms    │           │
│    │             │    │             │    │             │           │
│    │  Waitlist   │    │   Local     │    │  Snapshot   │           │
│    │  Signups    │    │  Storage    │    │   Target    │           │
│    │             │    │             │    │             │           │
│    │  Real count │    │  Your data  │    │ Performance │           │
│    │  updated    │    │  stays on   │    │ goal we're  │           │
│    │  live       │    │  your       │    │ hitting     │           │
│    │             │    │  machine    │    │             │           │
│    └─────────────┘    └─────────────┘    └─────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Counter Animation (Run Once)

```jsx
import { useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true;

      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}
```

### Card Styling

```css
.stat-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* Subtle gradient accent at top */
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-text);
  opacity: 0;
  transition: opacity 300ms ease;
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-number {
  font-size: 48px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.stat-description {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.5;
}
```

---

## 3.8 Timeline/Roadmap Component

### Visual Design

```
          Q4 2025                Q1 2026               Q2 2026
            │                      │                     │
            ▼                      ▼                     ▼
    ┌───────────────┐      ┌───────────────┐     ┌───────────────┐
    │   ● ALPHA     │      │   ○ BETA      │     │   ○ V1.0      │
    │   (Current)   │──────│   Launch      │─────│   Release     │
    │               │      │               │     │               │
    │ ✅ Snapshots  │      │ ☐ Cloud sync  │     │ ☐ MCP         │
    │ ✅ Timeline   │      │ ☐ Guardian    │     │ ☐ SSO         │
    │ ✅ Restore    │      │ ☐ CLI tool    │     │ ☐ Analytics   │
    └───────────────┘      └───────────────┘     └───────────────┘
```

### Interactive Hover States

```css
.roadmap-phase {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
  position: relative;
  transition: all 300ms ease;
}

/* Current phase highlight */
.roadmap-phase.current {
  border-color: var(--snapback-green);
  box-shadow: var(--shadow-glow-green);
}

.roadmap-phase.current::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 24px;
  width: 16px;
  height: 16px;
  background: var(--snapback-green);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
}

/* Connector line */
.roadmap-connector {
  position: absolute;
  top: 50%;
  right: -32px;
  width: 32px;
  height: 2px;
  background: var(--border-default);
}

.roadmap-phase.current .roadmap-connector {
  background: linear-gradient(
    90deg,
    var(--snapback-green),
    var(--border-default)
  );
}
```

### Item Check Animation

```css
.roadmap-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.roadmap-item.complete {
  color: var(--status-success);
}

.roadmap-item.complete .check-icon {
  animation: checkPop 400ms var(--ease-bounce);
}

@keyframes checkPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
```

---

## 3.9 Section Transitions

### Scroll-Triggered Fade In

```jsx
import { motion } from 'framer-motion';

const sectionVariants = {
  hidden: {
    opacity: 0,
    y: 40
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

function Section({ children }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={sectionVariants}
    >
      {children}
    </motion.section>
  );
}
```

### Staggered Children

```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

// Usage for feature cards, FAQ items, etc.
<motion.div variants={containerVariants} initial="hidden" whileInView="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

---

## 3.10 Toast Notifications

### Design

```
┌─────────────────────────────────────────┐
│  ✅  Snapshot created                   │
│      Restored in 47ms                   │
└─────────────────────────────────────────┘
```

### Variants

```jsx
// Success
<Toast variant="success" icon="✅">
  <ToastTitle>Snapshot created</ToastTitle>
  <ToastDescription>Auto-saved at 2:34 PM</ToastDescription>
</Toast>

// Warning
<Toast variant="warning" icon="⚠️">
  <ToastTitle>AI activity detected</ToastTitle>
  <ToastDescription>Creating protective snapshot</ToastDescription>
</Toast>

// Error
<Toast variant="error" icon="❌">
  <ToastTitle>Build failed</ToastTitle>
  <ToastDescription>Click to restore previous state</ToastDescription>
</Toast>
```

### Animation

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  animation: toastIn 300ms var(--ease-out);
}

.toast.exiting {
  animation: toastOut 200ms var(--ease-in) forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}

/* Variant borders */
.toast-success {
  border-left: 3px solid var(--status-success);
}

.toast-warning {
  border-left: 3px solid var(--status-warning);
}

.toast-error {
  border-left: 3px solid var(--status-error);
}
```

---

# Part 4: Page-Level Implementation Notes

## 4.1 Homepage Implementation Checklist

### Above the Fold
- [ ] Animated navigation (transparent → glass island on scroll)
- [ ] Origin story badge with hover effect
- [ ] Animated headline entrance
- [ ] Benefit pills with tooltips
- [ ] Primary CTA with shimmer effect
- [ ] Interactive demo or video embed

### Below the Fold
- [ ] Problem cards with staggered entrance
- [ ] Git comparison table
- [ ] Core principles with status badges
- [ ] Live waitlist counter (animate once)
- [ ] Roadmap preview
- [ ] Community section
- [ ] Final CTA with email capture

### Performance Targets
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Total JS < 200kb gzipped

## 4.2 Features Page Implementation Checklist

- [ ] Status badge legend at top
- [ ] Feature cards with progressive disclosure
- [ ] Integration grid with availability states
- [ ] Documentation CTA section
- [ ] Final CTA banner

## 4.3 Pricing Page Implementation Checklist

- [ ] Billing toggle with sliding indicator
- [ ] Price change animation
- [ ] Solo tier highlighted and scaled
- [ ] Expandable feature lists
- [ ] Trust indicators row
- [ ] FAQ accordion with keyboard nav
- [ ] Final CTA banner

---

# Part 5: Aceternity/Magic UI Component Recommendations

## 5.1 Recommended Components

### From Aceternity UI

1. **Spotlight Effect** - For hero section background
   - Subtle mouse-following gradient
   - Enhances depth without distraction
   - [aceternity.com/components/spotlight]

2. **Bento Grid** - For features layout
   - Modern asymmetric grid
   - Works well with cards of varying importance
   - [aceternity.com/components/bento-grid]

3. **Animated Tabs** - For demo section
   - Smooth content transitions
   - Good for showing different demo states
   - [aceternity.com/components/animated-tabs]

4. **Background Beams** - For CTA sections
   - Animated gradient beams
   - Creates visual interest
   - [aceternity.com/components/background-beams]

5. **Infinite Moving Cards** - For testimonials (future)
   - Auto-scrolling social proof
   - When you have real testimonials
   - [aceternity.com/components/infinite-moving-cards]

### From Magic UI

1. **Blur Fade** - For section entrances
   - Smooth blur-to-focus reveal
   - More refined than simple fade
   - [magicui.design/docs/components/blur-fade]

2. **Border Beam** - For highlighted cards
   - Animated border gradient
   - Perfect for Solo pricing card
   - [magicui.design/docs/components/border-beam]

3. **Shimmer Button** - For primary CTAs
   - Built-in shimmer effect
   - High engagement
   - [magicui.design/docs/components/shimmer-button]

4. **Marquee** - For logo strip
   - Smooth infinite scroll
   - For integration logos
   - [magicui.design/docs/components/marquee]

5. **Number Ticker** - For stats
   - Animated counting
   - Runs once on scroll into view
   - [magicui.design/docs/components/number-ticker]

## 5.2 Custom Components to Build

### SnapBack Timeline
- Unique to your product
- Shows session history with interactive restore
- No off-the-shelf equivalent

### Demo Terminal
- Interactive code editor simulation
- State machine for demo flow
- Custom typewriter effects

### Status Badges
- Beta/Dev/Planned variants
- Consistent across all pages
- Should pulse/animate subtly

---

# Part 6: Accessibility Checklist

## Color Contrast
- [ ] All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- [ ] Interactive elements have 3:1 contrast
- [ ] Don't rely on color alone for status

## Keyboard Navigation
- [ ] All interactive elements focusable
- [ ] Visible focus indicators
- [ ] Logical tab order
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys navigate within components

## Screen Readers
- [ ] Semantic HTML structure
- [ ] ARIA labels where needed
- [ ] Alt text for images
- [ ] Live regions for dynamic content
- [ ] Skip links for navigation

## Motion
- [ ] Respect prefers-reduced-motion
- [ ] No essential info conveyed only through animation
- [ ] Pause/stop controls for auto-playing content

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# Part 7: Implementation Priority

## Phase 1: Critical Fixes (Week 1)
1. Fix navigation scroll behavior
2. Consolidate color system (remove neon green)
3. Fix any broken text/buttons
4. Remove mysterious "N" markers
5. Standardize section spacing

## Phase 2: Copy Updates (Week 1-2)
1. Update hero with honest pre-launch messaging
2. Add origin story section
3. Update features with status badges
4. Revise pricing tier copy
5. Add FAQ content

## Phase 3: Microinteractions (Week 2-3)
1. Navigation glass island effect
2. CTA button effects (shimmer, hover)
3. Feature card hover states
4. Counter animations (run once)
5. Section scroll reveals

## Phase 4: Interactive Demo (Week 3-4)
1. Build demo component state machine
2. Implement code typewriter effect
3. Add timeline interaction
4. Create restore "snap" animation
5. Test and refine timing

## Phase 5: Polish (Week 4+)
1. Accessibility audit and fixes
2. Performance optimization
3. Mobile responsiveness
4. Cross-browser testing
5. Analytics implementation

---

*Document Version: 1.0*
*Last Updated: December 2025*
*Author: SnapBack Marketing Team*

---

## Appendix: Quick Reference

### Color Codes
```
Brand Green:    #10B981
CTA Orange:     #F97316
Background:     #000000
Surface:        #111111
Border:         #262626
Text Primary:   #FAFAFA
Text Secondary: #A1A1AA
```

### Font Stack
```
Sans: Inter, system-ui
Mono: JetBrains Mono, Fira Code
```

### Key Animations
```
Entrance:  300ms ease-out
Exit:      200ms ease-in
Bounce:    400ms cubic-bezier(0.34, 1.56, 0.64, 1)
Snap:      400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### Breakpoints
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```
