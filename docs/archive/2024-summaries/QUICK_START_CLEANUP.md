# Quick Start: I18N Cleanup

**⏱️ Total Time**: 2-3 hours
**📁 Files**: ~50-60 files
**⚠️ Risk**: Medium-High

## TL;DR

Complete removal of i18n (next-intl) and content-collections from SnapBack-Site codebase.

## Quick Start

```bash
# 1. Create branch
git checkout -b cleanup/i18n-final

# 2. Follow execution guide
open claudedocs/active/I18N_CLEANUP_EXECUTION_GUIDE.md

# 3. Execute phases 1-6
# 4. Test and commit
# 5. Create PR
```

## 6 Phases

| Phase                  | Time | Risk     | What                                         |
| ---------------------- | ---- | -------- | -------------------------------------------- |
| 1. Mail Package        | 30m  | Low      | Replace i18n with English in email templates |
| 2. Components          | 45m  | Med      | Replace LocaleLink with Next.js Link         |
| 3. Config              | 15m  | Low      | Remove i18n config                           |
| 4. Content-Collections | 15m  | Med      | Remove wrapper                               |
| 5. Route Migration     | 60m  | **HIGH** | Move [locale] directory (MANUAL)             |
| 6. Cleanup             | 15m  | Low      | Remove packages, verify                      |

## Critical Files

### Must Update (High Priority)

-   `packages/mail/emails/*.tsx` (6 files) - Email templates
-   `apps/web/modules/marketing/shared/components/NavBar.tsx` - Navigation
-   `config/types.ts` and `config/index.ts` - Remove i18n types
-   `apps/web/next.config.ts` - Remove content-collections wrapper

### Route Migration (HIGH RISK - Manual Required)

-   Move: `apps/web/app/(marketing)/[locale]/*` → `apps/web/app/(marketing)/*`
-   Delete: `apps/web/app/(marketing)/[locale]/layout.tsx`
-   Remove: `apps/web/app/(marketing)/[locale]/` directory

## Verification After Each Phase

```bash
# Type check
pnpm --filter web run type-check

# Build
pnpm --filter web run build

# Commit
git add .
git commit -m "Phase X: <description>"
```

## Final Checklist

```bash
# No i18n imports
grep -r "@i18n/routing" apps/web --include="*.tsx"
# Should: No results

# No use-intl
grep -r "use-intl" packages/mail --include="*.tsx"
# Should: No results

# No config.i18n
grep -r "config\.i18n" apps/web --include="*.tsx"
# Should: No results

# No [locale] directory
find apps/web/app -type d -name "\[locale\]"
# Should: No results

# Type check passes
pnpm --filter web run type-check
# Should: ✓ Success

# Build succeeds
pnpm --filter web run build
# Should: ✓ Success
```

## Test Routes

After completion, manually test:

-   http://localhost:3000/ (Home)
-   http://localhost:3000/blog (Blog)
-   http://localhost:3000/docs (Docs)
-   http://localhost:3000/legal/privacy (Legal)
-   http://localhost:3000/auth/login (Auth)

## Rollback

If something breaks:

```bash
# See commits
git log --oneline

# Revert
git reset --hard <last-good-commit>
```

## Full Documentation

📚 **Complete Guides** (in `claudedocs/active/`):

1. **I18N_CLEANUP_EXECUTION_GUIDE.md**

    - Step-by-step instructions
    - Exact code to copy/paste
    - Verification steps
    - Troubleshooting

2. **I18N_CONTENT_COLLECTIONS_CLEANUP_REPORT.md**

    - Detailed file inventory
    - Line-by-line changes
    - Pattern analysis

3. **I18N_REMOVAL_ARCHITECTURE.md**
    - Why we're doing this
    - Before/after architecture
    - Design decisions

## Common Issues

### TypeScript Errors

```bash
rm -rf apps/web/.next
pnpm --filter web run build
```

### Import Errors

```bash
pnpm store prune
pnpm install
```

### Routes Not Working

-   Check for locale params in moved files
-   Verify layout.tsx files
-   Check middleware

## Need Help?

1. Check execution guide troubleshooting section
2. Review architecture doc for context
3. Check git commits for what changed

---

**🎯 Start Here**: `claudedocs/active/I18N_CLEANUP_EXECUTION_GUIDE.md`

**📊 Progress**: Analysis ✅ | Documentation ✅ | Ready to Execute ⏳
