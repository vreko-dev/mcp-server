# 90-Minute SEO Foundation - Implementation Checklist
**Execute this week | Track completion | Done when checkboxes checked**

---

## ✅ Task 1: Expand package.json Keywords (30 min)

### @snapback-oss/sdk

**File:** `packages-oss/sdk/package.json`

**Current keywords:**
```json
"keywords": [
  "api", "client", "sdk", "snapback", "oss",
  "code-safety", "snapshot", "file-protection",
  "backup", "restore", "typescript", "developer-tools"
]
```

**Add these 8 keywords:**
```json
"keywords": [
  "api", "client", "sdk", "snapback", "oss",
  "code-safety", "snapshot", "file-protection",
  "backup", "restore", "typescript", "developer-tools",
  "ai-safety", "copilot-protection", "cursor-safety",
  "code-recovery", "rollback", "git-alternative",
  "cicd", "typescript-tools"
]
```

- [ ] Updated keywords in package.json
- [ ] Verified total count is 20 keywords

---

### @snapback-oss/contracts

**File:** `packages-oss/contracts/package.json`

**Current:** Similar base keywords

**Add these 8:**
```json
"keywords": [
  // existing keywords...
  "ai-safety", "type-definitions", "code-safety-types",
  "typescript-contracts", "schema-validation", "developer-tools",
  "typescript", "interfaces"
]
```

- [ ] Updated keywords in package.json
- [ ] Verified total count is ~15-18 keywords

---

### @snapback-oss/infrastructure

**File:** `packages-oss/infrastructure/package.json`

**Add these 8:**
```json
"keywords": [
  // existing keywords...
  "observability", "telemetry", "structured-logging",
  "distributed-tracing", "metrics", "monitoring",
  "developer-tools", "typescript"
]
```

- [ ] Updated keywords in package.json
- [ ] Verified total count is ~15-18 keywords

---

### @snapback-oss/events

**File:** `packages-oss/events/package.json`

**Add these 8:**
```json
"keywords": [
  // existing keywords...
  "event-bus", "pub-sub", "message-queue",
  "event-driven", "async", "typescript",
  "developer-tools", "event-emitter"
]
```

- [ ] Updated keywords in package.json
- [ ] Verified total count is ~15-18 keywords

---

### @snapback-oss/config

**File:** `packages-oss/config/package.json`

**Add these 8:**
```json
"keywords": [
  // existing keywords...
  "configuration", "config-management", "dotenv",
  "environment", "settings", "typescript",
  "developer-tools", "config-loader"
]
```

- [ ] Updated keywords in package.json
- [ ] Verified total count is ~15-18 keywords

---

## ✅ Task 2: Add UTM Tracking (30 min)

### Pattern to Use

```
?utm_source=npm&utm_medium=readme&utm_campaign=[package-name]
```

### Links to Update in Each Package README

For **each of the 5 OSS packages**, update these links:

#### 1. Main Documentation Link
```markdown
<!-- Before -->
[Documentation](https://docs.snapback.dev)

<!-- After -->
[Documentation](https://docs.snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=sdk)
```

#### 2. API Reference Link
```markdown
<!-- Before -->
[API Reference](https://docs.snapback.dev/api/sdk)

<!-- After -->
[API Reference](https://docs.snapback.dev/api/sdk?utm_source=npm&utm_medium=readme&utm_campaign=sdk)
```

#### 3. VS Code Extension Link
```markdown
<!-- Before -->
[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode)

<!-- After -->
[VS Code Extension](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode&utm_source=npm&utm_medium=readme&utm_campaign=sdk)
```

#### 4. Main Website Link
```markdown
<!-- Before -->
[snapback.dev](https://snapback.dev)

<!-- After -->
[snapback.dev](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=sdk)
```

#### 5. Ecosystem Table Links (in each README footer)
```markdown
<!-- Before -->
| Tool | Link |
|------|------|
| 🧢 VS Code | [Marketplace →](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode) |
| 🌐 Web | [snapback.dev →](https://snapback.dev) |
| 📚 Docs | [docs.snapback.dev →](https://docs.snapback.dev) |

<!-- After -->
| Tool | Link |
|------|------|
| 🧢 VS Code | [Marketplace →](https://marketplace.visualstudio.com/items?itemName=MarcelleLabs.snapback-vscode&utm_source=npm&utm_medium=readme&utm_campaign=sdk) |
| 🌐 Web | [snapback.dev →](https://snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=sdk) |
| 📚 Docs | [docs.snapback.dev →](https://docs.snapback.dev?utm_source=npm&utm_medium=readme&utm_campaign=sdk) |
```

### Checklist

- [ ] @snapback-oss/sdk README - Updated 4 links
- [ ] @snapback-oss/contracts README - Updated 4 links
- [ ] @snapback-oss/infrastructure README - Updated 4 links
- [ ] @snapback-oss/events README - Updated 4 links
- [ ] @snapback-oss/config README - Updated 4 links

**Note:** Replace `campaign=sdk` with the actual package name (e.g., `campaign=contracts`, `campaign=infrastructure`, etc.)

---

## ✅ Task 3: Fix Repository Metadata (15 min)

### Update Each package.json

For each OSS package, ensure these fields are correct:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/Marcelle-Labs/snapback.dev.git",
    "directory": "packages-oss/[package-name]"  // ← Update this
  },
  "bugs": {
    "url": "https://github.com/Marcelle-Labs/snapback.dev/issues",
    "email": "hello@snapback.dev"
  },
  "author": {
    "name": "SnapBack Team",
    "email": "hello@snapback.dev",
    "url": "https://snapback.dev"
  }
}
```

### Checklist

- [ ] @snapback-oss/sdk - `directory: "packages-oss/sdk"`
- [ ] @snapback-oss/contracts - `directory: "packages-oss/contracts"`
- [ ] @snapback-oss/infrastructure - `directory: "packages-oss/infrastructure"`
- [ ] @snapback-oss/events - `directory: "packages-oss/events"`
- [ ] @snapback-oss/config - `directory: "packages-oss/config"`

### Optional: Add Funding Field

If you want to add a funding/sponsor link:

```json
{
  "funding": {
    "type": "individual",
    "url": "https://snapback.dev/sponsor"
  }
}
```

- [ ] Decided on funding approach (skip if not ready)
- [ ] Added funding field to all packages (if applicable)

---

## ✅ Task 4: GitHub Repository Optimization (10 min)

### Update Repository About Section

**Go to:** https://github.com/Marcelle-Labs/snapback.dev/settings

#### Description
```
AI-aware code protection with open-source TypeScript SDK - snapshots, file protection, and risk analysis for developers
```

#### Website
```
https://snapback.dev
```

#### Topics (click "Add topics")

Add all of these:
```
typescript-sdk
code-safety
developer-tools
vscode-extension
snapshot-manager
ai-safety
file-protection
backup-tool
typescript
open-source
apache-license
```

### Checklist

- [ ] Updated repository description
- [ ] Set website URL
- [ ] Added all 11 topics
- [ ] Verified topics appear on repo homepage

---

## ✅ Task 5: VS Code Extension Keywords (5 min)

**File:** `apps/vscode/package.json`

**Current keywords count:** ~8

**Expand to 20-25:**

```json
{
  "keywords": [
    "snapshot",
    "backup",
    "code-safety",
    "ai-protection",
    "copilot",
    "cursor",
    "windsurf",
    "recovery",
    "rollback",
    "file-protection",
    "git",
    "version-control",
    "developer-tools",
    "typescript",
    "javascript",
    "productivity",
    "security",
    "code-quality",
    "automation",
    "testing",
    "ci-cd",
    "open-source",
    "sdk",
    "local-first",
    "ai-safety"
  ]
}
```

### Checklist

- [ ] Updated keywords in apps/vscode/package.json
- [ ] Verified total count is 20-25 keywords
- [ ] Keywords are relevant to VS Code Marketplace search

---

## 🎯 Verification & Publishing

### Test Locally

Before publishing, verify your changes:

```bash
# Check package.json is valid
cd packages-oss/sdk
npm run typecheck
pnpm build

# Repeat for each package
```

- [ ] All packages build successfully
- [ ] No JSON syntax errors
- [ ] TypeScript compiles

### Publish Updated Packages

When ready to publish with new keywords:

```bash
# From root of monorepo
pnpm changeset

# Select packages to version bump
# Choose patch version (0.5.0 → 0.5.1)
# Add changelog: "Improved npm discoverability with expanded keywords"

pnpm changeset version
pnpm install
git add .
git commit -m "chore: expand package keywords for better discoverability"

# Publish
pnpm publish -r
```

- [ ] Created changeset
- [ ] Published all updated packages
- [ ] Verified on npm that keywords appear

---

## 📊 Week 1 Check-In

**After completing all tasks, bookmark these for weekly check-ins:**

- [npm stats](https://npm-stat.com/@snapback-oss/sdk)
- [npmcharts](https://npmcharts.com/compare/@snapback-oss/sdk)
- [GitHub traffic](https://github.com/Marcelle-Labs/snapback.dev/graphs/traffic)
- [VS Code Marketplace](https://marketplace.visualstudio.com/manage/publishers/MarcelleLabs)

**Simple weekly tracking (5 minutes):**

```markdown
## Week [X] - 2025-XX-XX

**npm downloads (all packages):** [X]
**VS Code installs:** [X]
**GitHub stars:** [X]

**Top traffic source:** [source] → [X] visitors

**Notes:**
- [Anything interesting?]
```

- [ ] Bookmarked tracking URLs
- [ ] Created week 1 tracking note
- [ ] Set calendar reminder for weekly check-in

---

## ✅ Done!

**Congratulations!** You've completed the 90-minute SEO foundation.

**What you've accomplished:**
- ✅ Expanded keywords across 5 npm packages (better search discoverability)
- ✅ Added UTM tracking to all external links (learn where traffic comes from)
- ✅ Fixed repository metadata (proper GitHub integration)
- ✅ Optimized GitHub for discoverability (topics + description)
- ✅ Expanded VS Code Marketplace keywords (better extension search)

**Next steps:**
- Publish updated packages to npm
- Monitor for 1-2 weeks to see impact
- Focus on content creation (not more SEO optimization)

**Shelve until 100+ users:**
- Elaborate cross-platform integration
- Dedicated landing pages
- Social proof sections
- Metrics dashboards

---

## 🚫 Resist the Urge

After completing this checklist, you may be tempted to:

- ❌ Add social proof sections to READMEs (don't - numbers too small)
- ❌ Create an /open-source landing page (don't - no traffic to send there)
- ❌ Build a metrics dashboard (don't - nothing to measure yet)
- ❌ Optimize further (don't - diminishing returns)
- ❌ Create dedicated package documentation pages (don't - premature)
- ❌ Set up cross-platform conversion funnels (don't - no volume yet)
- ❌ A/B test README structures (don't - insufficient traffic)
- ❌ Add elaborate ecosystem diagrams (don't - keep it simple)

**The 90 minutes is done. Close this document. Open a blank page and start writing the $12K incident post.**

That's where the real growth comes from.

---

**Estimated total time:** 90 minutes
**Maintenance required:** 5 minutes per week (tracking)
**Expected ROI:** 20-30% better organic discoverability

**Remember:** The best SEO is content that creates demand, not infrastructure that captures it.

**Now go write that $12K incident post!**
