# SnapBack Visual Sitemap & User Journey Map
## Complete Information Architecture (November 2025)

---

## 🗺️ SITE MAP STRUCTURE

```
snapback.dev/
│
├── 🌐 PUBLIC SITE (Marketing)
│   │
│   ├── / (Homepage)
│   │   ├── Hero (Email capture)
│   │   ├── How It Works
│   │   ├── Comparison (Git vs SnapBack)
│   │   ├── FAQ
│   │   └── Final CTA
│   │
│   ├── /features
│   │   ├── Protection Levels (Watch/Warn/Block)
│   │   ├── Sessions & Time Travel
│   │   ├── Guardian AI
│   │   ├── Severity Detection
│   │   ├── MCP Integration
│   │   └── Performance
│   │
│   ├── /pricing
│   │   ├── Free (Open Source)
│   │   ├── Solo ($29/mo) ⭐ Most Popular
│   │   ├── Team ($79/seat/mo)
│   │   ├── FAQ
│   │   └── Feature Comparison Table
│   │
│   ├── /integrations
│   │   ├── MCP (Model Context Protocol)
│   │   │   ├── Claude Desktop
│   │   │   ├── Cursor
│   │   │   └── Setup Guide
│   │   ├── VS Code (primary)
│   │   ├── GitHub Copilot
│   │   ├── Windsurf
│   │   └── Coming Soon (JetBrains, Neovim)
│   │
│   ├── /about
│   │   ├── Origin Story ($12K disaster)
│   │   ├── Mission & Values
│   │   ├── Founder Bio
│   │   └── Product Vision
│   │
│   ├── /blog
│   │   ├── /ai-destroyed-12k-code (pillar post)
│   │   ├── /snapback-vs-git
│   │   ├── /github-copilot-safety
│   │   ├── /recover-ai-code-error
│   │   ├── /mcp-integration-guide
│   │   └── [...more posts]
│   │
│   ├── /docs (Nextra - public)
│   │   ├── /getting-started
│   │   │   ├── quickstart.mdx
│   │   │   ├── install-vscode.mdx
│   │   │   └── first-restore.mdx
│   │   ├── /how-to
│   │   │   ├── protect-critical-files.mdx
│   │   │   ├── configure-policy.mdx
│   │   │   ├── restore-session.mdx
│   │   │   └── connect-mcp.mdx
│   │   ├── /concepts
│   │   │   ├── sessions-and-snapshots.mdx
│   │   │   ├── protection-vs-severity.mdx
│   │   │   └── guardian-plugins.mdx
│   │   ├── /reference
│   │   │   ├── configuration.mdx
│   │   │   ├── cli.mdx
│   │   │   └── api.mdx
│   │   └── /troubleshooting
│   │
│   ├── /community
│   │   ├── Discord (embed widget)
│   │   ├── Twitter feed
│   │   ├── Contributing guide
│   │   └── Code of Conduct
│   │
│   ├── /careers (future opportunities)
│   │   ├── Why SnapBack
│   │   ├── Culture & Values
│   │   ├── Open Positions (when hiring)
│   │   └── Expression of Interest Form
│   │
│   └── /legal
│       ├── /privacy
│       ├── /terms
│       └── /security
│
├── 🔐 AUTH FLOW
│   │
│   ├── /signup
│   │   ├── Email + Password
│   │   ├── OAuth (GitHub, Google)
│   │   └── Magic Link
│   │
│   ├── /login
│   │   ├── Email + Password
│   │   ├── OAuth
│   │   └── Magic Link
│   │
│   ├── /onboarding (post-signup)
│   │   ├── Step 1: Welcome
│   │   ├── Step 2: Download Extension
│   │   ├── Step 3: Enter Invite Code
│   │   └── Step 4: First Checkpoint Created ✓
│   │
│   └── /verify-email
│       └── Confirmation screen
│
└── 🎛️ PRIVATE DASHBOARD (Post-Auth)
    │
    ├── /app/dashboard (home)
    │   ├── Protection Status (active/inactive)
    │   ├── Key Metrics Cards
    │   │   ├── Checkpoints Created
    │   │   ├── Recoveries Performed
    │   │   ├── Files Protected
    │   │   └── AI Detection Rate
    │   ├── Recent Activity Feed
    │   ├── AI Tool Detection Stats
    │   └── Quick Actions
    │       ├── Download Extension
    │       ├── View Docs
    │       └── Join Discord
    │
    ├── /app/metrics
    │   ├── Usage Overview
    │   │   ├── Checkpoints Over Time (chart)
    │   │   ├── Recovery Events (timeline)
    │   │   ├── Storage Usage
    │   │   └── API Calls (if applicable)
    │   ├── AI Activity Breakdown
    │   │   ├── By Tool (Copilot, Cursor, Claude)
    │   │   ├── By Confidence Level
    │   │   └── By File Type
    │   ├── Guardian Alerts
    │   │   ├── Secrets Detected
    │   │   ├── Mocks in Production
    │   │   └── Phantom Dependencies
    │   └── Export Data
    │       ├── CSV Download
    │       └── JSON Export
    │
    ├── /app/referrals (Alpha Referral Program)
    │   ├── Your Referral Stats
    │   │   ├── Total Invites Sent
    │   │   ├── Signups from Your Link
    │   │   ├── Active Users
    │   │   └── Rewards Earned
    │   ├── Referral Link Generator
    │   │   ├── Personal Link: snapback.dev/r/[username]
    │   │   └── Copy to Clipboard
    │   ├── Social Share Buttons
    │   │   ├── Twitter (pre-filled tweet)
    │   │   ├── LinkedIn
    │   │   └── Copy Message
    │   ├── Rewards Tracker
    │   │   ├── 3 referrals = 3 months Pro free
    │   │   ├── 10 referrals = 12 months Pro free
    │   │   ├── 25 referrals = Custom snapback cap 🧢
    │   │   └── 100 referrals = Lifetime Pro
    │   └── Leaderboard
    │       ├── Top Referrers (this week/month)
    │       └── Your Rank
    │
    ├── /app/settings
    │   ├── Account
    │   │   ├── Profile Info
    │   │   ├── Email Settings
    │   │   └── Delete Account
    │   ├── API Keys
    │   │   ├── Create New Key
    │   │   ├── View Keys (masked)
    │   │   ├── Revoke Key
    │   │   └── Usage Stats per Key
    │   ├── Subscription
    │   │   ├── Current Plan
    │   │   ├── Usage Limits
    │   │   ├── Upgrade/Downgrade
    │   │   └── Billing History
    │   ├── Notifications
    │   │   ├── Email Preferences
    │   │   ├── In-App Alerts
    │   │   └── Discord Integration
    │   └── Privacy
    │       ├── Data Retention
    │       ├── Telemetry Opt-out
    │       └── Export User Data
    │
    ├── /app/team (Team Plan Only)
    │   ├── Members
    │   │   ├── Invite New Member
    │   │   ├── Manage Roles
    │   │   └── Remove Member
    │   ├── Shared Policies
    │   │   ├── Organization-wide Rules
    │   │   └── Protection Templates
    │   ├── Audit Logs
    │   │   ├── Member Activity
    │   │   ├── Policy Changes
    │   │   └── Export Logs
    │   └── Team Analytics
    │       ├── Aggregate Metrics
    │       └── Top Issues
    │
    └── /app/support
        ├── Help Center (search)
        ├── Discord Link
        ├── Submit Ticket
        └── Feature Requests
```

---

## 🛤️ USER JOURNEY FLOWS

### **JOURNEY 1: First-Time Visitor → Alpha User**

```
┌─────────────────────────────────────────────────────────────────────┐
│ DISCOVERY PHASE                                                     │
└─────────────────────────────────────────────────────────────────────┘

Google Search: "ai broke my code"
         ↓
Landing on /blog/ai-destroyed-12k-code
         ↓
Reads story (relates to pain)
         ↓
Clicks CTA: "Get Protected Now" → Homepage

┌─────────────────────────────────────────────────────────────────────┐
│ CONSIDERATION PHASE                                                 │
└─────────────────────────────────────────────────────────────────────┘

Homepage Hero:
  - Reads: "AI Code Protection for VS Code"
  - Sees: "$12K disaster" context
  - Thinks: "This could happen to me"
         ↓
Scrolls to "How It Works"
  - Understands: Automatic, not manual
  - Sees: VS Code screenshot (actual product)
         ↓
Scrolls to Git vs SnapBack Comparison
  - Realizes: Complements Git, doesn't replace
  - Thinks: "I can use both"
         ↓
Reads FAQ
  - Concern #1: "Is my code in the cloud?" → No, local only
  - Concern #2: "Will it slow me down?" → <50ms overhead
  - Concern #3: "Works with Copilot?" → Yes

┌─────────────────────────────────────────────────────────────────────┐
│ CONVERSION PHASE                                                    │
└─────────────────────────────────────────────────────────────────────┘

Decision Point: "I'll try it"
         ↓
Enters Email in Hero Form
         ↓
Success Message: "Check your email for invite code"
         ↓
Receives Email (within 5 minutes)
  - Subject: "🧢 Your SnapBack Alpha Invite Code"
  - Body: Invite code + setup steps
         ↓
Clicks "Install Extension" → VS Code Marketplace
         ↓
Installs SnapBack extension
         ↓
Opens VS Code → SnapBack prompts for invite code
         ↓
Enters code → Account linked

┌─────────────────────────────────────────────────────────────────────┐
│ ACTIVATION PHASE                                                    │
└─────────────────────────────────────────────────────────────────────┘

VS Code Extension:
  - Shows: "Protection Active ✓"
  - Creates: First checkpoint automatically
         ↓
User codes for 10 minutes
         ↓
SnapBack (in background):
  - Detects: Copilot suggestion
  - Creates: Pre-AI checkpoint
         ↓
Copilot makes change → User accepts
         ↓
User saves file
         ↓
Build fails (Copilot broke something)
         ↓
🚨 CRITICAL MOMENT: User panics
         ↓
Opens SnapBack Explorer
  - Sees: "2 minutes ago (before Copilot change)"
  - Clicks: "Preview Restore"
  - Sees: Diff showing what Copilot changed
  - Clicks: "Restore"
         ↓
Code restored in 200ms
         ↓
Build passes ✓
         ↓
🎉 AHA MOMENT: "This just saved me hours"

┌─────────────────────────────────────────────────────────────────────┐
│ RETENTION PHASE                                                     │
└─────────────────────────────────────────────────────────────────────┘

Next Day:
  - Logs into /app/dashboard
  - Sees: "3 checkpoints created, 1 recovery performed"
  - Thinks: "Already got value"
         ↓
Week Later:
  - Uses SnapBack 3 more times
  - Visits /app/referrals
  - Shares referral link with 5 teammates
         ↓
Month Later:
  - 2 teammates have signed up
  - Dashboard shows: "You're earning 2 months Pro free"
  - Thinks: "I should share this more"
         ↓
Becomes Advocate:
  - Posts on Twitter: "SnapBack saved me again today"
  - Writes blog post: "Why I use SnapBack with Copilot"
  - Invites 20 more people
```

---

### **JOURNEY 2: Team Lead → Team Plan Purchase**

```
┌─────────────────────────────────────────────────────────────────────┐
│ DISCOVERY                                                           │
└─────────────────────────────────────────────────────────────────────┘

Sees tweet from developer: "SnapBack saved my weekend"
         ↓
Clicks link → Landing on Homepage
         ↓
Immediately thinks: "My team needs this"
         ↓
Clicks /pricing
         ↓
Compares plans:
  - Solo: $29/mo (individual)
  - Team: $79/seat/mo (shared policies, audit logs)
         ↓
Reads feature list:
  - "Centralized policies" ← This is what I need
  - "Audit logs" ← For compliance
  - "SSO integration" ← Must-have
         ↓
Decision: "I need to try this first"

┌─────────────────────────────────────────────────────────────────────┐
│ EVALUATION                                                          │
└─────────────────────────────────────────────────────────────────────┘

Signs up for Solo plan (14-day trial)
         ↓
Uses for 3 days → Experiences 2 successful recoveries
         ↓
Convinced, but needs team features
         ↓
Schedules call: "Book a demo" link in dashboard
         ↓
Call with founder:
  - Discusses: Team size (8 developers)
  - Discusses: Security concerns (SOC 2 in progress)
  - Discusses: Pricing (bulk discount?)
         ↓
Decision: "Let's pilot with 3 developers first"

┌─────────────────────────────────────────────────────────────────────┐
│ PURCHASE                                                            │
└─────────────────────────────────────────────────────────────────────┘

Upgrades to Team Plan (3 seats)
         ↓
Invites 3 senior developers
         ↓
Sets up shared policies:
  - Block saves to production configs without approval
  - Warn on any AI changes to /src/core/
  - Watch everything else
         ↓
30 Days Later:
  - Team has used SnapBack 47 times
  - Prevented 12 potential disasters
  - Saved estimated 40 hours of debugging
         ↓
Decision: "Expand to all 8 developers"
         ↓
Adds 5 more seats
         ↓
Becomes champion internally

┌─────────────────────────────────────────────────────────────────────┐
│ EXPANSION                                                           │
└─────────────────────────────────────────────────────────────────────┘

6 Months Later:
  - Company grows to 15 developers
  - All using SnapBack
  - Team Lead writes case study (with permission)
  - SnapBack features case study on website
         ↓
Case study drives 50+ new Team Plan inquiries
```

---

### **JOURNEY 3: Skeptical Developer → Advocate**

```
┌─────────────────────────────────────────────────────────────────────┐
│ INITIAL SKEPTICISM                                                  │
└─────────────────────────────────────────────────────────────────────┘

Sees Product Hunt launch
         ↓
Thinks: "Another VS Code extension? I have 50 already"
         ↓
Reads comments → Sees positive feedback
         ↓
Visits /features page
         ↓
Skeptical thoughts:
  - "Git already does this"
  - "I don't need this"
  - "It'll probably slow down my editor"
         ↓
But curiosity wins → Clicks /docs/getting-started
         ↓
Reads Quickstart (5 minutes)
         ↓
Thinks: "Fine, I'll try it. But I'm uninstalling if it's slow."

┌─────────────────────────────────────────────────────────────────────┐
│ TRIAL PERIOD                                                        │
└─────────────────────────────────────────────────────────────────────┘

Day 1: Installs, enters alpha code
  - First impression: "Okay, it's not annoying"
  - Status bar shows: "Protection Active"
  - Doesn't notice any performance impact
         ↓
Day 3: Hasn't needed it yet
  - Thinks: "See? I don't need this"
  - But doesn't uninstall (not causing problems)
         ↓
Day 7: Claude suggests refactoring
  - Accepts all changes
  - Tests break in 5 places
  - Thinks: "Ugh, now I have to revert..."
         ↓
💡 Remembers SnapBack
  - Opens Explorer
  - Sees checkpoint: "3 minutes ago (before Claude)"
  - Clicks Restore
  - Everything works again
         ↓
🎉 CONVERSION MOMENT: "Holy shit, this actually works"

┌─────────────────────────────────────────────────────────────────────┐
│ ADVOCACY                                                            │
└─────────────────────────────────────────────────────────────────────┘

Same Day:
  - Tweets: "I was skeptical but @snapbackdev just saved me hours"
  - Gets 200 likes, 50 retweets
         ↓
Week Later:
  - Writes blog post: "Why SnapBack Changed How I Use AI"
  - Includes referral link
  - 15 people sign up from his post
         ↓
Month Later:
  - Creates YouTube tutorial: "Safe AI Coding with SnapBack"
  - 5,000 views
  - Another 50 signups
         ↓
Becomes unofficial ambassador
  - SnapBack team reaches out
  - Offers: Free lifetime Pro + custom cap
  - Continues creating content
```

---

## 📊 CONVERSION FUNNEL METRICS

### **Public Site Funnel**

```
Homepage Visitors (baseline)
         ↓ 40% scroll >75%
Mid-page Engagement (FAQ, comparison)
         ↓ 10-15% submit email
Email Capture
         ↓ 80% open email
Email Opened
         ↓ 60% click "Install"
Extension Downloaded
         ↓ 70% enter code
Extension Activated
         ↓ 90% create first checkpoint
First Checkpoint
         ↓ 50% perform recovery within 7 days
First Recovery (AHA MOMENT)
         ↓ 80% continue using
Active User

OVERALL CONVERSION:
1,000 visitors → 100-150 emails → 80 opens → 48 installs → 34 activations → 17 recoveries → 14 active users
= 1.4% visitor-to-active-user rate
```

### **Dashboard Funnel (Post-Auth)**

```
New User Logs In (Day 1)
         ↓ 100% see dashboard
Views Dashboard Metrics
         ↓ 60% explore settings
Configures Preferences
         ↓ 30% visit referrals page
Views Referral Program
         ↓ 40% generate link
Creates Referral Link
         ↓ 20% share immediately
Shares on Social/Email
         ↓ varies
Referral Signups

REFERRAL CONVERSION:
100 active users → 30 generate link → 6 share immediately → ~2 signups per sharer = 12 new users from referrals
```

---

## 🎯 KEY DECISION POINTS (Where Users Drop Off)

### **Critical Point #1: Homepage → Email Submit**

**Current Drop-off:** 85-90% don't submit email

**Why:**
- Not convinced of value yet
- "I'll come back later" (never do)
- Distracted/interrupted

**Solutions:**
- ✅ Stronger emotional hook (you implemented)
- ✅ Social proof (X developers protected)
- ✅ Risk reversal ("Free forever for alpha users")
- ⚠️ Exit-intent popup (you decided against - good call)

---

### **Critical Point #2: Email → Extension Install**

**Current Drop-off:** ~40% never install

**Why:**
- Email goes to spam
- Forget to check email
- Email is unclear about next steps

**Solutions:**
- ✅ Beautiful email template (you have this)
- ✅ Clear CTAs ("Install Extension")
- Add: SMS reminder option (future)
- Add: In-app notification if they log in without installing

---

### **Critical Point #3: Install → First Recovery**

**Current Drop-off:** ~50% never use it

**Why:**
- Haven't experienced AI disaster yet
- Don't remember it exists
- Don't know how to use it

**Solutions:**
- Add: In-extension tutorial (first time)
- Add: Weekly email: "You're protected. Here's what happened this week"
- Add: Celebrate first checkpoint: "🎉 Your code is now protected!"
- Add: Monthly recap: "SnapBack saved you X times this month"

---

## 🗂️ INFORMATION ARCHITECTURE DECISIONS

### **Why /app/ Prefix for Dashboard?**

**Pros:**
- Clear separation (public vs private)
- SEO benefit (public pages indexed, /app/ noindexed)
- Subdomain alternative without complexity

**Cons:**
- Slightly longer URLs

**Decision:** Use /app/ prefix ✓

---

### **Why Docs Are Public?**

**Pros:**
- SEO gold (ranks for "how to" queries)
- Reduces support burden
- Builds authority

**Cons:**
- Competitors can see everything

**Decision:** Keep docs public ✓ (standard practice)

---

### **Why Referrals in Dashboard (Not Separate Page)?**

**Pros:**
- Users already authenticated
- Can show personalized stats
- Encourages login frequency

**Cons:**
- Slightly less accessible

**Decision:** Keep in dashboard, but add share buttons in email too

---

## 🔄 CROSS-LINKING STRATEGY

Every page should link to 3-5 other strategic pages:

```
Homepage
  ↓ Features (learn more)
  ↓ Pricing (get started)
  ↓ Docs (how it works)
  ↓ Blog (read stories)

Features
  ↓ Pricing (see plans)
  ↓ Docs (setup guide)
  ↓ Comparison (vs Git)
  ↓ Integration (MCP)

Pricing
  ↓ Features (what you get)
  ↓ FAQ (questions)
  ↓ Comparison (value prop)
  ↓ Signup (CTA)

Blog Post
  ↓ Homepage (learn more)
  ↓ Related posts (2-3)
  ↓ Docs (how to)
  ↓ Signup (CTA)

Dashboard
  ↓ Docs (help)
  ↓ Referrals (share)
  ↓ Settings (configure)
  ↓ Support (get help)
```

---

## 📱 MOBILE CONSIDERATIONS

### **Mobile-First Pages (Most Traffic)**

1. Homepage (60% mobile)
2. Blog posts (65% mobile)
3. Docs (55% mobile)

### **Desktop-First Pages**

4. Dashboard (90% desktop - developers at work)
5. Pricing (70% desktop - buying decision)
6. Integrations (80% desktop - technical setup)

**Design Implications:**
- ✅ Homepage: Stack sections vertically on mobile
- ✅ Dashboard: Hide sidebar, show burger menu
- ✅ Comparison table: Horizontal scroll or accordion
- ✅ Email form: Full-width on mobile

---

## ✅ PRIORITY PAGES TO BUILD THIS WEEK

Based on user journey analysis:

1. ✅ **Homepage** (you have this)
2. ✅ **Email capture flow** (backend ready)
3. 🚧 **Dashboard home** (/app/dashboard)
4. 🚧 **Referrals page** (/app/referrals)
5. 📅 **First blog post** (/blog/ai-destroyed-12k-code)

**Next Week:**
6. Features page
7. Pricing page
8. FAQ (can embed in homepage)
9. Docs quickstart

**Week 3:**
10. Comparison page (Git vs SnapBack)
11. Integrations page
12. About page

---

## 🎯 DASHBOARD WIREFRAME (HIGH-LEVEL)

```
┌─────────────────────────────────────────────────────────────────┐
│  🧢 SnapBack           Dashboard  Metrics  Referrals  Settings  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🛡️ Protection Status: ACTIVE                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Your code is protected                               │   │
│  │ Last checkpoint: 2 minutes ago                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 Your Protection Stats                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 1,247    │ │ 23       │ │ 3,892    │ │ 94%      │         │
│  │ Checkpts │ │ Recovers │ │ Files    │ │ AI Detect│         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                 │
│  🤖 AI Activity This Week                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GitHub Copilot: 847 changes detected                    │   │
│  │ Cursor:         412 changes detected                    │   │
│  │ Claude:         183 changes detected                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📜 Recent Activity                                            │
│  • 2 min ago: Checkpoint created (package.json)               │
│  • 15 min ago: AI activity detected (Copilot)                 │
│  • 1 hour ago: Recovery performed (src/utils/api.ts)          │
│                                                                 │
│  🚀 Quick Actions                                              │
│  [Download Extension] [View Docs] [Join Discord]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎁 REFERRAL PAGE WIREFRAME

```
┌─────────────────────────────────────────────────────────────────┐
│  🧢 SnapBack           Dashboard  Metrics  Referrals  Settings  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎁 Invite Friends, Earn Rewards                               │
│                                                                 │
│  Your Referral Stats                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔗 12 Invites Sent                                      │   │
│  │ ✅ 7 Signups                                            │   │
│  │ ⚡ 5 Active Users                                       │   │
│  │ 🎉 6 Months Pro Earned                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Your Referral Link                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://snapback.dev/r/alexdev       [Copy] [Share]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Share on Social                                               │
│  [Twitter] [LinkedIn] [Copy Message]                           │
│                                                                 │
│  🏆 Rewards Progress                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ 3 referrals → 3 months Pro FREE (EARNED!)           │   │
│  │ ◯ 10 referrals → 12 months Pro FREE (Need 3 more)      │   │
│  │ ◯ 25 referrals → Custom snapback cap 🧢 (Need 18 more) │   │
│  │ ◯ 100 referrals → Lifetime Pro (Need 93 more)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 Leaderboard                                                │
│  1. Sarah K.    - 247 referrals  🏆                            │
│  2. Mike T.     - 183 referrals                                │
│  3. Jordan P.   - 156 referrals                                │
│  ...                                                            │
│  47. You (Alex) - 7 referrals                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

Would you like me to create:
1. **Interactive dashboard mockups** (React components)?
2. **Referral system backend** (API endpoints + database schema)?
3. **Detailed user flow diagrams** (Mermaid/Figma)?
4. **Mobile-responsive layouts** for dashboard?

This sitemap shows the complete user journey from discovery → signup → activation → retention → advocacy. The referral system in the dashboard is key for viral growth during alpha! 🚀
