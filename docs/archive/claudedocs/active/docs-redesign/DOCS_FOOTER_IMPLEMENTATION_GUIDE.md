# Documentation Footer - Quick Implementation Guide

## Quick Fix (5 Minutes)

### Change 1: Move Footer to Layout Prop

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx`

**Before**:

```tsx
<DocsLayout
	tree={docsSource.pageTree[locale] ?? docsSource.pageTree}
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
	<DocsFooter /> {/* ❌ Remove this */}
</DocsLayout>
```

**After**:

```tsx
<DocsLayout
  tree={docsSource.pageTree[locale] ?? docsSource.pageTree}
  nav={{
    title: <strong>{t("documentation.title")}</strong>,
    url: "/docs",
    transparentMode: "top",
  }}
  sidebar={{
    defaultOpenLevel: 0,
    collapsible: false,
  }}
  footer={<DocsFooter />}  {/* ✅ Add here */}
>
  {children}
</DocsLayout>
```

### Change 2: Fix Link Routing

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/modules/marketing/docs/components/DocsFooter.tsx`

**Replace all `LocaleLink` components for main site navigation with regular `<a>` tags:**

**Before**:

```tsx
<li>
	<LocaleLink
		href="/blog"
		className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
	>
		Blog
	</LocaleLink>
</li>
```

**After**:

```tsx
<li>
	<a
		href="/blog"
		className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
	>
		Blog
	</a>
</li>
```

**Apply to these links**:

-   `/blog` → `<a href="/blog">`
-   `/legal/privacy-policy` → `<a href="/legal/privacy-policy">`
-   `/legal/terms` → `<a href="/legal/terms">`

**Keep `LocaleLink` for docs-internal navigation**:

-   `/docs`
-   `/docs/getting-started/overview`
-   `/docs/architecture/overview`
-   `/docs/api/overview`
-   `/docs/troubleshooting/faq`

### Change 3: Enforce Dark Mode

**File**: `/Users/user1/WebstormProjects/SnapBack-Site/apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx`

**Before**:

```tsx
<RootProvider i18n={provider(locale)}>
```

**After**:

```tsx
<RootProvider
  i18n={provider(locale)}
  theme={{
    defaultTheme: "dark",
    forcedTheme: "dark",
    attribute: "class",
  }}
>
```

---

## Complete Updated Files

### layout.tsx (Full File)

```tsx
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
		en: {
			displayName: "English",
		},
		de: {
			displayName: "Deutsch",
		},
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
		<RootProvider
			i18n={provider(locale)}
			theme={{
				defaultTheme: "dark",
				forcedTheme: "dark",
				attribute: "class",
			}}
		>
			<DocsLayout
				tree={docsSource.pageTree[locale] ?? docsSource.pageTree}
				nav={{
					title: <strong>{t("documentation.title")}</strong>,
					url: "/docs",
					transparentMode: "top",
				}}
				sidebar={{
					defaultOpenLevel: 0,
					collapsible: false,
				}}
				footer={<DocsFooter />}
			>
				{children}
			</DocsLayout>
		</RootProvider>
	);
}
```

### DocsFooter.tsx (Updated Links Section)

```tsx
{
	/* Resources - Use absolute paths for main site */
}
<div className="space-y-4">
	<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
		<MessageSquare className="h-4 w-4 text-primary" />
		Resources
	</h3>
	<ul className="space-y-2.5 text-sm">
		<li>
			<a
				href="/blog"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Blog
			</a>
		</li>
		<li>
			<a
				href="https://github.com/snapback/discussions"
				target="_blank"
				rel="noopener noreferrer"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Community
			</a>
		</li>
		<li>
			<LocaleLink
				href="/docs/troubleshooting/faq"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				FAQ
			</LocaleLink>
		</li>
		<li>
			<a
				href="https://github.com/snapback/issues"
				target="_blank"
				rel="noopener noreferrer"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Support
			</a>
		</li>
	</ul>
</div>;

{
	/* Legal - Use absolute paths */
}
<div className="space-y-4">
	<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
		<Shield className="h-4 w-4 text-primary" />
		Legal
	</h3>
	<ul className="space-y-2.5 text-sm">
		<li>
			<a
				href="/legal/privacy-policy"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Privacy Policy
			</a>
		</li>
		<li>
			<a
				href="/legal/terms"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Terms of Service
			</a>
		</li>
		<li>
			<a
				href="https://github.com/snapback/security"
				target="_blank"
				rel="noopener noreferrer"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				Security
			</a>
		</li>
		<li>
			<a
				href="https://github.com/snapback/license"
				target="_blank"
				rel="noopener noreferrer"
				className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
			>
				License
			</a>
		</li>
	</ul>
</div>;
```

---

## Testing Commands

```bash
# Start dev server
pnpm --filter web run dev

# Navigate to docs
open http://localhost:3000/docs

# Test checklist:
# 1. Scroll to bottom - footer should be fully visible (no cutoff)
# 2. Verify dark mode is enforced (no light mode toggle)
# 3. Click "Blog" link - should navigate to /blog (main site)
# 4. Click "Privacy Policy" - should navigate to /legal/privacy-policy
# 5. Click "Getting Started" - should stay within /docs
```

---

## Verification

### Footer Visibility

```bash
# Check footer height in browser DevTools
# Should be ~400-500px minimum
# Should not have overflow:hidden or max-height constraints
```

### Dark Mode

```bash
# Inspect <html> element
# Should have class="dark"
# No theme toggle should appear in docs nav
```

### Link Routing

```bash
# Click each footer link and verify URL:
# Blog → http://localhost:3000/blog (NOT /docs/blog)
# Privacy → http://localhost:3000/legal/privacy-policy (NOT /docs/legal/...)
# Getting Started → http://localhost:3000/docs/getting-started/overview
```

---

## Rollback (If Needed)

```bash
# Revert layout.tsx
git checkout apps/web/app/\(marketing\)/\[locale\]/docs/\[\[...path\]\]/layout.tsx

# Revert footer
git checkout apps/web/modules/marketing/docs/components/DocsFooter.tsx
```

---

## Summary of Changes

| File             | Change                    | Impact             |
| ---------------- | ------------------------- | ------------------ |
| `layout.tsx`     | Move footer to prop       | Fixes cutoff       |
| `layout.tsx`     | Add theme config          | Enforces dark mode |
| `DocsFooter.tsx` | Change LocaleLink → `<a>` | Fixes routing      |

**Total LOC Changed**: ~10 lines
**Risk Level**: Low
**Testing Time**: 5 minutes
**Total Time**: 15 minutes
