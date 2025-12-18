# Minimum Viable Docs (MVD) - Launch Plan

**Created**: 2025-12-18
**Target**: Launch-ready documentation in 20 hours
**Scope**: 8 pages (down from 45)
**Philosophy**: Document what EXISTS and WORKS

---

## Success Criteria

✅ **User can understand the product** (What is SnapBack?)
✅ **User can install and activate** (Quick Start)
✅ **User can perform first restore** (Your First Restore)
✅ **User can integrate with primary AI tools** (Cursor, Copilot)
✅ **User understands core value** (Recovering from AI Mistakes)
✅ **User can engage with gamification** (Pioneer Overview)

**Metric**: <10% support tickets for documented features

---

## MVD Page List (8 Pages, ~20 Hours)

### 1. What is SnapBack? (NEW - M = 3 hours)

**File**: `apps/docs/content/docs/what-is-snapback.mdx`

**Content**:
- 1-minute explainer video or animated GIF
- Problem: AI code changes can break projects
- Solution: Automatic snapshots + granular recovery
- Key differentiator: AI-aware protection vs git
- Quick visual: Before/after screenshot of recovery
- Call-to-action: Link to Quick Start

**Acceptance**:
- [ ] New user understands value in <2 minutes
- [ ] Clear differentiation from git
- [ ] Visual showing product in action

---

### 2. VS Code Extension (NEW - M = 4 hours)

**File**: `apps/docs/content/docs/products/vscode-extension.mdx`

**Content**:
- Hero section: Screenshots of extension in action
- Installation: Marketplace link + one-click install
- Key features:
  - Auto-checkpoint on file save
  - TreeView navigation (screenshot)
  - Protection level indicators
  - Quick restore UI
- Configuration basics: Settings panel
- Keyboard shortcuts table
- Troubleshooting: Common issues

**Acceptance**:
- [ ] User can install from docs alone
- [ ] All screenshots show current UI (not outdated)
- [ ] Keyboard shortcuts match actual implementation

---

### 3. Quick Start (POLISH EXISTING - S = 2 hours)

**File**: `apps/docs/content/docs/quick-start.mdx` (exists, needs polish)

**Updates**:
- Verify all installation steps work (test on clean machine)
- Update screenshots if UI changed
- Add "Expected: You should see..." validation steps
- Link to What is SnapBack for context
- Link to VS Code Extension for details

**Acceptance**:
- [ ] New user can complete in <5 minutes
- [ ] No broken links or outdated screenshots
- [ ] Validation steps prevent "stuck" users

---

### 4. Your First Restore (POLISH EXISTING - S = 2 hours)

**File**: `apps/docs/content/docs/first-restore.mdx` (exists, needs polish)

**Updates**:
- Flatten from `getting-started/` to root level
- Add GIF of restore flow (record actual UI)
- Clarify: "This is a restore, not git reset"
- Add troubleshooting: "What if restore doesn't show?"
- Link to Recovering from AI Mistakes for advanced patterns

**Acceptance**:
- [ ] User successfully restores first file
- [ ] Understands difference from git
- [ ] GIF matches current UI

---

### 5. Cursor Guide (NEW - M = 3 hours)

**File**: `apps/docs/content/docs/guides/cursor.mdx`

**Content**:
- Why SnapBack + Cursor: Cursor makes fast changes, SnapBack makes safe ones
- Setup: Ensure VS Code extension installed
- Workflow:
  1. Ask Cursor to make changes
  2. SnapBack auto-checkpoints
  3. Review changes in diff
  4. Restore if needed
- Common scenarios:
  - "Cursor refactored entire file, broke tests"
  - "Cursor changed wrong files"
  - "Multiple Cursor iterations, want to revert to checkpoint 3"
- Best practices: Trust but verify
- Screenshot: Cursor editor + SnapBack TreeView side-by-side

**Acceptance**:
- [ ] Cursor user understands integration
- [ ] Workflow is clear and actionable
- [ ] Screenshots show both tools together

---

### 6. Copilot Guide (EXPAND EXISTING - M = 3 hours)

**File**: `apps/docs/content/docs/guides/copilot.mdx` (exists at `integrations/copilot.mdx`, needs expansion)

**Updates**:
- Move from `integrations/` to `guides/`
- Expand from 6/10 to 8/10 quality
- Add workflow similar to Cursor guide
- Common scenarios:
  - "Copilot suggested broken code"
  - "Accepted completion, broke tests"
  - "Want to revert Copilot suggestions"
- Integration: How SnapBack intercepts Copilot changes
- Screenshot: Copilot suggestion + SnapBack checkpoint triggered

**Acceptance**:
- [ ] Copilot user understands integration
- [ ] Expanded from basic to comprehensive
- [ ] Moved to correct location

---

### 7. Recovering from AI Mistakes (NEW - M = 3 hours)

**File**: `apps/docs/content/docs/guides/recovering-mistakes.mdx`

**Content**:
- Core value proposition page
- Real scenarios (anonymized):
  - "AI refactored authentication, broke login"
  - "AI updated dependencies, app won't build"
  - "AI deleted critical config file"
- Step-by-step recovery:
  1. Identify broken state
  2. Find snapshot before break
  3. Preview diff
  4. Selective or full restore
- Advanced: Session time-travel (link to existing sessions.mdx)
- Video: 2-minute screencast of recovery flow

**Acceptance**:
- [ ] User sees themselves in scenarios
- [ ] Recovery process is clear
- [ ] Video demonstrates real recovery

---

### 8. Pioneer Overview (NEW - M = 3 hours)

**File**: `apps/docs/content/docs/pioneer/overview.mdx`

**Content**:
- What is Pioneer Program: Gamification for early adopters
- How it works:
  - Points for usage (restores, protections, referrals)
  - Tier progression: Seedling → Sprout → Sapling → Tree → Guardian
  - Tier benefits table (from contracts)
- Current tier: Link to console.snapback.dev/pioneer
- Leaderboard: Link to console.snapback.dev/pioneer/leaderboard
- FAQ: "Can I skip tiers?", "What happens at Guardian?"
- Screenshot: Pioneer dashboard with tier badges

**Acceptance**:
- [ ] User understands gamification
- [ ] Tier benefits are clear
- [ ] Links to live Pioneer pages work

---

## Navigation Structure Update

**New `meta.json`** (simplified):

```json
{
  "title": "SnapBack Docs",
  "pages": [
    "what-is-snapback",
    "quick-start",
    "first-restore",
    "---Products---",
    "products/vscode-extension",
    "---Guides---",
    "guides/cursor",
    "guides/copilot",
    "guides/recovering-mistakes",
    "---Pioneer Program---",
    "pioneer/overview",
    "---Existing Pages---",
    "protection-levels",
    "sessions",
    "ai-detection",
    "capabilities/mcp-local",
    "capabilities/mcp-backend",
    "cli",
    "privacy",
    "faq",
    "troubleshooting"
  ]
}
```

---

## Effort Breakdown

| Page | Type | Effort | Priority |
|------|------|--------|----------|
| What is SnapBack | Create | 3h | P0 |
| VS Code Extension | Create | 4h | P0 |
| Quick Start | Polish | 2h | P1 |
| Your First Restore | Polish | 2h | P1 |
| Cursor Guide | Create | 3h | P0 |
| Copilot Guide | Expand | 3h | P0 |
| Recovering from AI Mistakes | Create | 3h | P0 |
| Pioneer Overview | Create | 3h | P1 |
| **TOTAL** | - | **23h** | - |

**Buffer**: 3 hours for screenshots, testing, polish
**Total with buffer**: **26 hours** (~3-4 days for one person)

---

## Implementation Order

**Day 1 (Onboarding - 7h):**
1. What is SnapBack (3h)
2. VS Code Extension (4h)

**Day 2 (Getting Started - 7h):**
3. Quick Start polish (2h)
4. Your First Restore polish (2h)
5. Cursor Guide (3h)

**Day 3 (Core Value - 9h):**
6. Copilot Guide expand (3h)
7. Recovering from AI Mistakes (3h)
8. Pioneer Overview (3h)

**Day 4 (Polish + QA - 3h):**
- Record GIFs and videos
- Test all links
- Update navigation
- Screenshot audit

---

## Quality Gates

Before considering MVD "done", validate:

### Content Accuracy
- [ ] All installation steps tested on clean machine
- [ ] All screenshots match current UI (not outdated)
- [ ] All keyboard shortcuts verified in extension
- [ ] All links resolve (no 404s)

### User Testing
- [ ] 3 new users can complete Quick Start without help
- [ ] First restore flow works end-to-end
- [ ] Cursor/Copilot guides tested by actual users of those tools

### Technical Validation
- [ ] CLI commands documented match implementation
- [ ] Feature flags referenced are enabled (not disabled)
- [ ] Pioneer tier benefits match actual contracts

---

## Post-MVD: What Comes Next

**Week 2-3 (After Launch):**
- Monitor support tickets for documentation gaps
- Track which pages get most traffic (analytics)
- Survey users: "What docs do you wish existed?"

**Month 2 (Usage-Driven Expansion):**
- Add pages based on actual user requests (not assumptions)
- Expand guides where users get stuck most
- Only add interactive demos if users request them

**Q2 2025 (Review Deferred Scope):**
- Use `DEFERRED_SCOPE.md` as backlog
- Prioritize by: user requests > usage data > assumptions
- Validate features exist before documenting

---

## Success Metrics

**Activation:**
- Time to first restore: <10 minutes (from docs)
- Support tickets for "how to restore": <5% of users

**Engagement:**
- Docs page views: >70% of activated users
- Pioneer signup rate: >40% (from overview page)

**Quality:**
- User feedback rating: >4.0/5 (docs feedback widget)
- "Docs outdated" complaints: <2% of tickets

---

## Maintenance Schedule

**Weekly:**
- Check for broken links (automated)
- Update screenshots if UI changed

**Monthly:**
- Review analytics for most-visited pages
- Expand based on user questions
- Archive pages with <1% traffic

**Quarterly:**
- Full docs audit against product reality
- Review DEFERRED_SCOPE for un-deferral
- User survey on documentation quality

---

**Reference:**
- Deferred items: `DEFERRED_SCOPE.md`
- Original analysis: `gap_analysis.md`
- Product gaps: `.qoder/quests/task-audit.md`
