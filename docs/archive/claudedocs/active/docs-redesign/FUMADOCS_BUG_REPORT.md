# Fumadocs Bug Report: TypeError - item.startsWith is not a function

## Issue Summary

When accessing the documentation route `/en/docs`, fumadocs throws a `TypeError: item.startsWith is not a function` during page tree processing in the DocsLayout component. The error persists despite upgrading packages, adding missing icons, and trying various configuration approaches.

## Error Details

### Full Error Message

```
TypeError: item.startsWith is not a function
    at DocumentationLayout (app/(marketing)/[locale]/docs/[[...path]]/layout.tsx:37:22)
```

### Stack Trace Location

The error occurs in the DocsLayout component when passing the `tree` prop:

```typescript
// File: apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx:37
<DocsLayout
  tree={docsSource.pageTree}  // Error occurs here
  nav={{
    title: <strong>{t("documentation.title")}</strong>,
    url: "/docs",
    transparentMode: "top",
  }}
  // ...
>
```

## Environment

### Package Versions

```json
{
	"fumadocs-core": "^15.8.2",
	"fumadocs-ui": "^15.8.2",
	"fumadocs-mdx": "^12.0.1",
	"next": "15.5.3",
	"next-intl": "^3.29.3",
	"react": "^19.0.0",
	"lucide-react": "^0.469.0"
}
```

### Build Environment

-   **Bundler**: Turbopack (Next.js dev mode with `--turbo` flag)
-   **TypeScript**: 5.7.3
-   **Node.js**: 22.x
-   **Package Manager**: PNPM 10.x
-   **Monorepo**: Turborepo with PNPM workspaces

### Project Structure

-   Next.js 15 App Router with internationalization (next-intl)
-   Monorepo setup with multiple workspace packages
-   Documentation in `apps/web/content/docs/` directory
-   MDX files with frontmatter and Shiki syntax highlighting

## Configuration Files

### 1. docs-source.ts (Fumadocs Loader Configuration)

```typescript
import { config } from "@repo/config";
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import {
	Blocks,
	BookOpen,
	Code2,
	FileCode,
	FileText,
	Home,
	Library,
	LifeBuoy,
	Rocket,
	Sparkles,
	TestTube,
	Wrench,
} from "lucide-react";
import { createElement } from "react";
import { docs, meta } from "@/.source";

export const docsSource = loader({
	baseUrl: "/docs",
	// Temporarily disabled i18n to debug
	// i18n: {
	//   defaultLanguage: config.i18n.defaultLocale,
	//   languages: Object.keys(config.i18n.locales),
	// },

	// Use fumadocs-mdx generated source
	source: createMDXSource(docs, meta),

	// Icon mapping function
	icon(icon) {
		if (!icon) {
			return;
		}

		const icons = {
			Home,
			BookOpen,
			Code2,
			Blocks,
			Wrench,
			Sparkles,
			TestTube,
			Rocket,
			LifeBuoy,
			FileCode,
			FileText,
			Library,
		};

		if (icon in icons) {
			return createElement(icons[icon as keyof typeof icons]);
		}
	},
});
```

### 2. source.config.ts (MDX Configuration)

```typescript
import rehypeShiki from "@shikijs/rehype";
import { remarkImage } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const { docs, meta } = defineDocs({
	dir: "content/docs",
});

export default defineConfig({
	// Global MDX options
	mdxOptions: {
		remarkPlugins: [[remarkImage, { publicDir: "public" }]],
		rehypePlugins: [[rehypeShiki, { theme: "nord" }]],
	},
});
```

### 3. next.config.ts (Next.js Configuration)

```typescript
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withMDX = createMDX();
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
	// ... webpack config for aliases and externals
};

// Apply MDX wrapper first, then next-intl, then Sentry
export default withSentryConfig(withNextIntl(withMDX(nextConfig)), {
	// ... sentry config
});
```

### 4. Sample meta.json Structure

```json
{
	"title": "SnapBack Documentation",
	"description": "AI-aware code protection system documentation",
	"icon": "Home",
	"pages": [
		"index",
		{
			"title": "Guides",
			"icon": "BookOpen",
			"description": "Step-by-step guides to get started with SnapBack",
			"pages": ["guides/getting-started"]
		},
		{
			"title": "Features",
			"icon": "Sparkles",
			"description": "Core SnapBack features and capabilities",
			"pages": [
				"features/dashboard",
				"features/api-keys",
				"features/usage-tracking"
			]
		},
		{
			"title": "Reference",
			"icon": "Library",
			"description": "Technical reference and UI components",
			"pages": ["reference/components"]
		}
	]
}
```

### 5. Layout Component Usage

```typescript
// File: apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { docsSource } from "../../../../docs-source";
import { DocsFooter } from "../../../../../modules/marketing/docs/components/DocsFooter";

const i18nConfig = {
	defaultLanguage: docsSource._i18n?.defaultLanguage ?? "en",
	languages: docsSource._i18n?.languages ?? ["en"],
};

const { provider } = defineI18nUI(i18nConfig, {
	translations: {
		en: { displayName: "English" },
		de: { displayName: "Deutsch" },
	},
});

export default async function DocumentationLayout({
	children,
	params,
}: PropsWithChildren<{
	params: Promise<{ locale: string }>;
}>) {
	const t = await getTranslations();
	const { locale } = await params;

	return (
		<RootProvider i18n={provider(locale)}>
			<DocsLayout
				tree={docsSource.pageTree} // ⚠️ ERROR OCCURS HERE
				nav={{
					title: <strong>{t("documentation.title")}</strong>,
					url: "/docs",
					transparentMode: "top",
				}}
				sidebar={{
					defaultOpenLevel: 0,
					collapsible: false,
				}}
			>
				{children}
				<DocsFooter />
			</DocsLayout>
		</RootProvider>
	);
}
```

## Reproduction Steps

1. **Setup**:

    ```bash
    git clone <repository>
    pnpm install
    pnpm --filter web run postinstall  # Runs fumadocs-mdx
    ```

2. **Start Development Server**:

    ```bash
    pnpm --filter web run dev  # Uses Turbopack with --turbo flag
    ```

3. **Navigate to Documentation**:

    - Open browser to `http://localhost:3010/en/docs`
    - Error occurs during page rendering

4. **Observe Error**:
    ```
    TypeError: item.startsWith is not a function
    at DocumentationLayout (app/(marketing)/[locale]/docs/[[...path]]/layout.tsx:37:22)
    ```

## Attempted Fixes (All Failed)

### Attempt 1: Use getPageTree() Method

```typescript
// Changed from:
tree={docsSource.pageTree}

// To:
tree={docsSource.getPageTree(locale)}

// Result: Same error persists
```

### Attempt 2: Add Missing Lucide Icons

Added `Library` and `FileText` icons that were referenced in meta.json but not imported:

```typescript
import { Library, FileText } from "lucide-react";

const icons = {
	// ... existing icons
	FileText,
	Library,
};
```

**Result**: No change, error persists

### Attempt 3: Upgrade Fumadocs Packages

```bash
pnpm add fumadocs-core@^15.8.2 fumadocs-ui@^15.8.2
```

**Result**: No change, error persists

### Attempt 4: Disable i18n Configuration

```typescript
export const docsSource = loader({
	baseUrl: "/docs",
	// Commented out i18n configuration
	// i18n: {
	//   defaultLanguage: config.i18n.defaultLocale,
	//   languages: Object.keys(config.i18n.locales),
	// },
	source: createMDXSource(docs, meta),
	// ...
});
```

**Result**: No change, error persists

### Attempt 5: Use pageTree Directly (Without i18n)

```typescript
// With i18n disabled in docs-source.ts
tree={docsSource.pageTree}  // Direct access instead of getPageTree()
```

**Result**: Same error, no improvement

### Attempt 6: Verify .source/index.ts Generation

Ran `fumadocs-mdx` command multiple times to regenerate:

```bash
pnpm --filter web run postinstall
```

Generated file contains 35 MDX imports and 12 meta.json imports, appears correctly structured.

**Result**: No change, error persists

## Expected Behavior

The documentation route should render successfully with the page tree navigation sidebar showing all documentation sections and pages as defined in the meta.json files.

## Actual Behavior

The page throws `TypeError: item.startsWith is not a function` during DocsLayout rendering, preventing the documentation from displaying.

## Additional Context

### Project Characteristics

1. **Monorepo Structure**: Turborepo with PNPM workspaces
2. **Internationalization**: Using next-intl with English and German locales
3. **Complex Path Aliases**: Multiple webpack aliases for internal packages
4. **Turbopack Environment**: Running with Next.js Turbopack bundler
5. **MDX Processing**: Using fumadocs-mdx with Shiki syntax highlighting

### Related Configuration Issues Resolved

Before this error, we resolved:

-   Conflicting `next.config.mjs` with webpack-specific MDX loaders (incompatible with Turbopack)
-   Missing `createNextIntlPlugin` wrapper in next.config.ts
-   MDX syntax errors with unescaped special characters in 3 documentation files
-   TypeScript errors across 6 files in the codebase

### Directory Structure

```
apps/web/
├── app/
│   ├── (marketing)/
│   │   └── [locale]/
│   │       └── docs/
│   │           └── [[...path]]/
│   │               ├── layout.tsx  ← Error occurs here
│   │               └── page.tsx
│   └── docs-source.ts
├── content/
│   └── docs/
│       ├── meta.json
│       ├── index.mdx
│       ├── api/
│       │   ├── meta.json
│       │   ├── overview.mdx
│       │   └── endpoints.mdx
│       ├── guides/
│       │   ├── meta.json
│       │   └── getting-started.mdx
│       └── [... more sections]
├── .source/
│   └── index.ts  ← Generated by fumadocs-mdx
├── source.config.ts
├── next.config.ts
└── package.json
```

### Fumadocs Type Information

From `docsSource` type inspection:

```typescript
// When i18n is disabled:
docsSource.pageTree  // Type: PageTree

// When i18n is enabled:
docsSource.getPageTree(locale: string)  // Returns: PageTree
```

Both approaches result in the same error, suggesting the issue is in how fumadocs processes the page tree structure internally.

## Question

Is there a known compatibility issue between fumadocs 15.8.x and:

-   Next.js 15.5.3 with Turbopack?
-   next-intl 3.29.3 in App Router?
-   Complex monorepo setups with nested page structures?

The error message `item.startsWith is not a function` suggests fumadocs is trying to call `.startsWith()` on a value that isn't a string, possibly during page tree traversal or icon resolution.

Could there be an issue with how fumadocs processes nested meta.json structures or icon string values in v15.8.x?

## Possible Investigation Areas

1. **Type Mismatch**: The `item` being processed might be an object or array when fumadocs expects a string
2. **Icon Resolution**: Icon names in meta.json might not be correctly typed/validated
3. **Page Tree Structure**: Nested pages array structure might be malformed
4. **Locale Handling**: Even with i18n disabled, locale-specific processing might still occur

## System Information

-   **OS**: macOS (Darwin 24.6.0)
-   **Working Directory**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web`
-   **Git Branch**: `dev`
-   **Build Status**: Production build succeeds with `next build` (66 pages), but dev server crashes on docs route

---

**Fumadocs Version**: 15.8.2 (core + ui), 12.0.1 (mdx)
**Next.js Version**: 15.5.3
**React Version**: 19.0.0
**Issue Date**: 2025-10-02
