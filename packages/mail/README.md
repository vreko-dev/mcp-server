# @snapback/mail

Complete email system for SnapBack with:
- **EmailService abstraction** (Resend for production, Nodemailer for dev/test)
- **EmailOrchestrator** (event-driven email triggers)
- **UnsubscribeService** (HMAC tokens + database persistence)
- **HubSpot synchronization** (subscription preference sync)
- **React Email components** (production-ready templates)
- **API routes** (unsubscribe, preference management)

## Installation

```bash
pnpm install
```

## Environment Variables

```env
# Email Provider
NODE_ENV=production  # or development, test
RESEND_API_KEY=re_your_api_key
SMTP_HOST=localhost
SMTP_PORT=1025

# From Address
EMAIL_FROM="SnapBack <protection@snapback.dev>"

# Unsubscribe Token Secret
UNSUBSCRIBE_TOKEN_SECRET=your_secret_min_32_chars
# Falls back to BETTER_AUTH_SECRET if not set

# HubSpot Integration
HUBSPOT_ACCESS_TOKEN=pat_your_token

# URLs
NEXT_PUBLIC_APP_URL=https://snapback.dev
```

## Usage

### Sending Emails

```typescript
import {
  getEmailService,
  EmailPayload,
} from "@snapback/mail";
import { Welcome } from "@snapback/mail/templates";

const service = getEmailService();

const result = await service.send({
  to: "user@example.com",
  subject: "Welcome to SnapBack!",
  react: <Welcome userName="Alex" apiKey="sb_123..." />,
});

if (result.success) {
  console.log("Email sent:", result.messageId);
} else {
  console.error("Send failed:", result.error);
}
```

### Email Preferences

```typescript
import {
  getEmailPreferences,
  canReceiveEmail,
  unsubscribe,
} from "@snapback/mail";

// Check if user can receive email category
const canReceive = await canReceiveEmail(db, userId, "nurture");

if (canReceive) {
  // Send email
}

// Unsubscribe user
await unsubscribe(db, userId, "nurture");
```

### Unsubscribe URLs

```typescript
import { getUnsubscribeUrl } from "@snapback/mail";

const url = getUnsubscribeUrl(userId, userEmail, "nurture");
// Use in email templates: ${url}
```

## Architecture

### EmailService

Abstracts email sending across environments:
- **Production**: Uses Resend API (native React Email support)
- **Development**: Uses Nodemailer (SMTP-based for testing)
- **Test**: Uses Nodemailer with stub SMTP

### UnsubscribeService

Implements stateless unsubscribe flow:
1. User clicks unsubscribe link with HMAC-signed token
2. Token decoded and verified
3. User preference updated in database
4. Status synced to HubSpot
5. User sees success/error page

### HubSpot Sync

Keeps HubSpot contacts in sync:
- `hs_email_optout`: Global unsubscribe flag
- `snapback_*_optout`: Category-specific preferences
- Prevents marketing workflows from emailing unsubscribed users

## Database Schema (TODO)

Add to `@snapback/platform` schema:

```sql
CREATE TABLE email_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  achievement BOOLEAN NOT NULL DEFAULT TRUE,
  nurture BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX email_prefs_user_idx ON email_preferences(user_id);
CREATE INDEX email_prefs_email_idx ON email_preferences(email);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email preferences" ON email_preferences
  USING (auth.uid()::text = user_id);
```

## Testing

```bash
pnpm test         # Run tests
pnpm test:watch   # Watch mode
pnpm test:coverage # Coverage report
```

## Development

```bash
pnpm dev          # Start in dev mode
pnpm lint         # Check code
pnpm format       # Format code
pnpm typecheck    # Type check
```

## Building

```bash
pnpm build        # Build for production
pnpm clean        # Clean dist
```

## Integration Points

### With @snapback/auth

Add to auth hooks:

```typescript
import { createDefaultPreferences } from "@snapback/mail";

export const useAuthHooks = {
  afterSignUp: async ({ user }) => {
    // Create default email preferences
    await createDefaultPreferences(db, user.id, user.email);
  },
};
```

### With API Routes

Mount email routes in your API:

```typescript
import { emailRoutes } from "@snapback/mail/routes";

const app = new Hono();
app.route("/api/email", emailRoutes);
```

### With Events

Listen for user events and send emails:

```typescript
import { getEmailOrchestrator } from "@snapback/mail";

eventBus.on("user.signup", async (user) => {
  const orchestrator = getEmailOrchestrator();
  await orchestrator.onUserSignup({
    email: user.email,
    name: user.name,
    apiKey: user.apiKey,
  });
});
```

## References

- **Email System Design**: `communication_strategy/email_system.md`
- **Implementation Guide**: `communication_strategy/email_system_critique.md`
- **Resend Documentation**: https://resend.com/docs
- **Nodemailer Documentation**: https://nodemailer.com
- **HubSpot API**: https://developers.hubspot.com
- **React Email**: https://react.email

## LICENSE

Private - SnapBack Internal Only
