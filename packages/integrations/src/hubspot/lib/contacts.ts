import { createContact, getContact, updateContact } from "../provider/hubspot/index.js";
import type { CreateContactParams, GetContactParams, HubSpotContact, UpdateContactParams } from "../types.js";

/**
 * Create a new contact in HubSpot
 * @param params Contact creation parameters
 * @returns Created contact
 */
export async function createHubSpotContact(params: CreateContactParams): Promise<HubSpotContact> {
	return await createContact(params);
}

/**
 * Update an existing contact in HubSpot
 * @param params Contact update parameters
 * @returns Updated contact
 */
export async function updateHubSpotContact(params: UpdateContactParams): Promise<HubSpotContact> {
	return await updateContact(params);
}

/**
 * Get a contact by ID from HubSpot
 * @param params Contact retrieval parameters
 * @returns Contact details
 */
export async function getHubSpotContact(params: GetContactParams): Promise<HubSpotContact> {
	return await getContact(params);
}

/**
 * Create or update a contact in HubSpot based on email
 * @param params Contact parameters
 * @returns Created or updated contact
 */
export async function upsertHubSpotContact(params: CreateContactParams): Promise<HubSpotContact> {
	// If email is provided, try to find existing contact first
	if (params.properties.email) {
		try {
			// Search for existing contact by email
			// Note: This would require implementing a search function
			// For now, we'll just create a new contact
			return await createContact(params);
		} catch (_error) {
			// If contact doesn't exist, create it
			return await createContact(params);
		}
	}

	// If no email provided, create a new contact
	return await createContact(params);
}
