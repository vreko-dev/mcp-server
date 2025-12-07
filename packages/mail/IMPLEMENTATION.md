# Email System Implementation Guide

**Last Updated:** December 2025 with Context7 library verification

## Overview

The email system infrastructure is 30% complete with all services and routes scaffolded. This guide focuses on the remaining content phase (components → templates → orchestrator) using library best practices from React Email, Resend, Nodemailer, and Drizzle ORM.

## Completed

✅ **Core Services** (100%)
- EmailService: Resend (production) / Nodemailer (dev/test) abstraction
- UnsubscribeService: HMAC-SHA256 tokens, Drizzle ORM patterns, HubSpot sync
- API routes: Unsubscribe endpoint with HTML error/success pages
- Error handling: `@snapback-oss/sdk` toError(), structured logging

✅ **Infrastructure** (100%)
- packages/mail package.json and tsconfig
- Database schema (Drizzle ORM ready)
- Theme tokens (⚠️ needs color alignment)
- E2E tests (basic structure)

❌ **Content** (0%)
- Components (0/6) - Header, Footer, Button, Card, Stats, CodeBlock, Checklist
- Layouts (0/1) - BaseEmail.tsx
- Templates (0/5) - Welcome, ApiKeyCreated, FirstCheckpoint, FirstRecovery, WeeklyDigest
- EmailOrchestrator export (needs to be added)

## Critical Issues to Fix First

### 1. **Design System Alignment** (Theme Colors)

**Problem:** Theme.ts uses `#10B981` (Emerald) but Tailwind uses `#00FF41` (Neon SnapBack green)

**Fix needed in `packages/mail/src/theme.ts`:**

```typescript
// BEFORE (wrong)
green: "#10B981",

// AFTER (correct - aligned with Tailwind)
green: "#00FF41",
getDynamic
greendark: "#00CC34",
greenLight: "#4DFF70",
```

### 2. **Export EmailOrchestrator** (Blocks Generator)

Add to `packages/mail/src/services/email.ts` and export from `services/index.ts`

### 3. **Install Dependencies**

```bash
pnpm install
```

### 4. Create Database Schema

Add to `packages/platform/src/db/schema/snapback/index.ts`:

```typescript
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../postgres";

export const emailPreferences = pgTable("email_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  achievement: boolean("achievement").notNull().default(true),
  nurture: boolean("nurture").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailPreferencesRelations = relations(emailPreferences, ({ one }) => ({
  user: one(users, {
    fields: [emailPreferences.userId],
    references: [users.id],
  }),
}));
```

### 3. Generate Database Migration

```bash
cd packages/platform
pnpm db:generate
pnpm db:migrate
```

### 4. Update UnsubscribeService Database Calls

In `packages/mail/src/services/unsubscribe.ts`, uncomment and implement:

```typescript
import { db } from "@snapback/platform/db/client";
import { emailPreferences } from "@snapback/platform/src/db/schema/snapback";
import { eq } from "drizzle-orm";

// In getEmailPreferences function:
export async function getEmailPreferences(db: Database, userId: string) {
  const result = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  return result[0] || null;
}

// Similar updates for other database functions
```

### 5. Library Best Practices Integration

**React Email Components:**
```typescript
// Use React Email's structure components
import { Html, Head, Body, Container, Section, Row, Column, Text, Heading, Button } from '@react-email/components';

// Style with JSX inline props (not CSS files)
// React Email handles email client compatibility automatically
```

**Resend Sending:**
```typescript
// Resend handles JSX transpilation natively
const result = await resend.emails.send({
  from: 'noreply@snapback.dev',
  to: user.email,
  subject: 'Welcome!',
  react: <WelcomeTemplate name={user.name} />,  // JSX directly
});
```

**Nodemailer Rendering:**
```typescript
// Must render React to HTML for Nodemailer
import { render } from '@react-email/render';

const html = await render(<WelcomeTemplate name={user.name} />);
const text = await render(<WelcomeTemplate name={user.name} />, { plainText: true });

await nodemailer.sendMail({
  from: 'noreply@snapback.dev',
  to: user.email,
  subject: 'Welcome!',
  html,  // Rendered HTML
  text,  // Plain text version
});
```

### 6. Integrate with Auth System

In `packages/auth/src/auth.ts`, add email preference creation on signup:

```typescript
import { createDefaultPreferences } from "@snapback/mail";

export const authConfig = {
  callbacks: {
    async onSignUp({ user, profile }) {
      // Create default email preferences
      await createDefaultPreferences(db, user.id!, user.email);
    },
  },
};
```

### 7. Mount API Routes

In your API application (e.g., `apps/api/src/app.ts`):

```typescript
import { emailRoutes } from "@snapback/mail/routes";

const app = new Hono();

// Mount email routes
app.route("/api/email", emailRoutes);
```

### 8. Create Email Components (Using React Email Patterns)

Create in `packages/mail/src/components/`. Each component uses React Email structure:

```typescript
// Example: Button.tsx - styled with JSX inline props
import { Button as EmailButton } from '@react-email/components';

export interface ButtonProps {
  href: string;
  children: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = ({ href, children, variant = 'primary' }: ButtonProps) => {
  const baseStyles = {
    backgroundColor: variant === 'primary' ? '#00FF41' : '#111111',
    color: variant === 'primary' ? '#000' : '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
  };

  return (
    <EmailButton href={href} style={baseStyles}>
      {children}
    </EmailButton>
  );
};
```

**Files to create:**
- `packages/mail/src/components/Header.tsx` - Branding section
- `packages/mail/src/components/Footer.tsx` - Footer with links
- `packages/mail/src/components/Button.tsx` - CTA buttons (primary, secondary, danger)
- `packages/mail/src/components/Card.tsx` - Content cards (highlight, warning, danger, info)
- `packages/mail/src/components/Stats.tsx` - Single stat displays
- `packages/mail/src/components/CodeBlock.tsx` - Code display
- `packages/mail/src/components/Checklist.tsx` - Checklist items
- `packages/mail/src/layouts/BaseEmail.tsx` - Wraps Header + content + Footer

### 9. Create Email Templates

Create in `packages/mail/src/templates/` using components:

```typescript
// Example: transactional/Welcome.tsx
import { Html, Body, Container, Section, Text, Heading } from '@react-email/components';
import { BaseEmail } from '../layouts/BaseEmail';
import { Button } from '../components/Button';

export interface WelcomeProps {
  userName: string;
  apiKey?: string;
}

export const Welcome = ({ userName, apiKey }: WelcomeProps) => (
  <Html>
    <Body>
      <BaseEmail>
        <Section>
          <Heading as="h1">Welcome to SnapBack, {userName}!</Heading>
          <Text>Get started protecting your files in seconds.</Text>
          {apiKey && <CodeBlock code={apiKey} />}
          <Button href="https://snapback.dev/docs">View Docs</Button>
        </Section>
      </BaseEmail>
    </Body>
  </Html>
);
```

**Files to create:**
- `packages/mail/src/templates/transactional/Welcome.tsx`
- `packages/mail/src/templates/transactional/ApiKeyCreated.tsx`
- `packages/mail/src/templates/achievement/FirstCheckpoint.tsx`
- `packages/mail/src/templates/achievement/FirstRecovery.tsx`
- `packages/mail/src/templates/nurture/WeeklyDigest.tsx`

### 10. Create EmailOrchestrator

Add to `packages/mail/src/services/email.ts` (after EmailService class, before export statements):

```typescript
/**
 * EmailOrchestrator - Triggers emails based on application events
 *
 * Maps business events to email templates:
 * - onUserSignup → Welcome
 * - onApiKeyCreated → ApiKeyCreated
 * - onCheckpointCreated → FirstCheckpoint
 * - onRecoveryCompleted → FirstRecovery
 */
export class EmailOrchestrator {
  constructor(private emailService: EmailService) {}

  async onUserSignup(user: { email: string; name: string }) {
    return this.emailService.send({
      to: user.email,
      subject: "Welcome to SnapBack! 🧢",
      react: <Welcome userName={user.name} />,
      tags: [{ name: "category", value: "transactional" }],
    });
  }

  // Additional methods implemented per email_system.md
}

let orchestrator: EmailOrchestrator | null = null;

export function getEmailOrchestrator(): EmailOrchestrator {
  if (!orchestrator) {
    orchestrator = new EmailOrchestrator(getEmailService());
  }
  return orchestrator;
}
```

Then export from `packages/mail/src/services/index.ts`:

```typescript
export { EmailOrchestrator, getEmailOrchestrator } from './email';
```

### 11. Build and Test

```bash
# Build the package
pnpm --filter @snapback/mail build

# Run tests
pnpm --filter @snapback/mail test

# Type check
pnpm --filter @snapback/mail typecheck
```

### 12. Integration Testing

Create component and template tests following React Email testing patterns:

```typescript
// packages/mail/src/components/__tests__/Button.test.ts
import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { Button } from "../Button";

describe("Button Component", () => {
  it("should render primary button with correct colors", () => {
    const html = render(<Button href="#">Click me</Button>);
    expect(html).toContain("00FF41"); // Brand green
  });

  it("should render secondary button", () => {
    const html = render(<Button href="#" variant="secondary">Cancel</Button>);
    expect(html).toContain("111111"); // Dark background
  });
});

// packages/mail/src/templates/__tests__/Welcome.test.ts
import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { Welcome } from "../transactional/Welcome";

describe("Welcome Template", () => {
  it("should render with user name", () => {
    const html = render(<Welcome userName="Alice" />);
    expect(html).toContain("Welcome to SnapBack, Alice");
  });

  it("should include CTA button", () => {
    const html = render(<Welcome userName="Alice" />);
    expect(html).toContain("href");
  });
});
```

## Implementation Phases

### Phase 1: Fix Design Alignment (10 min) ✓ Next
1. Update theme.ts colors: `#10B981` → `#00FF41`
2. Verify all color values match Tailwind palette
3. No component changes yet

### Phase 2: Export Orchestrator (5 min) ✓ Next
1. Add EmailOrchestrator class to services/email.ts
2. Export getEmailOrchestrator from services/index.ts
3. Unblocks generator command

### Phase 3: Create Components (30 min)
1. Create 8 component files using React Email patterns
2. Use theme tokens (aligned colors)
3. All styled with JSX inline props

### Phase 4: Create Layouts & Templates (45 min)
1. Create BaseEmail layout
2. Create 5 email templates
3. Use components and proper structure

### Phase 5: Generate & Test (20 min)
1. Run generator: `pnpm turbo gen email`
2. Run component tests
3. Run template tests
4. Verify end-to-end flow

## Environment Configuration

1. Copy `.env.example` to `.env.local`:

```bash
cp packages/mail/.env.example packages/mail/.env.local
```

2. Update with actual values:

```bash
RESEND_API_KEY=re_your_actual_key
HUBSPOT_ACCESS_TOKEN=pat_your_token
UNSUBSCRIBE_TOKEN_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=https://snapback.dev
```

## Verification Checklist

**Infrastructure (Currently 100% ✅):**
- [x] EmailService abstraction (Resend/Nodemailer)
- [x] UnsubscribeService with HMAC tokens
- [x] API routes (unsubscribe endpoint)
- [x] Error handling and logging
- [x] Database schema patterns ready

**Next Steps (Currently 0%):**
- [ ] **Phase 1:** Theme colors aligned to Tailwind
- [ ] **Phase 2:** EmailOrchestrator exported
- [ ] **Phase 3:** Components created (8 files)
- [ ] **Phase 4:** Templates created (5 files)
- [ ] **Phase 5:** Generator tested end-to-end

**Build & Testing:**
- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @snapback/mail build` succeeds
- [ ] `pnpm --filter @snapback/mail typecheck` clean
- [ ] Component tests pass
- [ ] Template tests pass
- [ ] E2E tests pass

## Library References

**React Email (Component Structure):**
- Use `Html`, `Body`, `Section`, `Row`, `Column` for layout
- Style with inline JSX props (not CSS files)
- Use `@react-email/render` for HTML/text rendering
- Official: https://react.email

**Resend (Production Transport):**
- Accepts JSX directly in `react` property
- Handles transpilation automatically
- Tag emails for analytics
- Official: https://resend.com/docs

**Nodemailer (Dev/Test Transport):**
- Must render React Email to HTML with `@react-email/render`
- SMTP configuration for local/test environments
- Full feature parity with production
- Official: https://nodemailer.com

**Drizzle ORM (Database):**
- Already implemented in unsubscribe.ts
- Uses dynamic imports from `@snapback/platform/src/db/schema/snapback`
- Patterns: `select().from().where()`, `insert().values().returning()`

## Troubleshooting

### Color Mismatch in Emails
If emails show wrong green color, verify theme.ts has `#00FF41` not `#10B981`

### "Cannot find module @react-email/*"
Run `pnpm install` first to download dependencies

### Nodemailer Not Rendering
Ensure `@react-email/render` is imported and used:
```typescript
import { render } from '@react-email/render';
const html = await render(<Component />);
```

### Orchestrator Not Found
Verify export in `services/index.ts`:
```typescript
export { EmailOrchestrator, getEmailOrchestrator } from './email';
```

## Next Phase: Immediate Actions

**Ready to implement Phases 1-2 (15 min total):**
1. Update theme.ts colors → alignment with Tailwind
2. Add EmailOrchestrator class + export → unblocks generator
3. Run `pnpm build` to verify

Then proceed to Phase 3 (components) with confidence that foundation is correct.
