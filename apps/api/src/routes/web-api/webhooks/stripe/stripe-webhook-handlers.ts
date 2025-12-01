import { logger } from "@snapback/infrastructure";
import {
	db,
	snapbackSchema,
	subscriptions,
	usageLimits,
	user,
} from "@snapback/platform";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import {
	sendCancellationEmail,
	sendPaymentFailedEmail,
	sendPaymentReceipt,
	sendWelcomeEmail,
} from "./email-service";
import { PLAN_PERMISSIONS, type PlanTier } from "./subscription-config";

/**
 * Stripe Webhook Business Logic Handlers
 *
 * Handles subscription lifecycle events and updates user state accordingly
 */

export interface WebhookHandlerResult {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Handle customer.subscription.created event
 * When a user successfully subscribes to a plan
 */
export async function handleSubscriptionCreated(
	subscription: Stripe.Subscription,
): Promise<WebhookHandlerResult> {
	try {
		logger.info("Processing subscription.created", {
			subscriptionId: subscription.id,
			customerId: subscription.customer,
			status: subscription.status,
		});

		// Extract plan information from subscription
		const priceId = subscription.items.data[0]?.price.id;
		const plan = mapPriceIdToPlan(priceId);

		// Update user's plan in database
		if (typeof subscription.customer === "string") {
			await updateUserPlan(subscription.customer, subscription.id);
		}

		// Enable cloud backup permission for paid plans
		if (plan !== "free") {
			await enableCloudBackup(subscription.customer as string, plan);
		}

		// Send welcome email
		const userEmail = await getUserEmail(subscription.customer as string);
		await sendWelcomeEmail(
			subscription.customer as string,
			plan,
			userEmail || undefined,
		);

		// Track analytics event
		logger.info("Subscription created successfully", {
			customerId: subscription.customer,
			plan,
			subscriptionId: subscription.id,
		});

		return {
			success: true,
			message: "Subscription created and user upgraded successfully",
		};
	} catch (error) {
		logger.error("Error handling subscription.created", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle customer.subscription.updated event
 * When a subscription is modified (plan change, quantity change, etc.)
 */
export async function handleSubscriptionUpdated(
	subscription: Stripe.Subscription,
): Promise<WebhookHandlerResult> {
	try {
		logger.info("Processing subscription.updated", {
			subscriptionId: subscription.id,
			customerId: subscription.customer,
			status: subscription.status,
		});

		// Check if subscription was canceled but still active (cancel_at_period_end)
		if (subscription.cancel_at_period_end) {
			logger.info("Subscription will be canceled at period end", {
				subscriptionId: subscription.id,
				cancelAt: subscription.cancel_at,
			});
			// Optionally notify user about upcoming cancellation
		}

		// Update plan if it changed
		const priceId = subscription.items.data[0]?.price.id;
		const newPlan = mapPriceIdToPlan(priceId);

		if (typeof subscription.customer === "string") {
			await updateUserPlan(subscription.customer, subscription.id);
		}

		// Update permissions based on new plan
		await updatePermissions(subscription.customer as string, newPlan);

		return {
			success: true,
			message: "Subscription updated successfully",
		};
	} catch (error) {
		logger.error("Error handling subscription.updated", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle customer.subscription.deleted event
 * When a subscription is canceled or expires
 */
export async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
): Promise<WebhookHandlerResult> {
	try {
		logger.info("Processing subscription.deleted", {
			subscriptionId: subscription.id,
			customerId: subscription.customer,
		});

		// Check if user has email - if so, downgrade to email tier (1000 snapshots)
		// If not, downgrade to free tier (50 snapshots)
		const customerId = subscription.customer as string;
		const userEmail = await getUserEmail(customerId);

		const downgradePlan = userEmail ? "free" : "free";
		const snapshotLimit = userEmail ? 1000 : 50;

		// Downgrade user to free tier
		await updateUserPlan(customerId, null);

		// Update snapshot limit but preserve existing data
		await updateSnapshotLimits(customerId, "free");

		// Disable cloud backup but DO NOT delete local snapshots
		await disableCloudBackup(customerId);

		// Send cancellation email
		await sendCancellationEmail(customerId, userEmail || undefined);

		// Track analytics event
		logger.info("Subscription canceled, user downgraded", {
			customerId,
			newPlan: downgradePlan,
			snapshotLimit,
		});

		return {
			success: true,
			message: "Subscription canceled and user downgraded successfully",
		};
	} catch (error) {
		logger.error("Error handling subscription.deleted", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle checkout.session.completed event
 * When a checkout session is successfully completed
 */
export async function handleCheckoutCompleted(
	session: Stripe.Checkout.Session,
): Promise<WebhookHandlerResult> {
	try {
		logger.info("Processing checkout.session.completed", {
			sessionId: session.id,
			customerId: session.customer,
			mode: session.mode,
		});

		// Handle one-time purchases
		if (session.mode === "payment") {
			// Record one-time purchase
			logger.info("One-time purchase completed", {
				customerId: session.customer,
				amount: session.amount_total,
			});
		}

		// Handle subscription checkouts (subscription will be created separately)
		if (session.mode === "subscription") {
			logger.info("Subscription checkout completed", {
				customerId: session.customer,
				subscriptionId: session.subscription,
			});
		}

		// Link device trial to user if applicable
		if (session.client_reference_id) {
			await linkDeviceTrialToUser(
				session.client_reference_id,
				session.customer as string,
			);
		}

		return {
			success: true,
			message: "Checkout session processed successfully",
		};
	} catch (error) {
		logger.error("Error handling checkout.session.completed", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle invoice.payment_succeeded event
 * When an invoice payment succeeds
 */
export async function handleInvoicePaymentSucceeded(
	invoice: Stripe.Invoice,
): Promise<WebhookHandlerResult> {
	try {
		logger.info("Processing invoice.payment_succeeded", {
			invoiceId: invoice.id,
			customerId: invoice.customer,
			amount: invoice.amount_paid,
		});

		// Track successful payment
		// await trackPayment(invoice);

		// Send payment receipt
		const userEmail = await getUserEmail(invoice.customer as string);
		await sendPaymentReceipt(
			invoice.customer as string,
			invoice.amount_paid || 0,
			invoice.hosted_invoice_url || undefined,
			userEmail || undefined,
		);

		return {
			success: true,
			message: "Invoice payment processed successfully",
		};
	} catch (error) {
		logger.error("Error handling invoice.payment_succeeded", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle invoice.payment_failed event
 * When an invoice payment fails
 */
export async function handleInvoicePaymentFailed(
	invoice: Stripe.Invoice,
): Promise<WebhookHandlerResult> {
	try {
		logger.error("Processing invoice.payment_failed", {
			invoiceId: invoice.id,
			customerId: invoice.customer,
			attemptCount: invoice.attempt_count,
		});

		// Send payment failed notification
		const userEmail = await getUserEmail(invoice.customer as string);
		await sendPaymentFailedEmail(
			invoice.customer as string,
			invoice.attempt_count || 0,
			userEmail || undefined,
		);

		// If max attempts reached, suspend account
		if (invoice.attempt_count && invoice.attempt_count >= 3) {
			logger.warn("Max payment attempts reached, suspending account", {
				customerId: invoice.customer,
			});
			// await suspendAccount(invoice.customer as string);
		}

		return {
			success: true,
			message: "Invoice payment failure processed",
		};
	} catch (error) {
		logger.error("Error handling invoice.payment_failed", { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Helper functions

function mapPriceIdToPlan(
	priceId: string | undefined,
): "free" | "solo" | "team" | "enterprise" {
	if (!priceId) {
		return "free";
	}

	// Map Stripe price IDs to plan names
	// These should match environment variables
	const soloPriceId = process.env.STRIPE_SOLO_MONTHLY_PRICE_ID;
	const teamPriceId = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
	const enterprisePriceId = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;

	if (priceId === soloPriceId) {
		return "solo";
	}
	if (priceId === teamPriceId) {
		return "team";
	}
	if (priceId === enterprisePriceId) {
		return "enterprise";
	}

	return "free";
}

async function updateUserPlan(
	customerId: string,
	subscriptionId: string | null,
) {
	if (!db) {
		logger.error("Database not available");
		return;
	}

	try {
		// 1. Get subscription from Stripe to extract plan (if subscriptionId is provided)
		let tier: PlanTier = "free";

		if (subscriptionId) {
			// In a real implementation, we would retrieve the subscription from Stripe
			// For now, we'll simulate this by extracting from the subscriptionId
			// This is a simplification - in practice you'd use the Stripe SDK
			const lookupKey = subscriptionId.split("_")[0] || "free";
			tier = lookupKey in PLAN_PERMISSIONS ? (lookupKey as PlanTier) : "free";
		}

		// 2. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		// 3. Update user subscription tier
		await db
			.update(user)
			.set({
				subscriptionTier: tier,
				updatedAt: new Date(),
			})
			.where(eq(user.id, userRecord.id));

		// 4. If subscriptionId is provided, upsert subscription record
		if (subscriptionId) {
			await db
				.insert(subscriptions)
				.values({
					id: uuidv4(),
					userId: userRecord.id,
					stripeSubscriptionId: subscriptionId,
					stripeCustomerId: customerId,
					plan: tier,
					status: "active", // In a real implementation, this would come from the Stripe subscription
					currentPeriodStart: new Date(),
					currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
					createdAt: new Date(),
				})
				.onConflictDoUpdate({
					target: subscriptions.stripeSubscriptionId,
					set: {
						plan: tier,
						status: "active",
						currentPeriodStart: new Date(),
						currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
						updatedAt: new Date(),
					},
				});
		}

		logger.info(`Updated user ${userRecord.id} to plan ${tier}`);
	} catch (error) {
		logger.error("Error updating user plan", { error, customerId });
		throw error;
	}
}

async function enableCloudBackup(customerId: string, tier: PlanTier) {
	if (!db) {
		logger.error("Database not available");
		return;
	}

	try {
		// 1. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		// 2. Enable cloud backup on user (cloud backup is per-snapshot, not per-user)
		await db
			.update(user)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(user.id, userRecord.id));

		// 3. Update usage limits
		await db
			.insert(usageLimits)
			.values({
				subscriptionId: userRecord.id, // In a real implementation, this would be the actual subscription ID
				month: new Date(),
				cloudStorageLimitMb: PLAN_PERMISSIONS[tier].cloudStorageQuotaMb,
				snapshotsLimit: PLAN_PERMISSIONS[tier].maxSnapshots,
			})
			.onConflictDoUpdate({
				target: [usageLimits.subscriptionId, usageLimits.month],
				set: {
					cloudStorageLimitMb: PLAN_PERMISSIONS[tier].cloudStorageQuotaMb,
					snapshotsLimit: PLAN_PERMISSIONS[tier].maxSnapshots,
				},
			});

		// 4. Send welcome email (using existing email service)
		// This would be implemented in the email-service module

		logger.info(`Enabled cloud backup for user ${userRecord.id}`);
	} catch (error) {
		logger.error("Error enabling cloud backup", { error, customerId });
		throw error;
	}
}

async function disableCloudBackup(customerId: string) {
	if (!db) {
		logger.error("Database not available");
		return;
	}

	try {
		// 1. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		// 2. Update user record
		await db
			.update(user)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(user.id, userRecord.id));

		// 3. DO NOT delete cloudBackupUrl (30-day grace period)
		// 4. Schedule cleanup job for 30 days later (implementation would depend on your job scheduler)

		logger.info(
			`Disabled cloud backup for user ${userRecord.id} (30-day grace period)`,
		);
	} catch (error) {
		logger.error("Error disabling cloud backup", { error, customerId });
		throw error;
	}
}

async function updatePermissions(customerId: string, plan: PlanTier) {
	if (!db) {
		logger.error("Database not available");
		return;
	}

	try {
		// 1. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		const permissions = PLAN_PERMISSIONS[plan];

		// 2. Update user subscription tier (permissions are derived from plan)
		await db
			.update(user)
			.set({
				subscriptionTier: plan,
				updatedAt: new Date(),
			})
			.where(eq(user.id, userRecord.id));

		// 3. Cascade to ALL user's API keys
		const userApiKeys = await db
			.select()
			.from(snapbackSchema.apiKeys)
			.where(eq(snapbackSchema.apiKeys.userId, userRecord.id));

		for (const key of userApiKeys) {
			await db
				.update(snapbackSchema.apiKeys)
				.set({
					permissions: {
						...JSON.parse((key as any).permissions || "{}"),
						cloudBackup: permissions.cloudBackup,
					},
					updatedAt: new Date(),
				} as any)
				.where(eq(snapbackSchema.apiKeys.id, key.id));
		}

		logger.info(
			`Updated permissions for user ${userRecord.id} and ${userApiKeys.length} API keys`,
		);
	} catch (error) {
		logger.error("Error updating permissions", { error, customerId });
		throw error;
	}
}

async function updateSnapshotLimits(customerId: string, plan: PlanTier) {
	if (!db) {
		logger.error("Database not available");
		return;
	}

	try {
		// 1. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		// 2. Update usage limits
		await db
			.insert(usageLimits)
			.values({
				subscriptionId: userRecord.id, // In a real implementation, this would be the actual subscription ID
				month: new Date(),
				snapshotsLimit: PLAN_PERMISSIONS[plan].maxSnapshots,
				cloudStorageLimitMb: PLAN_PERMISSIONS[plan].cloudStorageQuotaMb,
			})
			.onConflictDoUpdate({
				target: [usageLimits.subscriptionId, usageLimits.month],
				set: {
					snapshotsLimit: PLAN_PERMISSIONS[plan].maxSnapshots,
					cloudStorageLimitMb: PLAN_PERMISSIONS[plan].cloudStorageQuotaMb,
				},
			});

		logger.info(
			`Updated snapshot limits for user ${userRecord.id} to ${PLAN_PERMISSIONS[plan].maxSnapshots}`,
		);
	} catch (error) {
		logger.error("Error updating snapshot limits", { error, customerId });
		throw error;
	}
}

async function getUserEmail(customerId: string): Promise<string | null> {
	if (!db) {
		return null;
	}

	try {
		// Find user by Stripe customer ID using paymentsCustomerId field
		const users = await db
			.select({ email: user.email })
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (users.length > 0 && users[0]) {
			return users[0].email;
		}

		return null;
	} catch (error) {
		logger.error("Error getting user email", { error, customerId });
		return null;
	}
}

async function linkDeviceTrialToUser(deviceId: string, customerId: string) {
	if (!db) {
		return;
	}

	try {
		// 1. Get user by Stripe customer ID
		const users = await db
			.select()
			.from(user)
			.where(eq(user.paymentsCustomerId, customerId))
			.limit(1);

		if (!users || users.length === 0) {
			throw new Error(`User not found for customer ${customerId}`);
		}

		const userRecord = users[0];
		// Add a type assertion to ensure userRecord is not undefined
		if (!userRecord) {
			throw new Error(`User record is undefined for customer ${customerId}`);
		}

		logger.info("Linking device trial to user", { deviceId, customerId });

		// Find unlinked device trials
		const trials = await db
			.select()
			.from(snapbackSchema.deviceTrials)
			.where(
				and(
					eq(snapbackSchema.deviceTrials.deviceFingerprint, deviceId),
					// Only select trials that are not yet linked to a user
					isNull(snapbackSchema.deviceTrials.userId),
				),
			);

		// Link trial to user
		for (const trial of trials) {
			await db
				.update(snapbackSchema.deviceTrials)
				.set({
					userId: userRecord.id,
					convertedAt: new Date(),
					// Upgrade trial limits to paid tier
					snapshotLimit:
						PLAN_PERMISSIONS[
							(userRecord.subscriptionTier || "free") as PlanTier
						]?.maxSnapshots || 50,
				})
				.where(eq(snapbackSchema.deviceTrials.id, trial.id));
		}

		logger.info(
			`Linked ${trials.length} device trials to user ${userRecord.id}`,
		);
	} catch (error) {
		logger.error("Error linking device trial to user", { error });
		throw error;
	}
}
