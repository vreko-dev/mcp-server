# Communication Hub

A comprehensive communication system that integrates email sending, CRM management, analytics-driven targeting, feature flagging, and drip campaign orchestration.

## Features

-   **Email Service**: Send emails through multiple providers (Resend, Mailgun, Postmark, etc.)
-   **CRM Service**: Sync user data with HubSpot CRM
-   **Analytics Service**: Segment users based on behavior and properties
-   **Feature Flag Service**: Gradual rollouts and A/B testing
-   **Drip Campaign Service**: Automated email sequences
-   **Communication Hub**: Orchestration layer that ties everything together

## MVP Note

Slack/Teams webhooks have been deferred for MVP. These integrations multiply support load and will be added post-MVP.

-   Weekly email digest + dashboard will be used for MVP
-   Slack/Teams webhooks will be added in future releases

## Installation

The Communication Hub is part of the `@snapback/integrations` package:

```bash
pnpm add @snapback/integrations
```

## Usage

### Basic Email Sending

```typescript
import { sendEmail } from "@snapback/integrations/communication";

const result = await sendEmail({
	to: "user@example.com",
	subject: "Welcome!",
	html: "<p>Welcome to our platform!</p>",
});

if (result.success) {
	console.log("Email sent successfully");
}
```

### CRM Integration

```typescript
import { createContact } from "@snapback/integrations/communication";

const contact = await createContact({
	email: "john.doe@example.com",
	firstname: "John",
	lastname: "Doe",
});
```

### Analytics-Driven Targeting

```typescript
import { isUserInSegment } from "@snapback/integrations/communication";

const user = {
	id: "user_123",
	properties: {
		plan: "enterprise",
		usage: "1500",
	},
};

const segmentRule = {
	properties: {
		plan: "enterprise",
		usage: ">1000",
	},
};

if (isUserInSegment(user, segmentRule)) {
	// Send targeted communication
}
```

### Feature Flag Integration

```typescript
import { isFeatureEnabled } from "@snapback/integrations/communication";

const isEnabled = await isFeatureEnabled("enhanced_onboarding", {
	userId: "user_123",
});

if (isEnabled) {
	// Send email with enhanced features
}
```

### Drip Campaigns

```typescript
import { scheduleCampaign } from "@snapback/integrations/communication";

const campaign = {
	id: "onboarding_sequence",
	userId: "user_123",
	emails: [
		{ template: "welcome", delayDays: 0 },
		{ template: "getting_started", delayDays: 1 },
		{ template: "advanced_features", delayDays: 3 },
	],
};

await scheduleCampaign(campaign);
```

## Environment Variables

```env
# Email provider keys
RESEND_API_KEY=your_resend_key
MAILGUN_API_KEY=your_mailgun_key
POSTMARK_API_KEY=your_postmark_key

# HubSpot integration
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
HUBSPOT_API_KEY=your_hubspot_key
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret

# PostHog for analytics and feature flags
POSTHOG_API_KEY=your_posthog_key
POSTHOG_HOST=https://app.posthog.com
```

## API Reference

### Email Service

-   `sendEmail(params: SendEmailParams): Promise<EmailServiceResult>`

### CRM Service

-   `createContact(contactData: Partial<HubSpotContact>): Promise<CRMContact>`

### Analytics Service

-   `isUserInSegment(user: User, rule: SegmentRule): boolean`

### Feature Flag Service

-   `isFeatureEnabled(flagName: string, context: FeatureFlagContext): Promise<boolean>`

### Drip Campaign Service

-   `scheduleCampaign(campaign: DripCampaign): Promise<void>`

## Testing

The Communication Hub follows Test-Driven Development principles with comprehensive unit and integration tests.

Run tests:

```bash
# Unit tests
pnpm test:unit --filter @snapback/integrations --testPathPattern communication

# Integration tests
pnpm test:integration --filter @snapback/integrations --testPathPattern communication

# Coverage report
pnpm test:coverage --filter @snapback/integrations --testPathPattern communication
```

## Contributing

1. Write failing tests first (TDD)
2. Implement minimal code to make tests pass
3. Refactor and optimize
4. Ensure all tests pass
5. Submit pull request

## License

MIT
