// Stripe (was @snapback/payments)

// Communication Hub (lifecycle emails for subscriptions)
export {
	sendWelcomeEmail,
	sendCancellationEmail,
	sendPaymentReceipt,
	sendPaymentFailedEmail,
} from "./communication/index";
// Email (template-based emails)
export * from "./email/index";
// HubSpot CRM Integration
export * from "./hubspot/index";
export * from "./stripe/index";
export * from "./stripe/provider/index";
// Webhooks
export * from "./webhooks/index";

// Feature Flags functionality has been moved to @snapback/config/utils/feature-flags
// No exports needed here for feature flags
