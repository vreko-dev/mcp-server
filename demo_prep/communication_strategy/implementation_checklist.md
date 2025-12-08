# SnapBack Implementation Checklist

**Priority Framework**: Demo-critical → Engagement → Community → Scale

---

## 🔴 WEEK 1: Demo Blockers (Must Complete)

### Technical Foundation
- [ ] **Bundle Size Fix** (4h)
  - Remove SQLite: `pnpm remove better-sqlite3 sql.js`
  - Implement file-based storage from guide
  - Validate bundle <2MB

- [ ] **TypeScript Compilation** (2h)
  - Fix 32+ errors blocking builds
  - Enable strict mode

- [ ] **Analytics Consolidation** (3h)
  - Remove unused providers (Google, Vercel, Plausible, Mixpanel, Umami, Pirsch)
  - Keep only PostHog + Sentry

### Activation Funnel Events
- [ ] **Add Missing Events** (3h)
  ```typescript
  // packages/analytics/src/engagement-events.ts
  EXTENSION_AUTHENTICATED: 'activation:extension_authenticated'
  FIRST_PROTECTED_SAVE: 'activation:first_protected_save'
  ```

- [ ] **PostHog Funnel Dashboard** (2h)
  - Create 5-step activation funnel
  - Set up TTFV measurement
  - Target: <5 minutes median

### Validation
- [ ] Clean build: `pnpm build` succeeds
- [ ] Bundle check: Extension <2MB
- [ ] Funnel tracking: All 5 events firing
- [ ] TTFV baseline: Measured and documented

---

## 🟡 WEEK 2: Recognition System

### Value Recognition
- [ ] **Disaster Averted Events** (4h)
  ```typescript
  // Track recoveries with shareable context
  DISASTER_AVERTED: 'value:disaster_averted'
  // Properties: lines_protected, severity, ai_tool, recovery_used
  ```

- [ ] **Milestone System** (4h)
  - 100/1000/10000 files protected
  - 1/10/50 recoveries
  - First-time triggers for each

### Dashboard Updates
- [ ] **Value Metrics Component** (4h)
  - Lines protected (primary)
  - Recoveries (proof of value)
  - AI edits detected (differentiator)
  - Time saved (relatable)

- [ ] **Remove Gamification** (2h)
  - No leaderboards
  - No arbitrary XP
  - No competitive elements

### Notifications
- [ ] **First Protected Save Toast** (1h)
  ```
  ✓ Snapshot created. You can always recover this version.
  [View in Dashboard]
  ```

- [ ] **First AI Detection** (1h)
  ```
  🤖 Detected Cursor edit. Auto-snapshot created before changes.
  ```

- [ ] **First Recovery Celebration** (2h)
  ```
  🎉 Recovered 847 lines. SnapBack saved the day!
  [Share Your Save]
  ```

---

## 🟢 WEEK 3: Shareable Moments

### Story Generation
- [ ] **Share Dialog** (6h)
  - Pre-filled templates with developer voice
  - Twitter/LinkedIn/Copy options
  - Character count for Twitter
  - Optional (never forced)

- [ ] **Story Templates** (2h)
  ```
  Large recovery (500+ lines):
  "{AI tool} just went rogue on {lines} lines of code.
  Good thing @SnapBackDev had my back. 😅"

  Medium recovery (100+ lines):
  "Just recovered {lines} lines with @SnapBackDev.
  If you're using AI coding tools, you need this."
  ```

### OG Image Generation
- [ ] **Recovery Share Images** (4h)
  - `/api/og/recovery` endpoint
  - Shows lines recovered, AI tool
  - SnapBack branding

### Tracking
- [ ] **Share Events** (1h)
  ```typescript
  SAVE_STORY_SHARED: 'community:save_story_shared'
  // Properties: share_platform, lines_in_story
  ```

---

## 🔵 WEEK 4: Community Foundation

### Discord Setup
- [ ] **Phase 1 Server** (4h)
  - 7 channels max:
    - #welcome, #announcements
    - #general, #introductions, #showcase
    - #help, #feature-requests
  - Carl-bot for voting/roles
  - GitHub webhook for releases

- [ ] **Welcome Flow** (2h)
  - Auto-message with quick start
  - Reaction roles for interests
  - Link to docs and extension

### GitHub Community
- [ ] **Issue Templates** (2h)
  - Bug report (YAML form)
  - Feature request
  - Good first issue criteria

- [ ] **Auto-labeling** (2h)
  - GitHub Actions by keywords
  - Priority labels
  - Stale bot configuration

- [ ] **All-Contributors Bot** (1h)
  - Recognize code, docs, bugs, ideas
  - Auto-update README

### Response SLAs
- [ ] **Document Expectations** (1h)
  - Critical: 24h
  - Bug: 48h
  - Feature: 1 week

---

## 📊 WEEK 5: Analytics & Cohorts

### PostHog Configuration
- [ ] **Dashboards** (4h)
  - Activation Funnel
  - Value Delivered
  - Community Health
  - AI Detection Performance

- [ ] **Cohorts** (2h)
  - Activated Users
  - Power Users
  - At-Risk (7-30 days inactive)
  - Story Sharers

### Privacy Compliance
- [ ] **Telemetry Tiers** (3h)
  - Tier 1: Always (anonymous aggregates)
  - Tier 2: Default on (pseudonymized)
  - Tier 3: Opt-in (feedback)
  - Tier 4: Never (code content, PII)

- [ ] **Consent UI** (2h)
  - Neutral language
  - Easy opt-out
  - Clear privacy policy link

---

## 🚀 WEEK 6: Contribution System

### Scoring
- [ ] **Contribution Weights** (4h)
  - High: PRs, blog posts, talks (40-100 pts)
  - Medium: Bug reports, answers (10-40 pts)
  - Low: Stars, shares (1-15 pts)

- [ ] **Anti-Gaming** (2h)
  - Daily caps
  - Diminishing returns
  - Quality multipliers
  - Private algorithm

### Tiers
- [ ] **Functional Privileges** (4h)
  - Contributor (100+): Badge, beta access
  - Expert (500+): Early features, swag
  - Champion (2000+): Roadmap access
  - Ambassador (5000+): Revenue share

### Dashboard
- [ ] **Contribution Display** (4h)
  - Show impact, not points
  - "Your contributions have helped X users"
  - No progress bars to arbitrary thresholds

---

## 📅 WEEK 7-8: Automation & Scale

### Automation Stack
- [ ] **GitHub Actions** (2h)
  - Auto-label by keywords
  - Stale issue handling
  - Release notifications

- [ ] **Discord Bots** (2h)
  - Carl-bot suggestions
  - ModMail for support
  - Role auto-assignment

- [ ] **Cross-Platform** (2h)
  - Zapier: Release → Discord
  - Newsletter template
  - Social queue

### Community Management Schedule
- [ ] **5hr/week Budget** (1h)
  - Monday: Issue triage (45min)
  - Tuesday: Discord check (30min)
  - Wednesday: Office hours (60min)
  - Thursday: Champion engagement (30min)
  - Friday: Issue triage (45min)
  - Saturday: Content batching (60min)
  - Sunday: Quick scan (30min)

### Champion Program
- [ ] **Identify Champions** (2h)
  - Top 3-5 contributors
  - Proactive, helpful
  - Good communicators

- [ ] **Champion Benefits** (2h)
  - Private channel
  - Direct access to team
  - Input on roadmap

---

## ✅ Success Criteria

### Demo Ready (Week 1)
- [ ] Extension installs cleanly (<2MB)
- [ ] Build succeeds (0 TS errors)
- [ ] Funnel tracks (5 events)
- [ ] TTFV measured (<5 min target)

### Engagement Ready (Week 4)
- [ ] Recognition system live
- [ ] Share dialog functional
- [ ] Discord active
- [ ] GitHub templates set

### Community Ready (Week 8)
- [ ] Contribution scoring live
- [ ] Champion program active
- [ ] Automation running
- [ ] 5hr/week sustainable

---

## 🎯 North Star Metrics

| Metric | Week 2 | Week 4 | Week 8 |
|--------|--------|--------|--------|
| TTFV | Baseline | <7 min | <5 min |
| Activation Rate | Baseline | >40% | >60% |
| D7 Retention | Baseline | >30% | >40% |
| Share Rate | - | >2% | >5% |
| Discord DAU | - | >10% | >20% |

---

## Anti-Patterns Checklist

### ❌ Never Build
- [ ] Streak anxiety ("Your streak is at risk!")
- [ ] Competitive leaderboards
- [ ] Arbitrary XP notifications
- [ ] Forced sharing for features
- [ ] Fake scarcity
- [ ] Guilt-trip consent language

### ✅ Always Include
- [ ] Value-focused notifications
- [ ] Personal stats (not comparative)
- [ ] Optional streaks (default off)
- [ ] Genuine milestone celebrations
- [ ] Clear consent with neutral language
- [ ] Feature access based on tier, not engagement
