# SnapBack Phase 2: Dashboard & Growth (TDD-Driven)
## Consolidated Action Plan with Docker, SDK, and Package Boundaries

**Status:** Post-Phase 1 (Auth, Telemetry, Welcome panel complete)
**Timeline:** 3-4 weeks
**Architecture:** Subdomain-based (console.snapback.dev), API-first, TDD red-green-refactor

---

## 🎯 PHASE 2 OBJECTIVES

### Primary Goals (ROI-Ordered)
1. **Dashboard home** (console.snapback.dev/dashboard) - User retention engine
2. **Referrals system** (console.snapback.dev/referrals) - Viral growth loop
3. **Core SEO blog content** (3-5 posts) - Organic traffic pipeline
4. **Basic docs** (Getting started, key how-tos) - Activation funnel

### Success Metrics
- Dashboard: 90%+ active user adoption within 7 days
- Referrals: 20%+ of active users generate link within 30 days
- Content: "ai destroyed my code" post ranks top 5 for primary keywords
- Docs: Reduce support questions by 30% (measurable via Discord/email)

---

## 📋 SPRINT BREAKDOWN

### **WEEK 1: Dashboard Home (TDD + API Integration)**

#### Sprint Goal
Create `/dashboard` page with real metrics from API/SDK via proper package boundaries.

#### Tasks (TDD: RED → GREEN → REFACTOR)

**1.1 API Contract Definition (RED)**
```
Task: Define dashboard metrics API schema
- File: packages/contracts/src/dashboard/metrics.ts
- What: Type definitions for dashboard data
  - protection_status: 'active' | 'inactive'
  - total_checkpoints: number
  - total_recoveries: number
  - files_protected: number
  - ai_detection_rate: number (0-100)
  - recent_activity: Array<{timestamp, action, file}>
  - ai_breakdown: {copilot: number, cursor: number, claude: number}
```

**1.2 API Endpoint (RED → GREEN)**
```
Task: Create API procedure for dashboard metrics
- Location: apps/api/modules/dashboard/procedures/get-metrics.ts
- Architecture: API-first, returns metrics from platform DB via better-auth context
- Auth: Requires authenticated session
- Database: Queries from snapshots, checkpoints, ai_activities tables
- Package boundary: Uses @snapback/platform via proper exports
```

**1.3 SDK Client (RED → GREEN)**
```
Task: Create SDK wrapper for dashboard metrics
- Location: packages/sdk/src/dashboard/metrics-client.ts
- Purpose: Thin wrapper around API endpoint (enforces package boundary)
- Export from: packages/sdk/src/index.ts
- Web app imports: Uses this, NOT direct API calls
```

**1.4 Dashboard Component (RED → GREEN → REFACTOR)**
```
Task: Build dashboard home component
- Location: apps/web/app/(saas)/dashboard/page.tsx
- Components needed:
  - ProtectionStatusCard (green/red indicator)
  - MetricsGrid (4 cards: checkpoints, recoveries, files, detection rate)
  - AIActivityBreakdown (pie/bar chart)
  - RecentActivityFeed (last 10 events, scrollable)
  - QuickActions (buttons to docs, discord, settings)

Test first (RED):
- Dashboard page renders without error
- Loads metrics via SDK client (mock initially)
- Displays protection status correctly
- Shows recent activity in chronological order

Implementation (GREEN):
- Wire SDK client to actual API
- Add Skeleton loading states
- Handle error states gracefully

Refactor:
- Extract metric cards to components/dashboard/MetricCard.tsx
- Extract feed to components/dashboard/ActivityFeed.tsx
- Optimize re-renders (useMemo for heavy calculations)
```

**1.5 Middleware Update (if needed)**
```
Task: Verify middleware allows /dashboard access
- File: apps/web/middleware.ts
- Check: Path is protected (requires auth)
- Verify: Subdomain routing works (console.snapback.dev)
```

#### Docker Considerations
- Migrations MUST run before API startup (already handled in docker-entrypoint.sh)
- NEXT_PUBLIC_SITE_URL set to console.snapback.dev in .env.docker
- API_URL points to http://api:3001 (internal)
- Database tables exist: snapshots, checkpoints, ai_activities

#### Deliverables
- ✅ Dashboard home page (functional, not styled yet)
- ✅ API endpoint + SDK client
- ✅ Tests passing for all components (RED → GREEN)
- ✅ No TypeScript errors
- ✅ Package boundaries respected

---

### **WEEK 2: Referrals System (Growth Engine)**

#### Sprint Goal
Build referral tracking, link generation, and reward display. Integrate with database.

#### Tasks (TDD Pattern)

**2.1 Referral Data Models (RED)**
```
Task: Define referral schema
- File: packages/contracts/src/referrals/types.ts
- Models:
  - referral_link: {user_id, link_code, created_at, click_count}
  - referral_signup: {referrer_id, referee_id, status, created_at}
  - referral_reward: {user_id, reward_type, earned_at, claimed_at}
```

**2.2 Database Schema Migration**
```
Task: Add referral tables to platform DB
- Location: packages/platform/src/schema.ts (Drizzle schema)
- Tables: referralLinks, referralSignups, referralRewards
- Relationships: FK to user table
- Indexes: On user_id, link_code for quick lookups
```

**2.3 API Procedures (RED → GREEN)**
```
Task: Create API endpoints for referrals
- apps/api/modules/referrals/procedures/:
  - generate-link.ts: Create unique link for user
  - get-stats.ts: Fetch referral stats (signups, rewards, clicks)
  - track-click.ts: Log referral link click
  - claim-reward.ts: Mark reward as claimed

Each endpoint:
- Uses better-auth for user context
- Validates against @snapback/platform schema
- Returns proper error responses
```

**2.4 SDK Client (RED → GREEN)**
```
Task: Create referrals SDK client
- Location: packages/sdk/src/referrals/client.ts
- Methods:
  - generateLink(): Promise<{url: string}>
  - getStats(): Promise<{signups, clicks, rewards}>
  - claimReward(rewardType): Promise<{success: boolean}>
- Export from packages/sdk/src/index.ts
```

**2.5 Referrals Page Component (RED → GREEN → REFACTOR)**
```
Task: Build /referrals page
- Location: apps/web/app/(saas)/referrals/page.tsx
- Sections:
  - ReferralStats (cards: invites sent, signups, active users, rewards earned)
  - LinkGenerator (display URL, copy button)
  - ShareButtons (Twitter, LinkedIn, copy message)
  - RewardsProgress (progress bars for each tier)
  - Leaderboard (optional: top referrers)

Test first:
- Stats load correctly from SDK
- Link generation produces shareable URL
- Share buttons have correct pre-filled content
- Rewards display progress correctly

Implementation:
- Wire SDK client
- Add copy-to-clipboard handler
- Open Twitter/LinkedIn in new tabs

Refactor:
- Extract RewardsProgress to components/referrals/
- Extract ShareButtons to reusable component
```

#### Docker Considerations
- Database migrations run before startup (referral tables exist)
- API environment: DATABASE_URL configured
- SDK client available in web app (proper boundary)

#### Deliverables
- ✅ Referral API endpoints (tested)
- ✅ Referrals page (functional)
- ✅ Database schema with proper relationships
- ✅ All tests passing

---

### **WEEK 3: SEO Content & Blog Setup**

#### Sprint Goal
Publish foundational blog content to drive organic discovery. Each post targets specific keywords.

#### Blog Posts (from seo-revised-strategy.md)

**3.1 Pillar Post: "$12K Disaster Story"**
```
Target: "ai broke my code", "ai coding disaster"
Length: 2,000 words
Structure:
- Hook: Real story of $12K loss
- Lessons: What went wrong, 5 key takeaways
- Solutions: How to recover (5 methods)
- CTA: Try SnapBack, join Discord

SEO: H1 with primary keyword, H2 headers as questions
Schema: Use FAQ section with FAQPage schema
Implementation: blog/ai-destroyed-12k-code.mdx
```

**3.2 How-To: "Recover Code After AI Breaks It"**
```
Target: "recover from ai error", "undo ai changes"
Length: 1,800 words
Comparison table: Git reset vs Time Machine vs SnapBack
Step-by-step: How to use SnapBack for recovery
Schema: HowTo schema for AI indexing
Implementation: blog/recover-ai-code-error.mdx
```

**3.3 Safety Guide: "GitHub Copilot Safety"**
```
Target: "github copilot safety", "safe ai coding"
Length: 1,500 words
7 practical tips with examples
References SnapBack as safety layer
Implementation: blog/github-copilot-safety.mdx
```

**3.4 Comparison: "SnapBack vs Git"**
```
Target: "git alternative", "vs git snapback"
Length: 2,200 words
Use seo-comparison-table.tsx component
Position: Complement (both together), not compete
Implementation: blog/snapback-vs-git.mdx
```

**3.5 MCP Integration: "Safe AI Coding with Claude Desktop"**
```
Target: "mcp code protection", "claude desktop safety"
Length: 1,500 words
Tutorial: Setup Claude Desktop + SnapBack
Schema: How-to schema
Implementation: blog/mcp-claude-desktop.mdx
```

#### Implementation Pattern
- File location: `apps/web/app/(marketing)/blog/[slug]/page.tsx`
- Use MDX for content + components
- Include schema.org markup (use components/marketing/seo-faq-section.tsx)
- Internal links to /dashboard, /docs, /features
- CTA at end: "Get Protected Now"

#### SEO Checklist Per Post
- ✅ Title includes primary keyword
- ✅ Meta description with secondary keywords
- ✅ H1 with target keyword
- ✅ H2 headers as questions (AI-friendly)
- ✅ Internal links (3-5 to other posts/pages)
- ✅ Image alt text with keywords
- ✅ Schema markup (FAQ or HowTo)
- ✅ CTA with semantic clarity

#### Deliverables
- ✅ 5 blog posts published to production
- ✅ Schema markup rendering correctly
- ✅ All internal links working
- ✅ Mobile responsive
- ✅ Submitted to Google Search Console

---

### **WEEK 4: Docs & Polish**

#### Sprint Goal
Create essential documentation to enable self-serve activation. Reduce support burden.

#### Docs Structure (apps/docs via Nextra)

**4.1 Getting Started**
```
Pages:
- /getting-started/quickstart.mdx (5 min read)
  - Install extension
  - Enter invite code
  - First checkpoint explanation

- /getting-started/install-vscode.mdx (10 min)
  - Step by step: VS Code Marketplace
  - How to enable
  - Troubleshooting

- /getting-started/first-restore.mdx (5 min)
  - Create intentional "disaster"
  - Walk through restore process
  - Verify it worked
```

**4.2 How-To Guides**
```
- /how-to/protect-critical-files.mdx
  - Whitelist/blacklist patterns
  - Policy configuration

- /how-to/restore-session.mdx
  - Finding specific checkpoints
  - Preview before restore
  - Rollback entire session

- /how-to/mcp-integration.mdx
  - Claude Desktop setup
  - Verify protection active
  - Use with Cursor, Windsurf
```

**4.3 Concepts**
```
- /concepts/snapshots-checkpoints.mdx
  - Terminology clarification
  - Automatic vs manual

- /concepts/protection-levels.mdx
  - Watch vs Warn vs Block
  - When to use each

- /concepts/guardian-ai.mdx
  - Pattern detection
  - Severity scoring
```

**4.4 Reference**
```
- /reference/cli.mdx (if exposing CLI)
- /reference/configuration.mdx (.snapbackrc)
- /api-reference.mdx (if exposing API)
```

#### Implementation
- Each page: 500-900 words (short, scannable)
- H2 headers as questions (e.g., "How do I restore?")
- Code examples with syntax highlighting
- Images: Screenshots of actual UI
- "Next steps" link at bottom

#### Deliverables
- ✅ Core docs deployed
- ✅ Nextra search working
- ✅ All code examples tested
- ✅ Mobile responsive

---

## 🏗️ ARCHITECTURE ALIGNMENT

### Package Boundaries (Enforce)
```
✅ Web app uses:
  - @snapback/sdk (public SDK client)
  - @snapback/contracts (types)

❌ Web app NEVER imports:
  - @snapback/platform (database direct access)
  - apps/api internals

✅ API uses:
  - @snapback/platform (database access)
  - better-auth (auth context)

✅ SDK uses:
  - @snapback/contracts (types)
  - Web-safe only (no Node.js)
```

### Docker Integration
```
Services:
- postgres (database)
- api (3001 internal, handles OAuth, migrations)
- web (3000, dashboard subdomain routing)

Startup Order:
1. postgres starts
2. api runs migrations (db:push)
3. api starts serving
4. web connects to api

Environment:
- .env.docker: NEXT_PUBLIC_SITE_URL=console.snapback.dev
- .env.docker: DATABASE_URL=[postgres connection]
- docker-compose.dev.yml: health checks per service
```

### TDD Pattern (All Tasks)
```
For each feature:
1. RED: Write failing test
   - Component tests in __tests__/ folder
   - API tests in modules/[feature]/__tests__/

2. GREEN: Minimal implementation
   - Make test pass
   - Don't over-engineer

3. REFACTOR: Polish & optimize
   - Extract to components
   - Add error states
   - Performance optimization

4. VERIFY: All tests pass
   - No regressions
   - TypeScript clean
   - Package boundaries respected
```

---

## 📊 DEPENDENCIES & BLOCKERS

### Prerequisites (Must Complete Before Week 1)
- ✅ Phase 1 complete (Auth, Telemetry, Welcome)
- ✅ Docker setup working (make dev runs)
- ✅ Database migrations configured
- ✅ API responding on localhost:3001
- ⚠️ OAuth configured for console.snapback.dev

### Potential Blockers
| Issue | Solution | Owner |
|-------|----------|-------|
| API not returning metrics | Verify DB schema exists, migrations ran | API team |
| Package import errors | Check @snapback/platform exports | SDK team |
| Docker network issues | Verify .env.docker URLs match | DevOps |
| OAuth redirect issues | Verify NEXT_PUBLIC_SITE_URL matches config | Auth team |

---

## 📅 WEEKLY CADENCE

### Week 1 Review
- ✅ Dashboard home deployed to console.snapback.dev/dashboard
- ✅ API metrics endpoints tested
- ✅ No package boundary violations
- ✅ All tests GREEN

### Week 2 Review
- ✅ Referrals page live
- ✅ Database schema clean
- ✅ Link generation working
- ✅ Share buttons functional

### Week 3 Review
- ✅ 5 blog posts published
- ✅ Schema markup verified (manual test in ChatGPT/Perplexity)
- ✅ Internal links live
- ✅ Google Search Console shows 0 crawl errors

### Week 4 Review
- ✅ Docs deployed and searchable
- ✅ Mobile responsive
- ✅ Code examples tested
- ✅ Ready for production

---

## 🚀 SUCCESS CRITERIA (Definition of Done)

**Phase 2 Complete When:**
- ✅ Dashboard home accessible, shows real data from API
- ✅ Referrals system generates and tracks links
- ✅ 5 SEO-optimized blog posts published
- ✅ Core documentation deployed
- ✅ All tests passing (TDD pattern followed)
- ✅ Zero TypeScript errors
- ✅ Package boundaries enforced (no violations)
- ✅ Docker services healthy and migrations run
- ✅ 10+ new users completing first recovery from dashboard
- ✅ 5+ users sharing referral links

---

## 📚 REFERENCE DOCUMENTS

**Master Strategy Docs (in apps/web/final_launch_polish/):**
- `seo-revised-strategy.md` - Complete SEO/content playbook
- `snapback-sitemap-user-journeys.md` - Full IA and user flows
- `mcp-seo-strategy-year-2.md` - MCP niche positioning

**Components (Ready to Use):**
- `apps/web/components/marketing/seo-comparison-table.tsx`
- `apps/web/components/marketing/seo-faq-section.tsx`

**API Patterns:**
- `packages/contracts/src/telemetry/` - Event contracts
- `packages/sdk/src/` - SDK structure example

**Docker:**
- `docker-compose.dev.yml`
- `docker-entrypoint.sh` (migrations)
- `.env.docker`

---

## 💡 NOTES

- **TDD Discipline:** Each task follows RED → GREEN → REFACTOR. Don't skip RED (write tests first).
- **Package Boundaries:** Enforce @snapback/* imports. No direct platform access from web.
- **Docker-First:** Test everything with `make dev`, not `npm run dev`.
- **SEO Gold:** Blog posts are highest-ROI content. Prioritize quality over quantity.
- **Referrals:** Viral loop drives 20%+ growth. Build with care.
- **Docs:** Self-serve reduces support burden by 30%+.

---

**Start Week 1, Monday. Ship incrementally. Celebrate wins. 🚀**
