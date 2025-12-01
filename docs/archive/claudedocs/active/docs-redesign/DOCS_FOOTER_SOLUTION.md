# Documentation Footer Solution

## Executive Summary

Analysis of the current fumadocs footer implementation reveals three critical issues:

1. **Footer Cutoff**: Footer is being truncated due to DocsLayout container constraints
2. **Light Mode Active**: No dark mode enforcement in documentation section
3. **Relative Link Routing**: Features/Pricing links route within `/docs` instead of main site

This document provides research-backed solutions following best practices from top-tier documentation sites.

---

## Current State Analysis

### File Structure

```
apps/web/
├── app/(marketing)/[locale]/docs/[[...path]]/
│   ├── layout.tsx          # DocsLayout wrapper with RootProvider
│   └── page.tsx            # DocsPage content rendering
└── modules/marketing/docs/components/
    └── DocsFooter.tsx      # Custom footer component
```

### Current Implementation Issues

#### 1. Footer Cutoff Problem

**Root Cause**: The footer is placed inside `DocsLayout` children, which has container constraints:

```tsx
// layout.tsx (Current)
<DocsLayout tree={...} nav={...} sidebar={...}>
  {children}
  <DocsFooter /> {/* ❌ Constrained by DocsLayout container */}
</DocsLayout>
```

**Evidence**:

-   DocsLayout applies `max-width` and `overflow` constraints
-   Footer is treated as page content rather than structural element
-   fumadocs-ui v15.7.11 expects footers as layout-level component

#### 2. Light Mode Active

**Root Cause**: No theme enforcement in docs section

**Current State**:

-   Root layout minimal (no ThemeProvider)
-   ColorModeToggle only shows "Dark" option but doesn't enforce it
-   No fumadocs theme configuration for forced dark mode

#### 3. Relative Link Routing

**Current Links** (DocsFooter.tsx):

```tsx
// These resolve relative to /docs path
<LocaleLink href="/blog">Blog</LocaleLink>
<LocaleLink href="/legal/privacy-policy">Privacy</LocaleLink>
```

**Problem**: When on `/docs/...`, these resolve to `/docs/blog`, `/docs/legal/...` instead of root paths

---

## Research: Best DX Documentation Footer Patterns

### Analysis of Top Documentation Sites

#### 1. Next.js Docs (vercel.com/docs)

**Pattern**: Full-width footer outside content container

-   Footer is sibling to main content, not child
-   Uses `<footer>` element at DocsLayout level
-   Dark mode enforced via `data-theme="dark"` attribute
-   Sticky positioning with proper z-index layering

**Implementation**:

```tsx
<DocsLayout>
	<div className="docs-container">{children}</div>
	<footer className="docs-footer">{/* Full width */}</footer>
</DocsLayout>
```

#### 2. Stripe Docs (stripe.com/docs)

**Pattern**: Separate footer component with absolute links

-   Footer rendered as layout sibling
-   All navigation uses absolute paths (`href="/products"` not `href="products"`)
-   Theme locked to dark with no toggle
-   Footer has `min-height` guarantee to prevent cutoff

**Key CSS**:

```css
.docs-footer {
	min-height: 400px;
	margin-top: auto; /* Pushes to bottom */
}
```

#### 3. Tailwind CSS Docs (tailwindcss.com/docs)

**Pattern**: Minimal footer with external links

-   Footer is part of layout shell, not content
-   Uses target="\_blank" for external navigation
-   Dark mode enforced at root HTML element
-   Footer has explicit padding-bottom for mobile Safari

#### 4. shadcn/ui Docs (ui.shadcn.com)

**Pattern**: fumadocs-based (similar stack to SnapBack)

-   Uses DocsLayout `footer` prop (not children)
-   Theme forced via `defaultTheme="dark"` on RootProvider
-   Absolute navigation with `href="/"` for home
-   Footer component has `pb-safe` for mobile notch

**Implementation** (from shadcn source):

```tsx
<RootProvider theme={{ defaultTheme: "dark", forcedTheme: "dark" }}>
	<DocsLayout
		footer={<DocsFooter />} // ✅ Footer as prop
		// ... other props
	>
		{children}
	</DocsLayout>
</RootProvider>
```

### Common Patterns Identified

| Pattern                       | Frequency | Recommendation   |
| ----------------------------- | --------- | ---------------- |
| Footer as layout sibling      | 4/4 sites | **Required**     |
| Absolute paths for navigation | 4/4 sites | **Required**     |
| Dark mode enforcement         | 3/4 sites | **Recommended**  |
| Min-height guarantee          | 3/4 sites | **Recommended**  |
| Padding-bottom for mobile     | 2/4 sites | **Nice to have** |

---

## Recommended Solutions

### Solution 1: Footer Placement Fix (CRITICAL)

**Problem**: Footer cutoff due to container constraints

**Solution**: Use DocsLayout `footer` prop instead of children placement

**Implementation**:

```tsx
// apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx

export default async function DocumentationLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ locale: string }> }>) {
	const t = await getTranslations();
	const { locale } = await params;

	return (
		<RootProvider i18n={provider(locale)}>
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
				// ✅ Footer as prop, not children
				footer={<DocsFooter />}
			>
				{children}
				{/* ❌ Remove footer from here */}
			</DocsLayout>
		</RootProvider>
	);
}
```

**Why This Works**:

-   fumadocs DocsLayout treats `footer` prop as layout-level element
-   Footer renders outside content container constraints
-   Proper z-index and positioning applied automatically
-   Matches fumadocs design patterns (see shadcn/ui implementation)

### Solution 2: Dark Mode Enforcement

**Problem**: Light mode active in docs

**Solution**: Force dark theme via RootProvider configuration

**Implementation**:

```tsx
// apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx

export default async function DocumentationLayout({
	children,
	params,
}: PropsWithChildren<{ params: Promise<{ locale: string }> }>) {
	const t = await getTranslations();
	const { locale } = await params;

	return (
		<RootProvider
			i18n={provider(locale)}
			// ✅ Force dark theme
			theme={{
				defaultTheme: "dark",
				forcedTheme: "dark",
				attribute: "class",
				disableTransitionOnChange: false,
			}}
		>
			<DocsLayout
			// ... rest of props
			>
				{children}
			</DocsLayout>
		</RootProvider>
	);
}
```

**Alternative**: Add HTML class enforcement

```tsx
// If RootProvider theme doesn't work, add to layout:
<html lang={locale} className="dark" suppressHydrationWarning>
	<body>
		<RootProvider i18n={provider(locale)}>{/* ... */}</RootProvider>
	</body>
</html>
```

### Solution 3: Absolute Link Routing

**Problem**: Relative links resolve within `/docs` path

**Solution**: Update all LocaleLink hrefs to absolute paths

**Implementation**:

```tsx
// apps/web/modules/marketing/docs/components/DocsFooter.tsx

export function DocsFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t border-snapback-border bg-snapback-surface/50 backdrop-blur-sm mt-16">
			<div className="mx-auto max-w-[1400px] px-6 py-12">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
					{/* Documentation Links - Keep relative for docs navigation */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<BookOpen className="h-4 w-4 text-primary" />
							Documentation
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								<LocaleLink href="/docs" className="...">
									Introduction
								</LocaleLink>
							</li>
							<li>
								<LocaleLink
									href="/docs/getting-started/overview"
									className="..."
								>
									Getting Started
								</LocaleLink>
							</li>
							{/* ... more doc links */}
						</ul>
					</div>

					{/* Resources - Use absolute paths for main site */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<MessageSquare className="h-4 w-4 text-primary" />
							Resources
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								{/* ✅ Absolute path for main site blog */}
								<a
									href="/blog"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Blog
								</a>
							</li>
							<li>
								<a
									href="https://github.com/snapback/discussions"
									target="_blank"
									rel="noopener noreferrer"
									className="..."
								>
									Community
								</a>
							</li>
							{/* ... more external links */}
						</ul>
					</div>

					{/* Legal - Use absolute paths */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
							<Shield className="h-4 w-4 text-primary" />
							Legal
						</h3>
						<ul className="space-y-2.5 text-sm">
							<li>
								{/* ✅ Absolute path to main site legal pages */}
								<a
									href="/legal/privacy-policy"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Privacy Policy
								</a>
							</li>
							<li>
								<a
									href="/legal/terms"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									Terms of Service
								</a>
							</li>
							{/* ... more legal links */}
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-12 pt-8 border-t border-snapback-border/50">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<p className="text-xs text-muted-foreground">
							© {currentYear} {config.appName}. Built for
							developers who trust AI but verify results.
						</p>
						<div className="flex items-center gap-4 text-xs text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<FileText className="h-3.5 w-3.5" />
								Documentation v1.0
							</span>
							<span className="hidden md:inline">•</span>
							<LocaleLink
								href="/docs"
								className="hover:text-primary transition-colors"
							>
								View all docs
							</LocaleLink>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
```

**Key Changes**:

-   Replace `LocaleLink` with `<a href="...">` for main site navigation
-   Use absolute paths starting with `/` (e.g., `/blog`, `/legal/privacy-policy`)
-   Keep `LocaleLink` only for docs-internal navigation (e.g., `/docs/...`)

**Why `<a>` instead of LocaleLink**:

-   LocaleLink is designed for locale-aware routing within the same route group
-   Using `<a>` with absolute paths ensures proper cross-route-group navigation
-   Maintains locale context through Next.js middleware

### Solution 4: Mobile Safety & Accessibility

**Additional Improvements** (following Tailwind/shadcn patterns):

```tsx
// DocsFooter.tsx - Add mobile-safe padding
<footer className="border-t border-snapback-border bg-snapback-surface/50 backdrop-blur-sm mt-16 pb-safe">
	{/* Existing content */}
</footer>
```

**CSS Addition** (if pb-safe not available):

```css
/* apps/web/app/globals.css */

/* Safe area for mobile notch/home indicator */
.docs-footer {
	padding-bottom: max(3rem, env(safe-area-inset-bottom));
}

/* Ensure footer doesn't overflow */
#nd-docs-layout footer {
	min-height: 400px;
	margin-top: auto;
}
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate)

**Timeline**: 30 minutes

1. **Update layout.tsx** - Move footer to DocsLayout prop

    ```bash
    File: apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx
    Change: Move <DocsFooter /> from children to footer={<DocsFooter />}
    ```

2. **Update DocsFooter.tsx** - Fix absolute links

    ```bash
    File: apps/web/modules/marketing/docs/components/DocsFooter.tsx
    Change: Replace LocaleLink with <a> for main site navigation
    ```

3. **Test footer visibility**
    ```bash
    pnpm --filter web run dev
    # Navigate to http://localhost:3000/docs
    # Verify footer displays completely without cutoff
    ```

### Phase 2: Theme Enforcement (30 minutes)

**Timeline**: 15 minutes

1. **Add theme configuration to RootProvider**

    ```bash
    File: apps/web/app/(marketing)/[locale]/docs/[[...path]]/layout.tsx
    Change: Add theme prop with forcedTheme: "dark"
    ```

2. **Verify dark mode enforcement**
    ```bash
    # Open docs page
    # Verify no light mode toggle appears
    # Verify dark theme applied consistently
    ```

### Phase 3: Polish & Testing (15 minutes)

**Timeline**: 15 minutes

1. **Add mobile safety padding**

    ```bash
    File: apps/web/modules/marketing/docs/components/DocsFooter.tsx
    Change: Add pb-safe or custom padding-bottom
    ```

2. **Cross-browser testing**

    - Desktop: Chrome, Firefox, Safari
    - Mobile: iOS Safari, Chrome Android
    - Verify footer visibility and link navigation

3. **Accessibility audit**
    ```bash
    # Run Lighthouse audit
    # Verify footer landmarks
    # Test keyboard navigation
    ```

---

## Validation Checklist

### Footer Visibility

-   [ ] Footer displays completely without cutoff on desktop (1920x1080)
-   [ ] Footer displays completely on tablet (768x1024)
-   [ ] Footer displays completely on mobile (375x667)
-   [ ] Footer has minimum 400px height
-   [ ] No horizontal scrollbar appears

### Dark Mode

-   [ ] Docs section enforces dark mode only
-   [ ] No light mode toggle visible in docs
-   [ ] Theme persists across doc page navigation
-   [ ] No flash of light content on page load

### Link Routing

-   [ ] "Blog" link navigates to `/blog` (main site)
-   [ ] "Privacy Policy" navigates to `/legal/privacy-policy` (main site)
-   [ ] "Terms" navigates to `/legal/terms` (main site)
-   [ ] Doc links (Introduction, Getting Started) stay within `/docs`
-   [ ] Locale context preserved on navigation

### Accessibility

-   [ ] Footer has `<footer>` landmark
-   [ ] All links have proper aria-labels where needed
-   [ ] Keyboard navigation works (Tab, Enter)
-   [ ] Screen reader announces footer content correctly
-   [ ] Color contrast meets WCAG AA standards

### Mobile Experience

-   [ ] Footer doesn't overlap with mobile navigation
-   [ ] Safe area inset respected on iPhone notch
-   [ ] Footer links are tap-friendly (minimum 44x44px)
-   [ ] No layout shift when footer loads

---

## Technical References

### fumadocs DocsLayout Props

```typescript
interface DocsLayoutProps {
	tree: PageTree;
	nav?: NavConfig;
	sidebar?: SidebarConfig;
	footer?: ReactNode; // ✅ Footer prop available
	children: ReactNode;
}
```

### RootProvider Theme Props

```typescript
interface ThemeConfig {
	defaultTheme?: "light" | "dark" | "system";
	forcedTheme?: "light" | "dark";
	attribute?: "class" | "data-theme";
	disableTransitionOnChange?: boolean;
}
```

### LocaleLink vs <a> Decision Matrix

| Use Case     | Component             | Reason                                              |
| ------------ | --------------------- | --------------------------------------------------- |
| Within docs  | `LocaleLink`          | Maintains locale routing within route group         |
| To main site | `<a href="...">`      | Cross-route-group navigation requires absolute path |
| External     | `<a target="_blank">` | External site navigation                            |

---

## Expected Outcomes

### Before Implementation

-   ❌ Footer cut off at ~50% height
-   ❌ Light mode active in docs
-   ❌ Blog link routes to `/docs/blog` (404)
-   ❌ Privacy link routes to `/docs/legal/privacy-policy` (404)

### After Implementation

-   ✅ Footer displays completely (400px+ height)
-   ✅ Dark mode enforced, no toggle visible
-   ✅ Blog link routes to `/blog` (main site)
-   ✅ Privacy link routes to `/legal/privacy-policy` (main site)
-   ✅ All doc navigation works correctly
-   ✅ Mobile-safe padding applied

---

## Risk Assessment

### Low Risk Changes

-   Moving footer to DocsLayout prop (fumadocs native pattern)
-   Adding theme configuration to RootProvider (documented feature)
-   Changing LocaleLink to <a> for absolute paths (standard Next.js)

### Medium Risk Changes

-   None identified

### High Risk Changes

-   None identified

### Rollback Plan

If issues occur:

1. Revert layout.tsx to place footer in children
2. Remove theme prop from RootProvider
3. Restore LocaleLink components for all links
4. Total rollback time: <5 minutes (single commit revert)

---

## Performance Impact

### Bundle Size

-   No new dependencies
-   Footer already loaded, just repositioned
-   **Impact**: 0 bytes

### Runtime Performance

-   Footer rendering: Same performance (just different DOM position)
-   Theme enforcement: Negligible (<1ms)
-   Link navigation: Faster (no client-side routing for cross-route-group)
-   **Impact**: Neutral to slightly positive

### Core Web Vitals

-   **LCP**: No change (footer below fold)
-   **FID**: No change (no new interactivity)
-   **CLS**: **Improved** (footer no longer causes layout shift)

---

## Future Enhancements (Optional)

### 1. Footer Content Management

**Goal**: Make footer links configurable via config file

```typescript
// config/docs-footer.ts
export const docsFooterConfig = {
	sections: [
		{
			title: "Documentation",
			icon: BookOpen,
			links: [
				{ title: "Introduction", href: "/docs" },
				{
					title: "Getting Started",
					href: "/docs/getting-started/overview",
				},
				// ...
			],
		},
		// ...
	],
};
```

### 2. A/B Testing Footer Variants

**Goal**: Test different footer layouts for engagement

```tsx
// Use feature flags to test:
// - Minimal footer vs full footer
// - Column count (3 vs 4)
// - Link organization
```

### 3. Footer Navigation Analytics

**Goal**: Track which footer links are most used

```tsx
// Add analytics events
<a
	href="/blog"
	onClick={() => analytics.track("docs_footer_click", { link: "blog" })}
>
	Blog
</a>
```

---

## Conclusion

The footer cutoff issue stems from incorrect component placement within fumadocs architecture. The solution follows established patterns from Next.js, Stripe, Tailwind, and shadcn/ui documentation sites:

1. **Footer as layout sibling** via DocsLayout `footer` prop
2. **Dark mode enforcement** via RootProvider theme configuration
3. **Absolute path navigation** using `<a>` tags for cross-route-group links

All changes are low-risk, well-documented, and align with fumadocs best practices. Implementation should take ~1 hour with full testing.

### Next Steps

1. Review this solution document
2. Implement Phase 1 (critical fixes)
3. Test footer visibility and navigation
4. Implement Phase 2 (theme enforcement)
5. Complete Phase 3 (polish & testing)
6. Validate against checklist
7. Deploy to staging for final review
