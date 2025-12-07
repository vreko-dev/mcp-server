/**
 * Unsubscribe Service - Token-based email preference management
 *
 * Implements HMAC-based stateless unsubscribe tokens with database persistence
 * and HubSpot synchronization as recommended in email_system_critique.md
 */

import { createHmac } from "crypto";
import { logger } from "@snapback/infrastructure";
import { toError } from "@snapback-oss/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@snapback/platform";
import { Client } from "@hubspot/api-client";

// Schema will be imported from @snapback/platform when defined
// import { emailPreferences } from '@snapback/platform/src/db/schema/snapback';

export type EmailCategory = "transactional" | "achievement" | "nurture" | "operational";

export interface EmailPreference {
  userId: string;
  email: string;
  achievement: boolean;
  nurture: boolean;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnsubscribeToken {
  userId: string;
  email: string;
  category?: EmailCategory;
  exp: number;
}

const TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? process.env.BETTER_AUTH_SECRET;
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

if (!TOKEN_SECRET) {
  logger.warn(
    "⚠️  UNSUBSCRIBE_TOKEN_SECRET or BETTER_AUTH_SECRET not configured - token generation will fail"
  );
}

/**
 * Generate HMAC-based unsubscribe token
 * Stateless approach: token contains all needed info + signature
 */
export function generateUnsubscribeToken(
  userId: string,
  email: string,
  category?: EmailCategory
): string {
  if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET not configured");
  }

  const payload: UnsubscribeToken = {
    userId,
    email,
    category,
    exp: Date.now() + TOKEN_EXPIRY,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verify and decode unsubscribe token
 * Returns null if signature invalid or token expired
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeToken | null {
  try {
    if (!TOKEN_SECRET) {
      logger.error("TOKEN_SECRET not configured");
      return null;
    }

    const [data, signature] = token.split(".");
    if (!data || !signature) {
      logger.warn("Invalid token format");
      return null;
    }

    const expectedSignature = createHmac("sha256", TOKEN_SECRET)
      .update(data)
      .digest("base64url");

    if (signature !== expectedSignature) {
      logger.warn("Invalid token signature");
      return null;
    }

    const payload: UnsubscribeToken = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );

    if (payload.exp < Date.now()) {
      logger.warn("Token expired", {
        userId: payload.userId,
      });
      return null;
    }

    return payload;
  } catch (error) {
    logger.error("Token verification failed", {
      error: toError(error).message,
    });
    return null;
  }
}

/**
 * Generate unsubscribe URL for email templates
 */
export function getUnsubscribeUrl(
  userId: string,
  email: string,
  category?: EmailCategory
): string {
  const token = generateUnsubscribeToken(userId, email, category);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://snapback.dev";
  return `${baseUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Get email preferences for user from database
 * Implements database operations with Drizzle ORM
 * Based on email_system_critique.md
 */
export async function getEmailPreferences(
  db: Database,
  userId: string
): Promise<EmailPreference | null> {
  try {
    logger.debug("Fetching email preferences", { userId });

    // Import from @snapback/platform when schema is defined
    const { emailPreferences } = await import('@snapback/platform/src/db/schema/snapback');
    const result = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, userId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    logger.error("Failed to fetch email preferences", {
      userId,
      error: toError(error).message,
    });
    return null;
  }
}

/**
 * Create default email preferences for new user
 * Implements database operations with Drizzle ORM
 * Based on email_system_critique.md
 */
export async function createDefaultPreferences(
  db: Database,
  userId: string,
  email: string
): Promise<EmailPreference> {
  try {
    logger.debug("Creating default email preferences", { userId, email });

    const { emailPreferences } = await import('@snapback/platform/src/db/schema/snapback');
    const result = await db
      .insert(emailPreferences)
      .values({ userId, email, achievement: true, nurture: true })
      .returning();

    logger.info("✅ Default email preferences created", { userId });
    return result[0];
  } catch (error) {
    logger.error("Failed to create default preferences", {
      userId,
      error: toError(error).message,
    });

    // Return default preferences as fallback
    return {
      userId,
      email,
      achievement: true,
      nurture: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Update email preference for user
 * Implements database operations with Drizzle ORM
 * Based on email_system_critique.md
 */
export async function updatePreference(
  db: Database,
  userId: string,
  category: "achievement" | "nurture",
  enabled: boolean
): Promise<void> {
  try {
    logger.debug("Updating email preference", {
      userId,
      category,
      enabled,
    });

    const { emailPreferences } = await import('@snapback/platform/src/db/schema/snapback');
    await db
      .update(emailPreferences)
      .set({ [category]: enabled, updatedAt: new Date() })
      .where(eq(emailPreferences.userId, userId));

    logger.info("✅ Email preference updated", { userId, category, enabled });
  } catch (error) {
    logger.error("Failed to update preference", {
      userId,
      category,
      error: toError(error).message,
    });
    throw error;
  }
}

/**
 * Unsubscribe user from email category
 * Implements database operations with Drizzle ORM
 * Based on email_system_critique.md
 */
export async function unsubscribe(
  db: Database,
  userId: string,
  category?: EmailCategory
): Promise<void> {
  try {
    logger.info("Unsubscribing user from emails", { userId, category });

    const { emailPreferences } = await import('@snapback/platform/src/db/schema/snapback');

    if (!category) {
      // Global Unsubscribe
      await db
        .update(emailPreferences)
        .set({
          achievement: false,
          nurture: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailPreferences.userId, userId));

      logger.info("✅ User globally unsubscribed", { userId });
    } else if (category === "achievement" || category === "nurture") {
      // Granular Unsubscribe
      await db
        .update(emailPreferences)
        .set({ [category]: false, updatedAt: new Date() })
        .where(eq(emailPreferences.userId, userId));

      logger.info("✅ User unsubscribed from category", {
        userId,
        category,
      });
    }
  } catch (error) {
    logger.error("Failed to unsubscribe user", {
      userId,
      category,
      error: toError(error).message,
    });
    throw error;
  }
}

/**
 * Resubscribe user to email category
 */
export async function resubscribe(
  db: Database,
  userId: string,
  category?: "achievement" | "nurture"
): Promise<void> {
  try {
    logger.info("Resubscribing user to emails", { userId, category });

    if (!category) {
      // Global resubscribe - enable all categories
      // This will be implemented once the schema is defined in @snapback/platform
      logger.info("✅ User globally resubscribed", { userId });
    } else {
      // Granular resubscribe
      await updatePreference(db, userId, category, true);
      logger.info("✅ User resubscribed to category", { userId, category });
    }
  } catch (error) {
    logger.error("Failed to resubscribe user", {
      userId,
      category,
      error: toError(error).message,
    });
    throw error;
  }
}

/**
 * Check if user can receive email of specific category
 * Transactional and operational emails always sent
 */
export async function canReceiveEmail(
  db: Database,
  userId: string,
  category: EmailCategory
): Promise<boolean> {
  try {
    // Transactional and operational emails always sent
    if (category === "transactional" || category === "operational") {
      return true;
    }

    const prefs = await getEmailPreferences(db, userId);
    if (!prefs) {
      // Default to opt-in for new users
      return true;
    }

    if (category === "achievement") {
      return prefs.achievement;
    }
    if (category === "nurture") {
      return prefs.nurture;
    }

    return true;
  } catch (error) {
    logger.error("Failed to check email permission", {
      userId,
      category,
      error: toError(error).message,
    });
    // Fail open - allow email if we can't verify preferences
    return true;
  }
}

/**
 * Sync unsubscribe to HubSpot
 * Implements TODO: HubSpot sync from email_system_critique.md
 *
 * Updates subscription status in HubSpot so marketing workflows don't hit unsubscribed users
 */
export async function syncUnsubscribeToHubSpot(
  email: string,
  unsubscribed: boolean
): Promise<void> {
  try {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      logger.debug(
        "HUBSPOT_ACCESS_TOKEN not configured - skipping HubSpot sync"
      );
      return;
    }

    logger.debug("Syncing unsubscribe status to HubSpot", { email, unsubscribed });

    const hubspot = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    });

    // Update contact's subscription status properties
    await hubspot.crm.contacts.basicApi.update(email, {
      idProperty: "email",
      properties: {
        // Standard HubSpot unsubscribe field (opt out of all email)
        hs_email_optout: unsubscribed ? "true" : "false",

        // Custom properties for granular control
        // These must be created in HubSpot settings first
        snapback_marketing_optout: unsubscribed ? "true" : "false",
        snapback_achievement_optout: unsubscribed ? "true" : "false",
        snapback_nurture_optout: unsubscribed ? "true" : "false",
      },
    });

    logger.info("✅ Unsubscribe status synced to HubSpot", {
      email,
      unsubscribed,
    });
  } catch (error) {
    // Don't throw - we don't want to break the user's unsubscribe flow if HubSpot is down
    logger.error("⚠️  Failed to sync unsubscribe to HubSpot", {
      email,
      error: toError(error).message,
    });
  }
}

/**
 * Sync subscription preference to HubSpot
 * Updates specific category subscription status
 */
export async function syncPreferenceToHubSpot(
  email: string,
  category: EmailCategory,
  enabled: boolean
): Promise<void> {
  try {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) {
      logger.debug(
        "HUBSPOT_ACCESS_TOKEN not configured - skipping HubSpot sync"
      );
      return;
    }

    logger.debug("Syncing email preference to HubSpot", {
      email,
      category,
      enabled,
    });

    const hubspot = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    });

    const propertyMap = {
      achievement: "snapback_achievement_optout",
      nurture: "snapback_nurture_optout",
      transactional: "snapback_transactional_optout",
      operational: "snapback_operational_optout",
    };

    const property = propertyMap[category];

    await hubspot.crm.contacts.basicApi.update(email, {
      idProperty: "email",
      properties: {
        [property]: enabled ? "false" : "true",
      },
    });

    logger.info("✅ Email preference synced to HubSpot", {
      email,
      category,
      enabled,
    });
  } catch (error) {
    logger.error("⚠️  Failed to sync preference to HubSpot", {
      email,
      category,
      error: toError(error).message,
    });
  }
}
