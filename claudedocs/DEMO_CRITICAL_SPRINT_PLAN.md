# SnapBack Demo-Critical Sprint Plan

**Generated**: 2025-12-04
**Purpose**: Tactical execution guide for LLM agents - demo readiness in 10 days
**Critical Insight**: 40-second activation time is THE blocker. Nothing else matters if extension appears broken.

---

## Sprint Overview

**Week 1 (Demo-Critical)**: 5 days to working demo
**Week 2 (Quality Polish)**: 5 days to professional polish

---

## Week 1: Demo-Critical Path (5 Days)

### Day 1: Activation Performance Fix (CRITICAL)
**Target**: 40s → <3s cold start (ideally <500ms)
**Current State**: Phase 2 (Storage) = 12.6s, Phase 3 (Managers) = 13.6s

#### Investigation Areas
```typescript
// 1. Profile initialization bottlenecks
// apps/vscode/src/extension.ts - activation phases

// Known suspects from debugging:
// - Phase 2: SqliteStorageAdapter initialization
//   → Check: Database migrations, initial queries, file I/O
// - Phase 3: Manager initialization (TreeViewManager, CommandManager)
//   → Check: Synchronous operations blocking activation

// 2. Defer non-critical managers
// Move to lazy initialization:
// - TreeViewManager (only needed when user opens tree view)
// - AnalyticsService (can initialize async after activation)
// - TelemetryService (defer to first event)

// 3. Storage optimization
// - Check if migrations run on every activation
// - Lazy-load database connections
// - Cache tier status, feature flags locally
```

#### Success Criteria
- [ ] Cold start <3s (acceptable)
- [ ] Cold start <500ms (ideal)
- [ ] `extension_activated` telemetry event fires within 100ms

**Deliverable**: Working extension activation that feels instant

---

### Day 2: AutoDecisionEngine (Auto-Protect Mode)
**Target**: Wire existing detection logic into automatic protection mode

#### Implementation Path
```typescript
// 1. Use existing detection from apps/vscode/src/domain/engine.ts
// - analyzeChange() already has AI detection
// - recommendProtectionLevel() already suggests Watch/Warn/Block

// 2. Create AutoDecisionEngine wrapper
// apps/vscode/src/domain/AutoDecisionEngine.ts

export class AutoDecisionEngine {
  constructor(
    private detector: ChangeAnalysisEngine,
    private config: UserConfigService
  ) {}

  async autoProtect(file: vscode.Uri, change: FileChange): Promise<void> {
    // Only if user enabled auto-mode
    if (!this.config.get('autoProtectMode')) return;

    const analysis = await this.detector.analyzeChange(file, change);
    const level = analysis.recommendedProtectionLevel; // Watch/Warn/Block

    // Auto-apply based on thresholds
    if (analysis.aiConfidence > 0.8 && level === 'Block') {
      await this.applyProtection(file, 'Block');
      this.notifyUser('Auto-protected: High AI confidence detected');
    } else if (analysis.aiConfidence > 0.5 && level === 'Warn') {
      await this.applyProtection(file, 'Warn');
    }
  }

  private async applyProtection(file: vscode.Uri, level: ProtectionLevel) {
    // Update .snapbackignore or create pre-snapshot
    // Use existing PreSnapshotService from apps/vscode/src/services/PreSnapshotService.ts
  }
}

// 3. Wire into file watcher
// apps/vscode/src/extension.ts - activate()
const autoEngine = new AutoDecisionEngine(changeAnalysisEngine, config);
fileWatcher.onDidChange(async (uri) => {
  await autoEngine.autoProtect(uri, change);
});
```

#### Success Criteria
- [ ] Auto-mode setting in configuration
- [ ] Detection runs on file save
- [ ] Protection applied automatically when confidence > threshold
- [ ] User notification shows decision reasoning

**Deliverable**: "It just works" protection without manual rules

---

### Day 3: Documentation Fixes (Brand Trust)
**Target**: Fix broken links, create FAQ, polish About page

#### Tasks
1. **Fix Broken Links** (1 hour)
   - Audit all markdown files in `/apps/web/content/docs/`
   - Fix internal links, update external references
   - Test all navigation paths

2. **FAQ Page** (2 hours)
   - Create `/apps/web/app/(marketing)/faq/page.tsx`
   - Answer top 10 questions:
     - "How is this different from Git?"
     - "Does my code leave my machine?" (IP protection)
     - "What happens to my Free tier snapshots if I don't upgrade?"
     - "Can I use SnapBack with AI assistants?" (MCP integration)
     - "How does AI detection work?"
   - SEO optimization for common search queries

3. **About Page Polish** (2 hours)
   - Update `/apps/web/app/(marketing)/about/page.tsx`
   - Founder story, mission, why SnapBack exists
   - Trust signals (privacy-first, open core, developer-focused)
   - Link to public roadmap, changelog

4. **Comparison Guide** (3 hours)
   - Create `/apps/web/app/(marketing)/compare/page.tsx`
   - SnapBack vs Git (stash, reflog)
   - SnapBack vs Time Machine
   - SnapBack vs Local History
   - Clear differentiation: "Git for commits, SnapBack for everything else"

#### Success Criteria
- [ ] 0 broken links in documentation
- [ ] FAQ answers top 10 questions with SEO keywords
- [ ] About page establishes trust and credibility
- [ ] Comparison guide shows clear value proposition

**Deliverable**: Professional documentation that converts visitors

---

### Day 4: Activation Funnel Telemetry (Data-Driven Decisions)
**Target**: Wire 3 critical events to measure activation success

#### Events to Implement
```typescript
// 1. extension_activated
// apps/vscode/src/extension.ts - activate()
export async function activate(context: vscode.ExtensionContext) {
  const startTime = Date.now();

  // ... initialization ...

  await telemetryService.trackEvent('extension_activated', {
    activationTime: Date.now() - startTime,
    version: context.extension.packageJSON.version,
    firstInstall: !context.globalState.get('hasActivatedBefore'),
  });

  context.globalState.update('hasActivatedBefore', true);
}

// 2. first_snapshot_created
// apps/vscode/src/services/SnapshotService.ts - createSnapshot()
async createSnapshot(files: vscode.Uri[]): Promise<Snapshot> {
  const snapshot = await this.storage.saveSnapshot(files);

  const isFirstSnapshot = await this.storage.getSnapshotCount() === 1;
  if (isFirstSnapshot) {
    await this.telemetry.trackEvent('first_snapshot_created', {
      fileCount: files.length,
      timeToFirstSnapshot: this.getTimeSinceActivation(),
    });
  }

  return snapshot;
}

// 3. restore_completed
// apps/vscode/src/services/RestoreService.ts - restore()
async restore(snapshotId: string): Promise<void> {
  const startTime = Date.now();

  // ... restore logic ...

  await this.telemetry.trackEvent('restore_completed', {
    restoreTime: Date.now() - startTime,
    fileCount: restoredFiles.length,
    snapshotAge: snapshot.createdAt,
  });
}
```

#### Integration with PostHog
```typescript
// Ensure these events map to your existing 127-event catalog
// apps/vscode/src/services/TelemetryService.ts

// These 3 events are THE activation funnel:
// extension_activated → first_snapshot_created → restore_completed
// If users complete all 3, they've experienced the "aha moment"
```

#### Success Criteria
- [ ] All 3 events fire reliably in dev environment
- [ ] Events appear in PostHog with correct properties
- [ ] Can measure: activation rate, time-to-first-snapshot, restore success rate

**Deliverable**: Data to optimize activation funnel post-demo

---

### Day 5: End-to-End Smoke Test + Demo Video
**Target**: Validate critical path works, record demo

#### Smoke Test Checklist
```markdown
## Critical Path Validation

### Fresh Install Flow
- [ ] Install extension from VSIX
- [ ] Activation completes in <3s
- [ ] First snapshot created automatically on file save
- [ ] TreeView shows snapshot in timeline
- [ ] Restore works via right-click menu
- [ ] File contents match snapshot exactly

### Auto-Protect Flow (if Day 2 complete)
- [ ] Enable auto-protect mode in settings
- [ ] Make AI-detected change (e.g., paste large code block)
- [ ] Notification shows "Auto-protected: High AI confidence"
- [ ] Snapshot created automatically with protection level

### Telemetry Validation
- [ ] extension_activated event in PostHog
- [ ] first_snapshot_created event in PostHog
- [ ] restore_completed event in PostHog
```

#### Demo Video Script
```markdown
## 2-Minute Demo Script

**Scene 1: The Problem (0:00-0:30)**
"You're coding with an AI assistant. It's fast, it's helpful... but sometimes it breaks things."
[Show AI making a breaking change]
"Git can't help - you haven't committed yet."

**Scene 2: The Solution (0:30-1:00)**
"SnapBack automatically snapshots every change."
[Show TreeView with automatic snapshots]
"No manual commits. No interruptions. It just works."

**Scene 3: The Magic (1:00-1:30)**
"Something breaks? Right-click, restore."
[Show restore in action]
"Back to working code in seconds."

**Scene 4: The Intelligence (1:30-2:00)**
"SnapBack detects AI-generated changes automatically."
[Show auto-protect notification]
"High-risk changes? Auto-protected."
"Your code, your safety net."
```

#### Success Criteria
- [ ] All smoke test items pass
- [ ] Demo video recorded and polished
- [ ] Demo shows under 2 minutes
- [ ] Video demonstrates "aha moment" clearly

**Deliverable**: Working demo ready for investor/user presentation

---

## Week 2: Quality Polish (5 Days)

### Day 6-7: TreeView Simplification
**Target**: Value-first UI, hide empty states

#### Current Problem
TreeView shows too much structure, not enough value:
- Empty session groups confuse users
- No clear indication of what changed
- File list doesn't show diff context

#### Improvements
```typescript
// 1. Value-first display
// Show WHAT changed before WHERE it is
// apps/vscode/src/managers/TreeViewManager.ts

interface SnapshotTreeItem {
  label: string; // "Login form broken → fixed" not just "snapshot_123"
  description: string; // "2 files changed, +45 lines"
  tooltip: string; // Full diff summary
  contextValue: 'snapshot-with-changes'; // Enable smart context menu
}

// 2. Hide empty states
// Don't show empty sessions or groups
// Only show when user has actual snapshots

// 3. Diff preview on hover
// Show inline diff summary in tooltip
// Top 3 changed functions/classes
```

#### Success Criteria
- [ ] TreeView shows value immediately
- [ ] No empty state confusion
- [ ] Diff context visible without clicks

**Deliverable**: TreeView that sells the value

---

### Day 8: Notification System Refactor
**Target**: Centralized, rate-limited, contextual notifications

#### Current Problem
Multiple notification sources, potential spam, no prioritization

#### Solution
```typescript
// apps/vscode/src/services/NotificationService.ts

export class NotificationService {
  private rateLimiter = new Map<string, number>();

  async notify(
    type: 'info' | 'warning' | 'error',
    message: string,
    options?: {
      actions?: Array<{ title: string; callback: () => void }>;
      rateLimit?: string; // Unique key for rate limiting
      ttl?: number; // Only show once per X ms
    }
  ) {
    // Rate limiting
    if (options?.rateLimit) {
      const lastShown = this.rateLimiter.get(options.rateLimit);
      if (lastShown && Date.now() - lastShown < (options.ttl || 60000)) {
        return; // Skip this notification
      }
      this.rateLimiter.set(options.rateLimit, Date.now());
    }

    // Contextual actions
    const notification = await vscode.window[`show${type.charAt(0).toUpperCase() + type.slice(1)}Message`](
      message,
      ...(options?.actions?.map(a => a.title) || [])
    );

    // Execute callback if action selected
    const action = options?.actions?.find(a => a.title === notification);
    if (action) await action.callback();
  }
}

// Usage:
await notificationService.notify('info', 'Auto-protected: High AI confidence', {
  actions: [
    { title: 'View Snapshot', callback: () => this.openSnapshot(snapshot.id) },
    { title: 'Disable Auto-Protect', callback: () => this.config.set('autoProtectMode', false) }
  ],
  rateLimit: 'auto-protect-notification',
  ttl: 300000 // Only show once per 5 minutes
});
```

#### Success Criteria
- [ ] No notification spam
- [ ] Contextual actions on all notifications
- [ ] Rate limiting prevents user fatigue

**Deliverable**: Professional notification UX

---

### Day 9-10: Final Tests + Documentation
**Target**: Demo-critical path tests, remaining documentation

#### Test Priorities
Focus ONLY on demo-critical paths:

```typescript
// 1. Extension activation flow
// apps/vscode/test/integration/activation.test.ts
describe('Extension Activation', () => {
  it('activates in under 3 seconds', async () => {
    const start = Date.now();
    await vscode.extensions.getExtension('snapback.snapback')?.activate();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });

  it('fires extension_activated telemetry event', async () => {
    // ...
  });
});

// 2. Snapshot creation flow
// apps/vscode/test/integration/snapshot.test.ts
describe('Snapshot Creation', () => {
  it('creates first snapshot on file save', async () => {
    // ...
  });

  it('fires first_snapshot_created event', async () => {
    // ...
  });
});

// 3. Restore flow
// apps/vscode/test/integration/restore.test.ts
describe('Snapshot Restore', () => {
  it('restores file to exact snapshot state', async () => {
    // ...
  });

  it('fires restore_completed event', async () => {
    // ...
  });
});
```

#### Documentation Priorities
- [ ] FAQ page (if not complete from Day 3)
- [ ] Comparison guide (SnapBack vs alternatives)
- [ ] Quick start guide (5-minute value)

#### Success Criteria
- [ ] Activation flow: 100% test coverage
- [ ] Snapshot creation: 100% test coverage
- [ ] Restore flow: 100% test coverage
- [ ] All documentation links working
- [ ] Demo-ready documentation

**Deliverable**: Tested, documented, demo-ready extension

---

## Success Metrics

### Week 1 (Demo-Critical)
- [ ] Activation time: 40s → <3s ✅ CRITICAL
- [ ] Auto-protect mode: Working demo ✅
- [ ] Documentation: 0 broken links ✅
- [ ] Telemetry: 3 critical events firing ✅
- [ ] Demo video: <2 minutes, shows "aha moment" ✅

### Week 2 (Quality Polish)
- [ ] TreeView: Value-first display ✅
- [ ] Notifications: Rate-limited, contextual ✅
- [ ] Tests: Demo-critical paths 100% coverage ✅
- [ ] Documentation: FAQ, comparison, quick start ✅

---

## Post-Demo Roadmap

After successful demo, tackle in this order:

### Phase 1: Test Expansion (1-2 weeks)
- API security middleware: 50+ tests
- Policy engine: 30+ tests
- VSCode new features: 20+ tests
- Target: 1,978 → 2,100+ tests, 75% → 85% coverage

### Phase 2: Next.js 16 Readiness Audit (2-4 hours)
**NOT migration, just readiness assessment:**
```markdown
## Async API Inventory
- Count `cookies()` usages: ___
- Count `headers()` usages: ___
- Count `params` in pages/layouts: ___
- Count `searchParams` usages: ___
- Estimated migration time: ___ hours
```

### Phase 3: Architecture Enhancements (2-4 weeks)
- Redis caching layer for tier checks
- Read replicas for snapshot queries
- Query optimization (materialized views)
- DBSCAN clustering for Pro tier (system-aware snapshots)

### Phase 4: Next.js 16 Migration (If/When Ready)
**Defer until Q1 2025 - wait for ecosystem stability:**
- Framework is stable
- Better Auth updated to 1.5+
- Fumadocs supports v16
- All deps compatible

---

## Risk Mitigation

### High-Risk Items
1. **40-second activation** - Profiling may reveal unexpected bottlenecks
2. **AutoDecisionEngine** - Detection logic exists, wiring may have edge cases
3. **Telemetry events** - PostHog integration may have reliability issues

### Mitigation Strategies
1. **Activation**: Budget 8-12 hours, not 4-6 hours (Day 1 + part of Day 2)
2. **AutoDecisionEngine**: Start with simple threshold-based logic, iterate
3. **Telemetry**: Test events locally first, validate in PostHog before relying on data

---

## Next Steps for LLM Agents

**START HERE**:
1. Read this sprint plan thoroughly
2. Begin Day 1: Profile extension activation
3. Identify bottlenecks in Phase 2 (Storage) and Phase 3 (Managers)
4. Implement deferred initialization for non-critical services
5. Validate activation time <3s before moving to Day 2

**DO NOT**:
- Skip Day 1 (activation fix is THE critical blocker)
- Work on Phase 0 file naming (doesn't reduce migration friction)
- Expand test scope beyond demo-critical paths (defer to post-demo)
- Migrate to AuthJS (stay with Better Auth per ADR-001/002)
- Migrate to Next.js 16 during sprint (defer to Q1 2025)

---

## References

- [Tier Matrix](../gold_plating/snapback_tier_and_ip_protection.md)
- [High ROI Integrations](../gold_plating/high_roi_integrations.md)
- [High ROI Integrations Pt 2](../gold_plating/high_roi_integrations_pt2.md)
- [Auto-Detect Implementation](../gold_plating/auto_detect_implementation.md)
- [Activation Funnel](../gold_plating/activation_funnel.md)
- Better Auth ADR (stay with Better Auth - 1,139+ imports, 11+ plugins)
- Next.js 16 Deferral (wait for ecosystem stability)
