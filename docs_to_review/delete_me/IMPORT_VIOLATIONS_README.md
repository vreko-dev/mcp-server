# Import Violations - Complete Audit & Fix Plan

> **Complete audit of 255 files using relative imports instead of TypeScript path aliases.**  
> Generated: December 8, 2025

---

## 🎯 Quick Summary

- **255 files** across 4 locations have relative imports (e.g., `../../../src/`)
- **~475 violations** total, mostly in test files and API procedures
- **3 solution paths** provided (quick/medium/comprehensive)
- **2,273 lines** of documentation with code examples and step-by-step guides
- **Ready to implement** with automated scripts and validation procedures

---

## 📚 Documentation Files

All files are in the repository root. Start with the index:

### **1. IMPORT_VIOLATIONS_INDEX.md** ⭐ START HERE
Navigation guide for all documents. Read first to understand what's available.

### **2. IMPORT_VIOLATIONS_QUICK_START.md** (5 min read)
Executive summary:
- Problem overview
- By-the-numbers breakdown
- 3 implementation options
- Quick checklist to get started

### **3. IMPORT_VIOLATIONS_INVENTORY.md** (15 min read)
Complete violation inventory:
- All 255 files listed and categorized
- Analysis by location (API/VSCode/Web/Packages)
- Top 20 import patterns
- Root cause analysis

### **4. IMPORT_VIOLATIONS_SUMMARY.md** (20 min read)
Decision and planning guide:
- Problem explanation
- Option A (Quick): 1-2 days
- Option B (Recommended): 1 week
- Option C (Comprehensive): 2-3 weeks
- Risk assessment and mitigation
- FAQ section

### **5. IMPORT_VIOLATIONS_FIX_GUIDE.md** (30 min read + implementation)
Technical implementation guide:
- Phase 1: Configuration (2 hours)
- Phase 2: Updates & reorganization (1 week)
- Phase 3: Package extraction (2-3 weeks)
- Code snippets (copy-paste ready)
- Automated fix scripts
- Validation & rollback procedures

### **6. IMPORT_VIOLATIONS_INVENTORY.csv** (machine-readable)
256 rows of structured data:
- File paths
- Locations
- Patterns
- Type (test/source)
- Priority (high/medium/low)

Use this to track progress or import into tracking tools.

---

## 🚀 Getting Started (5 Minutes)

### For Decision Makers:
1. Read `IMPORT_VIOLATIONS_QUICK_START.md` (5 min)
2. Skim `IMPORT_VIOLATIONS_SUMMARY.md` sections for Options A/B/C
3. Choose an option
4. Assign to developer

### For Developers:
1. Read `IMPORT_VIOLATIONS_QUICK_START.md` (5 min)
2. Read relevant phase in `IMPORT_VIOLATIONS_FIX_GUIDE.md`
3. Create branch: `git checkout -b refactor/import-violations`
4. Follow the step-by-step guide

### For Architects:
1. Read `IMPORT_VIOLATIONS_INVENTORY.md` - understand scope
2. Read `IMPORT_VIOLATIONS_SUMMARY.md` - evaluate options
3. Read `IMPORT_VIOLATIONS_FIX_GUIDE.md` - review implementation approach

---

## 📊 Key Numbers

```
Total Source Files:       2,758
Files with Violations:    255 (9.2%)
Total Violations:         ~475 import statements

By Location:
  • apps/api:          84 files (source code)
  • apps/vscode:      138 files (tests)
  • apps/web:           8 files (components)
  • packages/*:        13 files (tests)

Most Common:
  1. ../../../orpc/procedures           (68 files)
  2. ../../../src/services/database     (54 files)
  3. ../../../src/services/*            (50+ files)
```

---

## 🎯 Implementation Options

| Option | Effort | Time | Impact | Best For |
|--------|--------|------|--------|----------|
| **A** Quick | Low | 1-2 days | Medium | Fast wins |
| **B** Proper | Medium | 1 week | High | **RECOMMENDED** |
| **C** Comprehensive | High | 2-3 weeks | Very High | Long-term |

---

## 🔍 What's Included

✅ **Complete Audit**
- All 255 files identified
- Patterns analyzed
- Root causes identified

✅ **Documentation** (2,273 lines)
- 6 comprehensive documents
- Code examples
- Step-by-step guides

✅ **Implementation Tools**
- Configuration files
- Automated fix scripts
- Validation procedures

✅ **Planning Resources**
- Timeline estimates
- Risk assessment
- FAQ sections

✅ **Tracking**
- CSV export
- Spreadsheet format
- Progress template

---

## 📖 Recommended Reading Order

### If you have 30 minutes:
1. This README (2 min)
2. `IMPORT_VIOLATIONS_QUICK_START.md` (5 min)
3. `IMPORT_VIOLATIONS_SUMMARY.md` - Options section (15 min)
4. Make a decision (8 min)

### If you have 1 hour:
1. `IMPORT_VIOLATIONS_QUICK_START.md` (5 min)
2. `IMPORT_VIOLATIONS_INVENTORY.md` (15 min)
3. `IMPORT_VIOLATIONS_SUMMARY.md` (20 min)
4. `IMPORT_VIOLATIONS_FIX_GUIDE.md` - Skim phases (15 min)
5. Make a decision (5 min)

### If you're implementing:
1. `IMPORT_VIOLATIONS_QUICK_START.md` (5 min)
2. `IMPORT_VIOLATIONS_FIX_GUIDE.md` - Your phase (20 min)
3. `IMPORT_VIOLATIONS_INVENTORY.csv` - Find your files (5 min)
4. Code and test

---

## 🎓 Understanding the Problem

### The Issue
```typescript
// ❌ WRONG - 255 files do this
import { getDb } from "../../../src/services/database";

// ✅ RIGHT - Use path aliases
import { getDb } from "@snapback/api/services";
```

### Why It Matters
- **Brittleness:** Moving a file breaks all relative imports
- **Unclear boundaries:** Can't tell dependencies from import paths
- **Maintainability:** Harder to refactor
- **Linting:** Can't automatically detect cross-package violations

### Why It Happened
- Monolithic apps (`apps/api`, `apps/vscode`) without clear boundaries
- Tests separated from source in different directories
- Missing path alias configuration

---

## 💡 Next Actions

### Choose One:

**Do Phase 1 Now** (2 hours, non-breaking)
```bash
git checkout -b refactor/import-violations
# Create config files
# Run top 5 pattern fixes
# Run tests
git push origin refactor/import-violations
```
See: Phase 1 in `IMPORT_VIOLATIONS_FIX_GUIDE.md`

**Plan Phase 2** (1 week, structural improvement)
```bash
# Move test files
# Update remaining imports
# Create barrel exports
# Validate all tests pass
```
See: Phase 2 in `IMPORT_VIOLATIONS_FIX_GUIDE.md`

**Consider Phase 3** (2-3 weeks, long-term)
```bash
# Extract internal packages
# Define clear boundaries
# Enforce via linting
```
See: Option C in `IMPORT_VIOLATIONS_SUMMARY.md`

---

## 📋 Checklist: Before You Start

- [ ] Read `IMPORT_VIOLATIONS_QUICK_START.md`
- [ ] Decide: Option A, B, or C?
- [ ] Read relevant section in `IMPORT_VIOLATIONS_SUMMARY.md`
- [ ] Read relevant phase in `IMPORT_VIOLATIONS_FIX_GUIDE.md`
- [ ] Create feature branch
- [ ] Follow step-by-step guide
- [ ] Run tests after each change
- [ ] Create PR with before/after examples

---

## 📞 Questions?

Check these sections:

**"What's the problem?"**
→ `IMPORT_VIOLATIONS_QUICK_START.md` - Problem section

**"How many files are affected?"**
→ `IMPORT_VIOLATIONS_INVENTORY.md` - Full list

**"Which option should I choose?"**
→ `IMPORT_VIOLATIONS_SUMMARY.md` - Decision matrix

**"How do I implement this?"**
→ `IMPORT_VIOLATIONS_FIX_GUIDE.md` - Step-by-step guide

**"How do I track progress?"**
→ `IMPORT_VIOLATIONS_INVENTORY.csv` - Track in spreadsheet

---

## 🔗 Related Documentation

- `always-monorepo-imports.md` - Monorepo import standards
- `always-code-consolidation.md` - Canonical import locations
- `ARCHITECTURE.md` - System design
- `.lefthook.yml` - Pre-commit hooks (can enforce imports)

---

## ✨ Status

**Audit:** ✅ Complete  
**Documentation:** ✅ Complete  
**Ready to implement:** ✅ Yes  

All files are in the repository root with clear naming:
```
IMPORT_VIOLATIONS_INDEX.md          ← Navigation
IMPORT_VIOLATIONS_QUICK_START.md    ← 5-min summary
IMPORT_VIOLATIONS_INVENTORY.md      ← Detailed list
IMPORT_VIOLATIONS_SUMMARY.md        ← Decision guide
IMPORT_VIOLATIONS_FIX_GUIDE.md      ← Implementation
IMPORT_VIOLATIONS_INVENTORY.csv     ← Tracking
```

---

## 🚀 Ready?

**Next step:** Read `IMPORT_VIOLATIONS_QUICK_START.md` (5 minutes)

Then choose your option and get started!

---

**Generated:** December 8, 2025  
**Status:** Ready to implement 🚀
