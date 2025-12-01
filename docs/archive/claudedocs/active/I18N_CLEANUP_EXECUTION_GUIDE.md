# I18N Cleanup Execution Guide

**Generated**: 2025-10-05
**Purpose**: Step-by-step execution guide for completing i18n and content-collections removal
**Estimated Time**: 2-3 hours
**Difficulty**: Medium-High

## Prerequisites

Before starting:

-   [ ] All current work is committed or stashed
-   [ ] You're on the `dev` or `main` branch
-   [ ] You have a backup or can easily revert changes
-   [ ] You understand the scope (see `I18N_CONTENT_COLLECTIONS_CLEANUP_REPORT.md`)

## Setup

### 1. Create Feature Branch

```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
git checkout -b cleanup/i18n-content-collections-final
```

### 2. Verify Starting State

```bash
# Check for i18n imports
grep -r "@i18n/routing" apps/web --include="*.tsx" --include="*.ts" | wc -l
# Should show: ~15 files

# Check for use-intl
grep -r "use-intl" packages/mail --include="*.tsx" | wc -l
# Should show: ~6 files

# Check for config.i18n
grep -r "config\.i18n" apps/web packages --include="*.tsx" --include="*.ts" | wc -l
# Should show: ~25 files
```

## Phase 1: Mail Package Cleanup

**Time**: 30 minutes
**Risk**: Low
**Files**: 8 files

### Email Template Updates

Update each template to remove i18n and use hard-coded English text.

#### 1.1 OrganizationInvitation.tsx

```bash
# Edit: packages/mail/emails/OrganizationInvitation.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Heading, Link, Text } from "@react-email/components";
import React from "react";
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

</details>

#### 1.2 ForgotPassword.tsx

```bash
# Edit: packages/mail/emails/ForgotPassword.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Link, Text } from "@react-email/components";
import React from "react";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";

export function ForgotPassword({ url }: { url: string; name: string }) {
	return (
		<Wrapper>
			<Text>
				You requested a password reset for your account. Click the
				button below to reset your password.
			</Text>

			<PrimaryButton href={url}>Reset Password &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link into your browser:
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

export default ForgotPassword;
```

</details>

#### 1.3 NewUser.tsx

```bash
# Edit: packages/mail/emails/NewUser.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Link, Text } from "@react-email/components";
import React from "react";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";

export function NewUser({
	url,
	name,
	otp,
}: {
	url: string;
	name: string;
	otp: string;
}) {
	return (
		<Wrapper>
			<Text>
				Welcome, {name}! Please confirm your email address to get
				started.
			</Text>

			<Text>
				Your verification code:
				<br />
				<strong className="font-bold text-2xl">{otp}</strong>
			</Text>

			<Text>Or click the button below to confirm your email:</Text>

			<PrimaryButton href={url}>Confirm Email &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link into your browser:
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

export default NewUser;
```

</details>

#### 1.4 MagicLink.tsx

```bash
# Edit: packages/mail/emails/MagicLink.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Link, Text } from "@react-email/components";
import React from "react";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";

export function MagicLink({ url }: { url: string }) {
	return (
		<Wrapper>
			<Text>Click the button below to sign in to your account.</Text>

			<Text>This link will expire in 15 minutes.</Text>

			<PrimaryButton href={url}>Sign In &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link into your browser:
				<Link href={url}>{url}</Link>
			</Text>
		</Wrapper>
	);
}

export default MagicLink;
```

</details>

#### 1.5 EmailVerification.tsx

```bash
# Edit: packages/mail/emails/EmailVerification.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Link, Text } from "@react-email/components";
import React from "react";
import PrimaryButton from "../src/components/PrimaryButton";
import Wrapper from "../src/components/Wrapper";

export function EmailVerification({
	url,
	name,
}: {
	url: string;
	name: string;
}) {
	return (
		<Wrapper>
			<Text>
				Hello {name}, please confirm your email address by clicking the
				button below.
			</Text>

			<PrimaryButton href={url}>Confirm Email &rarr;</PrimaryButton>

			<Text className="text-muted-foreground text-sm">
				Or copy and paste this link into your browser:
				<Link href={url} className="break-all">
					{url}
				</Link>
			</Text>
		</Wrapper>
	);
}

export default EmailVerification;
```

</details>

#### 1.6 NewsletterSignup.tsx

```bash
# Edit: packages/mail/emails/NewsletterSignup.tsx
```

<details>
<summary>Full replacement code</summary>

```typescript
import { Heading, Text } from "@react-email/components";
import React from "react";
import Wrapper from "../src/components/Wrapper";

export function NewsletterSignup() {
	return (
		<Wrapper>
			<Heading className="text-xl">
				Welcome to the SnapBack Newsletter!
			</Heading>
			<Text>
				Thank you for subscribing. You'll receive updates about new
				features, tips, and news about SnapBack.
			</Text>
		</Wrapper>
	);
}

export default NewsletterSignup;
```

</details>

#### 1.7 Update send.ts

```bash
# Edit: packages/mail/src/util/send.ts
```

<details>
<summary>Full replacement code</summary>

```typescript
import { config } from "@snapback/config";
import { logger } from "@snapback/logs";
import type { emails as mailTemplates } from "../../emails";
import { send } from "../provider";
import type { TemplateId } from "./templates";
import { getTemplate } from "./templates";

export async function sendEmail<T extends TemplateId>(
	params: {
		to: string;
	} & (
		| {
				templateId: T;
				context: Parameters<(typeof mailTemplates)[T]>[0];
		  }
		| {
				subject: string;
				text?: string;
				html?: string;
		  }
	)
) {
	const { to } = params;

	let html: string;
	let text: string;
	let subject: string;

	if ("templateId" in params) {
		const { templateId, context } = params;
		const template = await getTemplate({
			templateId,
			context,
		});
		subject = template.subject;
		text = template.text;
		html = template.html;
	} else {
		subject = params.subject;
		text = params.text ?? "";
		html = params.html ?? "";
	}

	try {
		await send({
			to,
			subject,
			text,
			html,
		});
		return true;
	} catch (e) {
		logger.error(e);
		return false;
	}
}
```

</details>

#### 1.8 Update templates.ts

```bash
# Edit: packages/mail/src/util/templates.ts
```

<details>
<summary>Full replacement code</summary>

```typescript
import { render } from "@react-email/render";
import { emails as mailTemplates } from "../../emails";

export async function getTemplate<T extends TemplateId>({
	templateId,
	context,
}: {
	templateId: T;
	context: Parameters<(typeof mailTemplates)[T]>[0];
}) {
	const template = mailTemplates[templateId];

	const email = template(context as any);

	const subject = ""; // Subject will be provided by the calling code

	const html = await render(email);
	const text = await render(email, { plainText: true });
	return { html, text, subject };
}

export type TemplateId = keyof typeof mailTemplates;
```

</details>

#### 1.9 Update types.ts

```bash
# Edit: packages/mail/types.ts
```

```typescript
export interface SendEmailParams {
	to: string;
	subject: string;
	text: string;
	html?: string;
}

export type SendEmailHandler = (params: SendEmailParams) => Promise<void>;

export interface MailProvider {
	send: SendEmailHandler;
}

// Remove BaseMailProps or make it optional/empty
```

### Phase 1 Verification

```bash
# Check no use-intl imports remain in mail package
grep -r "use-intl" packages/mail --include="*.tsx" --include="*.ts"
# Should return: no results

# Commit Phase 1
git add packages/mail
git commit -m "refactor(mail): remove i18n, use English-only email templates"
```

## Phase 2: Component LocaleLink Replacement

**Time**: 45 minutes
**Risk**: Medium
**Files**: 15 files

### Automated Replacement Strategy

For most files, the pattern is simple: replace `LocaleLink` with `Link`.

#### 2.1 Simple Replacements (12 files)

These files only use `LocaleLink`:

```bash
# List of files:
apps/web/modules/saas/shared/components/Footer.tsx
apps/web/modules/saas/payments/components/PricingTable.tsx
apps/web/modules/marketing/blog/components/PostListItem.tsx
apps/web/modules/marketing/blog/utils/mdx-components.tsx
apps/web/modules/marketing/docs/components/DocsFooter.tsx
apps/web/modules/marketing/shared/components/NotFound.tsx
apps/web/modules/marketing/shared/components/Footer.tsx
apps/web/modules/marketing/shared/components/ContentMenu.tsx
apps/web/modules/marketing/home/components/Hero.tsx (already done)
apps/web/__tests__/components/NavBar.test.tsx
```

**Pattern for each file**:

1. Remove: `import { LocaleLink } from "@i18n/routing";`
2. Add: `import Link from "next/link";` (if not already present)
3. Replace: `LocaleLink` → `Link`

**Example - Footer.tsx**:

```typescript
// BEFORE:
import { LocaleLink } from "@i18n/routing";

<LocaleLink href="/docs">Documentation</LocaleLink>;

// AFTER:
import Link from "next/link";

<Link href="/docs">Documentation</Link>;
```

#### 2.2 NavBar.tsx (Complex Replacement)

```bash
# Edit: apps/web/modules/marketing/shared/components/NavBar.tsx
```

**Changes**:

1. Remove: `import { LocaleLink, useLocalePathname } from "@i18n/routing";`
2. Add: `import Link from "next/link";` and `import { usePathname } from "next/navigation";`
3. Replace: `useLocalePathname()` → `usePathname()`
4. Replace: `localePathname` → `pathname` (all occurrences)
5. Replace: `LocaleLink` → `Link`
6. Remove: Lines 213-217 (LocaleSwitch conditional)

#### 2.3 Page Files with localeRedirect

```bash
# Edit: apps/web/app/(marketing)/[locale]/legal/[...path]/page.tsx
# Edit: apps/web/app/(marketing)/[locale]/blog/[...path]/page.tsx
```

**Changes**:

1. Remove: `import { localeRedirect } from "@i18n/routing";`
2. Add: `import { redirect } from "next/navigation";`
3. Replace: `localeRedirect(` → `redirect(`

### Phase 2 Verification

```bash
# Check no @i18n/routing imports remain
grep -r "@i18n/routing" apps/web --include="*.tsx" --include="*.ts"
# Should return: no results (or only in documentation/comments)

# Type check
pnpm --filter web run type-check

# Commit Phase 2
git add apps/web/modules apps/web/app apps/web/__tests__
git commit -m "refactor(components): replace LocaleLink with Next.js Link"
```

## Phase 3: Config and Hooks Cleanup

**Time**: 15 minutes
**Risk**: Low
**Files**: 4 files

### 3.1 Update useLocaleCurrency Hook

```bash
# Edit: apps/web/modules/shared/hooks/locale-currency.tsx
```

```typescript
export function useLocaleCurrency() {
	return "USD"; // English-only, default currency
}
```

### 3.2 Remove i18n from Config Types

```bash
# Edit: config/types.ts
```

Remove the entire `i18n` section from the `Config` type (around lines 47-57).

### 3.3 Remove i18n from Config

```bash
# Edit: config/index.ts
```

Remove the entire `i18n` configuration object.

### 3.4 Update NavBar to Remove LocaleSwitch

Already done in Phase 2.2.

### Phase 3 Verification

```bash
# Check no config.i18n references in web app
grep -r "config\.i18n" apps/web --include="*.tsx" --include="*.ts"
# Should return: minimal results (maybe in tests or old code)

# Type check
pnpm --filter web run type-check

# Commit Phase 3
git add config apps/web/modules/shared/hooks
git commit -m "refactor(config): remove i18n configuration and simplify currency hook"
```

## Phase 4: Content-Collections Update

**Time**: 15 minutes
**Risk**: Medium
**Files**: 3 files

### 4.1 Update next.config.ts

```bash
# Edit: apps/web/next.config.ts
```

**Changes**:

1. Remove line 2: `import { withContentCollections } from "@content-collections/next";`
2. Change lines 62-63:

```typescript
// BEFORE:
export default withSentryConfig(
	withContentCollections(nextConfig),

// AFTER:
export default withSentryConfig(
	nextConfig,
```

### 4.2 Update content-collections.ts

```bash
# Edit: apps/web/content-collections.ts
```

**Change** line 21-26:

```typescript
function getLocaleFromFilePath(path: string) {
	return "en"; // Hard-coded since we removed i18n
}
```

### 4.3 Remove content-collections alias from next.config.ts

Already handled - the webpack alias can stay, it just points to the generated files.

### Phase 4 Verification

```bash
# Type check
pnpm --filter web run type-check

# Build check
pnpm --filter web run build

# Commit Phase 4
git add apps/web/next.config.ts apps/web/content-collections.ts
git commit -m "refactor(content): remove content-collections wrapper and simplify locale handling"
```

## Phase 5: Route Migration (MANUAL REQUIRED)

**Time**: 45-60 minutes
**Risk**: HIGH
**Files**: ~30 files

⚠️ **WARNING**: This phase requires careful manual work. Do NOT automate.

### 5.1 Analyze Current Structure

```bash
cd apps/web/app/\(marketing\)

# List what's in [locale]
ls -la \[locale\]/

# List what's in parent (marketing)
ls -la ./
```

### 5.2 Identify Conflicts

Check which directories exist in both `[locale]/` and parent:

```bash
# Check for blog
ls -la \[locale\]/blog 2>/dev/null && ls -la ./blog 2>/dev/null

# Check for docs
ls -la \[locale\]/docs 2>/dev/null && ls -la ./docs 2>/dev/null

# Check for changelog
ls -la \[locale\]/changelog 2>/dev/null && ls -la ./changelog 2>/dev/null
```

### 5.3 Migration Strategy

**For directories that exist in both**:

-   **DO NOT** overwrite
-   Manually compare and merge if needed
-   Most likely `[locale]/` versions are outdated

**For unique directories**:

-   Move from `[locale]/` to parent

### 5.4 Execute Migration

```bash
cd apps/web/app/\(marketing\)

# Move unique directories (adjust based on your findings)
# Example (you'll need to verify each):

# 1. Move (home) route group
mv \[locale\]/\(home\) ./

# 2. Check and handle rest route
ls -la \[locale\]/\[...rest\]
# Decide: move or delete based on if it's in parent

# 3. Check blog
# If [locale]/blog is old, don't move
# If it's the main one, be careful

# 4. Move components if unique
mv \[locale\]/components ./locale-components
# Then review and integrate

# 5. Move contact
mv \[locale\]/contact ./

# 6. Check docs
# Similar to blog

# 7. Move legal
mv \[locale\]/legal ./

# 8. Move not-found.tsx
mv \[locale\]/not-found.tsx ./not-found-locale.tsx
# Review and merge with existing not-found.tsx

# 9. Move test directory
mv \[locale\]/test ./
```

### 5.5 Update Moved Files

For each moved page file, check for:

-   Locale parameter in params
-   `setRequestLocale` calls
-   `NextIntlClientProvider` usage
-   Any locale-based logic

**Example - page.tsx updates**:

```typescript
// BEFORE:
export default async function Page({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>;
}) {
	const { locale, slug } = await params;
	setRequestLocale(locale);
	// ...
}

// AFTER:
export default async function Page({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	// Remove setRequestLocale
	// ...
}
```

### 5.6 Delete Locale Directory

```bash
# Only after verifying all content is moved
rm -rf apps/web/app/\(marketing\)/\[locale\]
```

### Phase 5 Verification

```bash
# Verify [locale] directory is gone
ls -la apps/web/app/\(marketing\)/\[locale\] 2>/dev/null
# Should return: No such file or directory

# Type check
pnpm --filter web run type-check

# Build check
pnpm --filter web run build

# Test routes
pnpm --filter web run dev
# Visit:
# - http://localhost:3000/
# - http://localhost:3000/blog
# - http://localhost:3000/docs
# - http://localhost:3000/legal/privacy

# Commit Phase 5
git add apps/web/app/\(marketing\)
git commit -m "refactor(routes): remove [locale] directory and migrate to root routes"
```

## Phase 6: Final Cleanup

**Time**: 15 minutes
**Risk**: Low

### 6.1 Remove Unused Packages

Check `package.json` files for i18n packages:

```bash
# Check root
grep -i "i18n\|intl" package.json

# Check web app
grep -i "i18n\|intl" apps/web/package.json

# Check api
grep -i "i18n\|intl" packages/api/package.json
```

If found, remove them:

```json
// Remove from dependencies or devDependencies:
"next-intl": "...",
"@formatjs/intl-localematcher": "...",
// etc.
```

### 6.2 Clean Install

```bash
pnpm install
```

### 6.3 Remove Locale Middleware

```bash
# Check if exists
cat apps/web/middleware.ts

# If it has i18n logic, update or remove
```

### 6.4 Update Global Types

```bash
# Check: apps/web/global.d.ts
# Remove any i18n type declarations if present
```

### Phase 6 Verification

```bash
# Final type check
pnpm --filter web run type-check

# Final build
pnpm --filter web run build

# Run tests if available
pnpm --filter web run test

# Commit Phase 6
git add package.json apps/web/package.json packages/*/package.json pnpm-lock.yaml
git commit -m "chore: remove unused i18n packages and update dependencies"
```

## Final Verification

### Complete Checklist

-   [ ] No `@i18n/routing` imports exist

    ```bash
    grep -r "@i18n/routing" apps/web packages --include="*.tsx" --include="*.ts"
    ```

-   [ ] No `use-intl` imports exist (except possibly dev dependencies)

    ```bash
    grep -r "use-intl" apps/web packages --include="*.tsx" --include="*.ts"
    ```

-   [ ] No `config.i18n` references exist

    ```bash
    grep -r "config\.i18n" apps/web packages --include="*.tsx" --include="*.ts"
    ```

-   [ ] No `[locale]` directory exists

    ```bash
    find apps/web/app -type d -name "\[locale\]"
    ```

-   [ ] Type check passes

    ```bash
    pnpm --filter web run type-check
    ```

-   [ ] Build succeeds

    ```bash
    pnpm --filter web run build
    ```

-   [ ] All routes work:

    -   [ ] Home page (`/`)
    -   [ ] Blog (`/blog`)
    -   [ ] Docs (`/docs`)
    -   [ ] Legal pages (`/legal/privacy`, `/legal/terms`)
    -   [ ] Auth pages (`/auth/login`, `/auth/signup`)
    -   [ ] App routes (`/app/dashboard`)

-   [ ] Email templates render in preview

## Commit and Push

```bash
# Final review
git log --oneline

# Push to remote
git push origin cleanup/i18n-content-collections-final

# Create PR (if using GitHub)
gh pr create --title "Complete i18n and content-collections removal" \
  --body "Completes the removal of i18n (next-intl) and content-collections cleanup. See detailed report in claudedocs/I18N_CONTENT_COLLECTIONS_CLEANUP_REPORT.md"
```

## Rollback (If Needed)

If something goes wrong:

```bash
# See what changed
git log --oneline

# Revert to before cleanup
git reset --hard <commit-hash-before-cleanup>

# Or revert specific commits
git revert <commit-hash>

# Force push if already pushed
git push --force origin cleanup/i18n-content-collections-final
```

## Post-Migration

After successful merge:

1. Update README if it mentions i18n
2. Update any developer documentation
3. Notify team of URL structure changes
4. Monitor for any broken links or issues
5. Update SEO/sitemap if needed

## Troubleshooting

### TypeScript Errors After Changes

```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Rebuild
pnpm --filter web run build
```

### Import Errors

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install
```

### Routes Not Working

-   Check moved files don't have locale params
-   Verify `layout.tsx` files are correct
-   Check for any middleware blocking routes

### Email Templates Not Rendering

-   Verify all translations were replaced
-   Check for missing text (search for `t(`)
-   Ensure imports are correct

## Success!

If all verification steps pass, you have successfully:

-   ✅ Removed all i18n infrastructure
-   ✅ Simplified routing (no locale segments)
-   ✅ Hard-coded English throughout
-   ✅ Removed content-collections wrapper
-   ✅ Cleaned up dependencies

The codebase is now simpler, easier to maintain, and focused on English-only content.

---

**Questions or Issues?**

Refer to:

-   `I18N_CONTENT_COLLECTIONS_CLEANUP_REPORT.md` - Detailed analysis
-   `I18N_REMOVAL_ARCHITECTURE.md` - Architectural decisions
-   Git history for step-by-step changes
