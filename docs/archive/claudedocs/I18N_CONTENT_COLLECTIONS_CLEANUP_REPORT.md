# I18N and Content-Collections Cleanup Report

Generated: 2025-10-05

## Executive Summary

This report outlines the systematic cleanup required to complete the removal of i18n (next-intl) and content-collections from the SnapBack-Site codebase. The initial removal was incomplete, leaving imports and references that cause type errors.

##Status Summary

-   **i18n Routing Imports**: 15 files
-   **next-intl Usage**: 9 files (mail package)
-   **config.i18n References**: 25 files
-   **content-collections Imports**: 13 files
-   **[locale] Route Directory**: 1 directory with 12 subdirectories

## Detailed Breakdown

### 1. I18N Routing Removal

#### Files Using `@i18n/routing` (15 files)

**Pattern**: `import { LocaleLink, localeRedirect, useLocalePathname } from "@i18n/routing"`

**Action**: Replace with Next.js native components

| File                                                           | Current Import                    | Replacement                                                   |
| -------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `apps/web/modules/saas/shared/components/Footer.tsx`           | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/saas/payments/components/PricingTable.tsx`   | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/blog/components/PostListItem.tsx`  | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/blog/utils/mdx-components.tsx`     | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/docs/components/DocsFooter.tsx`    | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/shared/components/NotFound.tsx`    | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/shared/components/Footer.tsx`      | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/shared/components/ContentMenu.tsx` | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/modules/marketing/shared/components/NavBar.tsx`      | `LocaleLink`, `useLocalePathname` | `Link` from `next/link`, `usePathname` from `next/navigation` |
| `apps/web/modules/marketing/home/components/Hero.tsx`          | `LocaleLink`                      | ✅ **COMPLETED**                                              |
| `apps/web/__tests__/components/NavBar.test.tsx`                | `LocaleLink`                      | `Link` from `next/link`                                       |
| `apps/web/app/(marketing)/[locale]/legal/[...path]/page.tsx`   | `localeRedirect`                  | `redirect` from `next/navigation`                             |
| `apps/web/app/(marketing)/[locale]/blog/[...path]/page.tsx`    | `LocaleLink`, `localeRedirect`    | `Link`, `redirect`                                            |

**Systematic Replacement**:

1. Remove: `import { LocaleLink } from "@i18n/routing"`
2. Add: `import Link from "next/link"`
3. Replace all: `<LocaleLink` → `<Link`
4. Replace all: `</LocaleLink>` → `</Link>`

For `useLocalePathname`:

1. Remove: `import { useLocalePathname } from "@i18n/routing"`
2. Add: `import { usePathname } from "next/navigation"`
3. Replace: `useLocalePathname()` → `usePathname()`
4. Replace variable: `localePathname` → `pathname`

For `localeRedirect`:

1. Remove: `import { localeRedirect } from "@i18n/routing"`
2. Add: `import { redirect } from "next/navigation"`
3. Replace: `localeRedirect(` → `redirect(`

###2. Mail Package I18N Removal

#### Files Using `use-intl/core` (6 email templates)

**Location**: `packages/mail/emails/`

| File                         | Action                               |
| ---------------------------- | ------------------------------------ |
| `OrganizationInvitation.tsx` | Replace with hard-coded English text |
| `ForgotPassword.tsx`         | Replace with hard-coded English text |
| `NewUser.tsx`                | Replace with hard-coded English text |
| `MagicLink.tsx`              | Replace with hard-coded English text |
| `EmailVerification.tsx`      | Replace with hard-coded English text |
| `NewsletterSignup.tsx`       | Replace with hard-coded English text |

**Pattern for Each Email Template**:

```typescript
// REMOVE:
import { createTranslator } from "use-intl/core";
import { defaultLocale, defaultTranslations } from "../src/util/translations";
import type { BaseMailProps } from "../types";

// REMOVE from function params:
& BaseMailProps

// REMOVE from function body:
const t = createTranslator({
  locale,
  messages: translations,
});

// REPLACE:
{t("mail.key.path")} → "Hard-coded English text"
{t("mail.key.path", { var })} → `Hard-coded English with ${var}`

// UPDATE PreviewProps:
// REMOVE locale and translations
```

**Example - OrganizationInvitation.tsx**:

```typescript
// BEFORE:
const t = createTranslator({ locale, messages: translations });
<Heading>{t.markup("mail.organizationInvitation.headline", {
  organizationName,
  strong: (chunks) => `<strong>${chunks}</strong>`,
})}</Heading>
<Text>{t("mail.organizationInvitation.body", { organizationName })}</Text>
<PrimaryButton href={url}>{t("mail.organizationInvitation.join")}</PrimaryButton>

// AFTER:
<Heading>You've been invited to <strong>{organizationName}</strong></Heading>
<Text>You have been invited to join {organizationName}.</Text>
<PrimaryButton href={url}>Join Organization</PrimaryButton>
```

#### Mail Utility Files

**File**: `packages/mail/src/util/send.ts`

```typescript
// Line 11: REMOVE
locale?: keyof typeof config.i18n.locales;

// Line 16: REMOVE
"locale" | "translations"

// Line 27: CHANGE
const { to, locale = config.i18n.defaultLocale } = params;
// TO:
const { to } = params;

// Line 35-38: UPDATE
const template = await getTemplate({
  templateId,
  context,
  // REMOVE: locale,
});
```

**File**: `packages/mail/src/util/templates.ts`

Already updated - no changes needed.

**File**: `packages/mail/types.ts`

```typescript
// REMOVE or make optional:
export type BaseMailProps = {
	locale?: string;
	translations?: any;
};
```

### 3. Config.i18n References Removal

#### Files Referencing `config.i18n` (25 files)

**Primary Pattern**: `config.i18n.locales`, `config.i18n.defaultLocale`, `config.i18n.enabled`, `config.i18n.defaultCurrency`

**Key Files**:

| File                                                      | Reference                                            | Action                                 |
| --------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| `apps/web/modules/shared/hooks/locale-currency.tsx`       | `config.i18n.locales`, `config.i18n.defaultCurrency` | Replace with hard-coded `USD` currency |
| `apps/web/modules/marketing/shared/components/NavBar.tsx` | `config.i18n.enabled`                                | Remove conditional i18n UI             |
| `apps/web/modules/saas/shared/components/AuthWrapper.tsx` | `config.i18n.*`                                      | Remove i18n references                 |
| `apps/web/app/(marketing)/[locale]/layout.tsx`            | `config.i18n.locales`                                | **DELETE FILE** (locale-based layout)  |
| `apps/web/content-collections.ts`                         | `config.i18n.defaultLocale`                          | Remove or hard-code `"en"`             |
| `packages/api/orpc/middleware/locale-middleware.ts`       | `config.i18n.*`                                      | Remove or simplify                     |

**Locale Currency Hook Replacement**:

```typescript
// File: apps/web/modules/shared/hooks/locale-currency.tsx

// BEFORE:
import { config } from "@snapback/config";
import { useLocale } from "next-intl";

export function useLocaleCurrency() {
	const locale = useLocale();
	const localeCurrency =
		Object.entries(config.i18n.locales).find(([key]) => key === locale)?.[1]
			.currency ?? config.i18n.defaultCurrency;
	return localeCurrency;
}

// AFTER:
export function useLocaleCurrency() {
	return "USD"; // Hard-coded default currency
}
```

**NavBar i18n Conditional**:

```typescript
// File: apps/web/modules/marketing/shared/components/NavBar.tsx

// REMOVE lines 213-217:
{
	config.i18n.enabled && (
		<Suspense>
			<LocaleSwitch />
		</Suspense>
	);
}
```

### 4. Content-Collections Removal

#### Files Importing content-collections (13 files)

| File                                                          | Import                           | Action                          |
| ------------------------------------------------------------- | -------------------------------- | ------------------------------- |
| `apps/web/next.config.ts`                                     | `withContentCollections`         | Remove wrapper and import       |
| `apps/web/content-collections.ts`                             | All imports                      | Remove `config.i18n` references |
| `apps/web/modules/marketing/blog/components/PostContent.tsx`  | `@content-collections/mdx/react` | Keep MDX, remove locale logic   |
| `apps/web/app/(marketing)/[locale]/docs/[[...path]]/page.tsx` | `content-collections`            | **MOVE to non-locale path**     |

**next.config.ts Update**:

```typescript
// Line 2: REMOVE
import { withContentCollections } from "@content-collections/next";

// Line 62-63: CHANGE
export default withSentryConfig(
  withContentCollections(nextConfig),

// TO:
export default withSentryConfig(
  nextConfig,
```

**content-collections.ts**:

```typescript
// Line 22-26: REMOVE getLocaleFromFilePath function or hard-code "en"

function getLocaleFromFilePath(path: string) {
	return "en"; // Hard-coded since we removed i18n
}
```

### 5. Locale Route Directory Migration

#### Directory Structure Change

**Current**:

```
apps/web/app/(marketing)/[locale]/
├── (home)/
├── [... rest]/
├── blog/
├── changelog/
├── component-test/
├── components/
├── contact/
├── docs/
├── layout.tsx
├── legal/
├── not-found.tsx
└── test/
```

**Target**:

```
apps/web/app/(marketing)/
├── (home)/
├── [... rest]/
├── blog/
├── changelog/
├── component-test/
├── components/ (from locale)
├── contact/
├── docs/
├── legal/
├── not-found.tsx (from locale)
└── test/
```

**Migration Steps**:

1. **Move all directories and files** from `[locale]/` to parent `(marketing)/`

    ```bash
    cd apps/web/app/\(marketing\)
    mv \[locale\]/\(home\)/ ./
    mv \[locale\]/\[...rest\]/ ./
    mv \[locale\]/blog/ ./ # Merge with existing if present
    mv \[locale\]/changelog/ ./ # Merge with existing if present
    mv \[locale\]/component-test/ ./ # Merge with existing if present
    mv \[locale\]/components/ ./locale-components/ # Temporary
    mv \[locale\]/contact/ ./ # Merge with existing if present
    mv \[locale\]/docs/ ./ # Merge with existing if present
    mv \[locale\]/legal/ ./ # Merge with existing if present
    mv \[locale\]/not-found.tsx ./not-found-locale.tsx # Temporary
    mv \[locale\]/test/ ./ # Merge with existing if present
    ```

2. **Delete locale layout**:

    ```bash
    rm apps/web/app/\(marketing\)/\[locale\]/layout.tsx
    ```

3. **Remove empty [locale] directory**:

    ```bash
    rmdir apps/web/app/\(marketing\)/\[locale\]
    ```

4. **Update imports** in moved files (remove locale param handling)

5. **Merge duplicate routes** (blog, changelog, docs already exist in parent)

### 6. Configuration Type Updates

#### File: `config/types.ts`

**REMOVE entire i18n type definition**:

```typescript
// REMOVE:
i18n: {
  enabled: boolean;
  locales: {
    [locale: string]: {
      name: string;
      currency: string;
    };
  };
  defaultLocale: string;
  defaultCurrency: string;
};
```

#### File: `config/index.ts`

**REMOVE entire i18n configuration**:

```typescript
// REMOVE:
i18n: {
  enabled: true,
  locales: {
    en: {
      name: "English",
      currency: "USD",
    },
  },
  defaultLocale: "en",
  defaultCurrency: "USD",
},
```

### 7. Other Critical Files

#### File: `apps/web/middleware.ts`

Check for i18n middleware and remove if present.

#### File: `apps/web/global.d.ts`

Remove any i18n type declarations.

#### File: `apps/web/app/(marketing)/layout.tsx`

Update to remove i18n providers if any.

## Cleanup Execution Plan

### Phase 1: Mail Package (Isolated, Safe to Start)

1. Update all 6 email templates to use hard-coded English
2. Update `send.ts` and `templates.ts`
3. Update `types.ts`
4. Remove from `package.json` if present

**Risk**: Low - isolated to mail package
**Impact**: Email templates will be English-only

### Phase 2: Component LocaleLink Replacement (Moderate Risk)

1. Update all 15 component files
2. Replace `LocaleLink` with `Link`
3. Replace `useLocalePathname` with `usePathname`
4. Replace `localeRedirect` with `redirect`

**Risk**: Medium - affects navigation
**Impact**: All links will work without locale prefix

### Phase 3: Config and Hooks (Low Risk)

1. Update `config/types.ts` and `config/index.ts`
2. Update `useLocaleCurrency` hook
3. Remove i18n conditionals from NavBar

**Risk**: Low - config changes
**Impact**: Removes i18n infrastructure

### Phase 4: Route Migration (High Risk - Manual Required)

1. Move all content from `[locale]/` to parent
2. Merge duplicate routes
3. Delete `[locale]/` directory and layout
4. Update any imports in moved files

**Risk**: High - route structure changes
**Impact**: URL structure changes, must handle carefully

### Phase 5: Content-Collections (Medium Risk)

1. Update `next.config.ts`
2. Update `content-collections.ts`
3. Remove locale handling from blog/docs pages

**Risk**: Medium - affects content rendering
**Impact**: Content will be English-only

### Phase 6: Cleanup and Verification

1. Remove i18n packages from `package.json`
2. Run `pnpm install`
3. Run type check: `pnpm --filter web run type-check`
4. Fix any remaining type errors
5. Test navigation and content rendering

**Risk**: Low - cleanup and validation
**Impact**: Final verification

## Automated Replacement Commands

### Using sed (macOS/Linux)

```bash
# Replace LocaleLink with Link in all files
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/<LocaleLink/<Link/g' {} \;
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/<\/LocaleLink>/<\/Link>/g' {} \;

# Remove @i18n/routing imports
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' '/import.*@i18n\/routing/d' {} \;

# Replace useLocalePathname with usePathname
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/useLocalePathname/usePathname/g' {} \;

# Replace localeRedirect with redirect
find apps/web -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/localeRedirect/redirect/g' {} \;
```

### Manual Review Required

These changes require manual review:

-   Email template text replacements
-   Route directory migration
-   Merging duplicate routes
-   Import statement updates
-   Config type removals

## Testing Checklist

After cleanup:

-   [ ] Type check passes: `pnpm --filter web run type-check`
-   [ ] Build succeeds: `pnpm --filter web run build`
-   [ ] Navigation works (all menu links)
-   [ ] Blog posts render correctly
-   [ ] Docs pages render correctly
-   [ ] Legal pages render correctly
-   [ ] Email templates render in preview
-   [ ] No console errors in browser
-   [ ] No import errors in IDE

## Estimated Impact

-   **Files Modified**: ~50-60 files
-   **Files Deleted**: 1 file (`[locale]/layout.tsx`)
-   **Directories Moved**: 12 directories
-   **Risk Level**: Medium-High (route structure changes)
-   **Time Estimate**: 2-3 hours for careful execution

## Recommendations

1. **Create Feature Branch**: Don't work on main/dev
2. **Commit Frequently**: After each phase
3. **Test After Each Phase**: Ensure no breakage
4. **Manual Route Migration**: Don't automate directory moves
5. **Review Email Templates**: Ensure text quality
6. **Update Documentation**: Note English-only decision

## Next Steps

1. Create feature branch: `git checkout -b cleanup/remove-i18n-final`
2. Start with Phase 1 (Mail Package) - safest
3. Commit after each phase
4. Run type-check after each phase
5. Test thoroughly before merging

---

**Note**: This is a comprehensive cleanup that touches many files. Proceed systematically and test frequently to avoid breaking the application.
