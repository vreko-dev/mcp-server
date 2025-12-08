# Import Violations - Quick Start (5 Minutes)

**TL;DR:** 255 files use relative imports instead of `@snapback/*`. Here's what you need to know and what to do.

---

## The Problem (30 seconds)

```typescript
// ❌ Current (255 files do this)
import { getDb } from "../../../src/services/database";

// ✅ Should be
import { getDb } from "@snapback/api/services";
```

**Impact:** Tests break when files move. Hard to see package dependencies.

---

## By The Numbers

| Metric | Count |
|--------|-------|
| Files affected | 255 |
| Import statements | ~475 |
| Mostly tests | 200+ |
| Mostly API | 84 |
| Fix time | 1-2 weeks |
| Effort | Medium |

---

## Where Are They? (Priorities)

```
🔴 HIGH (Fix soon)
├── apps/api/modules/*/procedures/        (84 files) - Source code
└── apps/vscode/test/unit/services/       (60 files) - Tests

🟡 MEDIUM (Fix next)
├── apps/vscode/test/integration/         (78 files) - Tests
└── packages/*/test/                       (13 files) - Tests

🟢 LOW (Nice to have)
└── apps/web/modules/*/                   (8 files) - Components
```

---

## What To Do (Choose One)

### Option 1: Quick Fix This Week ⚡
**Time:** 1-2 days
**Effort:** Low
**How:** Update config files, run find-replace for top 10 patterns

→ **See:** `IMPORT_VIOLATIONS_FIX_GUIDE.md` - Phase 1 & 2

### Option 2: Proper Fix This Month 🔧
**Time:** 1 week
**Effort:** Medium
**How:** Do Quick Fix + move test files + create exports

→ **See:** `IMPORT_VIOLATIONS_FIX_GUIDE.md` - Phase 1, 2, 3

### Option 3: Comprehensive Refactor This Quarter 📐
**Time:** 2-3 weeks
**Effort:** High
**How:** Extract internal packages, define boundaries, enforce rules

→ **See:** `IMPORT_VIOLATIONS_SUMMARY.md` - Option C

---

## Start Now: 3 Steps to Phase 1 (Today)

### Step 1: Create vitest config (5 min)
```bash
# Create apps/vscode/vitest.config.ts
cat > apps/vscode/vitest.config.ts << 'EOF'
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@snapback/vscode": path.resolve(__dirname, "./src"),
    },
  },
});
EOF
```

### Step 2: Run automated fix (10 min)
```bash
# Fix top API pattern (affects 68 files)
find apps/api -name "*.ts" | xargs sed -i '' \
  -e 's|from ['"'"'"]\.\./\.\./\.\./orpc/procedures['"'"'"]|from "@snapback/api/orpc"|g'

# Run tests
pnpm test
```

### Step 3: Commit & move to Phase 2 (5 min)
```bash
git checkout -b refactor/import-violations
git add .
git commit -m "chore: configure path aliases and fix top API imports"
git push origin refactor/import-violations
```

**Done!** You've fixed 68 files in 20 minutes.

---

## Files You Need

📄 **IMPORT_VIOLATIONS_INVENTORY.md** (455 lines)
- Complete list of all 255 files
- Detailed analysis by location
- Root cause analysis

📄 **IMPORT_VIOLATIONS_SUMMARY.md** (410 lines)
- Decision guide (Options A/B/C)
- Timeline & effort estimates
- Risk mitigation

📄 **IMPORT_VIOLATIONS_FIX_GUIDE.md** (581 lines)
- Step-by-step implementation
- Code snippets ready to use
- Validation procedures

📄 **IMPORT_VIOLATIONS_INVENTORY.csv** (256 rows)
- Machine-readable format
- All 255 files listed
- Easy to import to tracking tools

---

## Decision Matrix

| Want... | Choose... | Time | See... |
|---------|-----------|------|--------|
| Quick win | Option 1 | 1-2 days | Phase 1 in Fix Guide |
| Proper solution | Option 2 | 1 week | Phase 1-3 in Fix Guide |
| Best architecture | Option 3 | 2-3 weeks | Summary > Option C |
| Just understand | None yet | 30 min | This doc + Inventory |

---

## Top 3 Common Violations

These alone account for 150+ files:

```typescript
// 1️⃣ API procedures (68 files)
❌ import { adminProcedure } from "../../../orpc/procedures";
✅ import { adminProcedure } from "@snapback/api/orpc";

// 2️⃣ VSCode tests (54 files)
❌ import { getDb } from "../../../src/services/database";
✅ import { getDb } from "@snapback/vscode/services";

// 3️⃣ VSCode types (13 files)
❌ import type { SnapBackRC } from "../../../src/types/snapbackrc.types";
✅ import type { SnapBackRC } from "@snapback/vscode/types";
```

---

## Checklist: Before You Start

- [ ] Read this document (5 min)
- [ ] Skim `IMPORT_VIOLATIONS_INVENTORY.md` (10 min)
- [ ] Decide: Option 1, 2, or 3?
- [ ] Read relevant phase in `IMPORT_VIOLATIONS_FIX_GUIDE.md`
- [ ] Create feature branch
- [ ] Start Phase 1 (configuration)

---

## FAQ

**Q: Is this urgent?**
A: Low priority for functionality, medium for maintainability. Do Phase 1 this week.

**Q: Can we automate this?**
A: Yes! Phase 1 is 100% automated. Phase 2 is 80% automated.

**Q: Will it break anything?**
A: No. Phase 1 is configuration-only. Follow testing procedure for Phase 2.

**Q: How long?**
A: Phase 1 = 2 hours. Phase 2 = 1 week. Phase 3 = 2-3 weeks.

**Q: Do we need to do all 3 phases?**
A: No. Phase 1 is essential. Phase 2 recommended. Phase 3 only if extracting packages.

---

## Current Status

| Phase | Status | Files |
|-------|--------|-------|
| **1** | 🟡 Ready to start | Create configs, 68 API files |
| **2** | 🔴 Needs planning | Remaining patterns, tests |
| **3** | 🔴 Future | Package extraction |

---

## Right Now: Pick One

### Pick this if you want to help NOW:
```bash
git checkout -b fix/api-imports
# Follow Phase 1 in IMPORT_VIOLATIONS_FIX_GUIDE.md
# Takes 1-2 hours
# Creates PR with 68 files fixed
```

### Pick this if you want to understand the scope:
```
Read: IMPORT_VIOLATIONS_INVENTORY.md (15 min)
```

### Pick this if you need to decide what to do:
```
Read: IMPORT_VIOLATIONS_SUMMARY.md (20 min)
Read: Option A/B/C section
Make decision ✅
```

---

## Next Step

**Choose one:**

1. **Do Phase 1 now** → Create PR with config + top patterns fixed
2. **Schedule Phase 2** → Plan 1-week effort to organize tests
3. **Plan Phase 3** → Design package extraction (future)
4. **Just track it** → Add to backlog with links to inventory files

---

## Links

- **Detailed inventory:** `IMPORT_VIOLATIONS_INVENTORY.md`
- **Decision guide:** `IMPORT_VIOLATIONS_SUMMARY.md`
- **Implementation:** `IMPORT_VIOLATIONS_FIX_GUIDE.md`
- **Tracking:** `IMPORT_VIOLATIONS_INVENTORY.csv`

---

**Recommendation:** Start with Phase 1 today (2 hours) + Phase 2 next week (1 week). Skip Phase 3 unless planning major refactor.

**Questions?** See the detailed guides above. 📚
