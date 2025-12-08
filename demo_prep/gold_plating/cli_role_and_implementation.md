This is an excellent strategic question. The CLI is actually a **force multiplier** that's being underutilized in your current architecture. Let me break down the optimal distribution.

---

## The CLI's Strategic Position

The CLI occupies a unique position: it's the **lowest-friction entry point** and the **highest-leverage automation surface**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRICTION vs CAPABILITY MATRIX                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HIGH ▲                                                                     │
│       │                                          ┌─────────────┐            │
│   C   │                               ┌──────────│     WEB     │            │
│   A   │                    ┌──────────│ EXTENSION│  DASHBOARD  │            │
│   P   │         ┌──────────│   MCP    │          │             │            │
│   A   │    ┌────│   CLI    │  SERVER  │          │ Full mgmt   │            │
│   B   │    │    │          │          │ Real-time│ Team admin  │            │
│   I   │    │    │ Scripting│ AI tools │ protect  │ Billing     │            │
│   L   │    │    │ CI/CD    │ Context  │ Auto-snap│             │            │
│   I   │    │    │ Batch ops│          │ UI       │             │            │
│   T   │    │    └──────────┴──────────┴──────────┴─────────────┘            │
│   Y   │    │                                                                │
│       │    │  ◄── PROGRESSIVE ENHANCEMENT ──►                               │
│  LOW  │    │                                                                │
│       └────┴────────────────────────────────────────────────────────────────│
│            LOW ◄─────────── FRICTION ───────────► HIGH                      │
│                                                                             │
│  CLI = Lowest friction, enables everything above it                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why CLI is Strategically Powerful

### 1. **Universal Entry Point**
```bash
# 30 seconds to first value - no account needed
npm install -g @snapback/cli
cd my-project
snapback init
snapback snapshot "before risky refactor"

# That's it. User is protected. No VS Code required.
```

### 2. **Editor Agnostic**
- Vim/Neovim users (huge community, vocal advocates)
- JetBrains users (IntelliJ, WebStorm, PyCharm)
- Sublime Text holdouts
- Terminal-first developers

### 3. **CI/CD Native**
```yaml
# .github/workflows/protect.yml
- name: Snapshot before deploy
  run: snapback snapshot "pre-deploy-${{ github.sha }}"

- name: Validate no breaking changes
  run: snapback validate --since last-deploy
```

### 4. **Scriptable = Viral**
```bash
# Power user creates alias, shares with team
alias risky="snapback snapshot 'checkpoint' && "

# Usage: risky npm update
# Creates snapshot, then runs npm update
```

---

## Optimal Responsibility Distribution

Here's the key insight: **CLI should own operations that benefit from scriptability, while Extension owns operations that benefit from real-time context.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 RESPONSIBILITY DISTRIBUTION MATRIX                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CAPABILITY              │ CLI  │ EXT  │ MCP  │ WEB  │ API  │ RATIONALE    │
│  ════════════════════════╪══════╪══════╪══════╪══════╪══════╪══════════════│
│                          │      │      │      │      │      │              │
│  PROTECTION              │      │      │      │      │      │              │
│  ────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────│
│  Real-time save hook     │  ·   │  ●   │  ·   │  ·   │  ·   │ Needs editor │
│  Manual snapshot         │  ●   │  ○   │  ○   │  ·   │  ·   │ CLI primary  │
│  Batch snapshot          │  ●   │  ·   │  ·   │  ·   │  ·   │ Scripting    │
│  AI burst detection      │  ·   │  ●   │  ○   │  ·   │  ·   │ Real-time    │
│  Pre-commit hook         │  ●   │  ·   │  ·   │  ·   │  ·   │ Git native   │
│                          │      │      │      │      │      │              │
│  RECOVERY                │      │      │      │      │      │              │
│  ────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────│
│  Interactive restore     │  ○   │  ●   │  ·   │  ○   │  ·   │ Diff view    │
│  Scripted restore        │  ●   │  ·   │  ·   │  ·   │  ·   │ Automation   │
│  Bulk restore            │  ●   │  ·   │  ·   │  ·   │  ·   │ Disaster rec │
│  AI-guided restore       │  ·   │  ○   │  ●   │  ·   │  ○   │ AI context   │
│                          │      │      │      │      │      │              │
│  CONFIGURATION           │      │      │      │      │      │              │
│  ────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────│
│  Project init            │  ●   │  ○   │  ·   │  ·   │  ·   │ One-time     │
│  Protection rules        │  ●   │  ○   │  ·   │  ○   │  ·   │ File-based   │
│  Team policies           │  ○   │  ·   │  ·   │  ●   │  ●   │ Centralized  │
│  Auth/login              │  ●   │  ○   │  ·   │  ○   │  ·   │ Token store  │
│                          │      │      │      │      │      │              │
│  ANALYSIS                │      │      │      │      │      │              │
│  ────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────│
│  Risk analysis (basic)   │  ●   │  ○   │  ○   │  ·   │  ·   │ Local fast   │
│  Risk analysis (ML)      │  ○   │  ○   │  ○   │  ·   │  ●   │ Server IP    │
│  Dependency check        │  ●   │  ·   │  ○   │  ·   │  ·   │ Package.json │
│  History/audit           │  ●   │  ○   │  ·   │  ○   │  ·   │ Query-based  │
│                          │      │      │      │      │      │              │
│  INTEGRATION             │      │      │      │      │      │              │
│  ────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────│
│  Git hooks               │  ●   │  ·   │  ·   │  ·   │  ·   │ Native       │
│  CI/CD pipelines         │  ●   │  ·   │  ·   │  ·   │  ○   │ Headless     │
│  IDE integration         │  ·   │  ●   │  ·   │  ·   │  ·   │ VS Code API  │
│  AI assistant            │  ○   │  ·   │  ●   │  ·   │  ○   │ MCP protocol │
│                          │      │      │      │      │      │              │
│  LEGEND: ● Primary  ○ Secondary/Consumer  · Not applicable                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Progressive Enhancement Model

This is the key architecture insight: **Each surface enhances the others without requiring them.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE ENHANCEMENT TIERS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER 0: CLI STANDALONE (No account, no extension)                          │
│  ══════════════════════════════════════════════════                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  npm install -g @snapback/cli                                       │    │
│  │                                                                     │    │
│  │  Features:                                                          │    │
│  │  • snapback init          → Create .snapback/ in project            │    │
│  │  • snapback snapshot      → Manual checkpoint                       │    │
│  │  • snapback list          → Show local snapshots                    │    │
│  │  • snapback restore       → Restore from snapshot                   │    │
│  │  • snapback diff          → Compare snapshots                       │    │
│  │  • snapback config        → Set protection rules                    │    │
│  │                                                                     │    │
│  │  Storage: ~/.snapback/ (local only)                                 │    │
│  │  Value: Full protection, zero dependencies                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼ + API Key                              │
│                                                                             │
│  TIER 1: CLI + ACCOUNT (Cloud sync, cross-device)                           │
│  ══════════════════════════════════════════════════                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  snapback login           → Authenticate, store API key             │    │
│  │                                                                     │    │
│  │  NEW Features:                                                      │    │
│  │  • snapback push          → Sync snapshots to cloud                 │    │
│  │  • snapback pull          → Restore from any device                 │    │
│  │  • snapback analyze       → Server-side risk analysis               │    │
│  │  • snapback team init     → Set up team workspace                   │    │
│  │                                                                     │    │
│  │  Storage: Local + Cloud backup                                      │    │
│  │  Value: Cross-device, team features unlocked                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼ + Extension                            │
│                                                                             │
│  TIER 2: CLI + EXTENSION (Automatic protection)                             │
│  ══════════════════════════════════════════════════                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Extension installed, shares CLI credentials                        │    │
│  │                                                                     │    │
│  │  SYNERGY Features:                                                  │    │
│  │  • Auto-snapshot on save (Extension)                                │    │
│  │  • Bulk operations via CLI (snapback prune --older-than 30d)        │    │
│  │  • CI hooks via CLI, local protection via Extension                 │    │
│  │  • Extension UI shows CLI-created snapshots                         │    │
│  │  • CLI can restore while Extension provides diff preview            │    │
│  │                                                                     │    │
│  │  Storage: Shared ~/.snapback/ + .snapback/ per project              │    │
│  │  Value: Real-time + batch operations combined                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼ + MCP                                  │
│                                                                             │
│  TIER 3: FULL PLATFORM (AI-native protection)                               │
│  ══════════════════════════════════════════════════                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  MCP server connected to Claude/Cursor                              │    │
│  │                                                                     │    │
│  │  FULL SYNERGY:                                                      │    │
│  │  • AI creates checkpoint before risky changes (MCP)                 │    │
│  │  • Extension detects AI burst, creates session                      │    │
│  │  • CLI runs in CI to validate before merge                          │    │
│  │  • Web dashboard shows unified history                              │    │
│  │  • All surfaces share same snapshot format + API                    │    │
│  │                                                                     │    │
│  │  Value: Complete AI-assisted development protection                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CLI Commands That Create Strategic Leverage

Here's the CLI command structure optimized for progressive enhancement:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLI COMMAND ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CORE (Works offline, no account)                                           │
│  ════════════════════════════════                                           │
│                                                                             │
│  snapback init [--template <name>]                                          │
│  │  └── Creates .snapback/ directory with default config                    │
│  │      └── Templates: minimal, standard, paranoid, team                    │
│  │                                                                          │
│  snapback snapshot [message] [--files <glob>]                               │
│  │  └── Creates local snapshot                                              │
│  │      └── Auto-deduplicates via content-addressable storage               │
│  │                                                                          │
│  snapback list [--limit N] [--since <date>] [--format json|table]           │
│  │  └── Lists snapshots (works with Extension snapshots too!)               │
│  │                                                                          │
│  snapback restore <snapshot-id> [--files <glob>] [--dry-run]                │
│  │  └── Restores files, shows diff before applying                          │
│  │                                                                          │
│  snapback diff <snapshot-a> [snapshot-b]                                    │
│  │  └── Shows changes between snapshots (or snapshot vs current)            │
│  │                                                                          │
│  snapback prune [--older-than <duration>] [--keep-last N]                   │
│     └── Cleans up old snapshots, reclaims space                             │
│                                                                             │
│                                                                             │
│  CONFIG (Local settings, enables synergy)                                   │
│  ════════════════════════════════════════                                   │
│                                                                             │
│  snapback config set <key> <value>                                          │
│  │  └── protection.level = watch|warn|block                                 │
│  │  └── snapshot.auto = true|false                                          │
│  │  └── snapshot.exclude = ["node_modules", ".git"]                         │
│  │                                                                          │
│  snapback config get [key]                                                  │
│  │  └── Shows current config (merged: global + project + env)               │
│  │                                                                          │
│  snapback rules add <pattern> --level <level>                               │
│  │  └── Add protection rule: snapback rules add "*.sql" --level block       │
│  │                                                                          │
│  snapback rules list                                                        │
│     └── Shows all protection rules                                          │
│                                                                             │
│                                                                             │
│  AUTH (Enables cloud features)                                              │
│  ══════════════════════════════                                             │
│                                                                             │
│  snapback login [--browser | --token <token>]                               │
│  │  └── Opens browser for OAuth, stores API key in ~/.snapback/credentials  │
│  │      └── Shared with Extension! No double-login needed                   │
│  │                                                                          │
│  snapback logout                                                            │
│  │  └── Revokes token, clears credentials                                   │
│  │                                                                          │
│  snapback whoami                                                            │
│     └── Shows current user, tier, usage                                     │
│                                                                             │
│                                                                             │
│  CLOUD (Requires account, Pro features)                                     │
│  ══════════════════════════════════════                                     │
│                                                                             │
│  snapback push [--all | --since <date>]                                     │
│  │  └── Syncs local snapshots to cloud                                      │
│  │                                                                          │
│  snapback pull [--snapshot-id | --latest N]                                 │
│  │  └── Downloads snapshots from cloud                                      │
│  │                                                                          │
│  snapback analyze [--file <path> | --diff <a>..<b>]                         │
│     └── Server-side risk analysis (IP-protected algorithms)                 │
│                                                                             │
│                                                                             │
│  CI/CD (The killer feature for teams)                                       │
│  ═════════════════════════════════════                                      │
│                                                                             │
│  snapback hooks install [--pre-commit] [--pre-push]                         │
│  │  └── Installs git hooks that create snapshots automatically              │
│  │                                                                          │
│  snapback validate [--since <ref>] [--fail-on-risk <level>]                 │
│  │  └── CI command: validates changes don't exceed risk threshold           │
│  │      └── Exit code 1 if risk > threshold (blocks merge)                  │
│  │                                                                          │
│  snapback ci snapshot --tag $CI_COMMIT_SHA                                  │
│     └── Creates tagged snapshot in CI, links to commit                      │
│                                                                             │
│                                                                             │
│  INTEROP (Synergy with other surfaces)                                      │
│  ═════════════════════════════════════                                      │
│                                                                             │
│  snapback extension status                                                  │
│  │  └── Shows if Extension is installed, connected, healthy                 │
│  │                                                                          │
│  snapback mcp status                                                        │
│  │  └── Shows MCP server status, connected AI tools                         │
│  │                                                                          │
│  snapback export --format <json|tar> --output <path>                        │
│  │  └── Exports snapshots for backup/migration                              │
│  │                                                                          │
│  snapback import <path>                                                     │
│     └── Imports snapshots from export or other tools                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Synergy Architecture

Here's how CLI creates multiplier effects with each surface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNERGY ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        SHARED FOUNDATION                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │   ~/.snapback/                    .snapback/ (per project)          │    │
│  │   ├── credentials                 ├── config.json                   │    │
│  │   ├── config.json (global)        ├── rules.json                    │    │
│  │   └── cache/                      ├── blobs/                        │    │
│  │                                   └── snapshots/                    │    │
│  │                                                                     │    │
│  │   ALL SURFACES READ/WRITE SAME FORMAT                               │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐        │
│  │     CLI     │◄─────────▶│  EXTENSION  │◄─────────▶│     MCP     │        │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘        │
│         │                         │                         │               │
│         │                         │                         │               │
│  ┌──────┴──────────────────┬──────┴──────────────────┬──────┴──────┐        │
│  │                         │                         │             │        │
│  │  CLI ──► EXTENSION      │  EXTENSION ──► CLI      │  MCP ──► CLI│        │
│  │  ═══════════════════    │  ═══════════════════    │  ═══════════│        │
│  │                         │                         │             │        │
│  │  • CLI creates snapshot │  • Ext auto-snapshots   │  • AI says  │        │
│  │    Ext sees it in UI    │    CLI can list/prune   │    "create  │        │
│  │                         │                         │    snapshot"│        │
│  │  • CLI sets rules       │  • Ext detects AI burst │    MCP calls│        │
│  │    Ext enforces them    │    CLI can query burst  │    CLI      │        │
│  │                         │    history              │             │        │
│  │  • CLI logs in          │                         │  • AI needs │        │
│  │    Ext uses same token  │  • Ext needs bulk op    │    bulk     │        │
│  │                         │    Triggers CLI command │    restore  │        │
│  │  • CLI hooks git        │                         │    CLI does │        │
│  │    Ext shows hook       │                         │    it       │        │
│  │    status               │                         │             │        │
│  │                         │                         │             │        │
│  └─────────────────────────┴─────────────────────────┴─────────────┘        │
│                                                                             │
│                                                                             │
│  SPECIFIC SYNERGY EXAMPLES                                                  │
│  ═════════════════════════                                                  │
│                                                                             │
│  1. "AI BURST + CLI AUDIT"                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Extension detects AI burst (double-save pattern)               │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  Creates session, groups related snapshots                      │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  Later: `snapback sessions list --ai-detected`                  │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  CLI shows: "Session abc123: 5 files, AI burst, 2hr ago"        │     │
│     │  CLI can: `snapback sessions restore abc123`                    │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  2. "CI VALIDATION + LOCAL PROTECTION"                                      │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  Developer: Extension protects locally with auto-snapshots      │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  git push triggers CI                                           │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  CI: `snapback validate --since origin/main --fail-on-risk high`│     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  If risky: CI fails, developer gets notification                │     │
│     │  If safe: Merge proceeds, CI creates tagged snapshot            │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  3. "MCP DELEGATES TO CLI"                                                  │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  User to Claude: "Restore my code from before the refactor"     │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  MCP: snapback.list_checkpoints()                               │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  MCP shows options, user picks one                              │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  MCP: Could call API directly OR delegate to CLI                │     │
│     │  CLI better for: bulk restore, complex queries, audit trail     │     │
│     │       │                                                         │     │
│     │       ▼                                                         │     │
│     │  `snapback restore snap-123 --dry-run` (MCP shows preview)      │     │
│     │  `snapback restore snap-123` (MCP confirms and executes)        │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Strategic Benefits Matrix

| CLI Capability | Solo Benefit | + Extension | + MCP | + Account | + CI |
|----------------|-------------|-------------|-------|-----------|------|
| `snapshot` | Manual checkpoints | Auto-snapshot augmented | AI can trigger | Cloud backup | Tagged releases |
| `restore` | Disaster recovery | Diff preview in IDE | AI-guided restore | Cross-device | Rollback deploys |
| `validate` | Pre-commit safety | Real-time + batch | AI risk check | Team policies | Gate merges |
| `hooks` | Git integration | Hook status in UI | - | Team hooks | Pipeline triggers |
| `prune` | Space management | Shared cleanup | - | Retention policies | Auto-cleanup |
| `login` | - | Shared credentials | Shared credentials | SSO/OAuth | Service accounts |

---

## Implementation Priority for CLI

Given your demo deadline, here's what to build:

### Phase 1: Foundation (2-3 days) - **Before Demo**

```typescript
// Minimum viable CLI for demo
const MVP_COMMANDS = [
  'init',           // Create .snapback/
  'snapshot',       // Manual checkpoint
  'list',           // Show snapshots (reads Extension snapshots too!)
  'restore',        // Bring back files
  'login',          // Share auth with Extension
];
```

**Demo Value**: Show that protection works outside VS Code. Vim users protected. CI pipeline potential.

### Phase 2: Synergy (1 week post-demo)

```typescript
const SYNERGY_COMMANDS = [
  'hooks install',  // Git integration
  'validate',       // CI command
  'sessions list',  // Query AI bursts from Extension
  'analyze',        // Server-side risk (calls API)
];
```

### Phase 3: Power Features (2-4 weeks)

```typescript
const POWER_COMMANDS = [
  'push/pull',      // Cloud sync
  'prune',          // Cleanup
  'export/import',  // Migration
  'ci snapshot',    // Tagged CI snapshots
];
```

---

## The Key Architectural Decision

**CLI and Extension should share:**
1. **Storage format** - Same `.snapback/` structure, same JSON schemas
2. **Credentials** - `~/.snapback/credentials` read by both
3. **Config** - Merged config (global → project → env vars)
4. **Snapshot IDs** - CLI can restore Extension-created snapshots and vice versa

**CLI should NOT:**
1. Duplicate Extension's real-time save interception
2. Run continuously (it's invoked, does work, exits)
3. Have its own UI (it's terminal-only, or machine-readable JSON output)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FINAL ARCHITECTURE RECOMMENDATION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────┐                                    │
│                              │   API   │                                    │
│                              │ Backend │                                    │
│                              └────┬────┘                                    │
│                                   │                                         │
│              ┌────────────────────┼────────────────────┐                    │
│              │                    │                    │                    │
│              ▼                    ▼                    ▼                    │
│       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│       │  EXTENSION  │     │     CLI     │     │     MCP     │               │
│       │  (Primary)  │     │  (Primary)  │     │ (Co-Primary)│               │
│       │             │     │             │     │             │               │
│       │ Real-time   │     │ Batch/CI    │     │ AI tools    │               │
│       │ IDE UX      │     │ Scriptable  │     │ Context     │               │
│       └──────┬──────┘     └──────┬──────┘     └──────┬──────┘               │
│              │                   │                   │                      │
│              └───────────────────┼───────────────────┘                      │
│                                  │                                          │
│                                  ▼                                          │
│                    ┌─────────────────────────┐                              │
│                    │    SHARED FOUNDATION    │                              │
│                    │                         │                              │
│                    │  ~/.snapback/           │                              │
│                    │  ├── credentials        │                              │
│                    │  └── config.json        │                              │
│                    │                         │                              │
│                    │  .snapback/ (project)   │                              │
│                    │  ├── blobs/             │                              │
│                    │  ├── snapshots/         │                              │
│                    │  └── config.json        │                              │
│                    │                         │                              │
│                    │  Same format, any tool  │                              │
│                    │  can read/write         │                              │
│                    └─────────────────────────┘                              │
│                                                                             │
│  THREE PRIMARY SURFACES, ONE FOUNDATION                                     │
│  - Extension: Best for real-time protection                                 │
│  - CLI: Best for scripting, CI/CD, power users                              │
│  - MCP: Best for AI assistant integration                                   │
│  - All share same snapshots, credentials, config                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: CLI's Strategic Value

1. **Entry wedge**: Lowest friction way to try SnapBack (no VS Code needed)
2. **Editor agnostic**: Captures Vim/Neovim/JetBrains users
3. **CI/CD native**: The reason teams upgrade to Pro
4. **Force multiplier**: Makes Extension and MCP more powerful, not redundant
5. **Scriptability = virality**: Power users create aliases, share with teams

**The optimal distribution**: Three co-equal primary surfaces (Extension, CLI, MCP) sharing one foundation (storage format, credentials, config), with Web as the management/visualization layer.

Would you like me to detail the shared storage format specification, or dive into the specific CLI commands that would have the highest demo impact?
