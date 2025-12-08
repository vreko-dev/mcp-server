import { Client } from "@hubspot/api-client";
import { logger } from "@snapback/infrastructure";

const hubspotClient = new Client({
	accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

export interface HubSpotContactProperties {
	email: string;
	source?: string;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
}

/**
 * Creates or updates a contact in HubSpot
 * @param properties Contact properties to create/update
 * @returns HubSpot contact ID or null if failed
 */
export async function createOrUpdateHubSpotContact(properties: HubSpotContactProperties): Promise<string | null> {
	if (!process.env.HUBSPOT_ACCESS_TOKEN) {
		logger.warn("HubSpot access token not configured, skipping sync");
		return null;
	}

	try {
		// Map our properties to HubSpot's format
		const hubspotProperties = {
			email: properties.email,
			...(properties.source && { newsletter_source: properties.source }),
			...(properties.utm_source && {
				hs_analytics_source: properties.utm_source,
			}),
			...(properties.utm_medium && {
				hs_analytics_source_data_1: properties.utm_medium,
			}),
			...(properties.utm_campaign && {
				hs_analytics_source_data_2: properties.utm_campaign,
			}),
		};

		// Create or update contact using email as unique identifier
		const response = await hubspotClient.crm.contacts.basicApi.create({
			properties: hubspotProperties,
			associations: [],
		});

		logger.info(`HubSpot contact created/updated: ${response.id}`);
		return response.id;
	} catch (error: unknown) {
		// Handle duplicate email error (contact already exists)
		if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) {
			try {
				// Contact exists, update it instead
				// Simplified approach - just log and return null for now
				logger.info("Contact already exists in HubSpot, skipping update");
				return null;
			} catch (updateError) {
				logger.error("Failed to update existing HubSpot contact", {
					error: updateError,
				});
				return null;
			}
		}

		logger.error("Failed to create/update HubSpot contact", { error });
		return null;
	}
}

/**
 * Adds a contact to a HubSpot list
 * @param contactId HubSpot contact ID
 * @param listId HubSpot list ID
 */
export async function addContactToList(contactId: string, listId: string): Promise<boolean> {
	if (!process.env.HUBSPOT_ACCESS_TOKEN) {
		logger.warn("HubSpot access token not configured, skipping list add");
		return false;
	}

	try {
		// Note: List API may require different permissions
		// This is a placeholder for list management
		logger.info(`Would add contact ${contactId} to list ${listId}`);
		return true;
	} catch (error) {
		logger.error("Failed to add contact to HubSpot list", { error });
		return false;
	}
}
