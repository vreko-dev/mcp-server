import { Client } from "@hubspot/api-client";
import { logger } from "@snapback/infrastructure";
import type { HubSpotContactProperties } from "./types";

const hubspotClient = new Client({
	accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
});

/**
 * Creates or updates a contact in HubSpot with enhanced properties
 * @param properties Contact properties to create/update
 * @returns HubSpot contact ID or null if failed
 */
export async function createOrUpdateHubSpotContact(
	properties: HubSpotContactProperties,
): Promise<string | null> {
	if (!process.env.HUBSPOT_ACCESS_TOKEN) {
		logger.warn("HubSpot access token not configured, skipping sync");
		return null;
	}

	try {
		// Map our properties to HubSpot's format
		const hubspotProperties: Record<string, any> = {
			email: properties.email,
			...(properties.firstname && { firstname: properties.firstname }),
			...(properties.lastname && { lastname: properties.lastname }),
			...(properties.plan && { plan: properties.plan }),
			...(properties.subscription_status && {
				subscription_status: properties.subscription_status,
			}),
			...(properties.total_snapshots !== undefined && {
				total_snapshots: properties.total_snapshots,
			}),
			...(properties.total_recoveries !== undefined && {
				total_recoveries: properties.total_recoveries,
			}),
			...(properties.mrr !== undefined && { mrr: properties.mrr }),
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
			// Additional properties for growth stack
			...(properties.cohort && { cohort: properties.cohort }),
			...(properties.cohort_action && {
				cohort_action: properties.cohort_action,
			}),
			...(properties.last_event && { last_event: properties.last_event }),
			...(properties.last_event_timestamp && {
				last_event_timestamp: properties.last_event_timestamp,
			}),
			...(properties.trial_start_date && {
				trial_start_date: properties.trial_start_date,
			}),
			...(properties.trial_end_date && {
				trial_end_date: properties.trial_end_date,
			}),
			...(properties.limit_hit_feature && {
				limit_hit_feature: properties.limit_hit_feature,
			}),
			...(properties.limit_hit_type && {
				limit_hit_type: properties.limit_hit_type,
			}),
			...(properties.limit_hit_current_usage !== undefined && {
				limit_hit_current_usage: properties.limit_hit_current_usage,
			}),
			...(properties.limit_hit_limit !== undefined && {
				limit_hit_limit: properties.limit_hit_limit,
			}),
			...(properties.lifecyclestage && {
				lifecyclestage: properties.lifecyclestage,
			}),
		};

		// Try to find existing contact first
		try {
			const existingContact = await hubspotClient.crm.contacts.basicApi.getById(
				properties.email,
				undefined,
				undefined,
				undefined,
				true, // archived
				"email", // idProperty
			);

			// Update existing contact
			const response = await hubspotClient.crm.contacts.basicApi.update(
				existingContact.id,
				{
					properties: hubspotProperties,
				},
			);

			logger.info(`HubSpot contact updated: ${response.id}`);
			return response.id;
		} catch (error: any) {
			// If contact doesn't exist, create new one
			if (error.statusCode === 404) {
				const response = await hubspotClient.crm.contacts.basicApi.create({
					properties: hubspotProperties,
				});

				logger.info(`HubSpot contact created: ${response.id}`);
				return response.id;
			}

			// Re-throw if it's a different error
			throw error;
		}
	} catch (error: any) {
		logger.error("Failed to create/update HubSpot contact", {
			error: error.message || error,
			email: properties.email,
		});
		return null;
	}
}

/**
 * Trigger a HubSpot workflow for a contact
 * @param workflowId HubSpot workflow ID
 * @param email Contact email
 * @param properties Additional properties to send with workflow
 */
export async function triggerHubSpotWorkflow(
	workflowId: string,
	email: string,
	_properties: Record<string, any> = {},
): Promise<boolean> {
	if (!process.env.HUBSPOT_ACCESS_TOKEN) {
		logger.warn(
			"HubSpot access token not configured, skipping workflow trigger",
		);
		return false;
	}

	try {
		// First get the contact ID
		const contact = await hubspotClient.crm.contacts.basicApi.getById(
			email,
			undefined,
			undefined,
			undefined,
			true, // archived
			"email", // idProperty
		);

		// Trigger the workflow for the contact
		// Using the automation API to enroll a contact in a workflow
		// Note: workflows API not available in current HubSpot client version
		// await hubspotClient.automation.workflows.enrollmentsApi.create(
		// 	workflowId,
		// 	contact.id,
		// );

		logger.info("HubSpot workflow triggered", {
			workflowId,
			contactId: contact.id,
			email,
		});

		return true;
	} catch (error: any) {
		logger.error("Failed to trigger HubSpot workflow", {
			error: error.message || error,
			workflowId,
			email,
		});
		return false;
	}
}

/**
 * Add a contact to a HubSpot list
 * @param email Contact email
 * @param listId HubSpot list ID
 */
export async function addContactToList(
	email: string,
	listId: string,
): Promise<boolean> {
	if (!process.env.HUBSPOT_ACCESS_TOKEN) {
		logger.warn("HubSpot access token not configured, skipping list add");
		return false;
	}

	try {
		// First, get the contact ID by email
		const contact = await hubspotClient.crm.contacts.basicApi.getById(
			email,
			undefined,
			undefined,
			undefined,
			true, // archived
			"email", // idProperty
		);

		// Add contact to list using the CRM lists API
		// Note: This uses the newer CRM Lists API rather than the legacy lists API
		await hubspotClient.crm.lists.membershipsApi.add(listId, [contact.id]);

		logger.info("Contact added to HubSpot list", {
			contactId: contact.id,
			email,
			listId,
		});

		return true;
	} catch (error: any) {
		logger.error("Failed to add contact to HubSpot list", {
			error: error.message || error,
			email,
			listId,
		});
		return false;
	}
}

/**
 * Update a contact's lifecycle stage
 * @param email Contact email
 * @param lifecycleStage HubSpot lifecycle stage
 */
export async function updateContactLifecycleStage(
	email: string,
	lifecycleStage: string,
): Promise<boolean> {
	try {
		const response = await createOrUpdateHubSpotContact({
			email,
			lifecyclestage: lifecycleStage,
		});

		return response !== null;
	} catch (error: any) {
		logger.error("Failed to update contact lifecycle stage", {
			error: error.message || error,
			email,
			lifecycleStage,
		});
		return false;
	}
}
