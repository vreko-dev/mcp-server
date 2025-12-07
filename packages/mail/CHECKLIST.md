# Email System Implementation Checklist

## ✅ Completed: Core Architecture & Integration Points

### Phase 0: Foundation (100% Complete)

- [x] **packages/mail/ directory structure created**
  - [x] src/services/
  - [x] src/routes/
  - [x] Configuration files (tsconfig, tsup, vitest)

- [x] **EmailService Implementation**
  - [x] Resend API integration (production)
  - [x] Nodemailer SMTP integration (dev/test)
  - [x] Environment-based provider selection
  - [x] Error handling with structured logging
  - [x] Transport verification
  - [x] Singleton pattern with factory function

- [x] **UnsubscribeService Implementation**
  - [x] HMAC-SHA256 token generation (stateless)
  - [x] Token verification with expiry (30 days)
  - [x] Database integration points (Drizzle ORM ready)
  - [x] HubSpot API sync implementation
  - [x] Email preference management (achievement, nurture)
  - [x] Category-based subscription control

- [x] **API Routes**
  - [x] GET /api/email/unsubscribe (token verification)
  - [x] Success page (styled, brand-aligned)
  - [x] Error page (user-friendly)
  - [x] HubSpot sync on unsubscribe
  - [x] Comprehensive logging

- [x] **Library Integration**
  - [x] Resend API documented and configured
  - [x] Nodemailer documented and configured
  - [x] HubSpot API (@hubspot/api-client) documented
  - [x] @react-email/render for HTML generation
  - [x] Drizzle ORM ready for database operations
  - [x] Infrastructure logger integration
  - [x] SDK error handling (toError)

- [x] **Design System**
  - [x] SnapBack brand colors (dark mode)
  - [x] Typography scales
  - [x] Spacing tokens
  - [x] Border radius tokens
  - [x] Exported for component use

- [x] **Configuration**
  - [x] package.json with all dependencies
  - [x] tsconfig.json (workspace compatible)
  - [x] tsup.config.ts (bundler config)
  - [x] vitest.config.ts (test config)
  - [x] .env.example (all variables documented)

- [x] **Documentation**
  - [x] README.md (usage guide)
  - [x] IMPLEMENTATION.md (integration steps)
  - [x] SUMMARY.md (overview)
  - [x] Inline code comments
  - [x] Error handling documented

### Phase 1: Setup & Verification (Next Step - 5 min)

- [ ] Run `pnpm install` in workspace root
- [ ] Verify packages/mail builds: `pnpm --filter @snapback/mail build`
- [ ] Verify types: `pnpm --filter @snapback/mail typecheck`
- [ ] Copy .env.example to .env.local and update with actual values

**Verification Commands**:
```bash
# Check build
pnpm --filter @snapback/mail build

# Check types
pnpm --filter @snapback/mail typecheck

# Check linting
pnpm --filter @snapback/mail lint
```

### Phase 2: Database Schema (15 min)

**Location**: `packages/platform/src/db/schema/snapback/index.ts`

- [ ] Add emailPreferences table schema:
  - id (uuid primary key)
  - userId (foreign key to users)
  - email (string)
  - achievement (boolean, default true)
  - nurture (boolean, default true)
  - unsubscribedAt (timestamp nullable)
  - createdAt (timestamp)
  - updatedAt (timestamp)

- [ ] Add relations to users table

**Commands**:
```bash
cd packages/platform
pnpm db:generate
pnpm db:migrate
```

- [ ] Update UnsubscribeService database functions:
  - Uncomment Drizzle imports
  - Replace placeholder implementations
  - Test with actual database

### Phase 3: Email Templates (45 min)

**From `email_system.md` - Create:**

- [ ] **Transactional Emails**
  - [ ] `src/templates/transactional/Welcome.tsx`
  - [ ] `src/templates/transactional/ApiKeyCreated.tsx`

- [ ] **Achievement Emails**
  - [ ] `src/templates/achievement/FirstCheckpoint.tsx`
  - [ ] `src/templates/achievement/FirstRecovery.tsx`

- [ ] **Nurture Emails**
  - [ ] `src/templates/nurture/WeeklyDigest.tsx`

- [ ] **Email Components**
  - [ ] `src/components/Header.tsx`
  - [ ] `src/components/Footer.tsx`
  - [ ] `src/components/Button.tsx` (variants: primary, secondary, danger, ghost)
  - [ ] `src/components/Card.tsx` (variants: default, highlight, warning, danger, info)
  - [ ] `src/components/Stats.tsx` (StatsRow, SingleStat)
  - [ ] `src/components/CodeBlock.tsx` (CodeBlock, InlineCode)
  - [ ] `src/components/Checklist.tsx` (Checklist, Steps)

- [ ] **Layouts**
  - [ ] `src/layouts/BaseEmail.tsx`

- [ ] **Component/Template Exports**
  - [ ] `src/components/index.ts`
  - [ ] `src/templates/index.ts`
  - [ ] `src/templates/transactional/index.ts`
  - [ ] `src/templates/achievement/index.ts`
  - [ ] `src/templates/nurture/index.ts`

**Verification**:
```bash
pnpm --filter @snapback/mail build
```

### Phase 4: Email Orchestrator (20 min)

**Location**: `packages/mail/src/services/orchestrator.ts`

- [ ] Create EmailOrchestrator class
- [ ] Implement event handlers:
  - [ ] onUserSignup() → Welcome email
  - [ ] onApiKeyCreated() → ApiKeyCreated email
  - [ ] onCheckpointCreated() → FirstCheckpoint email (on first)
  - [ ] onRecoveryCompleted() → FirstRecovery email (on first)
  - [ ] onWeeklyDigest() → WeeklyDigest email

- [ ] Export singleton getEmailOrchestrator()
- [ ] Add to services/index.ts exports

**Verification**:
```bash
pnpm --filter @snapback/mail typecheck
```

### Phase 5: Integration with Applications (30 min)

**In apps/api/src/app.ts**:
- [ ] Import emailRoutes from @snapback/mail/routes
- [ ] Mount routes: `app.route("/api/email", emailRoutes)`
- [ ] Verify endpoint accessible: GET /api/email/unsubscribe

**In packages/auth/src/auth.ts**:
- [ ] Import createDefaultPreferences
- [ ] Add to auth callbacks (onSignUp)
- [ ] Create email preferences on user signup

**In event bus/application**:
- [ ] Wire up EmailOrchestrator event listeners
- [ ] Trigger onUserSignup after user creation
- [ ] Trigger onApiKeyCreated when API key created
- [ ] Trigger achievement emails on milestones

### Phase 6: Testing (20 min)

- [ ] Build the package:
```bash
pnpm --filter @snapback/mail build
```

- [ ] Type checking:
```bash
pnpm --filter @snapback/mail typecheck
```

- [ ] Linting:
```bash
pnpm --filter @snapback/mail lint
```

- [ ] Test EmailService:
  - [ ] Send test email to development SMTP
  - [ ] Verify HTML rendering
  - [ ] Check logs in infrastructure logger

- [ ] Test UnsubscribeService:
  - [ ] Generate unsubscribe token
  - [ ] Verify token signature
  - [ ] Test token expiry
  - [ ] Verify HubSpot sync

- [ ] Test API Route:
  - [ ] GET /api/email/unsubscribe?token=valid
  - [ ] Verify success page rendered
  - [ ] GET /api/email/unsubscribe (no token)
  - [ ] Verify error page rendered

- [ ] E2E Test:
  - [ ] Send welcome email on signup
  - [ ] Click unsubscribe link
  - [ ] Verify database updated
  - [ ] Verify HubSpot contact updated
  - [ ] Verify user sees success page

### Phase 7: Production Deployment

- [ ] Set environment variables:
  ```bash
  RESEND_API_KEY=re_your_production_key
  HUBSPOT_ACCESS_TOKEN=pat_your_token
  UNSUBSCRIBE_TOKEN_SECRET=<base64_32_chars>
  EMAIL_FROM=noreply@snapback.dev
  ```

- [ ] Test Resend integration:
  - [ ] Set NODE_ENV=production
  - [ ] Send test email
  - [ ] Verify delivery

- [ ] Monitor logs:
  - [ ] Email sending logs
  - [ ] Unsubscribe events
  - [ ] HubSpot sync status
  - [ ] Errors and warnings

- [ ] Set up monitoring:
  - [ ] Email delivery rate
  - [ ] Unsubscribe rate
  - [ ] HubSpot sync success rate
  - [ ] Error tracking

## 📊 Status Summary

| Phase | Component | Status | Time |
|-------|-----------|--------|------|
| 0 | Core Architecture | ✅ Complete | 0% |
| 1 | Setup & Verify | ⏳ Next | 5 min |
| 2 | Database Schema | ⏳ Pending | 15 min |
| 3 | Email Templates | ⏳ Pending | 45 min |
| 4 | Orchestrator | ⏳ Pending | 20 min |
| 5 | Application Integration | ⏳ Pending | 30 min |
| 6 | Testing | ⏳ Pending | 20 min |
| 7 | Production | ⏳ Pending | - |

**Total Implementation Time**: ~2.5 hours (after dependencies installed)

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Verify build
pnpm --filter @snapback/mail build

# 3. Check setup
pnpm --filter @snapback/mail typecheck

# 4. Next: Follow IMPLEMENTATION.md for database schema
```

## 📞 Integration Support

| Question | Answer | Location |
|----------|--------|----------|
| How do I use the email service? | See examples | README.md |
| How do I integrate with my app? | Step-by-step guide | IMPLEMENTATION.md |
| What libraries are used? | Complete reference | SUMMARY.md |
| What are all the functions? | API reference | README.md |
| How do I set up the database? | Schema + migration | IMPLEMENTATION.md |

## ⚠️ Important Notes

1. **Dependencies**: Must run `pnpm install` before building
2. **Database**: Schema must be created before database functions will work
3. **Environment**: Different providers based on NODE_ENV
4. **Resend**: Production uses Resend API (requires API key)
5. **Nodemailer**: Dev/test uses SMTP (localhost:1025 default)
6. **HubSpot**: Optional - unsubscribe still works without it
7. **Tokens**: HMAC secret required - falls back to BETTER_AUTH_SECRET

## ✨ Next Immediate Step

**Run Phase 1 Setup** (5 minutes):
```bash
cd /Users/user1/WebstormProjects/SnapBack-Site
pnpm install
pnpm --filter @snapback/mail build
```

Then follow `packages/mail/IMPLEMENTATION.md` for Phase 2+
