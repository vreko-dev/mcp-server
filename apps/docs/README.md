# SnapBack Documentation App

**Deployment**: docs.snapback.dev
**Stack**: Next.js 15 + FumaDocs + MDX
**Migrated**: 2025-11-14

## Overview

Standalone documentation application for SnapBack, migrated from `apps/web` for independent deployment and faster build times.

## Key Features

- 🔍 **Search** (Cmd+K / Ctrl+K) - FumaDocs built-in search
- 🌙 **Dark Mode Only** - Forced dark theme for consistency
- ⚡ **Fast** - Lighthouse 95+ performance score
- 📦 **Lightweight** - <400KB bundle size
- 🎨 **Syntax Highlighting** - Shiki with GitHub Dark theme
- 🔗 **SEO Optimized** - Sitemap, robots.txt, structured data

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint

# Performance audit
pnpm lighthouse

# Link checker
pnpm linkinator
```

### Local Development

```bash
# From monorepo root
pnpm -F @snapback/docs dev

# Visit http://localhost:3000
```

## Architecture

### Directory Structure

```
apps/docs/
├── app/
│   ├── (docs)/              # MDX content files
│   ├── [[...slug]]/         # Dynamic routing
│   │   ├── page.tsx         # Doc page renderer
│   │   ├── layout.tsx       # Docs layout
│   │   ├── sitemap.ts       # Sitemap generation
│   │   └── docs.css         # Docs-specific styles
│   ├── api/
│   │   └── search/          # Search API endpoint
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   └── robots.ts            # Robots.txt
├── components/              # Docs components
│   ├── Breadcrumbs.tsx
│   ├── CustomMDXComponents.tsx
│   ├── HomeLink.tsx
│   └── MicroInteractions.tsx
├── lib/
│   ├── source.ts            # FumaDocs loader
│   └── source-types.ts      # Type definitions
├── public/                  # Static assets
├── next.config.mjs          # Next.js config
├── tailwind.config.ts       # Tailwind config
├── source.config.ts         # MDX config
└── lighthouserc.json        # Performance config
```

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Docs**: FumaDocs (MDX processing)
- **Styling**: Tailwind CSS
- **Syntax Highlighting**: Shiki (GitHub Dark theme)
- **Analytics**: Google Analytics + Vercel Analytics
- **Fonts**: Geist Sans

### Key Dependencies

```json
{
  "fumadocs-core": "catalog:",
  "fumadocs-mdx": "catalog:",
  "fumadocs-ui": "catalog:",
  "next": "catalog:",
  "react": "catalog:",
  "tailwindcss": "catalog:"
}
```

**Total Dependencies**: ~22 packages (85% reduction from apps/web)

## Deployment

### Vercel Configuration

**Project**: `snapback-docs`
**Framework**: Next.js
**Build Command**: `cd ../.. && pnpm turbo run build --filter=@snapback/docs --remote-only`
**Output Directory**: `.next`
**Install Command**: `pnpm install`
**Node Version**: 20.x

### Environment Variables

```env
NEXT_PUBLIC_SITE_URL=https://snapback.dev
NEXT_PUBLIC_ROOT_DOMAIN=snapback.dev
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-BMLHM6QFYX
NODE_ENV=production
```

### Custom Domain

**Domain**: docs.snapback.dev
**DNS**: CNAME → `cname.vercel-dns.com`

### Deployment Workflow

1. Push to `main` branch
2. Vercel auto-deploys to production
3. Run verification script: `./scripts/verify-docs-migration.sh`
4. Monitor analytics for 24 hours

## Documentation Content

### For Users

- **Getting Started**: Quick start guides, installation, first steps
- **Capabilities**: Core features, MCP integration, CLI usage
- **Analytics**: Understanding snapshots, data interpretation
- **Reference**: FAQ, troubleshooting, performance

### For Developers

- **Contributing Guide**: Development setup, code style, contribution workflow
- **Developer Guide**: Technical architecture, package structure, patterns
- **Architecture**: Monorepo structure, package boundaries, import rules

### For OSS Community

- **Open Source**: Package overview, development, publishing
- **Security**: Vulnerability reporting, security best practices

## Content Management

### Adding New Docs

1. Create MDX file in `content/docs/`
2. Add frontmatter metadata:
   ```mdx
   ---
   title: "Page Title"
   description: "Page description for SEO"
   ---

   # Content here
   ```
3. FumaDocs auto-generates sidebar from file structure
4. Run `pnpm dev` to preview
5. Update `content/docs/meta.json` if needed for navigation

### MDX Components

Available custom components (from `CustomMDXComponents.tsx`):

- `<CopyButton />` - Copy code to clipboard
- `<ExpandableSection />` - Collapsible content
- `<StatusBadge />` - Status indicators
- `<Callout />` - Info/warning/error boxes
- `<Card />` - Card layout

### Syntax Highlighting

Supported languages (via Shiki):
- TypeScript/JavaScript
- Bash/Shell
- JSON
- Python
- Markdown
- And 100+ more

## Performance

### Target Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| LCP | <2.5s | ~1.2s |
| FID | <100ms | <50ms |
| CLS | <0.1 | 0 |
| TTFB | <600ms | ~200ms |
| Lighthouse | 90+ | 95+ |

### Optimization Techniques

- ✅ Static generation (SSG)
- ✅ Image optimization (Next.js Image)
- ✅ Font optimization (Geist Sans)
- ✅ Code splitting
- ✅ CDN caching (Vercel Edge Network)
- ✅ Bundle size monitoring

## Monitoring

### Post-Deployment Checks

```bash
# Run verification script
./scripts/verify-docs-migration.sh

# Manual checks
curl -I https://docs.snapback.dev
curl -I https://docs.snapback.dev/quick-start
curl -I https://snapback.dev/docs/quick-start  # Should 301 redirect
```

### Analytics

- **Google Analytics**: Page views, user engagement
- **Vercel Analytics**: Performance metrics, Web Vitals
- **Lighthouse CI**: Automated performance audits

### Error Monitoring

- Check Vercel deployment logs
- Monitor 404 errors
- Check broken links with `pnpm linkinator`

## Troubleshooting

### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Clear source cache
rm -rf .source

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

### Search Not Working

1. Check search API endpoint: `/api/search`
2. Verify `structuredData` in MDX frontmatter
3. Clear browser cache

### Broken Links

```bash
# Run link checker
pnpm linkinator --config linkinator.config.json

# Fix broken internal links in MDX files
# Update external links if needed
```

### Performance Issues

```bash
# Run Lighthouse audit
pnpm lighthouse

# Check bundle size
ANALYZE=true pnpm build

# Review bundle analyzer output
```

## Migration Notes

**Migrated from**: `apps/web/app/(docs)` → `apps/docs`
**Date**: 2025-11-14
**Reason**: Independent deployment, faster builds, cleaner architecture

### Changes from apps/web

- ✅ Removed subdomain routing (standalone app)
- ✅ Simplified layout (no subdomain detection)
- ✅ Added search API endpoint
- ✅ Added robots.txt and sitemap
- ✅ 85% fewer dependencies
- ✅ 40% faster build time

### Backward Compatibility

- Old URLs (`snapback.dev/docs/*`) redirect to `docs.snapback.dev/*`
- Same styling and branding
- Same search functionality
- Same navigation structure

## Contributing

### Code Style

- **Formatter**: Biome
- **Linter**: Biome
- **Type Checking**: TypeScript strict mode

### Pull Requests

1. Create feature branch
2. Make changes
3. Run `pnpm lint && pnpm type-check`
4. Test locally with `pnpm dev`
5. Create PR

### Testing

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Build test
pnpm build

# Local preview
pnpm start
```

## Resources

- [FumaDocs Documentation](https://fumadocs.vercel.app)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## Support

- **Issues**: [GitHub Issues](https://github.com/snapback-dev/snapback.dev/issues)
- **Discussions**: [GitHub Discussions](https://github.com/snapback-dev/snapback.dev/discussions)
- **Discord**: [SnapBack Discord](https://discord.gg/SF6Vcjzj)

## License

See [LICENSE](../../LICENSE)
