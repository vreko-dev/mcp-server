# Early-Stage SEO Foundation: 90-Minute Quick Wins
**SnapBack Open-Core - Pre-Launch SEO Essentials**

**Created:** 2025-12-05
**Time Investment:** ~90 minutes one-time setup
**Return:** Foundation for organic discovery + tracking infrastructure
**Stage:** Pre-launch to 100 users

---

## 🎯 Reality Check

You don't need elaborate cross-platform SEO integration yet. You need:

1. **Basic discoverability** - When developers search for you, they find you
2. **Tracking infrastructure** - Learn where traffic comes from
3. **Professional presentation** - Don't look abandoned
4. **Set-and-forget optimizations** - No ongoing maintenance

**Not needed until 100+ users:**
- Dedicated npm package landing pages
- /open-source marketing page
- Social proof metrics sections
- Weekly dashboard tracking
- A/B testing README structures

---

## ✅ 90-Minute Foundation Checklist

### Task 1: Expand package.json Keywords (30 minutes)

**Current reality:** 7-8 keywords per package
**Target:** 15-20 keywords (npm allows up to 25)
**Why:** Free SEO, set once, forget forever

**For each OSS package, add:**

```json
{
  "keywords": [
    // Current
    "code-safety", "snapshot", "backup", "restore",
    "file-protection", "typescript", "sdk", "developer-tools",

    // Add these
    "ai-safety", "copilot-protection", "cursor-safety",
    "code-backup", "version-control", "git-alternative",
    "developer-productivity", "code-recovery", "cicd",
    "rollback", "typescript-tools", "nodejs-tools"
  ]
}
```

**Packages to update:**
- [ ] @snapback-oss/sdk
- [ ] @snapback-oss/contracts
- [ ] @snapback-oss/infrastructure
- [ ] @snapback-oss/events
- [ ] @snapback-oss/config

**Expected impact:** 20-30% better npm search discoverability

---

### Task 2: Add UTM Tracking to Links (30 minutes)

**Why:** Learn which platforms drive traffic/conversions

**Pattern:**
```
?utm_source=[platform]&utm_medium=[location]&utm_campaign=[package]
```

**Update in all OSS package READMEs:**

```markdown
<!-- Before -->
[Documentation](https://docs.snapback.dev)

<!-- After -->
[Documentation](https://docs.snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=sdk)
```

**Links to update per package:**
- Main docs link
- API reference link
- VS Code extension link
- Main website link

**Expected impact:** Quantify npm → docs → extension conversion funnel

---

### Task 3: Fix Repository Metadata (15 minutes)

#### 3a. package.json repository.directory

**Current:** Points to monorepo root
**Fix:** Point to specific package subdirectory

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/Marcelle-Labs/snapback.dev.git",
    "directory": "packages-oss/sdk"  // ← Add this
  }
}
```

#### 3b. Add funding field (optional)

```json
{
  "funding": {
    "type": "individual",
    "url": "https://snapback.dev/sponsor"
  }
}
```

**Expected impact:** GitHub "View on npm" links go to correct package subdirectory

---

### Task 4: GitHub Repository Optimization (10 minutes)

#### Update About Section

**Location:** GitHub repo settings → About

**Current:** Basic description
**New:**
- **Description:** "AI-aware code protection with open-source TypeScript SDK - snapshots, file protection, and risk analysis for developers"
- **Website:** https://snapback.dev
- **Topics:**
  - `typescript-sdk`
  - `code-safety`
  - `developer-tools`
  - `vscode-extension`
  - `snapshot-manager`
  - `ai-safety`
  - `file-protection`
  - `backup-tool`
  - `typescript`
  - `open-source`
  - `apache-license`

**Expected impact:** Better GitHub search and topic page discoverability

---

### Task 5: VS Code Extension Keywords (5 minutes)

**File:** `apps/vscode/package.json`

**Expand keywords to maximum (25):**

```json
{
  "keywords": [
    "snapshot", "backup", "code-safety", "ai-protection",
    "copilot", "cursor", "windsurf", "recovery", "rollback",
    "file-protection", "git", "version-control", "developer-tools",
    "typescript", "javascript", "productivity", "security",
    "code-quality", "automation", "testing", "ci-cd",
    "open-source", "sdk", "local-first"
  ]
}
```

**Expected impact:** Better VS Code Marketplace search discoverability

---

## 📊 Tracking Setup (Passive Monitoring)

### Simple Weekly Check-In (5 minutes)

**Tools to bookmark:**
- [npm package stats](https://npm-stat.com/@snapback-oss/sdk)
- [npmcharts comparison](https://npmcharts.com/compare/@snapback-oss/sdk)
- [GitHub traffic insights](https://github.com/Marcelle-Labs/snapback.dev/graphs/traffic)
- [VS Code Marketplace metrics](https://marketplace.visualstudio.com/manage/publishers/MarcelleLabs)

**What to track (manually, once a week):**
```markdown
## Week [X] (2025-XX-XX)

**Downloads:**
- npm (all packages): [X]
- VS Code: [X]

**Stars/Ratings:**
- GitHub: [X] stars
- Marketplace: [X] rating

**Traffic sources** (from GitHub traffic page):
- Top referrer 1: [source] → [X] visitors
- Top referrer 2: [source] → [X] visitors

**Notes:**
- [Anything interesting this week?]
```

**Don't build dashboards. Don't automate. Just check numbers once a week.**

---

## ⏸️ Shelf Until 100+ Users

These are good ideas but premature for your current stage:

### Documentation Enhancements
- ❌ Dedicated npm package pages at docs.snapback.dev/packages/*
- ❌ Live metrics widgets
- ❌ Installation variant guides
- ✅ Keep current docs as-is

### Marketing Site
- ❌ /open-source landing page
- ❌ "Open Source" in main navigation
- ❌ Blog content calendar
- ✅ Simple mention of OSS in existing pages is fine

### README Enhancements
- ❌ Social proof section with metrics (shows weakness at small numbers)
- ❌ Multi-platform ecosystem table
- ✅ Keep current README structure - it's already good

### Analytics
- ❌ Weekly metrics dashboard
- ❌ Cross-platform conversion funnels
- ❌ A/B testing README formats
- ✅ Manual weekly check-in (5 min) is enough

**When to revisit:**
- 500+ weekly npm downloads
- 100+ GitHub stars
- 50+ VS Code extension users

---

## 🚀 What Actually Drives Early Growth

SEO captures demand. **You need to create demand first.** Here's what matters at your stage:

### 1. The "$12K Incident" Post (Your Best Asset)

**Format:** Long-form technical post-mortem
**Length:** 2,000-3,000 words
**Platforms:** Your blog (primary) + Dev.to + Hashnode

**Structure:**
```markdown
# We Lost $12,000 in 4 Hours Because of AI Code Suggestions

## The Incident
[Detailed timeline of what happened]

## The Technical Details
[Exact changes AI made, why they broke production]

## Why This Matters to You
[This isn't unique to us - it's systemic]

## What We Built (SnapBack)
[Natural transition to solution, not promotional]

## Lessons for AI-Assisted Development
[Practical takeaways readers can use immediately]
```

**Why this works:**
- Emotionally resonant (other devs have felt this pain)
- Technically credible (you understand the problem deeply)
- Shareable (people will send to teammates)
- Searchable (people Google "AI code disaster" "Copilot broke production")
- Natural SnapBack mention (origin story, not ad)

**Distribution:**
- Submit to Hacker News (tech depth + personal story usually works)
- Share in r/programming, r/typescript
- Post in Cursor Discord, Copilot discussions
- Email to anyone who's shown interest

**Expected impact:** This single post could drive more users than 6 months of SEO optimization

---

### 2. AI Disaster Stories (Curated Collection)

**Format:** GitHub repo or docs page
**Content:** Other developers' AI coding horror stories (with permission)

**Examples:**
- "Copilot suggested `rm -rf /` in production deploy script"
- "Cursor autocompleted AWS credentials in React component"
- "AI refactored authentication logic and removed all validation"

**Why this works:**
- You become the hub for this conversation
- Every story is shareable content
- Demonstrates problem is widespread
- Natural platform for SnapBack as solution

**How to collect:**
- Monitor Twitter/X for AI coding complaints
- Ask in forums: "What's your worst AI coding incident?"
- Create submission form
- Give attribution to submitters

---

### 3. Technical Deep-Dives (Educational, Not Promotional)

**Topics that establish expertise:**
- "How AI Coding Assistants Modify Your Codebase (Under the Hood)"
- "Analyzing 1,000 Copilot Suggestions: What Goes Wrong and Why"
- "The Hidden Risks of AI Code Generation (With Evidence)"

**Why this works:**
- Positions you as expert, not vendor
- Provides genuine value
- Natural search results for AI coding questions
- Builds trust before asking for install

---

### 4. Community Presence (Be Helpful, Not Promotional)

**Where to be:**
- r/cursor - Answer questions about Cursor issues
- r/programming - Discuss AI coding tools
- Cursor Discord - Help people with problems
- VS Code GitHub - Respond to AI-related issues

**How to engage:**
- Answer questions genuinely
- Share relevant expertise
- Only mention SnapBack when directly relevant
- Build reputation as helpful expert

**Example (good):**
```
User: "Cursor just rewrote my entire auth system wrong, how do I revert?"
You: "Ugh, been there. Here's how to revert [detailed steps].

For future: I built SnapBack (shameless plug) specifically because
of this problem, but you can also use git stash + good commit hygiene."
```

**Example (bad):**
```
User: "Cursor just rewrote my entire auth system wrong, how do I revert?"
You: "You should use SnapBack! [link]"
```

---

## 📈 Realistic Growth Targets

| Metric | 30 Days | 60 Days | 90 Days | Notes |
|--------|---------|---------|---------|-------|
| **npm downloads/week** | 50-100 | 100-300 | 300-500 | Requires 1-2 viral content moments |
| **GitHub stars** | 20-50 | 50-100 | 100-200 | Organic + content-driven |
| **VS Code installs** | 20-50 | 50-100 | 100-200 | Lags npm by ~2 weeks |
| **Docs visitors/month** | 200-500 | 500-1,500 | 1,500-3,000 | Content + npm growth |

**How to hit these:**
- 1 viral HN/Dev.to post → 50-200 stars, 200-500 npm downloads
- Sustained community presence → 10-20 stars/week, 50-100 downloads/week
- Word of mouth from happy users → 2-3x multiplier over time

**Not by:** SEO optimization, cross-platform funnels, or README A/B testing

---

## ⚡ Execution Plan

### This Week (90 minutes)
- [ ] Update package.json keywords (30 min)
- [ ] Add UTM tracking to links (30 min)
- [ ] Fix repository metadata (15 min)
- [ ] Update GitHub About + topics (10 min)
- [ ] Expand VS Code keywords (5 min)

### Next 2-4 Weeks (Content Creation)
- [ ] Write "$12K Incident" post (4-6 hours)
- [ ] Submit to HN, Dev.to, Hashnode
- [ ] Share in relevant communities
- [ ] Start "AI Disaster Stories" collection

### Ongoing (Community Presence)
- [ ] Answer 2-3 questions per week in r/cursor, r/programming
- [ ] Share helpful content (not promotional)
- [ ] Build reputation as AI coding safety expert

### Shelved Until 100+ Users
- All the elaborate SEO cross-platform integration stuff
- Dedicated landing pages
- Metrics dashboards
- Social proof sections

---

## 🎯 Success Looks Like

**By Month 3:**
- ✅ 100-200 weekly npm downloads
- ✅ 100+ GitHub stars
- ✅ 1-2 pieces of content that got real traction
- ✅ Active presence in developer communities
- ✅ 5-10 happy users who recommend you
- ✅ Understanding of which content/channels work

**Not:**
- ❌ 3,000 weekly npm downloads
- ❌ 10,000 docs visitors
- ❌ Elaborate multi-platform funnels
- ❌ Social proof everywhere

**The goal is momentum and learning, not scale.**

---

## 📞 Questions?

This is intentionally minimal. If you're tempted to do more:

**Ask yourself:**
1. Do I have traffic to optimize? (If <100 weekly npm downloads → No)
2. Is this capturing demand or creating it? (Focus on creating first)
3. Can I measure ROI with current numbers? (If no → wait)
4. Does this take time from product/content? (If yes → skip)

**When in doubt:** Ship content, not infrastructure.

---

**Last Updated:** 2025-12-05
**Next Review:** When you hit 500 weekly npm downloads

---

*Remember: The best SEO is a product people love and talk about. Focus on making that happen.*
