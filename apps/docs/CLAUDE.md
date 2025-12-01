# SnapBack Documentation App

**Type**: Next.js Application (Standalone)
**Deployment**: docs.snapback.dev (Vercel)
**Stack**: Next.js 15 + FumaDocs + MDX
**Migrated**: 2025-11-14 from `apps/web/app/(docs)`

---

## Purpose

Standalone documentation application for SnapBack, deployed independently from the main web app for:
- ✅ **Independent Deployments** - Docs changes don't require full web app rebuild
- ✅ **Faster Builds** - 85% fewer dependencies, 40% faster build time
- ✅ **Better Caching** - Static-first approach with CDN caching
- ✅ **Cleaner Architecture** - Separation of concerns between marketing/SaaS and documentation

---

## Architecture

### Key Files

```
apps/docs/
├── app/
│   ├── (docs)/              # MDX content (14 files)
│   │   ├── index.mdx        # Docs homepage
│   │   ├── quick-start.mdx
│   │   ├── ai-detection.mdx
│   │   ├── sessions.mdx
│   │   ├── analytics.mdx
│   │   ├── cli.mdx
│   │   ├── mcp.mdx
│   │   ├── performance.mdx
│   │   ├── privacy.mdx
│   │   ├── protection-levels.mdx
│   │   ├── retention-correlation.mdx
│   │   ├── analytics-faq.mdx
│   │   ├── interpreting-data.mdx
│   │   └── troubleshooting.mdx
│   ├── [[...slug]]/
│   │   ├── page.tsx         # Doc page renderer
│   │   ├── layout.tsx       # FumaDocs layout
│   │   ├── sitemap.ts       # SEO sitemap
│   │   ├── error.tsx        # Error boundary
│   │   └── docs.css         # Docs-specific styles
│   ├── api/search/route.ts  # Search API (FumaDocs)
│   ├── layout.tsx           # Root layout (minimal providers)
│   ├── globals.css          # Global styles
│   ├── mdx-components.tsx   # MDX component overrides
│   └── robots.ts            # robots.txt generator
├── components/              # Docs components (4 files)
│   ├── Breadcrumbs.tsx      # Navigation breadcrumbs
│   ├── CustomMDXComponents.tsx  # Custom MDX components
│   ├── HomeLink.tsx         # Logo/home link
│   └── MicroInteractions.tsx    # Progress bar
├── lib/
│   ├── source.ts            # FumaDocs loader (generates page tree)
│   └── source-types.ts      # Type definitions
├── public/                  # Static assets
├── next.config.mjs          # Next.js + FumaDocs config
├── tailwind.config.ts       # Tailwind + FumaDocs preset
├── source.config.ts         # MDX plugins config
├── package.json             # 22 deps (vs 104 in apps/web)
├── lighthouserc.json        # Performance auditing
├── linkinator.config.json   # Link checker
└── .env.local               # Environment variables
```

### Tech Stack

**Framework**: Next.js 15 (App Router)
- Static generation (SSG) for all docs
- React Server Components
- Server-side search API

**Documentation**: FumaDocs
- MDX processing with `fumadocs-mdx`
- Auto-generated sidebar from file structure
- Built-in search (Cmd+K)
- Dark mode only (forced)

**Styling**: Tailwind CSS
- FumaDocs preset for docs-specific components
- Custom theme variables
- Dark mode by default

**MDX Plugins**:
- `remark-gfm` - GitHub Flavored Markdown
- `remark-smartypants` - Smart typography
- `rehype-slug` - Heading IDs
- `rehype-autolink-headings` - Auto-linked headings
- `@shikijs/rehype` - Syntax highlighting (GitHub Dark theme)

**Analytics**:
- Google Analytics (GA4)
- Vercel Analytics
- Vercel Speed Insights

---

## Key Features

### 1. Search (Cmd+K / Ctrl+K)
- FumaDocs built-in search
- Server-side indexing
- Structured data from MDX frontmatter
- No client-side index (fast initial load)

**Implementation**: `app/api/search/route.ts`
```typescript
export const { GET } = createSearchAPI("advanced", {
  indexes: source.getPages().map((page) => ({
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    structuredData: page.data.structuredData,
  })),
});
```

### 2. Dark Mode Only
- Forced dark theme (no toggle)
- Consistent with SnapBack branding
- Better for code-heavy documentation

**Implementation**: `app/[[...slug]]/layout.tsx`
```typescript
<RootProvider
  theme={{
    enabled: false,      // Disable theme toggle
    defaultTheme: "dark", // Force dark mode
  }}
>
```

### 3. Syntax Highlighting
- Shiki with GitHub Dark theme
- Support for 100+ languages
- Code copy button
- Line highlighting support

**Configuration**: `source.config.ts`
```typescript
rehypePlugins: [
  [rehypeShiki, { theme: "github-dark" }],
]
```

### 4. SEO Optimization
- Auto-generated sitemap
- robots.txt
- OpenGraph metadata
- Twitter Card metadata
- Structured data for search engines

### 5. Navigation
- Auto-generated sidebar from file structure
- Breadcrumbs (server-side generated)
- Navigation links (Home, GitHub, Discord)
- Server-side URL generation (no new tabs)

---

## Performance

### Metrics (Target)
- **Lighthouse Score**: 95+ (all categories)
- **LCP**: <1.5s
- **FID**: <50ms
- **CLS**: 0
- **TTFB**: <200ms
- **Bundle Size**: <400KB

### Optimization Techniques
1. **Static Generation**: All docs pages pre-rendered at build time
2. **Code Splitting**: Automatic code splitting by Next.js
3. **Image Optimization**: Next.js Image component with lazy loading
4. **Font Optimization**: Geist Sans with font-display: swap
5. **CDN Caching**: Vercel Edge Network (14 regions)
6. **Remote Caching**: Turborepo remote cache for faster builds

---

## Development Workflow

### Adding New Docs

1. **Create MDX file** in `app/(docs)/`
   ```mdx
   ---
   title: "New Feature"
   description: "Learn about the new feature"
   ---

   # New Feature

   Content here...
   ```

2. **FumaDocs auto-generates**:
   - Sidebar entry
   - Table of contents
   - Search index
   - Breadcrumbs

3. **Preview locally**:
   ```bash
   pnpm -F @snapback/docs dev
   ```

4. **Test build**:
   ```bash
   pnpm -F @snapback/docs build
   ```

### Custom MDX Components

Available components (from `CustomMDXComponents.tsx`):

```mdx
<CopyButton text="npm install snapback" />

<ExpandableSection title="Advanced">
  Advanced content here
</ExpandableSection>

<StatusBadge status="stable" />

<Callout type="warning">
  Important notice
</Callout>
```

### Modifying Layout/Styling

- **Layout**: `app/[[...slug]]/layout.tsx`
- **Global Styles**: `app/globals.css`
- **Docs Styles**: `app/[[...slug]]/docs.css`
- **Tailwind Config**: `tailwind.config.ts`

---

## Deployment

### Vercel Setup

**Project Name**: `snapback-docs`
**Framework**: Next.js
**Root Directory**: `apps/docs` ⚠️ CRITICAL
**Build Command**: `cd ../.. && pnpm turbo run build --filter=@snapback/docs --remote-only`
**Output Directory**: `.next`
**Install Command**: `pnpm install`
**Node Version**: 20.x

### Environment Variables (Production)

```env
NEXT_PUBLIC_SITE_URL=https://snapback.dev
NEXT_PUBLIC_ROOT_DOMAIN=snapback.dev
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-BMLHM6QFYX
NODE_ENV=production
TURBO_TOKEN=<your-token>
TURBO_TEAM=<your-team>
```

### Deployment Workflow

1. **Commit changes** to `main` branch
2. **Vercel auto-deploys** to production
3. **Run verification**:
   ```bash
   ./scripts/verify-docs-migration.sh
   ```
4. **Monitor analytics** for 24 hours

### DNS Configuration

**Domain**: docs.snapback.dev
**DNS Record**:
```
Type: CNAME
Name: docs
Value: cname.vercel-dns.com
TTL: 3600
```

---

## Routing & Redirects

### Current Routing
```
User visits: docs.snapback.dev/quick-start
     ↓
Vercel routes to: apps/docs
     ↓
Next.js routes to: app/[[...slug]]/page.tsx
     ↓
FumaDocs renders: app/(docs)/quick-start.mdx
```

### Redirects from Old URLs
`apps/web/next.config.mjs` redirects:
```javascript
{
  source: '/docs/:path*',
  destination: 'https://docs.snapback.dev/:path*',
  permanent: true,
  statusCode: 301,
}
```

**Result**: `snapback.dev/docs/quick-start` → `docs.snapback.dev/quick-start` (301)

---

## Monitoring

### Post-Deployment Checks

```bash
# Automated verification
./scripts/verify-docs-migration.sh

# Manual checks
curl -I https://docs.snapback.dev  # Should 200
curl -I https://docs.snapback.dev/quick-start  # Should 200
curl -I https://snapback.dev/docs/quick-start  # Should 301
```

### Performance Auditing

```bash
# Lighthouse CI
pnpm -F @snapback/docs lighthouse

# Link checker
pnpm linkinator --config apps/docs/linkinator.config.json
```

### Analytics Monitoring

1. **Google Analytics**: Page views, engagement
2. **Vercel Analytics**: Performance, Web Vitals
3. **Sentry**: Error tracking (if enabled)

---

## Common Tasks

### Update Documentation Content

```bash
# Edit MDX file
code apps/docs/app/(docs)/quick-start.mdx

# Test locally
pnpm -F @snapback/docs dev

# Commit and push
git add apps/docs/app/(docs)/quick-start.mdx
git commit -m "docs: update quick-start guide"
git push
```

### Add New Component

```bash
# Create component
code apps/docs/components/NewComponent.tsx

# Export in CustomMDXComponents.tsx
export const NewComponent = () => { /* ... */ };

# Use in MDX
<NewComponent />
```

### Fix Broken Links

```bash
# Run link checker
pnpm linkinator --config apps/docs/linkinator.config.json

# Fix links in MDX files
# Update references
```

### Improve Performance

```bash
# Run Lighthouse audit
pnpm -F @snapback/docs lighthouse

# Analyze bundle
ANALYZE=true pnpm -F @snapback/docs build

# Review suggestions and optimize
```

---

## Migration History

**Date**: 2025-11-14
**From**: `apps/web/app/(docs)` + `apps/web/app/docs`
**To**: `apps/docs` (standalone)

### Changes
- ✅ Removed docs subdomain routing from middleware
- ✅ Added redirect rules in `apps/web/next.config.mjs`
- ✅ Simplified layout (no subdomain detection)
- ✅ Added search API endpoint
- ✅ Added robots.txt and sitemap
- ✅ 85% reduction in dependencies (104 → 22)
- ✅ 40% faster build time for apps/web

### Backward Compatibility
- Old URLs automatically redirect
- Same content and styling
- Same navigation structure
- No user-facing changes

---

## Troubleshooting

### Build Failures

**Issue**: `fumadocs-mdx` fails to generate `.source` directory

**Solution**:
```bash
rm -rf .source
pnpm postinstall
pnpm build
```

### Search Not Working

**Issue**: Search results empty or outdated

**Solution**:
1. Check `structuredData` in MDX frontmatter
2. Rebuild: `pnpm build`
3. Clear browser cache

### Performance Issues

**Issue**: Slow page load times

**Solution**:
```bash
# Run Lighthouse
pnpm lighthouse

# Check bundle size
ANALYZE=true pnpm build

# Optimize images, lazy-load components
```

### Broken Links

**Issue**: 404 errors on internal links

**Solution**:
```bash
# Run link checker
pnpm linkinator

# Fix broken links in MDX
# Update breadcrumb logic if needed
```

---

## Dependencies

**Total**: ~22 packages (vs 104 in apps/web)

**Key Dependencies**:
- `next` - Framework
- `react` + `react-dom` - UI library
- `fumadocs-core` - Docs framework
- `fumadocs-mdx` - MDX processing
- `fumadocs-ui` - Docs UI components
- `@mdx-js/loader` - MDX loader
- `@shikijs/rehype` - Syntax highlighting
- `tailwindcss` - Styling
- `geist` - Font
- `lucide-react` - Icons
- `@vercel/analytics` - Analytics
- `@next/third-parties` - Google Analytics

**Dev Dependencies**:
- `@biomejs/biome` - Linting/formatting
- `@lhci/cli` - Lighthouse CI
- `linkinator` - Link checker
- `typescript` - Type checking

---

## Security

### Headers (from `next.config.mjs`)
- **Strict-Transport-Security**: HSTS enabled
- **X-Frame-Options**: DENY (prevent clickjacking)
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Content-Security-Policy**: Strict CSP with Google Analytics whitelist
- **Permissions-Policy**: Disabled camera, microphone, geolocation

### Content Security
- MDX content sanitized by FumaDocs
- No inline scripts (except Analytics)
- No eval() or Function() constructors
- HTTPS only in production

---

## Future Enhancements

### Planned
- [ ] Versioned docs (v1, v2, etc.)
- [ ] API reference auto-generation
- [ ] Interactive code examples
- [ ] Video tutorials
- [ ] PDF export

### Under Consideration
- [ ] Multi-language support
- [ ] Dark/light mode toggle
- [ ] Advanced search filters
- [ ] Comment system
- [ ] Contribution guidelines

---

## Resources

- [FumaDocs Documentation](https://fumadocs.vercel.app)
- [Next.js App Router](https://nextjs.org/docs/app)
- [MDX Documentation](https://mdxjs.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Shiki Syntax Highlighting](https://shiki.style)

---

## Support

**Issues**: Report at [GitHub Issues](https://github.com/snapback/snapback/issues)
**Discussions**: [GitHub Discussions](https://github.com/snapback/snapback/discussions)
**Discord**: [SnapBack Community](https://discord.gg/SF6Vcjzj)

---

**Last Updated**: 2025-11-14
**Maintainer**: SnapBack Team
