# SnapBack Implementation Specification

**Version**: 1.0.0
**Status**: Implementation Ready
**Date**: December 2025

---

## Executive Summary

SnapBack is an AI-assisted code protection extension for VS Code. When a user protects a file, the system traces import relationships and extends protection to related files (clusters). Changes trigger atomic snapshots preserving coherent state for restoration.

**Monetization**: Free users get single-file protection. Cluster features require Pioneer Program membership (free during beta, engagement-gated).

---

## Part 1: Pioneer Program

### Overview

A gamified early access program that:
1. Gives engaged users Pro features before launch
2. Creates viral loops (referrals, social sharing)
3. Builds community before monetization
4. Lets us ship "Pro" features without payment infrastructure

### Tiers & Benefits

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SNAPBACK PIONEER PROGRAM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🌱 SEEDLING (0-249 pts)           │  🌿 GROWER (250-749 pts)       │
│  • Queue position visible          │  • Everything in Seedling      │
│  • 50% lifetime Pro discount       │  • Discord Pioneer role        │
│  • Name in GitHub credits          │  • Monthly founder AMA access  │
│  • Cluster protection (beta)       │  • Beta feature previews       │
│                                    │  • Co-change analysis          │
│  ──────────────────────────────────┼──────────────────────────────  │
│  🌳 CULTIVATOR (750-1499 pts)      │  🌲 GUARDIAN (1500+ pts)       │
│  • Everything in Grower            │  • Everything in Cultivator    │
│  • Private Slack with founders     │  • Immediate Pro access        │
│  • Priority support                │  • Lifetime free Pro tier      │
│  • Feature request voting power    │  • Advisory board invitation   │
│                                    │  • Custom Pioneer badge        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Point Actions

| Action | Points | Frequency | Verification |
|--------|--------|-----------|--------------|
| Create account | +50 | Once | Auto |
| Verify email | +25 | Once | Auto |
| Star GitHub repo | +100 | Once | GitHub API (instant via VS Code auth) |
| Join Discord | +75 | Once | OAuth callback |
| Share on X | +50 | Weekly | Link click tracking |
| Submit feedback | +150 | Per submission | Manual review |
| Referral signup | +200 | Per referral | Auto |
| Referral activation | +100 | Per active referral | 5+ snapshots |
| First snapshot | +50 | Once | Auto |
| Protect 5 files | +75 | Once | Auto |

### Feature Gating Rules

**During Beta:**
| Feature | Access |
|---------|--------|
| Single-file protection | Everyone |
| Cluster protection | All Pioneers (Seedling+) |
| Co-change analysis | Grower+ |
| Auto re-analysis | Grower+ |

**Post-Beta:**
| Feature | Access |
|---------|--------|
| Single-file protection | Free forever |
| Cluster protection | Guardian (free) OR $12/mo |
| Pioneer discount | 50% lifetime ($6/mo or $49/yr) |

### Profile Schema

```typescript
interface PioneerProfile {
  id: string;                    // UUID
  username: string;              // GitHub handle
  tier: 'seedling' | 'grower' | 'cultivator' | 'guardian';
  totalPoints: number;
  joinedAt: string;              // ISO date
  referralCode: string;          // e.g., "abc123"
  githubStarred: boolean;        // For instant verification
}
```

---

## Part 2: Core Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VS Code Host                               │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │ Active Editor    │  │ Command Palette  │                         │
│  └────────┬─────────┘  └────────┬─────────┘                         │
└───────────┼─────────────────────┼───────────────────────────────────┘
            │                     │
┌───────────┼─────────────────────┼───────────────────────────────────┐
│           ▼                     ▼           SnapBack Extension      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      PIONEER LAYER                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             ││
│  │  │ PioneerAuth │  │ Gatekeeper  │  │PointsTracker│             ││
│  │  │ (VS Code    │  │ (Singleton) │  │ (Stub →     │             ││
│  │  │  Auth API)  │  │             │  │  Supabase)  │             ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                       ENGINE LAYER                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             ││
│  │  │BurstDetector│  │ Protection  │  │ GraphEngine │             ││
│  │  │             │──▶│  Manager    │──▶│ (madge)     │             ││
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘             ││
│  │                          │                                      ││
│  │  ┌─────────────┐         │                                      ││
│  │  │CooldownCache│◀────────┘                                      ││
│  │  │ (In-memory) │                                                ││
│  │  └─────────────┘                                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      STORAGE LAYER                              ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │               StorageManager (Orchestrator)                 │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │       │           │           │           │           │         ││
│  │  ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐   ││
│  │  │BlobStore│ │Snapshot │ │ Session │ │AuditLog │ │ Config  │   ││
│  │  │  (CAS)  │ │  Store  │ │  Store  │ │ (JSONL) │ │  Store  │   ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                        UI LAYER                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             ││
│  │  │  Sidebar    │  │ Interactive │  │   Status    │             ││
│  │  │ (TreeView)  │  │  Tutorial   │  │  Bar Item   │             ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      TELEMETRY                                  ││
│  │  ┌─────────────┐  ┌─────────────┐                              ││
│  │  │ PII Scrubber│──▶│   PostHog   │                              ││
│  │  └─────────────┘  └─────────────┘                              ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│            File System (~/.config/Code/User/globalStorage)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │blobs/ab/cd/ │  │snapshots/   │  │audit.jsonl  │                 │
│  │  <hash>     │  │ *.json      │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Architecture

**Root**: `~/.config/Code/User/globalStorage/snapback.id/`

| Directory | Purpose | Format |
|-----------|---------|--------|
| `blobs/ab/cd/<hash>` | Content-addressable file storage | Raw text |
| `snapshots/*.json` | Snapshot manifests | JSON |
| `sessions/*.json` | Session groupings | JSON |
| `audit.jsonl` | Append-only action log | JSONL |
| `config.json` | User settings | JSON |

**Blob Sharding**: First 4 chars of SHA-256 hash create 2-level directory structure.

### Protection Inheritance Model

```
User sets BLOCK on Button.tsx (anchor file)
    │
    ▼
Button.tsx ──imports──▶ useButton.ts ──imports──▶ useInput.ts
   BLOCK                   WARN                    WATCH
  (Depth 0)              (Depth 1)               (Depth 2)
                                                     │
                                           ┌────────┘
                                           ▼
                               useValidation.ts (Depth 3)
                                    EXCLUDED
                              (Max depth = 2 enforced)
```

**Rules:**
- Only anchors are explicitly set by user
- Depth 1 dependencies inherit WARN
- Depth 2 dependencies inherit WATCH
- Depth 3+ excluded (prevents bloat)
- External deps (node_modules) always excluded

### Gatekeeper Logic

```typescript
class PioneerGatekeeper {
  private static instance: PioneerGatekeeper;
  private currentProfile: PioneerProfile | null = null;

  static getInstance(): PioneerGatekeeper { /* singleton */ }

  get isPioneer(): boolean {
    return this.currentProfile !== null;
  }

  private get tierRank(): number {
    const ranks = { seedling: 0, grower: 1, cultivator: 2, guardian: 3 };
    return ranks[this.currentProfile?.tier ?? 'seedling'];
  }

  canUseFeature(feature: 'clusters' | 'co-change' | 'auto-reanalysis'): boolean {
    if (!this.isPioneer) return false;

    switch (feature) {
      case 'clusters': return true;              // All Pioneers
      case 'co-change': return this.tierRank >= 1;   // Grower+
      case 'auto-reanalysis': return this.tierRank >= 1;
      default: return false;
    }
  }

  getUpsellMessage(feature: string): string {
    if (this.isPioneer) {
      return `Reach Grower tier to unlock ${feature}`;
    }
    return `Join Pioneers to unlock ${feature}`;
  }
}
```

---

## Part 3: User Journeys

### Journey 1: First Protection (Cluster Discovery)

```
STEP 1: User right-clicks Button.tsx → "Protect with SnapBack"
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│ SNAPBACK                                                    [gear]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Button.tsx                                            🔴 PROTECTED │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  📊 RELATED FILES DISCOVERED                                   │ │
│  │                                                                 │ │
│  │  This file imports/exports with 5 other files.                 │ │
│  │  Protecting them together keeps your code coherent.            │ │
│  │                                                                 │ │
│  │  🔗 useButton.ts          (direct import)                      │ │
│  │  🔗 ButtonContext.tsx     (direct import)                      │ │
│  │  🔗 buttonStyles.ts       (direct import)                      │ │
│  │  🔗 types/button.ts       (transitive)                         │ │
│  │  🔗 useClickOutside.ts    (transitive)                         │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  🚀 UNLOCK CLUSTER PROTECTION                            │  │ │
│  │  │                                                          │  │ │
│  │  │  Pioneers can protect all related files together.        │  │ │
│  │  │  When one changes, all are snapshotted atomically.       │  │ │
│  │  │                                                          │  │ │
│  │  │  [Become a Pioneer - Free]    [Maybe Later]              │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  📷 SNAPSHOTS                                                        │
│                                                                      │
│  (No snapshots yet - edit this file to create one)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


STEP 2: User clicks "Become a Pioneer"
══════════════════════════════════════

VS Code system dialog appears:
┌─────────────────────────────────────────────────────────────────────┐
│  Allow 'SnapBack' to sign in using GitHub?                          │
│                                                                      │
│  [Allow]                                              [Cancel]       │
└─────────────────────────────────────────────────────────────────────┘

User clicks Allow → GitHub token received instantly


STEP 3: Sidebar updates immediately
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│ SNAPBACK                                    🌱 175 pts    [gear]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Button.tsx                                       🔴 CLUSTER ANCHOR │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  🔗 PROTECTED CLUSTER (6 files)                                │ │
│  │                                                                 │ │
│  │  🔴 Button.tsx           (anchor - BLOCK)                      │ │
│  │  🟡 useButton.ts         (WARN)                                │ │
│  │  🟡 ButtonContext.tsx    (WARN)                                │ │
│  │  🟡 buttonStyles.ts      (WARN)                                │ │
│  │  🟢 types/button.ts      (WATCH)                               │ │
│  │  🟢 useClickOutside.ts   (WATCH)                               │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Journey 2: Pioneer Signup (Zero-Friction)

**Authentication Flow:**

```
FLOW A: User already logged into VS Code with GitHub (80% of cases)
═══════════════════════════════════════════════════════════════════

1. User clicks "Become a Pioneer"
2. Extension calls:
   vscode.authentication.getSession('github', ['read:user', 'user:email'], { createIfNone: true })
3. System dialog: "Allow SnapBack to use your GitHub account?"
4. User clicks "Allow"
5. Extension receives GitHub token → sends to backend
6. Backend creates pioneer_profiles entry, returns profile
7. Sidebar immediately updates with tier badge

Total time: ~2 seconds, never leaves IDE


FLOW B: User not logged into VS Code (fallback)
═══════════════════════════════════════════════

1. User clicks "Become a Pioneer"
2. VS Code prompts: "Sign in with GitHub to continue"
3. Browser opens GitHub OAuth
4. User authorizes → redirects back to VS Code
5. Continues from Flow A step 5

Total time: ~15 seconds


FLOW C: User prefers Google/Email (rare)
════════════════════════════════════════

1. User clicks "Other sign-in options"
2. Browser opens: https://snapback.dev/pioneers
3. Standard OAuth (Google) or magic link (Email)
4. User enters connection code in extension
```

### Journey 3: Save Interception

```
SCENARIO: User edits Button.tsx (BLOCK level, cluster anchor)
═════════════════════════════════════════════════════════════

User presses Cmd+S...

┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  🛑 PROTECTED FILE                                                  │
│                                                                      │
│  Button.tsx is protected at BLOCK level.                            │
│  This will snapshot the entire cluster (6 files).                   │
│                                                                      │
│  [Snapshot & Save]              [Cancel]                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

User clicks "Snapshot & Save":
1. StorageManager.createClusterSnapshot() called
2. All 6 files written to BlobStore
3. Manifest written to SnapshotStore
4. AuditLog entry appended
5. Save completes
6. Status bar flash: "📷 Cluster snapshot saved (6 files)"


SCENARIO: User edits useButton.ts (WARN level, inherited)
═════════════════════════════════════════════════════════

User presses Cmd+S...

┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ⚠️  RELATED TO PROTECTED FILE                                      │
│                                                                      │
│  useButton.ts is related to protected cluster (Button.tsx).         │
│                                                                      │
│  [Snapshot & Save]              [Save Without Snapshot]             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


SCENARIO: User edits types/button.ts (WATCH level, transitive)
══════════════════════════════════════════════════════════════

User presses Cmd+S...
→ Silent snapshot created
→ Status bar flash: "📷 Snapshot saved"
→ No modal interruption
```

### Journey 4: Restore Flow

```
STEP 1: User clicks snapshot in sidebar
═══════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│ SNAPBACK                                    🌱 175 pts    [gear]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📷 SNAPSHOTS (Button.tsx cluster)                                  │
│                                                                      │
│  ▶ 2 minutes ago (6 files)                         [↩️ Restore]     │
│    ├─ Button.tsx (+12, -3)                                          │
│    ├─ useButton.ts (+5, -0)                                         │
│    └─ 4 more files...                                               │
│                                                                      │
│  ▶ 15 minutes ago (6 files)                        [↩️ Restore]     │
│                                                                      │
│  ▶ 1 hour ago (4 files)                            [↩️ Restore]     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


STEP 2: User clicks "Restore"
═════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ↩️  RESTORE SNAPSHOT                                               │
│                                                                      │
│  This will restore 6 files to their state from 2 minutes ago.       │
│                                                                      │
│  Changes since snapshot:                                             │
│  • Button.tsx: +12 lines, -3 lines                                  │
│  • useButton.ts: +5 lines                                           │
│                                                                      │
│  Current changes will be backed up automatically.                    │
│                                                                      │
│  [Restore All]    [Select Files...]    [Cancel]                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


STEP 3: Atomic restore via WorkspaceEdit
════════════════════════════════════════

const edit = new vscode.WorkspaceEdit();
for (const [filePath, content] of Object.entries(snapshot.files)) {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);
    edit.replace(uri, fullRange, content);
}
await vscode.workspace.applyEdit(edit);  // Single undo step

Status bar: "↩️ Restored 6 files (Cmd+Z to undo)"
```

---

## Part 4: Implementation Chunks

### Chunk 0: Pioneer Infrastructure (Week 1)

```
We are starting SnapBack. Build Pioneer Infrastructure first.

Architecture:
• Auth: Native VS Code Authentication
• State: PioneerProfile in globalState
• Gatekeeper: Singleton for feature access
• Telemetry: PostHog integration

Tasks:
1. src/pioneer/types.ts:
   • Tier = 'seedling' | 'grower' | 'cultivator' | 'guardian'
   • PioneerProfile interface

2. src/pioneer/PioneerAuth.ts:
   • login(): vscode.authentication.getSession('github',
       ['read:user', 'user:email'], { createIfNone: true })
   • getProfile(): Cache in globalState, fetch from backend
   • Telemetry: posthog.capture('pioneer_signup_completed')

3. src/pioneer/PioneerGatekeeper.ts (Singleton):
   • canUseFeature(feature):
     - 'clusters': All Pioneers
     - 'co-change': Grower+
   • getUpsellMessage(feature): CTA strings

4. src/pioneer/PointsTracker.ts:
   • Stub addPoints(), syncWithServer()
   • posthog.capture('pioneer_action_completed')

5. src/views/PioneerStatusItem.ts:
   • Pioneer: "$(sprout) [Points] pts" → Dashboard
   • Guest: "$(rocket) Join Pioneers" → Login

6. Wire to SidebarProvider header
```

### Chunk 1: Storage Foundation (Week 1-2)

```
Build the Storage Layer using Content-Addressable Storage.

Storage Root: ~/.config/Code/User/globalStorage/snapback.id/

Tasks:
1. src/utils/:
   • hash.ts: SHA-256 implementation
   • atomicWrite.ts: Safe file writing
   • fileId.ts: Consistent ID generation

2. src/analytics/telemetry.ts:
   • Initialize PostHog
   • scrub(filepath): Hash to ensure no PII leaves machine

3. src/storage/:
   • BlobStore.ts: CAS with blobs/ab/cd/<hash>
   • SnapshotStore.ts: Manifests in snapshots/*.json
   • SessionStore.ts: Group by temporal proximity
   • AuditLog.ts: Append-only audit.jsonl
   • ConfigStore.ts: Protection levels, engine settings

4. src/engine/CooldownCache.ts:
   • In-memory Map<string, number>
   • Resets on reload (ephemeral by design)

5. src/storage/StorageManager.ts:
   • Initialize all stores
   • persistSnapshot(files, trigger)
   • createClusterSnapshot(cluster)
   • getRecentSnapshots()

Constraints:
• Use vscode.workspace.fs exclusively
• No compression (v1)
```

### Chunk 2: Engine Logic (Week 2)

```
Build Protection System and Graph Engine.

Tasks:
1. src/engine/graph/:
   • ImportAnalyzer.ts: Parse imports (madge)
   • GraphManager.ts: Maintain dependency graph
   • Inheritance: Anchor(BLOCK) → Direct(WARN) → Transitive(WATCH)
   • Max depth = 2

2. src/engine/ClusterManager.ts:
   • getCluster(anchorUri): Returns all related files with levels
   • createClusterSnapshot(): Atomic snapshot of entire cluster

3. src/engine/ProtectionManager.ts:
   • getProtectionStatus(uri): { level, isInherited, anchorFile }
   • Check PioneerGatekeeper before cluster operations

4. Save Interceptor:
   • Hook vscode.workspace.onWillSaveTextDocument
   • BLOCK: Modal → Reject/Resolve promise
   • WARN: Warning notification
   • WATCH: Silent snapshot
   • Non-Pioneer + cluster file: Show upsell, protect single file only

5. Integration:
   • Check CooldownCache before action
   • Auto-scan imports on save to update graph

Constraints:
• madge for graph analysis (v1)
• Handle untitled: files gracefully
```

### Chunk 3: Sidebar UI (Week 3)

```
Build context-aware Sidebar TreeView.

Tasks:
1. src/views/SidebarProvider.ts:
   • Implement vscode.TreeDataProvider
   • Update on onDidChangeActiveTextEditor

2. Dynamic Structure:
   Header (based on PioneerGatekeeper state):
   • Non-Pioneer: "🚀 Become a Pioneer [Join]"
   • Pioneer: "🌱 175/250 pts"

   Section 1: Current File Context
   • File name + protection level icon
   • Cluster files (if Pioneer) with inheritance indicators

   Section 2: Related Files
   • List deps from GraphManager
   • Lock icon for non-Pioneers with "Unlock" button

   Section 3: Recent Snapshots
   • Snapshots for this cluster
   • Click → Diff view

3. Interactions:
   • Click snapshot → Open diff
   • revealSnapshot(id): Highlight specific item
   • "Restore" button on each snapshot

4. Empty States:
   • No file open: "Open a file to see protection status"
   • No snapshots: "Edit protected files to create snapshots"
```

### Chunk 4: Interactive Tutorial (Week 3)

```
Build onboarding tutorial that drives Pioneer conversion.

Tasks:
1. src/tutorial/InteractiveTutorial.ts:
   • Create virtual untitled document
   • Set WARN level programmatically

2. Flow:
   Step 1: Welcome decoration explains protection
   Step 2: User makes edits
   Step 3: Save triggers real interception (ProtectionManager)
   Step 4: User clicks "Snapshot & Save"
   Step 5: Show restore flow
   Step 6: Pioneer CTA (if not Pioneer)

3. Handoff Sequence:
   • Create real snapshot via StorageManager
   • Close tutorial editor
   • Wait 100ms
   • Focus Sidebar
   • Call SidebarProvider.revealSnapshot(id)
   • If non-Pioneer: Show "Unlock cluster protection" prompt

4. Telemetry:
   • tutorial_started
   • tutorial_step_completed
   • tutorial_pioneer_cta_shown
   • tutorial_completed

Constraints:
• ProtectionManager must handle untitled: scheme
```

### Chunk 5: Intelligence Layer (Week 4)

```
Build automatic protection triggers.

Tasks:
1. src/engine/BurstDetector.ts (Free Tier):
   • Monitor onDidChangeTextDocument
   • Config: burstThreshold from ConfigStore (default: 30 chars/100ms)
   • If protected file: Auto-snapshot
   • If unprotected: Notify user

2. src/engine/ClusteringService.ts (Stub for Pro):
   • analyzeDensity(): Stub for future DBSCAN
   • Returns session grouping suggestions

3. src/engine/SessionDetector.ts:
   • Group snapshots by temporal proximity (5 min window)
   • Consider import graph context

4. Telemetry:
   • burst_detected
   • session_created

5. Auto Re-analysis (Grower+):
   • Trigger: New imports added OR dependency count changes >20%
   • Frequency: Max once per day on activation
   • Notification: "Cluster expanded. [Review] [Keep Current]"
   • Check PioneerGatekeeper before execution
```

---

## Part 5: Technical Reference

### PostHog Events

```typescript
// Pioneer lifecycle
posthog.capture('pioneer_signup_started', {
  source: 'extension_cta' | 'sidebar' | 'tutorial',
  auth_flow: 'vscode_native' | 'browser_fallback'
});

posthog.capture('pioneer_signup_completed', {
  auth_method: 'github_vscode' | 'github_browser' | 'google' | 'email',
  time_to_complete_ms: number
});

posthog.capture('pioneer_action_completed', {
  action: 'github_star' | 'discord_join' | 'referral' | 'feedback',
  points_earned: number,
  total_points: number,
  tier_before: Tier,
  tier_after: Tier
});

// Protection events
posthog.capture('file_protected', {
  protection_level: 'BLOCK' | 'WARN' | 'WATCH',
  is_cluster: boolean,
  cluster_size: number,
  file_extension: string  // ".tsx", never full path
});

posthog.capture('snapshot_created', {
  trigger: 'save' | 'burst' | 'manual',
  file_count: number,
  is_cluster: boolean
});

posthog.capture('snapshot_restored', {
  file_count: number,
  age_minutes: number
});

// Intelligence
posthog.capture('burst_detected', {
  chars_per_second: number,
  file_protected: boolean
});

// Tutorial
posthog.capture('tutorial_started');
posthog.capture('tutorial_step_completed', { step: number });
posthog.capture('tutorial_pioneer_cta_shown');
posthog.capture('tutorial_completed', { became_pioneer: boolean });

// Feature gating
posthog.capture('feature_gated', {
  feature: 'clusters' | 'co-change',
  user_tier: Tier | 'guest',
  upsell_shown: boolean
});
```

### Performance Budgets

| Operation | Budget | Strategy |
|-----------|--------|----------|
| Graph analysis (cold) | <500ms | Parallel file reading, madge |
| Graph analysis (cached) | <10ms | In-memory cache with hash validation |
| Cluster snapshot | <200ms | Parallel blob writes, skip unchanged |
| Pioneer tier check | <5ms | Cache in extension memory |
| File decoration render | <1ms/file | Pre-computed decorations |
| Save interception | <50ms | No heavy compute in onWillSave |

### File Structure

```
src/
├── extension.ts                 # Entry point, register all components
├── pioneer/
│   ├── types.ts                # PioneerProfile, Tier
│   ├── PioneerAuth.ts          # VS Code Auth API wrapper
│   ├── PioneerGatekeeper.ts    # Singleton feature gating
│   └── PointsTracker.ts        # Points management (stub)
├── engine/
│   ├── graph/
│   │   ├── ImportAnalyzer.ts   # Parse imports with madge
│   │   └── GraphManager.ts     # Dependency graph state
│   ├── ClusterManager.ts       # Cluster operations
│   ├── ProtectionManager.ts    # Protection levels + interception
│   ├── BurstDetector.ts        # Rapid change detection
│   ├── SessionDetector.ts      # Temporal grouping
│   ├── CooldownCache.ts        # In-memory debounce
│   └── ClusteringService.ts    # DBSCAN stub
├── storage/
│   ├── StorageManager.ts       # Orchestrator
│   ├── BlobStore.ts            # Content-addressable storage
│   ├── SnapshotStore.ts        # Manifests
│   ├── SessionStore.ts         # Session groupings
│   ├── AuditLog.ts             # Append-only log
│   └── ConfigStore.ts          # Settings persistence
├── views/
│   ├── SidebarProvider.ts      # TreeDataProvider
│   └── PioneerStatusItem.ts    # Status bar
├── tutorial/
│   └── InteractiveTutorial.ts  # Onboarding flow
├── analytics/
│   └── telemetry.ts            # PostHog + scrubbing
└── utils/
    ├── hash.ts                 # SHA-256
    ├── atomicWrite.ts          # Safe file ops
    └── fileId.ts               # ID generation
```

---

## Part 6: Future Roadmap

### Post-Beta Optimizations

**Web Worker for Graph Analysis**
If madge becomes bottleneck (>500ms on large repos):
- Migrate to Web Worker with SWC/OXC WASM parser
- Incremental updates via file hash comparison
- ~10x faster parsing

**WorkspaceEdit for Atomic Restore**
Currently planned for v1. Single undo step, all-or-nothing semantics.

**Postgres Trigger for Tier Calculation**
Auto-calculate tiers on point changes server-side.

**Co-Change Analysis (Grower+)**
Analyze git history (30 days) to suggest cluster additions:
"Form.tsx changed with Button.tsx in 78% of commits"

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pioneer signup rate | 30% of CTA views | `pioneer_cta_clicked / pioneer_cta_shown` |
| Pioneer activation | 50% to Grower in 7 days | Funnel analysis |
| Guardian conversion | 5% of Pioneers | `pioneer_tier_unlocked {tier: guardian}` |
| Cluster adoption | 70% of Pioneers | `file_protected {is_cluster: true}` |
| Restore success | 80% single-try | `snapshot_restored` without follow-up |

---

*Document version 1.0.0 - Complete Implementation Specification*
