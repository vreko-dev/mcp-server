# HubSpot Integration

This module provides a comprehensive integration with HubSpot CRM, allowing you to manage contacts, companies, deals, and associations directly from your application.

## Installation

The HubSpot integration is part of the `@snapback/integrations` package. To use it, you need to install the package and add the required environment variables.

```bash
# The package is already included in the integrations package
# Just make sure you have the HubSpot SDK installed
pnpm add @hubspot/api-client
```

## Environment Variables

To use the HubSpot integration, you need to set the following environment variables:

```env
# Either provide an access token (for OAuth) or API key (for developer access)
HUBSPOT_ACCESS_TOKEN=your_access_token_here
HUBSPOT_API_KEY=your_api_key_here

# For webhook verification
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret_here
```

## Usage

### Importing Functions

```typescript
import {
	// Contact functions
	createContact,
	updateContact,
	getContact,

	// Company functions
	createCompany,
	updateCompany,
	getCompany,

	// Deal functions
	createDeal,
	updateDeal,
	getDeal,

	// Association functions
	associateContactWithCompany,
	associateContactWithDeal,
	associateCompanyWithDeal,
	createAssociation,

	// Webhook handler
	handleHubSpotWebhook,
} from "@snapback/integrations/hubspot";
```

### Creating a Contact

```typescript
const contact = await createContact({
	properties: {
		email: "john.doe@example.com",
		firstname: "John",
		lastname: "Doe",
		phone: "+1234567890",
		website: "https://example.com",
	},
});

console.log("Created contact with ID:", contact.id);
```

### Creating a Company

```typescript
const company = await createCompany({
	properties: {
		name: "Example Corp",
		domain: "example.com",
		phone: "+1234567890",
		address: "123 Main St",
		city: "Anytown",
		state: "NY",
		zip: "12345",
		country: "USA",
	},
});

console.log("Created company with ID:", company.id);
```

### Creating a Deal

```typescript
const deal = await createDeal({
	properties: {
		dealname: "New Business Deal",
		dealstage: "appointmentscheduled",
		pipeline: "default",
		amount: "5000",
		dealtype: "newbusiness",
	},
});

console.log("Created deal with ID:", deal.id);
```

### Creating Associations

```typescript
// Associate a contact with a company
await associateContactWithCompany(contactId, companyId);

// Associate a contact with a deal
await associateContactWithDeal(contactId, dealId);

// Associate a company with a deal
await associateCompanyWithDeal(companyId, dealId);
```

### Handling Webhooks

```typescript
// In your webhook endpoint handler
app.post("/webhooks/hubspot", async (req, res) => {
	const response = await handleHubSpotWebhook(req);
	res.status(response.status).send(await response.text());
});
```

## API Reference

### Contact Functions

-   `createContact(params: CreateContactParams): Promise<HubSpotContact>`
-   `updateContact(params: UpdateContactParams): Promise<HubSpotContact>`
-   `getContact(params: GetContactParams): Promise<HubSpotContact>`

### Company Functions

-   `createCompany(params: CreateCompanyParams): Promise<HubSpotCompany>`
-   `updateCompany(params: UpdateCompanyParams): Promise<HubSpotCompany>`
-   `getCompany(params: GetCompanyParams): Promise<HubSpotCompany>`

### Deal Functions

-   `createDeal(params: CreateDealParams): Promise<HubSpotDeal>`
-   `updateDeal(params: UpdateDealParams): Promise<HubSpotDeal>`
-   `getDeal(params: GetDealParams): Promise<HubSpotDeal>`

### Association Functions

-   `associateContactWithCompany(contactId: string, companyId: string): Promise<void>`
-   `associateContactWithDeal(contactId: string, dealId: string): Promise<void>`
-   `associateCompanyWithDeal(companyId: string, dealId: string): Promise<void>`
-   `createAssociation(params: CreateAssociationParams): Promise<void>`

### Webhook Functions

-   `handleHubSpotWebhook(req: Request): Promise<Response>`
-   `verifyWebhookSignature(requestBody: string, signature: string, secret: string): boolean`

## Error Handling

All functions will throw errors if the HubSpot API returns an error. Make sure to wrap your calls in try/catch blocks:

```typescript
try {
	const contact = await createContact({
		properties: {
			email: "john.doe@example.com",
			firstname: "John",
			lastname: "Doe",
		},
	});
} catch (error) {
	console.error("Failed to create contact:", error);
}
```

## Types

The integration provides TypeScript types for all objects and parameters:

-   `HubSpotContact` - Contact object type
-   `HubSpotCompany` - Company object type
-   `HubSpotDeal` - Deal object type
-   `CreateContactParams` - Parameters for creating a contact
-   `UpdateContactParams` - Parameters for updating a contact
-   And many more...

## Contributing

If you need to extend the HubSpot integration with additional functionality, you can add new functions to the appropriate files in the `lib/` directory and export them through the main `index.ts` file.
