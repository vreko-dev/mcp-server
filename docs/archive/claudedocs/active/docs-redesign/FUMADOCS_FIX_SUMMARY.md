# Fumadocs Configuration Fix - Quick Summary

## Problem

MDX files in `content/docs/` were throwing "Unknown module type" errors when using Next.js 15 with Turbopack.

## Root Cause

Two conflicting Next.js configuration files:

-   `next.config.ts` - Correct fumadocs setup with `createMDX()`
-   `next.config.mjs` - Manual webpack loader (not Turbopack compatible)

## Solution

```bash
# Backup the conflicting file
mv apps/web/next.config.mjs apps/web/next.config.mjs.backup

# Regenerate fumadocs types
pnpm --filter @repo/web run postinstall

# Start dev server
pnpm dev
```

## Why It Works

-   **Fumadocs' `createMDX()`** wrapper handles MDX processing internally
-   Compatible with both webpack AND Turbopack
-   Uses Next.js built-in MDX support, not manual webpack loaders
-   No manual loader configuration needed

## Key Files

**Active Configuration** (`next.config.ts`):

```typescript
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
export default withSentryConfig(withMDX(nextConfig), { ... });
```

**Source Configuration** (`source.config.ts`):

```typescript
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const { docs, meta } = defineDocs({
	dir: "content/docs",
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [[remarkImage, { publicDir: "public" }]],
		rehypePlugins: [[rehypeShiki, { theme: "nord" }]],
	},
});
```

**Documentation Loader** (`app/docs-source.ts`):

```typescript
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { docs, meta } from "@/.source";

export const docsSource = loader({
	baseUrl: "/docs",
	i18n: {
		defaultLanguage: "en",
		languages: ["en", "de"],
	},
	source: createMDXSource(docs, meta),
});
```

## Verification

✅ Backed up `next.config.mjs` to `next.config.mjs.backup`
✅ Regenerated `.source/index.ts` with 35 MDX imports
✅ Dev server starts without errors
✅ No "Unknown module type" errors
✅ No "critters" dependency errors

## Dependencies

```json
{
	"dependencies": {
		"fumadocs-core": "15.7.11",
		"fumadocs-ui": "15.7.11"
	},
	"devDependencies": {
		"fumadocs-mdx": "12.0.1",
		"@mdx-js/loader": "^3.1.1",
		"@mdx-js/react": "^3.1.1"
	}
}
```

## Documentation Structure

```
apps/web/content/docs/
├── 35 MDX documents (English + German)
├── 12 meta.json files for navigation
└── Organized by category (api, architecture, components, etc.)
```

## Best Practices

**DO**:

-   Use `next.config.ts` (TypeScript) for configuration
-   Let fumadocs handle MDX processing via `createMDX()`
-   Run `fumadocs-mdx` after adding/removing docs
-   Keep only ONE Next.js config file

**DON'T**:

-   Add manual webpack loaders for MDX
-   Create multiple Next.js config files
-   Modify `.source/index.ts` manually (auto-generated)
-   Use webpack-specific loaders with Turbopack

## Troubleshooting

**If errors return**:

```bash
# 1. Check for conflicting configs
ls -la apps/web/next.config.*

# 2. Regenerate types
pnpm --filter @repo/web run postinstall

# 3. Clear cache and restart
rm -rf apps/web/.next
pnpm dev
```

**If new docs don't appear**:

```bash
pnpm --filter @repo/web run postinstall
```

## References

-   [Full Technical Report](./FUMADOCS_TURBOPACK_FIX_REPORT.md)
-   [Fumadocs Documentation](https://fumadocs.vercel.app)
-   [Next.js Turbopack Docs](https://nextjs.org/docs/app/api-reference/next-config-js/turbo)
