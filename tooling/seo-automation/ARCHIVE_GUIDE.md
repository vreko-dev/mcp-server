# Archive Cleanup System

Quick reference for the automated file archival system.

## What It Does

Automatically moves non-essential files to `.archive/` before publish, organized by category:

- **dev-notes**: Scratch files, drafts, TODOs
- **reviews**: Code review files
- **deprecated**: Old versions, backups
- **test-artifacts**: Non-essential fixtures
- **planning**: Design docs not in production
- **duplicates**: macOS/Windows file copies
- **temp-artifacts**: Log files, caches

## Usage

```bash
# Dry run (see what would be archived)
pnpm --filter @snapback/seo-automation seo:archive-clutter:dry-run

# Actually archive files
pnpm --filter @snapback/seo-automation seo:archive-clutter

# Integrated in full SEO automation
pnpm turbo seo:full  # Runs dry-run automatically
```

## Protected Files (Never Archived)

- `package.json`, `tsconfig.json`
- `README.md`, `LICENSE`
- `.gitignore`, `.env*`
- `Dockerfile`, `Makefile`
- `.github/` workflows
- `node_modules/`, `dist/`, `.next/`

## Archive Structure

```
.archive/
├── dev-notes/
│   └── 2025-12-05/
│       └── apps/web/scratch-notes.md
├── deprecated/
│   └── 2025-12-05/
│       └── packages/core/old-api.ts
└── planning/
    └── 2025-12-05/
        └── DESIGN-doc.md
```

## Restore a File

```bash
# Find archived file
ls -R .archive/

# Move back to original location
mv .archive/[category]/[date]/[path] [original-path]
```

## Customization

Edit `tooling/seo-automation/src/archive-clutter.ts` to add rules:

```typescript
{
  pattern: /my-pattern/,
  category: 'my-category',
  description: 'Description',
  test: (filepath) => /my-pattern/.test(filepath),
}
```

## Integration

Runs automatically in `pnpm turbo seo:full` as dry-run (safe preview).

For actual archival before publish, run explicitly:
```bash
pnpm --filter @snapback/seo-automation seo:archive-clutter
```
