# SnapBack Documentation Planning

**Last Updated**: 2025-12-18
**Status**: MVD (Minimum Viable Docs) approach active

---

## 📚 Documentation Files Overview

| File | Purpose | Status |
|------|---------|--------|
| **`MVD_PLAN.md`** | **Active launch plan** - 8 pages, 23 hours | ✅ CURRENT |
| **`DEFERRED_SCOPE.md`** | Future work backlog - 14 pages deferred | 📦 ARCHIVED |
| **`gap_analysis_ARCHIVED.md`** | Original 45-page plan (superseded) | 🗄️ REFERENCE |
| **`json_gap.json`** | Structured data (superseded) | 🗄️ REFERENCE |

---

## 🎯 Quick Start: Which File to Use?

### I want to write docs for launch
→ **Use `MVD_PLAN.md`**
- 8 must-have pages
- 23 hours of work
- Clear acceptance criteria

### I want to see what's been deferred
→ **Use `DEFERRED_SCOPE.md`**
- 14 pages postponed to Q2 2025
- 78 hours saved
- Review criteria for un-deferring

### I want to see the original vision
→ **Use `gap_analysis_ARCHIVED.md`**
- Historical reference
- Explains why scope was reduced
- Preserved for future planning

---

## 📖 MVD Pages (Launch-Critical)

**8 Pages, ~23 Hours:**

1. **What is SnapBack** (NEW - 3h) - Value proposition
2. **VS Code Extension** (NEW - 4h) - Hero product page
3. **Quick Start** (POLISH - 2h) - Installation
4. **Your First Restore** (POLISH - 2h) - First success
5. **Cursor Guide** (NEW - 3h) - Primary AI tool
6. **Copilot Guide** (EXPAND - 3h) - Primary AI tool
7. **Recovering from AI Mistakes** (NEW - 3h) - Core value
8. **Pioneer Overview** (NEW - 3h) - Gamification

**Success Metric**: <10% support tickets for documented features

---

## 🗂️ Deferred Items (Post-Launch)

**14 Pages, ~78 Hours:**

### Interactive Demos (32h saved)
- Playground (16h)
- Risk Analyzer Demo (8h)
- Diff Visualizer (8h)

### Product Pages (8h saved)
- SDK Reference (4h)
- Dashboard Page (4h)

### Framework Guides (12h saved)
- Next.js, React, Node.js (4h each)

### Advanced Guides (16h saved)
- Team Workflows, CI/CD, Large Codebases, Claude Guide

### API Docs (10h saved)
- REST API Reference, Webhooks

**Revisit**: Q2 2025 after launch + usage data

---

## 🚀 Implementation Timeline

**Day 1**: Onboarding (What is SnapBack, VS Code Extension)
**Day 2**: Getting Started (Quick Start, First Restore, Cursor)
**Day 3**: Core Value (Copilot, Recovering Mistakes, Pioneer)
**Day 4**: Polish + QA (screenshots, testing, links)

**Total**: 4 days for one person, 2 days for two people

---

## ✅ Quality Gates

Before launch, validate:
- [ ] All installation steps tested on clean machine
- [ ] All screenshots match current UI
- [ ] All links work (no 404s)
- [ ] 3 new users can complete Quick Start
- [ ] First restore flow works end-to-end

---

## 🔄 Maintenance

**Weekly**: Check for broken links
**Monthly**: Review analytics, expand based on user questions
**Quarterly**: Full audit, review deferred scope

---

## 📊 Success Metrics

**Activation**: Time to first restore <10 min
**Support**: <5% tickets for "how to restore"
**Engagement**: >70% of users visit docs
**Quality**: >4.0/5 user rating

---

## 🤔 Decision Rationale

**Why reduce from 45 → 8 pages?**

The original plan assumed:
- All features complete (reality: 73 unfinished items)
- Dashboard showing real data (reality: hardcoded zeros)
- SDK has external users (reality: no external devs)
- Interactive demos showing working features (reality: fake data)

**Philosophy shift:**
- From: "Build comprehensive docs for future product"
- To: "Document current product excellently"

**Effort reallocation:**
- 78 hours saved from deferred docs
- Redirect to: Fix Gap 1 (6h), Gap 2 (8h), CLI restore (16h)
- Result: Product + docs both ship-ready

---

## 📎 Related Documents

- Product gaps: `.qoder/quests/task-audit.md`
- Platform assessment: "Overengineered in Scope, Not Structure" analysis
- Decision date: 2025-12-18

---

**For questions or updates, see `MVD_PLAN.md` for active work.**
