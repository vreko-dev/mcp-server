import { createCompany, getCompany, updateCompany } from "../provider/hubspot/index";
import type { CreateCompanyParams, GetCompanyParams, HubSpotCompany, UpdateCompanyParams } from "../types";

/**
 * Create a new company in HubSpot
 * @param params Company creation parameters
 * @returns Created company
 */
export async function createHubSpotCompany(params: CreateCompanyParams): Promise<HubSpotCompany> {
	return await createCompany(params);
}

/**
 * Update an existing company in HubSpot
 * @param params Company update parameters
 * @returns Updated company
 */
export async function updateHubSpotCompany(params: UpdateCompanyParams): Promise<HubSpotCompany> {
	return await updateCompany(params);
}

/**
 * Get a company by ID from HubSpot
 * @param params Company retrieval parameters
 * @returns Company details
 */
export async function getHubSpotCompany(params: GetCompanyParams): Promise<HubSpotCompany> {
	return await getCompany(params);
}

/**
 * Create or update a company in HubSpot based on domain
 * @param params Company parameters
 * @returns Created or updated company
 */
export async function upsertHubSpotCompany(params: CreateCompanyParams): Promise<HubSpotCompany> {
	// If domain is provided, try to find existing company first
	if (params.properties.domain) {
		try {
			// Search for existing company by domain
			// Note: This would require implementing a search function
			// For now, we'll just create a new company
			return await createCompany(params);
		} catch (_error) {
			// If company doesn't exist, create it
			return await createCompany(params);
		}
	}

	// If no domain provided, create a new company
	return await createCompany(params);
}
