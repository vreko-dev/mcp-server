# SEO Automation Package

**Pristine SEO automation for SnapBack content - industry standard + cut above**

## Overview

This package provides comprehensive, automated SEO polish that runs during the publish process via Turborepo. Every optimization is based on 2025 industry best practices with AI-optimized content strategies.

## Features

### ✅ What Turborepo Handles (Built-in)
- Task orchestration (`seo:lint` → `seo:optimize` → `seo:validate` → `seo:full`)
- Caching (markdown/image inputs tracked)
- Parallel execution across packages
- Dependency graphs (`deploy` depends on `seo:full`)
- Incremental builds (only changed content)

### ✅ What This Package Adds (External Libraries Needed)

#### 1. Markdown Linting
**Tool**: `markdownlint-cli2` + `markdownlint`
**Why Needed**: Turbo can't validate markdown syntax
**What It Does**:
- Heading hierarchy (H1 → H2 → H3, no skips)
- Consistent formatting (ATX headers, dash lists)
- Code block fencing
- HTML element whitelist for MDX

#### 2. Image Optimization
**Tool**: `sharp` (high-performance image processing)
**Why Needed**: Turbo can't transform images
**What It Does**:
- Convert to WebP/AVIF (60-80% size reduction)
- Generate 8 responsive sizes (640w-3840w)
- Create blur placeholders (base64 data URLs)
- Strip EXIF metadata
- Validate alt text presence

#### 3. SEO Content Validation
**Tools**: `gray-matter` + `zod` + custom algorithms
**Why Needed**: Turbo can't analyze content quality
**What It Does**:
- Metadata schema validation (Zod)
- Keyword density analysis (prevent over-optimization)
- Reading time calculation
- Word count thresholds (300+ for SEO)
- Heading hierarchy validation

#### 4. Link Validation
**Tools**: Custom (uses Node.js `fs` + `glob`)
**Why Needed**: Turbo can't check file references
**What It Does**:
- Broken internal link detection
- Missing page warnings
- Anchor target validation

## Installation

Already configured! Just install dependencies:

```bash
cd tooling/seo-automation
pnpm install
```

## Usage

### Via Turborepo (Recommended)

```bash
# Full SEO automation suite
pnpm turbo seo:full

# Individual tasks
pnpm turbo seo:lint      # Markdown linting
pnpm turbo seo:optimize  # Image optimization
pnpm turbo seo:validate  # Content validation

# File archival (cleanup)
pnpm --filter @snapback/seo-automation seo:archive-clutter:dry-run  # Preview
pnpm --filter @snapback/seo-automation seo:archive-clutter          # Execute
```

### Direct Execution

```bash
cd tooling/seo-automation

# Lint markdown
pnpm seo:lint-markdown

# Optimize images
pnpm seo:optimize-images

# Validate SEO
pnpm seo:validate

# Check links
pnpm seo:check-links

# Full suite
pnpm seo:full
```

## What Turborepo Can vs Cannot Do

### ✅ Turborepo Strengths
- Task orchestration (perfect for our SEO pipeline)
- Caching validation results
- Running tasks in dependency order
- Filtering changed packages (`--filter=...[origin/main]`)
- Parallelizing independent tasks

### ❌ Turborepo Limitations (Why We Need External Libs)
- No markdown syntax validation (need `markdownlint`)
- No image transformation (need `sharp`)
- No content analysis (need custom scripts)
- No link checking (need custom scripts)
- No metadata validation (need `zod`)
- **No file management** (need custom archival script)

**Decision**: Use Turborepo for **orchestration**, external libs for **domain-specific tasks**.

## Integration with Publish Workflow

```json
// turbo.json
{
  "tasks": {
    "deploy": {
      "dependsOn": ["test", "seo:full", "docker-build"]
    },
    "seo:full": {
      "dependsOn": ["seo:validate"]
    },
    "seo:validate": {
      "dependsOn": ["seo:optimize"]
    },
    "seo:optimize": {
      "dependsOn": ["seo:lint"]
    }
  }
}
```

**Flow**: `lint` → `optimize` → `validate` → `deploy`

## Expected Performance

### Build Time Impact
- Markdown linting: ~2s
- Image optimization: ~15s (depends on image count)
- Content validation: ~5s
- Link checking: ~8s
- **Total overhead**: ~30s

### SEO Improvements
- Image load time: ↓ 60-80% (WebP/AVIF)
- Lighthouse SEO score: ↑ 15-20 points
- Broken links: 0 (validated pre-deploy)
- Alt text coverage: 100%
- Keyword optimization: Balanced (no penalties)

## Patterns from Research

### Industry Best Practices (Implemented)
✓ Answer-first approach (40-60 words, from Onely research)
✓ Long-form content (>2,000 words for AI citations)
✓ Structured formats (lists, tables for LLM extraction)
✓ Original research signals (E-E-A-T)
✓ Content freshness (updated <30 days)
✓ Schema markup (FAQ, BlogPosting, BreadcrumbList)

### Web Patterns (2025)
✓ WebP/AVIF format priority
✓ Responsive image srcset generation
✓ Blur-up placeholder technique
✓ Lazy loading below-the-fold
✓ CDN-friendly asset structure

### Markdown Patterns
✓ ATX headers (##) over Setext
✓ Fenced code blocks with language tags
✓ Consistent list markers (-)
✓ Semantic heading hierarchy

## Recipes

### Recipe 1: Add New Markdown Rule

```json
// .markdownlintrc.json
{
  "MD050": {
    "style": "asterisk"  // Enforce * for emphasis instead of _
  }
}
```

### Recipe 2: Custom Image Sizes

```typescript
// src/optimize-images.ts
const DEFAULT_CONFIG: ImageOptimizationConfig = {
  sizes: [320, 640, 768, 1024, 1280, 1536, 2048],  // Your breakpoints
};
```

### Recipe 3: Adjust SEO Thresholds

```typescript
// src/validate-all.ts
const MetadataSchema = z.object({
  title: z.string().min(40).max(70),  // Longer titles
  description: z.string().min(140).max(180),
});
```

### Recipe 4: Add External Link Checking

```typescript
// src/check-links.ts
async function checkExternalLink(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

## When NOT to Use

### Skip SEO Automation For:
- Private docs (internal only)
- Draft content (not published)
- Generated content (API docs from code)
- Non-content pages (auth, dashboard)

### Use Manual Process For:
- One-off marketing pages (custom design)
- Landing pages with complex layouts
- Interactive demos (non-standard structure)

## Troubleshooting

### "sharp installation failed"
```bash
# Rebuild sharp for your platform
pnpm rebuild sharp
```

### "Markdown linting too strict"
Edit `.markdownlintrc.json` to disable specific rules.

### "Image optimization too slow"
Reduce `sizes` array or skip placeholder generation.

### "False positive broken links"
Check `resolveInternalLink` function for path resolution logic.

## Future Enhancements

Potential additions (not yet implemented):
- [ ] HTML minification for blog posts
- [ ] CSS unused selector removal
- [ ] External link health monitoring (cron job)
- [ ] Automatic Open Graph image generation
- [ ] AI content quality scoring
- [ ] Reading level analysis (Flesch-Kincaid)
- [ ] Translation validation (i18n)
- [x] **File archival system** (implemented! ✅)

## File Archival Details

See [ARCHIVE_GUIDE.md](./ARCHIVE_GUIDE.md) for full documentation.

**Categories**:
- `dev-notes`: scratch, draft, WIP files
- `reviews`: code review files
- `deprecated`: old versions, backups
- `test-artifacts`: non-essential fixtures
- `planning`: design docs (not in production)
- `duplicates`: macOS/Windows copies
- `temp-artifacts`: logs, caches

**Safety**:
- Dry-run by default in `seo:full`
- Protected files never touched (package.json, README, etc.)
- Preserves directory structure
- Dated archives for easy restoration

## References

**Research Sources**:
- [Onely LLM-Friendly Content](https://www.onely.com/blog/llm-friendly-content/) - AI citation optimization
- [Web.dev Image Optimization](https://web.dev/fast/#optimize-your-images) - Modern formats
- [Markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) - Linting standards

**Tools Used**:
- `sharp` - Image processing (30x faster than ImageMagick)
- `markdownlint-cli2` - Markdown linting (ESLint for markdown)
- `gray-matter` - Frontmatter parsing
- `zod` - Schema validation (type-safe)

---

**DX Philosophy**: One command (`pnpm turbo seo:full`), pristine results, zero manual work.
