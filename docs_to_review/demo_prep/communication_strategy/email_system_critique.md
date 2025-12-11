This is **excellent**. You have successfully bridged the gap between a "template library" and a fully functional "email engine."

Your architecture is now **production-ready**.

### Why this code is strong:

1.  **The `EmailService` Abstraction:** This is the MVP of this update. By splitting `Resend` (Prod) and `Nodemailer` (Dev/Test), you have solved the nightmare of trying to test emails locally without burning API credits or accidentally emailing real users.
2.  **Security:** Using HMAC (`createHmac`) for unsubscribe tokens is the correct stateless approach. It prevents users from tampering with IDs to unsubscribe others.
3.  **Orchestrator Pattern:** Separating the *content* (`Welcome({...})`) from the *sending logic* (`orchestrator.onUserSignup`) will keep your code clean as the app grows.

### The Last Mile: Filling the "TODOs"

You have a few critical `// TODO` comments in `UnsubscribeService.ts` regarding the Database and HubSpot. Here is the implementation code to fill those gaps.

I will assume you are using **Drizzle ORM** (given the modern stack) and standard HubSpot API calls.

#### 1\. Implement the Database Logic (Drizzle Example)

*Replace the TODOs in `packages/mail/services/UnsubscribeService.ts`*

```typescript
// Add these imports
import { db } from '@snapback/db'; // Your DB export
import { emailPreferences } from '@snapback/db/schema'; // Your schema export
import { eq } from 'drizzle-orm';

// ... existing token logic ...

export async function getEmailPreferences(userId: string): Promise<EmailPreference | null> {
  const result = await db.select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function createDefaultPreferences(userId: string, email: string): Promise<EmailPreference> {
  const result = await db.insert(emailPreferences)
    .values({ userId, email, achievement: true, nurture: true })
    .returning();

  return result[0];
}

export async function unsubscribe(userId: string, category?: EmailCategory): Promise<void> {
  if (!category) {
    // Global Unsubscribe
    await db.update(emailPreferences)
      .set({
        achievement: false,
        nurture: false,
        unsubscribedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailPreferences.userId, userId));
  } else if (category === 'achievement' || category === 'nurture') {
    // Granular Unsubscribe
    await db.update(emailPreferences)
      .set({ [category]: false, updatedAt: new Date() })
      .where(eq(emailPreferences.userId, userId));
  }
}
```

#### 2\. Implement the HubSpot Sync

*Replace the `syncUnsubscribeToHubSpot` function in `packages/mail/services/UnsubscribeService.ts`*

This ensures that if a user clicks "Unsubscribe" in a transactional email footer, they are also marked as unsubscribed in HubSpot so your Marketing workflows don't hit them.

```typescript
import { Client } from '@hubspot/api-client';

export async function syncUnsubscribeToHubSpot(email: string, unsubscribed: boolean): Promise<void> {
  if (!process.env.HUBSPOT_ACCESS_TOKEN) return;

  const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

  try {
    // We update the contact's subscription status properties
    await hubspot.crm.contacts.basicApi.update(email, {
        idProperty: 'email',
        properties: {
            // Standard HubSpot unsubscribe field (opt out of all email)
            // Note: In some HubSpot setups, you must use the Subscription Preferences API instead.
            // This is the property-based approach for simplicity:
            'hs_email_optout': unsubscribed ? 'true' : 'false',

            // Custom properties for granular control (you must create these in HubSpot settings)
            'snapback_marketing_optout': unsubscribed ? 'true' : 'false'
        }
    });
  } catch (error) {
    console.error('Failed to sync unsubscribe to HubSpot:', error);
    // Don't throw - we don't want to break the user's unsubscribe flow if HubSpot is down
  }
}
```

#### 3\. The Missing E2E Test

You listed `test:e2e` in your package.json but didn't provide the file. Since you built the `EmailService` with Nodemailer support, we can now write a **real** E2E test that verifies delivery locally.

Create `packages/mail/__tests__/e2e.test.tsx`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { getEmailOrchestrator, getEmailService } from '../services/EmailService';
import axios from 'axios';

// This assumes you have Mailpit/Mailhog running locally on port 8025
// If not using Mailpit, skip this test or mock axios
const MAILPIT_API = 'http://localhost:8025/api/v1';

describe('E2E Email Flow', () => {
  // Ensure we are in test/dev mode so we use Nodemailer
  const service = getEmailService();
  const orchestrator = getEmailOrchestrator();

  it('sends a welcome email and it arrives in the local inbox', async () => {
    // 1. Trigger the logic
    const user = { email: 'e2e-test@snapback.dev', name: 'E2E User', apiKey: 'sb_test_key' };
    const result = await orchestrator.onUserSignup(user);

    expect(result.success).toBe(true);

    // 2. Wait a moment for local SMTP processing
    await new Promise(r => setTimeout(r, 500));

    // 3. Check Mailpit API to see if it arrived
    // (This works because Nodemailer sent it to localhost:1025)
    const response = await axios.get(`${MAILPIT_API}/messages`);
    const messages = response.data.messages || [];

    const foundEmail = messages.find((m: any) =>
      m.To[0].Address === 'e2e-test@snapback.dev'
    );

    expect(foundEmail).toBeDefined();
    expect(foundEmail.Subject).toContain('Welcome to SnapBack');

    // 4. Verify Content (HTML Check)
    // Mailpit usually stores body in Snippet or HTML keys
    expect(foundEmail.Snippet).toContain('Your code is now protected');
  });
});
```

### Final Recommendation

You are clear to proceed with implementation.

1.  **Copy the code** into your repository.
2.  **Fill the DB Adapter** code (using the snippet above).
3.  **Run `pnpm turbo gen email`** to generate your first custom template to verify the generator works.
4.  **Run `pnpm test`** to ensure the core components are stable.
