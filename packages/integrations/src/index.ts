// Stripe (was @snapback/payments)

// Communication Hub (lifecycle emails for subscriptions)
export {
	sendWelcomeEmail,
	sendCancellationEmail,
	sendPaymentReceipt,
	sendPaymentFailedEmail,
} from "./communication/index.js";
// Email (template-based emails)
export * from "./email/index.js";
// HubSpot CRM Integration
export * from "./hubspot/index.js";
export * from "./stripe/index.js";
export * from "./stripe/provider/index.js";
// Webhooks
export * from "./webhooks/index.js";

// Feature Flags functionality has been moved to @snapback/config/utils/feature-flags
// No exports needed here for feature flags
