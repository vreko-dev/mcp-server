# I18N Removal Architecture & Strategy

## Overview

The SnapBack-Site codebase is transitioning from a multi-locale architecture to an English-only application. This document outlines the architectural changes and provides a systematic execution strategy.

## Architectural Changes

### Before: Multi-Locale Architecture

```
Route Structure:
/[locale]/          → Dynamic locale segment
  ├── blog/         → Localized blog
  ├── docs/         → Localized documentation
  └── legal/        → Localized legal pages

Components:
- LocaleLink        → Locale-aware routing
- useLocalePathname → Locale-aware path detection
- LocaleSwitch      → Language selector UI
- config.i18n       → Internationalization configuration

Email Templates:
- use-intl/core     → Translation system
- Locale-aware text → Dynamic translations

Content:
- content-collections → Locale-based content routing
- getLocaleFromFilePath → Extract locale from file paths
```

### After: English-Only Architecture

```
Route Structure:
/                   → No locale segment
  ├── blog/         → English blog
  ├── docs/         → English documentation
  └── legal/        → English legal pages

Components:
- Link              → Standard Next.js routing
- usePathname       → Standard path detection
- (removed)         → No language selector
- (removed)         → No i18n configuration

Email Templates:
- Hard-coded text   → English strings
- No translations   → Direct text rendering

Content:
- Standard routing  → No locale handling
- English-only      → Single language content
```

## Key Decisions

### 1. English-Only Product Strategy

**Rationale**:

-   SnapBack targets English-speaking developers globally
-   Reduces complexity and maintenance burden
-   Faster development iteration
-   Clearer messaging and documentation

**Impact**:

-   All UI text in English
-   All email templates in English
-   All content (blog, docs, legal) in English
-   Currency defaults to USD

### 2. Route Simplification

**Before**: `/en/docs/getting-started`
**After**: `/docs/getting-started`

**Benefits**:

-   Cleaner URLs
-   Better SEO (no duplicate content issues)
-   Simpler routing logic
-   Easier to understand codebase

### 3. Component Standardization

Replace custom i18n components with Next.js standard components:

| Custom              | Standard      | Benefit                   |
| ------------------- | ------------- | ------------------------- |
| `LocaleLink`        | `Link`        | Native Next.js, better DX |
| `useLocalePathname` | `usePathname` | Standard API              |
| `localeRedirect`    | `redirect`    | Consistent with Next.js   |

### 4. Configuration Simplification

**Remove**:

```typescript
i18n: {
  enabled: boolean;
  locales: { [key: string]: { name: string; currency: string } };
  defaultLocale: string;
  defaultCurrency: string;
}
```

**Rationale**:

-   Unused configuration adds cognitive load
-   Simpler config = easier onboarding
-   Reduces potential for misconfiguration

### 5. Email Template Approach

**Decision**: Hard-code English text instead of translation keys

**Before**:

```typescript
{
	t("mail.forgotPassword.body");
}
```

**After**:

```typescript
You requested a password reset for your account.
```

**Benefits**:

-   Immediate clarity (no looking up translation keys)
-   Easier to modify email copy
-   Faster email template development
-   No translation maintenance

## Migration Strategy

### Phase-Based Approach

#### Phase 1: Isolated Changes (Low Risk)

-   Mail package email templates
-   Configuration type definitions
-   Utility hooks

**Why First**: No dependencies on other systems, easy to test in isolation

#### Phase 2: Component Updates (Medium Risk)

-   Replace `LocaleLink` with `Link`
-   Update path hooks
-   Remove i18n UI conditionals

**Why Second**: Well-defined replacements, easy to verify

#### Phase 3: Route Migration (High Risk)

-   Move content from `[locale]/` to parent
-   Merge duplicate routes
-   Update imports

**Why Third**: Requires careful manual work, impacts URL structure

#### Phase 4: Cleanup (Low Risk)

-   Remove packages
-   Type checking
-   Final verification

**Why Last**: Ensures everything else is working before cleanup

### Risk Mitigation

1. **Feature Branch**: Work on `cleanup/remove-i18n-final` branch
2. **Incremental Commits**: Commit after each phase
3. **Type Checking**: Run after each phase to catch errors early
4. **Manual Testing**: Test navigation and rendering between phases
5. **Rollback Plan**: Each commit is a rollback point

### Testing Strategy

#### After Each Phase:

```bash
# Type check
pnpm --filter web run type-check

# Build check
pnpm --filter web run build

# Run dev server and manually test
pnpm --filter web run dev
```

#### Final Verification:

-   [ ] All navigation links work
-   [ ] Blog posts render
-   [ ] Docs pages render
-   [ ] Legal pages render
-   [ ] Email templates preview correctly
-   [ ] No TypeScript errors
-   [ ] No console errors
-   [ ] No broken imports

## Implementation Details

### 1. Email Template Pattern

**Template**: All email templates follow this pattern

```typescript
// OrganizationInvitation.tsx

import { Heading, Link, Text } from "@react-email/components";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";

export function OrganizationInvitation({
	url,
	organizationName,
}: {
	url: string;
	organizationName: string;
}) {
	return (
		<Wrapper>
			<Heading className="text-xl">
				You've been invited to <strong>{organizationName}</strong>
			</Heading>
			<Text>
				You have been invited to join {organizationName}. Click the
				button below to accept the invitation.
			</Text>
			<PrimaryButton href={url}>Join Organization</PrimaryButton>
			<Text className="mt-4 text-muted-foreground text-sm">
				Or copy and paste this link into your browser:
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

export default OrganizationInvitation;
```

### 2. Component Replacement Pattern

**Pattern**: Replace i18n components with standard Next.js

```typescript
// BEFORE:
import { LocaleLink } from "@i18n/routing";

<LocaleLink href="/docs">Documentation</LocaleLink>;

// AFTER:
import Link from "next/link";

<Link href="/docs">Documentation</Link>;
```

### 3. Path Hook Replacement

**Pattern**: Use Next.js native path hooks

```typescript
// BEFORE:
import { useLocalePathname } from "@i18n/routing";

const localePathname = useLocalePathname();
const isActive = localePathname.startsWith(href);

// AFTER:
import { usePathname } from "next/navigation";

const pathname = usePathname();
const isActive = pathname.startsWith(href);
```

### 4. Redirect Replacement

**Pattern**: Use Next.js native redirect

```typescript
// BEFORE:
import { localeRedirect } from "@i18n/routing";

localeRedirect("/not-found");

// AFTER:
import { redirect } from "next/navigation";

redirect("/not-found");
```

### 5. Currency Hook Simplification

**Pattern**: Return hard-coded USD

```typescript
// BEFORE:
export function useLocaleCurrency() {
	const locale = useLocale();
	const localeCurrency =
		Object.entries(config.i18n.locales).find(([key]) => key === locale)?.[1]
			.currency ?? config.i18n.defaultCurrency;
	return localeCurrency;
}

// AFTER:
export function useLocaleCurrency() {
	return "USD";
}
```

## File-by-File Checklist

### Critical Path Files (Must Complete)

-   [ ] `packages/mail/emails/*.tsx` (6 files) - Email templates
-   [ ] `packages/mail/src/util/send.ts` - Email sending
-   [ ] `apps/web/modules/marketing/shared/components/NavBar.tsx` - Navigation
-   [ ] `apps/web/modules/shared/hooks/locale-currency.tsx` - Currency
-   [ ] `config/index.ts` - Remove i18n config
-   [ ] `config/types.ts` - Remove i18n types
-   [ ] `apps/web/next.config.ts` - Remove content-collections wrapper

### Component Files (Bulk Replacement)

-   [ ] All files with `LocaleLink` (12 files)
-   [ ] All files with `use Locale Pathname` (1 file)
-   [ ] All files with `localeRedirect` (2 files)

### Route Migration (Manual Required)

-   [ ] Move `[locale]/(home)/` content
-   [ ] Move `[locale]/blog/` content (check for conflicts)
-   [ ] Move `[locale]/docs/` content (check for conflicts)
-   [ ] Move `[locale]/legal/` content
-   [ ] Delete `[locale]/layout.tsx`
-   [ ] Remove `[locale]/` directory

## Success Criteria

### Build & Type Safety

-   ✅ `pnpm --filter web run type-check` passes with 0 errors
-   ✅ `pnpm --filter web run build` completes successfully
-   ✅ No import errors in any file
-   ✅ No unresolved references

### Functional Testing

-   ✅ All navigation links functional
-   ✅ Blog posts render and navigate correctly
-   ✅ Docs pages render and navigate correctly
-   ✅ Legal pages accessible
-   ✅ Email templates render in preview mode
-   ✅ No runtime errors in console

### Code Quality

-   ✅ No `@i18n/routing` imports remain
-   ✅ No `use-intl` imports remain (except dev dependencies if needed)
-   ✅ No `config.i18n` references remain
-   ✅ No `content-collections` wrapper in next.config
-   ✅ No `[locale]` directory exists

## Rollback Plan

If issues arise during migration:

1. **Identify Phase**: Determine which phase caused the issue
2. **Git Revert**: Revert to the last good commit
    ```bash
    git log --oneline  # Find last good commit
    git revert <commit-hash>
    ```
3. **Analyze**: Review what went wrong
4. **Re-attempt**: Fix the issue and try again

## Post-Migration Tasks

After successful migration:

1. **Update Documentation**: Note English-only decision in README
2. **Update Package.json**: Remove unused i18n packages
3. **Clean Dependencies**: Run `pnpm install` to update lockfile
4. **Update Tests**: Ensure all tests pass with new structure
5. **Performance Check**: Verify no performance regression
6. **SEO Review**: Check that URLs are clean and indexed properly

## Future Considerations

### If Multi-Language Needed Later

If the product needs to support multiple languages in the future:

1. **Re-evaluate Approach**: Consider if next-intl is still the best choice
2. **Content-First**: Focus on content translation, not full i18n
3. **URL Structure**: Keep English as default, add `/es/`, `/fr/` etc. as needed
4. **Gradual Rollout**: Start with critical pages only

### Alternative Approaches

-   **Marketing vs App**: Different i18n for marketing site vs. SaaS app
-   **Content-Only**: Translate blog/docs but keep app English-only
-   **User Preference**: Let users choose language without changing URLs

## Conclusion

This migration simplifies the SnapBack-Site architecture by removing unnecessary i18n complexity. The English-only approach aligns with the target audience (developers) and reduces maintenance burden while improving development velocity.

**Key Takeaway**: Simpler architecture = faster development = better product
