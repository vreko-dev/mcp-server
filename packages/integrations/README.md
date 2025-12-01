# @snapback/integrations

A collection of integration modules for various third-party services used in the SnapBack platform.

## Available Integrations

### Email

Email sending capabilities with multiple provider support:

-   Resend
-   Mailgun
-   Postmark
-   And more...

### Stripe

Payment processing and subscription management integration.

### HubSpot

CRM integration for managing contacts, companies, deals, and associations.

## Installation

```bash
pnpm add @snapback/integrations
```

## Usage

### Email

```typescript
import { sendEmail } from "@snapback/integrations/email";

await sendEmail({
	to: "user@example.com",
	subject: "Welcome!",
	text: "Welcome to our platform!",
});
```

### Stripe

```typescript
import { createCheckoutLink } from "@snapback/integrations/stripe";

const checkoutUrl = await createCheckoutLink({
	type: "subscription",
	productId: "price_123",
	email: "user@example.com",
});
```

### HubSpot

```typescript
import { createContact } from "@snapback/integrations/hubspot";

const contact = await createContact({
	properties: {
		email: "john.doe@example.com",
		firstname: "John",
		lastname: "Doe",
	},
});
```

## Environment Variables

Each integration requires specific environment variables. Check each integration's documentation for details.

## Contributing

To add a new integration:

1. Create a new directory in `src/`
2. Implement the integration following the existing patterns
3. Export the integration in `src/index.ts`
4. Update the package.json exports field
5. Add documentation

## License

MIT
